// Logique de renouvellement des abonnements — appelée par le cron quotidien.
//
// Principe : chaque abonnement dont nextRenewalAt <= now() et status IN
// (ACTIVE, PAST_DUE) est traité. On tente de déduire les crédits du plan
// sur le solde de l'utilisateur. Succès → on avance nextRenewalAt.
// Échec → on incrémente renewalFailures. Au 3ème échec consécutif, on
// suspend l'abonnement.
//
// MAX_FAILURES_BEFORE_SUSPEND = 3. Grace period implicite entre chaque
// tentative = 1 jour (le cron tourne quotidiennement).
import { prisma } from '@/lib/server/prisma';
import { enqueueOutbox } from '@/lib/server/outbox';
import { log } from '@/lib/server/observability/log';

const MAX_FAILURES = 3;

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

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

export interface RenewalResult {
  processed: number;
  renewed: number;
  failed: number;
  suspended: number;
}

export async function renewDueSubscriptions(): Promise<RenewalResult> {
  const now = new Date();

  const due = await prisma.subscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'PAST_DUE'] },
      nextRenewalAt: { lte: now },
      cancelAtPeriodEnd: false,
    },
    include: {
      plan: true,
      user: { select: { id: true, email: true, creditBalance: true } },
    },
  });

  let renewed = 0;
  let failed = 0;
  let suspended = 0;

  for (const sub of due) {
    const creditsNeeded =
      sub.cycle === 'ANNUAL'
        ? (sub.plan.creditsPerYear ?? sub.plan.creditsPerMonth * 12)
        : sub.plan.creditsPerMonth;

    const hasBalance = sub.user.creditBalance >= creditsNeeded;

    if (hasBalance) {
      const periodStart = now;
      const periodEnd = sub.cycle === 'ANNUAL' ? addYears(now, 1) : addMonths(now, 1);

      await prisma.$transaction(async (tx) => {
        const balanceBefore = sub.user.creditBalance;
        const balanceAfter = balanceBefore - creditsNeeded;

        await tx.user.update({
          where: { id: sub.userId },
          data: { creditBalance: { decrement: creditsNeeded } },
        });

        await tx.creditTransaction.create({
          data: {
            userId: sub.userId,
            type: 'DEBIT',
            amount: creditsNeeded,
            balanceBefore,
            balanceAfter,
            reason: 'SUBSCRIPTION_RENEWAL',
            description: `Renouvellement abonnement ${sub.plan.name}`,
          },
        });

        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            renewalFailures: 0,
            lastRenewalAt: now,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            nextRenewalAt: periodEnd,
          },
        });

        await enqueueOutbox(tx, {
          kind: 'email.subscription_renewed',
          payload: {
            to: sub.user.email,
            planName: sub.plan.name,
            creditsDeducted: creditsNeeded,
            newBalance: balanceAfter,
            nextRenewalAt: periodEnd.toISOString(),
          },
        });
      });

      log.info('subscription renewed', { subId: sub.id, userId: sub.userId });
      renewed++;
    } else {
      const newFailures = sub.renewalFailures + 1;
      const willSuspend = newFailures >= MAX_FAILURES;

      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: willSuspend ? 'SUSPENDED' : 'PAST_DUE',
            renewalFailures: newFailures,
            // Retry again tomorrow
            nextRenewalAt: willSuspend ? sub.nextRenewalAt : addDays(now, 1),
          },
        });

        await enqueueOutbox(tx, {
          kind: willSuspend ? 'email.subscription_suspended' : 'email.subscription_payment_failed',
          payload: {
            to: sub.user.email,
            planName: sub.plan.name,
            creditsNeeded,
            currentBalance: sub.user.creditBalance,
            attemptsLeft: willSuspend ? 0 : MAX_FAILURES - newFailures,
            retryAt: willSuspend ? null : addDays(now, 1).toISOString(),
          },
        });
      });

      log.info(willSuspend ? 'subscription suspended' : 'subscription renewal failed', {
        subId: sub.id,
        failures: newFailures,
      });

      if (willSuspend) suspended++;
      else failed++;
    }
  }

  // Expire subscriptions where cancelAtPeriodEnd + currentPeriodEnd passed
  const toCancel = await prisma.subscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lte: now },
      status: { not: 'CANCELLED' },
    },
  });

  for (const sub of toCancel) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    log.info('subscription cancelled at period end', { subId: sub.id });
  }

  return { processed: due.length, renewed, failed, suspended };
}

export async function seedDefaultPlans(): Promise<void> {
  const plans = [
    {
      name: 'Solo Expert',
      slug: 'solo',
      description: 'Idéal pour un expert indépendant',
      creditsPerMonth: 150,
      creditsPerYear: 1500,
      priceXOF: 15000,
      priceAnnualXOF: 150000,
      maxProjects: 3,
      features: JSON.stringify([
        '3 projets actifs',
        'EIES + PGES complets',
        'Suivi terrain',
        'Export PDF (10 cr/export)',
        'Support email',
      ]),
      highlighted: false,
      sortOrder: 1,
    },
    {
      name: 'Bureau Pro',
      slug: 'pro',
      description: "Pour les bureaux d'études en croissance",
      creditsPerMonth: 350,
      creditsPerYear: 3500,
      priceXOF: 35000,
      priceAnnualXOF: 350000,
      maxProjects: 10,
      features: JSON.stringify([
        '10 projets actifs',
        'EIES + PGES complets',
        'Suivi terrain multi-agents',
        'Export PDF illimité inclus',
        'Invitation bailleur',
        'Support prioritaire',
      ]),
      highlighted: true,
      sortOrder: 2,
    },
    {
      name: 'Bureau Premium',
      slug: 'premium',
      description: "Bureaux d'études avec grands volumes",
      creditsPerMonth: 750,
      creditsPerYear: 7500,
      priceXOF: 75000,
      priceAnnualXOF: 750000,
      maxProjects: null,
      features: JSON.stringify([
        'Projets illimités',
        'Tout Bureau Pro inclus',
        'Sync réglementaire incluse',
        'Rapports multi-bailleurs',
        'Accès API (à venir)',
        'Support dédié',
      ]),
      highlighted: false,
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: { ...plan },
    });
  }
}
