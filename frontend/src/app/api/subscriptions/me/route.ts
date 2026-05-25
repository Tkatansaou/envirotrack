// GET  /api/subscriptions/me — abonnement courant de l'utilisateur
// PATCH /api/subscriptions/me — modifier (annuler en fin de période, changer de plan)
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { requireAuth } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { enqueueOutbox } from '@/lib/server/outbox';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const [subscription, userRow] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: auth.user.sub },
        include: { plan: true },
      }),
      prisma.user.findUnique({
        where: { id: auth.user.sub },
        select: { trialEndsAt: true, role: true },
      }),
    ]);

    const now = Date.now();
    const trialEndsAt = userRow?.trialEndsAt ?? null;
    const trialActive = !!trialEndsAt && trialEndsAt.getTime() > now;
    const daysLeft = trialActive
      ? Math.ceil((trialEndsAt!.getTime() - now) / (24 * 60 * 60 * 1000))
      : 0;

    // Admins and superadmins always have access — never blocked by the subscription gate.
    const isAdmin = userRow?.role === 'ADMIN' || userRow?.role === 'SUPERADMIN';

    return NextResponse.json(
      {
        subscription,
        trial: { active: trialActive, endsAt: trialEndsAt?.toISOString() ?? null, daysLeft },
        isAdmin,
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const PatchBody = z.object({
  cancelAtPeriodEnd: z.boolean().optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfErr = verifyCsrf(req);
    if (csrfErr) return csrfErr;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const sub = await prisma.subscription.findUnique({
      where: { userId: auth.user.sub },
      include: { plan: true, user: { select: { email: true } } },
    });

    if (!sub || sub.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'NO_ACTIVE_SUBSCRIPTION' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.cancelAtPeriodEnd !== undefined) {
      updates.cancelAtPeriodEnd = parsed.data.cancelAtPeriodEnd;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({
        where: { id: sub.id },
        data: updates,
        include: { plan: true },
      });

      if (parsed.data.cancelAtPeriodEnd === true) {
        await enqueueOutbox(tx, {
          kind: 'email.subscription_cancellation_scheduled',
          payload: {
            to: sub.user.email,
            planName: sub.plan.name,
            accessUntil: sub.currentPeriodEnd.toISOString(),
          },
        });
      } else if (parsed.data.cancelAtPeriodEnd === false) {
        await enqueueOutbox(tx, {
          kind: 'email.subscription_reactivated',
          payload: {
            to: sub.user.email,
            planName: sub.plan.name,
            nextRenewalAt: sub.nextRenewalAt.toISOString(),
          },
        });
      }

      return s;
    });

    log.info('subscription updated', { subId: sub.id, updates });
    return NextResponse.json(
      { subscription: updated },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
