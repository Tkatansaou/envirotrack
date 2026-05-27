/**
 * Outbox dispatcher — drains PENDING OutboxEvent rows and routes each to
 * the correct side-effect handler.
 *
 *   draining order: oldest scheduledAt first.
 *   on success: row.status = SENT, sentAt = now.
 *   on failure: row.attempts++, lastError = err.message; if attempts <
 *               maxAttempts the row is rescheduled (status PENDING +
 *               scheduledAt += backoff), else marked DEAD.
 *
 * The dispatcher is single-instance safe via a per-row claim:
 *   UPDATE OutboxEvent SET status = 'PROCESSING', attempts = attempts + 1
 *   WHERE id = $1 AND status = 'PENDING'
 *   RETURNING id;
 *
 * Two competing workers see at most one of them claim each row (the other's
 * UPDATE returns 0 rows). For multi-instance prod a Redis-leader-election
 * variant is recommended on top of this — single-instance is the v1 stance.
 *
 * Backoff: 30s, 2m, 10m, 30m, 1h. Max 5 attempts before DEAD.
 */
import type { PrismaClient } from '@prisma/client';
import { createNotification } from '../notifications/index';
import {
  paymentReceived,
  projectActivated,
  pgesReminder,
  nonConformityOpen,
} from '../notifications/templates';
import type { EmailQueue } from '../queues/email-queue';
import { createLogger } from '../logger';
import type { OutboxEvent } from './types';

const logger = createLogger();

const MAX_ATTEMPTS = 5;
const BACKOFF_MS: readonly number[] = [
  30_000, // 30s
  2 * 60_000, // 2 min
  10 * 60_000, // 10 min
  30 * 60_000, // 30 min
  60 * 60_000, // 1 h
];

export interface OutboxDispatcherDeps {
  prisma: PrismaClient;
  emailQueue?: EmailQueue;
}

/**
 * Process up to `batchSize` PENDING events whose scheduledAt has elapsed.
 * Returns count successfully processed (success or terminal failure).
 */
export async function drainOutbox(
  deps: OutboxDispatcherDeps,
  batchSize: number = 25,
): Promise<{ processed: number; succeeded: number; failed: number; dead: number }> {
  const now = new Date();
  const candidates = await deps.prisma.outboxEvent.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: batchSize,
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;
  let dead = 0;

  for (const candidate of candidates) {
    // Per-row atomic claim — guards against concurrent dispatchers.
    const claimed = await deps.prisma.outboxEvent.updateMany({
      where: { id: candidate.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue; // another worker got it

    const row = await deps.prisma.outboxEvent.findUnique({
      where: { id: candidate.id },
    });
    if (!row) continue;

    const event: OutboxEvent = {
      kind: row.kind as OutboxEvent['kind'],
      payload: row.payload as OutboxEvent['payload'],
    } as OutboxEvent;

    try {
      await dispatchEvent(deps, event);
      await deps.prisma.outboxEvent.update({
        where: { id: row.id },
        data: { status: 'SENT', sentAt: new Date(), lastError: null },
      });
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (row.attempts >= MAX_ATTEMPTS) {
        await deps.prisma.outboxEvent.update({
          where: { id: row.id },
          data: { status: 'DEAD', lastError: message },
        });
        dead++;
        logger.error('outbox: event DEAD', { id: row.id, kind: row.kind, lastError: message });
      } else {
        const idx = Math.min(row.attempts - 1, BACKOFF_MS.length - 1);
        const delay = BACKOFF_MS[Math.max(0, idx)] ?? BACKOFF_MS[BACKOFF_MS.length - 1]!;
        await deps.prisma.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: 'PENDING',
            lastError: message,
            scheduledAt: new Date(Date.now() + delay),
          },
        });
        failed++;
        logger.warn('outbox: event failed (will retry)', {
          id: row.id,
          kind: row.kind,
          attempts: row.attempts,
          retryInMs: delay,
          lastError: message,
        });
      }
    }
  }

  return { processed: candidates.length, succeeded, failed, dead };
}

