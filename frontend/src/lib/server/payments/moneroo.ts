/**
 * Moneroo payment provider — implements PaymentProvider + WebhookProvider.
 * Mobile money (Wave, Orange Money, Free Money, MTN…) UEMOA + XAF.
 * API docs: https://docs.moneroo.io/
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider, ChargeInput, ChargeResult } from '@/lib/server/payments/provider';
import type { WebhookProvider, ParsedIds } from '@/lib/server/webhook/handler';

const MONEROO_API_URL = 'https://api.moneroo.io';
const FETCH_TIMEOUT_MS = 15_000;

// ─── Config ───────────────────────────────────────────────────────────────

export interface MonerooConfig {
  MONEROO_SECRET_KEY: string;
  MONEROO_WEBHOOK_SECRET?: string | undefined;
}

// ─── Internal fetch ───────────────────────────────────────────────────────

async function monerooFetch(path: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${MONEROO_API_URL}${path}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function splitName(
  full: string | undefined,
  fallbackEmail: string,
): { first: string; last: string } {
  const v = (full ?? '').trim();
  if (!v) {
    const local = fallbackEmail.split('@')[0] ?? 'Customer';
    return { first: local, last: '-' };
  }
  const parts = v.split(/\s+/);
  return { first: parts[0]!, last: parts.slice(1).join(' ') || '-' };
}

// ─── Webhook payload shape ────────────────────────────────────────────────

interface MonerooWebhookPayload {
  event?: string;
  data?: {
    id?: string;
    status?: string;
    amount?: number | string;
    currency?: string | { code?: string };
    reference?: string;
  };
}

function parseMonerooEvent(raw: unknown): {
  id: string;
  kind: 'paid' | 'refunded' | 'failed' | 'other';
} | null {
  const b = raw as MonerooWebhookPayload | null;
  if (!b?.event || !b.data?.id) return null;
  const id = b.data.id;
  if (b.event === 'payment.success') return { id, kind: 'paid' };
  if (b.event === 'payment.failed' || b.event === 'payment.cancelled')
    return { id, kind: 'failed' };
  if (b.event === 'payment.refunded') return { id, kind: 'refunded' };
  return { id, kind: 'other' };
}

// ─── Factory ──────────────────────────────────────────────────────────────

export interface MonerooProviderHandle {
  provider: PaymentProvider & { name: 'moneroo' };
  webhookProvider: WebhookProvider<unknown>;
}

export function createMonerooProvider(cfg: MonerooConfig): MonerooProviderHandle {
  const provider: PaymentProvider & { name: 'moneroo' } = {
    name: 'moneroo',

    async charge(input: ChargeInput): Promise<ChargeResult> {
      const { first, last } = splitName(input.customer.name, input.customer.email ?? '');

      const body: Record<string, unknown> = {
        amount: input.amount,
        currency: input.currency,
        description: `Recharge crédits EnviroTrack — réf. ${input.externalRef}`,
        return_url: input.successUrl,
        customer: {
          email: input.customer.email,
          first_name: first,
          last_name: last,
          ...(input.customer.phone ? { phone: input.customer.phone } : {}),
        },
        metadata: {
          externalRef: input.externalRef,
          ...(input.metadata
            ? Object.fromEntries(Object.entries(input.metadata).map(([k, v]) => [k, String(v)]))
            : {}),
        },
      };

      const res = await monerooFetch('/v1/payments/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.MONEROO_SECRET_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const parsed = (await res.json().catch(() => null)) as {
        data?: { id?: string; checkout_url?: string };
        message?: string;
      } | null;

      if (!res.ok || !parsed?.data?.id || !parsed.data.checkout_url) {
        throw new Error(parsed?.message ?? `Moneroo charge failed (HTTP ${res.status})`);
      }

      return {
        providerChargeId: parsed.data.id,
        paymentUrl: parsed.data.checkout_url,
        status: 'PENDING',
      };
    },
  };

  const webhookProvider: WebhookProvider<unknown> = {
    name: 'moneroo',

    verifySignature(rawBody: Buffer, headers: Record<string, string>) {
      const secret = cfg.MONEROO_WEBHOOK_SECRET;
      if (!secret) {
        // No secret configured — accept but warn (dev mode).
        return { valid: true };
      }
      const signature = headers['x-moneroo-signature'] ?? '';
      if (!signature) return { valid: false, reason: 'Missing X-Moneroo-Signature' };

      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { valid: false, reason: 'Signature mismatch' };
      }
      return { valid: true };
    },

    parsePayload(rawBody: Buffer): unknown {
      return JSON.parse(rawBody.toString('utf-8')) as unknown;
    },

    extractIds(payload: unknown): ParsedIds {
      const evt = parseMonerooEvent(payload);
      if (!evt) {
        return { externalId: `moneroo-unknown-${Date.now()}`, eventType: 'unknown', kind: 'other' };
      }
      return {
        externalId: evt.id,
        eventType: (payload as MonerooWebhookPayload).event ?? 'unknown',
        kind: evt.kind,
      };
    },
  };

  return { provider, webhookProvider };
}
