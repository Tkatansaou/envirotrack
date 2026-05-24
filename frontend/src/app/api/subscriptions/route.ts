// POST /api/subscriptions — souscrire à un plan
// Débite immédiatement les crédits du premier mois/an sur le solde.
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { enqueueOutbox } from '@/lib/server/outbox';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';
import {
  validateAndRedeemCoupon,
  CouponError,
  couponErrorMessage,
} from '@/lib/server/coupons/validate';

const Body = z.object({
  planId: z.string().min(1),
  cycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  couponCode: z.string().min(1).max(30).optional(),
});

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfErr = verifyCsrf(req);
    if (csrfErr) return csrfErr;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }
    const { planId, cycle, couponCode } = parsed.data;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return NextResponse.json(
        { error: 'PLAN_NOT_FOUND' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // Vérifier abonnement existant
    const existing = await prisma.subscription.findUnique({
      where: { userId: auth.user.sub },
    });
    if (existing && existing.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'ALREADY_SUBSCRIBED', message: 'Vous avez déjà un abonnement actif.' },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const baseCredits =
      cycle === 'ANNUAL'
        ? (plan.creditsPerYear ?? plan.creditsPerMonth * 12)
        : plan.creditsPerMonth;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.user.sub },
      select: { id: true, email: true, creditBalance: true },
    });

    // Valider le coupon avant de vérifier le solde (pour donner l'erreur coupon
    // en premier si les deux conditions échouent)
    let appliedDiscountPct: number | null = null;
    if (couponCode) {
      const preview = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase().trim() },
        select: {
          active: true,
          discountPct: true,
          expiresAt: true,
          maxUses: true,
          usedCount: true,
        },
      });
      if (!preview || !preview.active) {
        return NextResponse.json(
          { error: 'COUPON_NOT_FOUND', message: 'Code promo introuvable ou inactif.' },
          { status: 422, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      if (preview.expiresAt && preview.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'COUPON_EXPIRED', message: 'Ce code promo a expiré.' },
          { status: 422, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      if (preview.maxUses !== null && preview.usedCount >= preview.maxUses) {
        return NextResponse.json(
          {
            error: 'COUPON_EXHAUSTED',
            message: "Ce code promo a atteint sa limite d'utilisation.",
          },
          { status: 422, headers: { 'x-request-id': ctx.requestId } },
        );
      }
      appliedDiscountPct = preview.discountPct ?? null;
    }

    const creditsNeeded =
      appliedDiscountPct !== null
        ? Math.max(1, Math.round(baseCredits * (1 - appliedDiscountPct / 100)))
        : baseCredits;

    if (user.creditBalance < creditsNeeded) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Solde insuffisant. Il vous faut ${creditsNeeded} crédits (solde actuel : ${user.creditBalance}).`,
          needed: creditsNeeded,
          balance: user.creditBalance,
        },
        { status: 402, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const now = new Date();
    const periodEnd = cycle === 'ANNUAL' ? addYears(now, 1) : addMonths(now, 1);

    let subscription;
    try {
      subscription = await prisma.$transaction(async (tx) => {
        const balanceBefore = user.creditBalance;
        const balanceAfter = balanceBefore - creditsNeeded;

        if (couponCode) {
          await validateAndRedeemCoupon(tx, couponCode, auth.user.sub);
        }

        await tx.user.update({
          where: { id: user.id },
          data: { creditBalance: { decrement: creditsNeeded } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            type: 'DEBIT',
            amount: creditsNeeded,
            balanceBefore,
            balanceAfter,
            reason: 'SUBSCRIPTION_START',
            description: `Activation abonnement ${plan.name} (${cycle === 'ANNUAL' ? 'annuel' : 'mensuel'})${appliedDiscountPct ? ` — ${appliedDiscountPct}% de réduction` : ''}`,
          },
        });

        const sub = await tx.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            planId: plan.id,
            cycle,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextRenewalAt: periodEnd,
            lastRenewalAt: now,
          },
          update: {
            planId: plan.id,
            cycle,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextRenewalAt: periodEnd,
            lastRenewalAt: now,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            renewalFailures: 0,
          },
        });

        await enqueueOutbox(tx, {
          kind: 'email.subscription_started',
          payload: {
            to: user.email,
            planName: plan.name,
            cycle,
            creditsDeducted: creditsNeeded,
            newBalance: balanceAfter,
            periodEnd: periodEnd.toISOString(),
          },
        });

        return sub;
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

    log.info('subscription created', { subId: subscription.id, planId, cycle });
    return NextResponse.json(
      { subscription },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
