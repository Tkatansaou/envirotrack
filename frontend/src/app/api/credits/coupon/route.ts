// GET  /api/credits/coupon?code=XXX — prévisualise un coupon sans le racheter (auth requise).
// POST /api/credits/coupon — valide et applique un code promo (crédits cadeau).
// Pour les coupons de type "rabais" (discountPct), utiliser le champ couponCode
// directement dans POST /api/credits/checkout ou POST /api/subscriptions.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import {
  validateAndRedeemCoupon,
  CouponError,
  couponErrorMessage,
} from '@/lib/server/coupons/validate';

// ── GET — preview sans rachat ────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim();
    if (!code || code.length < 1 || code.length > 50) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Code manquant.' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      select: {
        active: true,
        discountPct: true,
        credits: true,
        description: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
      },
    });

    if (!coupon || !coupon.active) {
      return NextResponse.json(
        { error: 'COUPON_NOT_FOUND', message: 'Code promo introuvable ou inactif.' },
        { status: 422, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'COUPON_EXPIRED', message: 'Ce code promo a expiré.' },
        { status: 422, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { error: 'COUPON_EXHAUSTED', message: "Ce code promo a atteint sa limite d'utilisation." },
        { status: 422, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    return NextResponse.json(
      { discountPct: coupon.discountPct, credits: coupon.credits, description: coupon.description },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const Body = z.object({
  code: z.string().min(1).max(50).toUpperCase().trim(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'Code invalide.' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { code } = parsed.data;
    const userId = auth.user.sub;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const coupon = await validateAndRedeemCoupon(tx, code, userId);

        if (coupon.credits <= 0) {
          // Coupon de type "rabais" uniquement — pas de crédits à distribuer ici.
          // Le client devrait utiliser ce coupon via POST /api/credits/checkout.
          return { coupon, creditsAdded: 0, newBalance: null };
        }

        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { creditBalance: true },
        });

        const balanceBefore = user.creditBalance;
        const balanceAfter = balanceBefore + coupon.credits;

        await tx.user.update({
          where: { id: userId },
          data: { creditBalance: { increment: coupon.credits } },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'CREDIT',
            amount: coupon.credits,
            balanceBefore,
            balanceAfter,
            reason: 'COUPON_REDEMPTION',
            description: `Code promo : ${coupon.code}${coupon.description ? ` — ${coupon.description}` : ''}`,
          },
        });

        return { coupon, creditsAdded: coupon.credits, newBalance: balanceAfter };
      });

      if (result.newBalance === null) {
        return NextResponse.json(
          {
            discountPct: result.coupon.discountPct,
            credits: 0,
            message: 'Code promo de réduction validé. Appliquez-le lors de votre prochain achat.',
          },
          { status: 200, headers: { 'x-request-id': ctx.requestId } },
        );
      }

      return NextResponse.json(
        {
          credits: result.creditsAdded,
          newBalance: result.newBalance,
          description:
            result.coupon.description ?? `+${result.creditsAdded} crédits ajoutés à votre compte.`,
        },
        { status: 200, headers: { 'x-request-id': ctx.requestId } },
      );
    } catch (err) {
      if (err instanceof CouponError) {
        return NextResponse.json(
          { error: err.code, message: couponErrorMessage(err.code) },
          { status: 422, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      throw err;
    }
  });
}