/** Route a single event to the correct handler. */
async function dispatchEvent(deps: OutboxDispatcherDeps, event: OutboxEvent): Promise<void> {
  switch (event.kind) {
    case 'notification.payment_received': {
      const { userId, orderId, amount, currency } = event.payload;
      await createNotification(deps.prisma, paymentReceived(userId, orderId, amount, currency));
      return;
    }
    case 'email.payment_confirmation': {
      if (!deps.emailQueue) {
        // No mailer configured — skip silently. This event will be retried;
        // for permanent skips, ops should mark it DEAD manually.
        throw new Error('email queue not configured');
      }
      const { to, orderId, amount, currency } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: 'Payment received',
        html: `<p>Your order <strong>${orderId}</strong> for ${amount} ${currency} is confirmed. Thank you!</p>`,
      });
      return;
    }
    case 'email.verification_code': {
      // Phase 1 — emitted by signup + resend-verification routes. Phase 5's
      // email-queue cron will render via verificationEmail() and call enqueue.
      // O1 audit fix — thread `expiresAt` so the rendered TTL matches the
      // route-side `AUTH_VERIFICATION_TTL_MIN` env (was hardcoded "15 min").
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { verificationEmail } = await import('../auth/email-templates');
      const { to, code, expiresAt } = event.payload;
      const tpl = verificationEmail({ code, email: to, expiresAt });
      await deps.emailQueue.enqueue({ to, subject: tpl.subject, html: tpl.html });
      return;
    }
    case 'email.password_reset': {
      // Phase 1 — emitted by forgot-password route.
      // O1 audit fix — thread `expiresAt` (see email.verification_code above).
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { resetPasswordEmail } = await import('../auth/email-templates');
      const { to, code, expiresAt } = event.payload;
      const tpl = resetPasswordEmail({ code, email: to, expiresAt });
      await deps.emailQueue.enqueue({ to, subject: tpl.subject, html: tpl.html });
      return;
    }
    case 'notification.project_activated': {
      const { userId, projectId, projectName } = event.payload;
      await createNotification(deps.prisma, projectActivated(userId, projectId, projectName));
      return;
    }
    case 'email.project_activated': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, projectId, projectName, projectType } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Projet EnviroTrack activé : ${projectName}`,
        html: `<p>Votre projet <strong>${projectName}</strong> (${projectType}, réf. ${projectId}) est maintenant actif. Vous pouvez démarrer la rédaction de votre EIES.</p>`,
      });
      return;
    }
    case 'notification.pges_reminder': {
      const { userId, projectId, projectName, year, quarter } = event.payload;
      await createNotification(
        deps.prisma,
        pgesReminder(userId, projectId, projectName, year, quarter),
      );
      return;
    }
    case 'email.pges_reminder': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, projectId, projectName, year, quarter } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Rappel PGES T${quarter}/${year} — ${projectName}`,
        html: `<p>Le suivi trimestriel PGES T${quarter}/${year} du projet <strong>${projectName}</strong> est en attente de saisie. <a href="${process.env['NEXT_PUBLIC_APP_URL']}/projects/${projectId}/pges">Accéder au tableau de suivi</a>.</p>`,
      });
      return;
    }
    case 'notification.non_conformity_open': {
      const { userId, projectId, projectName, nonConformityId, gravity } = event.payload;
      await createNotification(
        deps.prisma,
        nonConformityOpen(userId, projectId, projectName, nonConformityId, gravity),
      );
      return;
    }
    case 'email.subscription_started': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, planName, cycle, creditsDeducted, newBalance, periodEnd } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Abonnement ${planName} activé`,
        html: `<p>Votre abonnement <strong>${planName}</strong> (${cycle === 'ANNUAL' ? 'annuel' : 'mensuel'}) est actif. ${creditsDeducted} crédits débités — solde : ${newBalance} crédits. Accès jusqu'au ${new Date(periodEnd).toLocaleDateString('fr-FR')}.</p>`,
      });
      return;
    }
    case 'email.subscription_renewed': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, planName, creditsDeducted, newBalance, nextRenewalAt } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Abonnement ${planName} renouvelé`,
        html: `<p>Votre abonnement <strong>${planName}</strong> a été renouvelé. ${creditsDeducted} crédits débités — solde : ${newBalance} crédits. Prochain renouvellement : ${new Date(nextRenewalAt).toLocaleDateString('fr-FR')}.</p>`,
      });
      return;
    }
    case 'email.subscription_cancellation_scheduled': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, planName, accessUntil } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Résiliation abonnement ${planName} programmée`,
        html: `<p>Votre abonnement <strong>${planName}</strong> sera résilié à la fin de la période en cours. Vous conservez l'accès jusqu'au ${new Date(accessUntil).toLocaleDateString('fr-FR')}.</p>`,
      });
      return;
    }
    case 'email.subscription_reactivated': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, planName, nextRenewalAt } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Abonnement ${planName} réactivé`,
        html: `<p>La résiliation de votre abonnement <strong>${planName}</strong> a été annulée. Prochain renouvellement : ${new Date(nextRenewalAt).toLocaleDateString('fr-FR')}.</p>`,
      });
      return;
    }
    case 'email.subscription_payment_failed': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, planName, creditsNeeded, currentBalance, attemptsLeft } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Renouvellement abonnement ${planName} échoué`,
        html: `<p>Le renouvellement de votre abonnement <strong>${planName}</strong> a échoué (solde : ${currentBalance} crédits, requis : ${creditsNeeded} crédits). ${attemptsLeft} tentative(s) restante(s) avant suspension. Rechargez vos crédits pour maintenir l'accès.</p>`,
      });
      return;
    }
    case 'email.subscription_suspended': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, planName, creditsNeeded, currentBalance } = event.payload;
      await deps.emailQueue.enqueue({
        to,
        subject: `Abonnement ${planName} suspendu`,
        html: `<p>Votre abonnement <strong>${planName}</strong> a été suspendu après 3 tentatives de renouvellement échouées (solde : ${currentBalance} crédits, requis : ${creditsNeeded} crédits). Rechargez vos crédits pour réactiver l'accès.</p>`,
      });
      return;
    }
    case 'email.contact_feedback': {
      if (!deps.emailQueue) throw new Error('email queue not configured');
      const { to, fromEmail, fromName, category, title, body, page, feedbackId } = event.payload;
      const { htmlEscape } = await import('../auth/email-templates');
      await deps.emailQueue.enqueue({
        to,
        subject: `[EnviroTrack] Nouveau message — ${htmlEscape(title)}`,
        html: `<p><strong>De :</strong> ${htmlEscape(fromName)} &lt;${htmlEscape(fromEmail)}&gt;<br><strong>Catégorie :</strong> ${htmlEscape(category)}<br><strong>Page :</strong> ${page ? htmlEscape(page) : '—'}<br><strong>Réf. :</strong> ${htmlEscape(feedbackId)}</p><hr><p>${htmlEscape(body).replace(/\n/g, '<br>')}</p>`,
      });
      return;
    }
    default: {
      // Exhaustive check — TS will yell if we add a new variant and forget it.
      const _exhaustive: never = event;
      void _exhaustive;
      throw new Error(`outbox: unknown event kind`);
    }
  }
}
