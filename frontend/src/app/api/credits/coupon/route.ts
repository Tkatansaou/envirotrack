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
