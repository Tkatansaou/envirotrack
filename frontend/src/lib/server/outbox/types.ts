/**
 * Outbox event types. Add new variants here, then handle them in
 * backend/src/lib/outbox/dispatcher.ts.
 *
 * `kind` is a dotted "domain.event" string. The dispatcher looks up the
 * handler by exact match — no inheritance, no fallback dispatching.
 *
 * Each variant carries its own `payload` shape; runtime validation
 * happens in the dispatcher (the JSON column is opaque to Prisma).
 */

export type OutboxEvent =
  | NotificationPaymentReceivedEvent
  | EmailPaymentConfirmationEvent
  | EmailVerificationCodeEvent
  | EmailPasswordResetEvent
  // EnviroTrack events
  | NotificationProjectActivatedEvent
  | EmailProjectActivatedEvent
  | NotificationPGESReminderEvent
  | EmailPGESReminderEvent
  | NotificationNonConformityOpenEvent
  // Subscription events
  | EmailSubscriptionStartedEvent
  | EmailSubscriptionRenewedEvent
  | EmailSubscriptionCancellationScheduledEvent
  | EmailSubscriptionReactivatedEvent
  | EmailSubscriptionPaymentFailedEvent
  | EmailSubscriptionSuspendedEvent
  // Admin notifications
  | EmailContactFeedbackEvent;

export interface NotificationPaymentReceivedEvent {
  kind: 'notification.payment_received';
  payload: {
    userId: string;
    orderId: string;
    amount: number;
    currency: string;
  };
}

export interface EmailPaymentConfirmationEvent {
  kind: 'email.payment_confirmation';
  payload: {
    to: string;
    orderId: string;
    amount: number;
    currency: string;
  };
}

/**
 * Phase 1 — emitted by signup + resend-verification routes; consumed by the
 * email-queue cron in Phase 5 (which calls verificationEmail() to render).
 */
export interface EmailVerificationCodeEvent {
  kind: 'email.verification_code';
  payload: {
    to: string;
    code: string;
    expiresAt: string;
  };
}

/**
 * Phase 1 — emitted by forgot-password route; consumed by the email-queue cron
 * in Phase 5 (which calls resetPasswordEmail() to render).
 */
export interface EmailPasswordResetEvent {
  kind: 'email.password_reset';
  payload: {
    to: string;
    code: string;
    expiresAt: string;
  };
}

// --- EnviroTrack domain events ---

export interface NotificationProjectActivatedEvent {
  kind: 'notification.project_activated';
  payload: {
    userId: string;
    projectId: string;
    projectName: string;
  };
}

export interface EmailProjectActivatedEvent {
  kind: 'email.project_activated';
  payload: {
    to: string;
    projectId: string;
    projectName: string;
    projectType: string;
  };
}

/** Emitted by the PGES quarterly reminder cron, one per project in PGES_TRACKING status */
export interface NotificationPGESReminderEvent {
  kind: 'notification.pges_reminder';
  payload: {
    userId: string;
    projectId: string;
    projectName: string;
    year: number;
    quarter: number;
  };
}

export interface EmailPGESReminderEvent {
  kind: 'email.pges_reminder';
  payload: {
    to: string;
    projectId: string;
    projectName: string;
    year: number;
    quarter: number;
  };
}

export interface NotificationNonConformityOpenEvent {
  kind: 'notification.non_conformity_open';
  payload: {
    userId: string;
    projectId: string;
    projectName: string;
    nonConformityId: string;
    gravity: string;
  };
}

// --- Subscription events ---

export interface EmailSubscriptionStartedEvent {
  kind: 'email.subscription_started';
  payload: {
    to: string;
    planName: string;
    cycle: string;
    creditsDeducted: number;
    newBalance: number;
    periodEnd: string;
  };
}

export interface EmailSubscriptionRenewedEvent {
  kind: 'email.subscription_renewed';
  payload: {
    to: string;
    planName: string;
    creditsDeducted: number;
    newBalance: number;
    nextRenewalAt: string;
  };
}

export interface EmailSubscriptionCancellationScheduledEvent {
  kind: 'email.subscription_cancellation_scheduled';
  payload: {
    to: string;
    planName: string;
    accessUntil: string;
  };
}

export interface EmailSubscriptionReactivatedEvent {
  kind: 'email.subscription_reactivated';
  payload: {
    to: string;
    planName: string;
    nextRenewalAt: string;
  };
}

export interface EmailSubscriptionPaymentFailedEvent {
  kind: 'email.subscription_payment_failed';
  payload: {
    to: string;
    planName: string;
    creditsNeeded: number;
    currentBalance: number;
    attemptsLeft: number;
    retryAt: string | null;
  };
}

export interface EmailSubscriptionSuspendedEvent {
  kind: 'email.subscription_suspended';
  payload: {
    to: string;
    planName: string;
    creditsNeeded: number;
    currentBalance: number;
    attemptsLeft: number;
    retryAt: string | null;
  };
}

export interface EmailContactFeedbackEvent {
  kind: 'email.contact_feedback';
  payload: {
    /** Destination — ADMIN_CONTACT_EMAIL env var (e.g. contact@envirotrack.uk) */
    to: string;
    fromEmail: string;
    fromName: string;
    category: string;
    title: string;
    body: string;
    page?: string;
    feedbackId: string;
  };
}

export type OutboxEventKind = OutboxEvent['kind'];
