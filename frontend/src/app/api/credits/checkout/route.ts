// POST /api/credits/checkout — initie l'achat d'un pack de crédits.
//
// Body: { packId: string, paymentMethod: "MOBILE_MONEY" | "CARD" }
//
// Séquence :
//   1. CSRF + auth
//   2. Zod parse
//   3. Vérifier que le pack existe et est actif
//   4. Insérer CreditOrder (PENDING) + Order (PENDING) dans la même tx
//   5. Appel provider.charge()
//   6. Mettre à jour Order.providerChargeId + paymentUrl
//   7. Retourner { creditOrderId, orderId, paymentUrl }
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import {
  getCreditProvider,
  CreditProviderUnconfiguredError,
  type CreditPaymentMethod,
} from '@/lib/server/payments/credits-router';
import { breaker } from '@/lib/server/payments/provider-singleton';
import { CircuitOpenError } from '@/lib/server/payments/circuit-breaker';
import {
  validateAndRedeemCoupon,
  CouponError,
  couponErrorMessage,
} from '@/lib/server/coupons/validate';

const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000;

const Body = z.object({
  packId: z.string().min(1),
  paymentMethod: z.enum(['MOBILE_MONEY', 'CARD']),
  couponCode: z.string().min(1).max(30).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    // 1. CSRF + auth
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // 2. Zod
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Invalid request body',
          issues: parsed.error.issues,
        },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const { packId, paymentMethod, couponCode } = parsed.data;

    // 3. Pack actif
    const pack = await prisma.creditPack.findUnique({ where: { id: packId } });
    if (!pack || !pack.active) {
      return NextResponse.json(
        { error: 'PACK_NOT_FOUND', message: 'Credit pack not found or inactive' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // 4. Provider
    let bundle;
    try {
      bundle = getCreditProvider(paymentMethod as CreditPaymentMethod);
    } catch (err) {
      if (err instanceof CreditProviderUnconfiguredError) {
        return NextResponse.json(
          { error: 'PAYMENT_PROVIDER_UNCONFIGURED', message: err.message },
          { status: 503, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      throw err;
    }

    const envPublicUrl = process.env.PUBLIC_URL;
    if (!envPublicUrl && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'PAYMENT_PROVIDER_UNCONFIGURED', message: 'PUBLIC_URL not set' },
        { status: 503, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const publicUrl = envPublicUrl ?? 'http://localhost:3000';

    // 5. Créer CreditOrder + Order dans la même transaction (+ coupon si fourni)
    let appliedDiscountPct: number | null = null;
    let txResult: { creditOrder: { id: string }; order: { id: string; amount: number } } | null =
      null;
    try {
      txResult = await prisma.$transaction(async (tx) => {
        let finalPrice = pack.priceXOF;

        if (couponCode) {
          const coupon = await validateAndRedeemCoupon(tx, couponCode, auth.user.sub);
          if (coupon.discountPct) {
            appliedDiscountPct = coupon.discountPct;
            finalPrice = Math.max(1, Math.round(pack.priceXOF * (1 - coupon.discountPct / 100)));
          }
        }

        const order = await tx.order.create({
          data: {
            userId: auth.user.sub,
            amount: finalPrice,
            currency: 'XOF',
            provider: bundle.provider.name,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + ORDER_EXPIRY_MS),
            customerEmail: auth.user.email,
            metadata: {
              packId,
              credits: pack.credits,
              paymentMethod,
              ...(appliedDiscountPct
                ? { couponCode, discountPct: appliedDiscountPct, originalPrice: pack.priceXOF }
                : {}),
            },
          },
        });

        const creditOrder = await tx.creditOrder.create({
          data: {
            userId: auth.user.sub,
            packId: pack.id,
            orderId: order.id,
            provider: bundle.provider.name,
            status: 'PENDING',
          },
        });

        return { creditOrder, order };
      });
    } catch (err) {
      if (err instanceof CouponError) {
        return NextResponse.json(
          { error: err.code, message: couponErrorMessage(err.code) },
          { status: 422, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      throw err;
    }
    const { creditOrder, order } = txResult;

    // 6. Appel provider.charge() via le circuit breaker existant
    try {
      const result = await breaker.execute(() =>
        bundle.provider.charge({
          amount: order.amount,
          currency: 'XOF',
          customer: { email: auth.user.email },
          successUrl: `${publicUrl}/credits/success?orderId=${order.id}`,
          failureUrl: `${publicUrl}/credits/failed?orderId=${order.id}`,
          externalRef: order.id,
          metadata: { packId, creditOrderId: creditOrder.id },
        }),
      );

      await prisma.order.update({
        where: { id: order.id },
        data: { providerChargeId: result.providerChargeId, paymentUrl: result.paymentUrl },
      });

      return NextResponse.json(
        { creditOrderId: creditOrder.id, orderId: order.id, paymentUrl: result.paymentUrl },
        { status: 201, headers: { 'x-request-id': ctx.requestId } },
      );
    } catch (err) {
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } }),
        prisma.creditOrder.update({ where: { id: creditOrder.id }, data: { status: 'FAILED' } }),
      ]);

      if (err instanceof CircuitOpenError) {
        const retryAfter = Math.max(1, Math.ceil((err.retryAt.getTime() - Date.now()) / 1000));
        return NextResponse.json(
          {
            error: 'PAYMENT_PROVIDER_UNAVAILABLE',
            message: 'Payment provider temporarily unavailable',
          },
          {
            status: 503,
            headers: { 'x-request-id': ctx.requestId, 'Retry-After': String(retryAfter) },
          },
        );
      }

      const message = err instanceof Error ? err.message : 'Unknown payment error';
      return NextResponse.json(
        { error: 'PAYMENT_FAILED', message },
        { status: 502, headers: { 'x-request-id': ctx.requestId } },
      );
    }
  });
}
