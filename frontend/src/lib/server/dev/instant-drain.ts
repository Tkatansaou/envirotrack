/**
 * Dev-only helper: fire both outbox-drain and email-queue-drain immediately
 * after an outbox event is enqueued, so emails arrive within ~1s in local dev
 * without waiting for a cron scheduler.
 *
 * Only active when NODE_ENV === 'development'. Completely inert in production.
 * Fire-and-forget: never throws, never blocks the caller.
 */
export function triggerDevDrain(): void {
  if (process.env.NODE_ENV !== 'development') return;

  // Always use localhost in dev — APP_URL may point to ngrok/production which
  // would route the request externally instead of hitting the local process.
  const port = process.env.PORT ?? '3000';
  const base = `http://localhost:${port}`;
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret) return;

  const headers = { Authorization: `Bearer ${secret}` };

  // Schedule after current tick so the response has left the handler.
  setTimeout(() => {
    fetch(`${base}/api/cron/outbox-drain`, { method: 'POST', headers })
      .then(() => fetch(`${base}/api/cron/email-queue-drain`, { method: 'POST', headers }))
      .catch(() => {
        // Intentionally swallow — dev convenience only, must never crash the server.
      });
  }, 200);
}
