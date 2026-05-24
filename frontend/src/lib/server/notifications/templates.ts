/**
 * Notification templates.
 *
 * Each project defines its own typed wrappers around `createNotification`.
 * The example below ships with the template — adapt it, replace it, or add
 * more (e.g. `firePaymentReceived`, `fireExportReady`). The pattern:
 *
 *   1. Build a `CreateNotificationInput` with a *deterministic* dedupeKey
 *      so the unique constraint enforces at-most-once delivery for that
 *      logical event (e.g. `payment-received:${orderId}` — never include
 *      a timestamp or random suffix).
 *   2. Pass the input + your PrismaClient to `createNotification`.
 *   3. Optionally enqueue an email via `EmailQueue.enqueue` — but ONLY
 *      after the notification row is created, so a duplicate event never
 *      sends a duplicate email.
 *
 * Keep these helpers free of side effects beyond the row insert; the
 * email enqueue belongs at the call site so each project can pick the
 * right channel (no email vs. transactional vs. marketing).
 */

import type { CreateNotificationInput } from './index';

export function welcomeNotification(userId: string, email: string): CreateNotificationInput {
  return {
    userId,
    type: 'WELCOME',
    title: 'Welcome!',
    body: `Glad to have you on board, ${email}.`,
    dedupeKey: `welcome:${userId}`,
  };
}

/**
 * Example: notification dispatched after a successful payment.
 * Called from the Bictorys webhook handler's `onPaid` post-commit hook.
 */
export function paymentReceived(
  userId: string,
  orderId: string,
  amount: number,
  currency: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment received',
    body: `Order ${orderId} for ${amount} ${currency} confirmed.`,
    data: { orderId, amount, currency },
    dedupeKey: `payment-received:${orderId}`,
  };
}

// --- EnviroTrack notification templates ---

export function projectActivated(
  userId: string,
  projectId: string,
  projectName: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'PROJECT_ACTIVATED',
    title: 'Projet activé',
    body: `Votre projet "${projectName}" est maintenant actif. Vous pouvez démarrer la rédaction de l'EIES.`,
    data: { projectId, projectName },
    dedupeKey: `project-activated:${projectId}`,
  };
}

export function pgesReminder(
  userId: string,
  projectId: string,
  projectName: string,
  year: number,
  quarter: number,
): CreateNotificationInput {
  return {
    userId,
    type: 'PGES_REMINDER',
    title: `Rappel suivi PGES T${quarter}/${year}`,
    body: `Le suivi trimestriel T${quarter}/${year} du projet "${projectName}" est en attente.`,
    data: { projectId, projectName, year, quarter },
    dedupeKey: `pges-reminder:${projectId}:${year}:${quarter}`,
  };
}

export function nonConformityOpen(
  userId: string,
  projectId: string,
  projectName: string,
  nonConformityId: string,
  gravity: string,
): CreateNotificationInput {
  return {
    userId,
    type: 'NON_CONFORMITY_OPEN',
    title: 'Non-conformité détectée',
    body: `Une non-conformité de gravité ${gravity} a été ouverte sur le projet "${projectName}".`,
    data: { projectId, projectName, nonConformityId, gravity },
    dedupeKey: `nc-open:${nonConformityId}`,
  };
}
