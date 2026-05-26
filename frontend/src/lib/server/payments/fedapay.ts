/**
 * FedaPay payment provider — implements PaymentProvider + WebhookProvider.
 * Mobile Money (Wave, Orange, Moov, MTN, Free Money) + cartes en FCFA.
 * Présent au Togo, Bénin, Côte d'Ivoire, Sénégal, Guinée.
 *
 * Charge flow (hosted redirect) :
 *   1. POST /v1/transactions            → transaction.id
 *   2. POST /v1/transactions/{id}/token → { url } checkout
 *
 * Webhook signature : x-fedapay-signature = "t={ts},v1={hmac}"
 *   HMAC-SHA256(secret, "{ts}.{rawBody}")
 *
 * L'externalRef (Order.id) est stocké dans custom_metadata.externalRef
 * pour corrélation dans le handler onPaid.
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider, ChargeInput, ChargeResult } from '@/lib/server/payments/provider';
import type { WebhookProvider, ParsedIds } from '@/lib/server/webhook/handler';

const FETCH_TIMEOUT_MS = 20_000;

// ─── Config ───────────────────────────────────────────────────────────────

export interface FedapayConfig {
  FEDAPAY_SECRET_KEY: string;
  FEDAPAY_WEBHOOK_SECRET?: string | undefined;
}

function baseUrl(key: string): string {
  return key.startsWith('sk_sandbox')
    ? 'https://sandbox-api.fedapay.com/v1'
    : 'https://api.fedapay.com/v1';
}

// ─── Internal fetch ───────────────────────────────────────────────────────

async function fedapayFetch(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
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

interface FedapayWebhookPayload {
  id?: number;
  entity?: string;
  object?: {
    id?: number;
    reference?: string;
    amount?: number;
    status?: string;
    description?: string;
    custom_metadata?: Record<string, unknown>;
  };
}

function classifyFedapayStatus(
  status: string | undefined,
): 'paid' | 'failed' | 'refunded' | 'other' {
  const s = (status ?? '').toLowerCase();
  if (s === 'approved') return 'paid';
  if (s === 'declined' || s === 'canceled' || s === 'cancelled') return 'failed';
  if (s === 'refunded') return 'refunded';
  return 'other';
}

// ─── Factory ──────────────────────────────────────────────────────────────

export interface FedapayProviderHandle {
  provider: PaymentProvider & { name: 'fedapay' };
  webhookProvider: WebhookProvider<FedapayWebhookPayload>;
}

export function createFedapayProvider(cfg: FedapayConfig): FedapayProviderHandle {
  const api = baseUrl(cfg.FEDAPAY_SECRET_KEY);
  const authHeaders = {
    Authorization: `Bearer ${cfg.FEDAPAY_SECRET_KEY}`,
    'Content-Type': 'application/json',
    'X-Version': '1',
  };

  const provider: PaymentProvider & { name: 'fedapay' } = {
    name: 'fedapay',

    async charge(input: ChargeInput): Promise<ChargeResult> {
      const { first, last } = splitName(input.customer.name, input.customer.email ?? '');

      // Step 1 — créer la transaction
      const res1 = await fedapayFetch(`${api}/transactions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          amount: input.amount,
          description: `Crédits EnviroTrack — réf. ${input.externalRef}`,
          currency: { iso: input.currency ?? 'XOF' },
          callback_url: input.successUrl,
          customer: {
            email: input.customer.email,
            firstname: first,
            lastname: last,
            ...(input.customer.phone ? { phone_number: input.customer.phone } : {}),
          },
          custom_metadata: {
            externalRef: input.externalRef,
            ...(input.metadata
              ? Object.fromEntries(
                  Object.entries(input.metadata)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => [k, String(v)]),
                )
              : {}),
          },
        }),
      });

      const tx1 = (await res1.json().catch(() => null)) as {
        v1?: { transaction?: { id?: number } };
        message?: string;
      } | null;

      if (!res1.ok || !tx1?.v1?.transaction?.id) {
        throw new Error(tx1?.message ?? `FedaPay transaction create failed (HTTP ${res1.status})`);
      }

      const txId = tx1.v1.transaction.id;

      // Step 2 — obtenir le token de paiement
      const res2 = await fedapayFetch(`${api}/transactions/${txId}/token`, {
        method: 'POST',
        headers: authHeaders,
      });

      const tx2 = (await res2.json().catch(() => null)) as {
        token?: string;
        url?: string;
        message?: string;
      } | null;

      if (!res2.ok || !tx2?.url) {
        throw new Error(tx2?.message ?? `FedaPay token failed (HTTP ${res2.status})`);
      }

      return {
        providerChargeId: String(txId),
        paymentUrl: tx2.url,
        status: 'PENDING',
      };
    },
  };

  const webhookProvider: WebhookProvider<FedapayWebhookPayload> = {
    name: 'fedapay',

    verifySignature(rawBody: Buffer, headers: Record<string, string>) {
      const secret = cfg.FEDAPAY_WEBHOOK_SECRET;
      if (!secret) return { valid: true }; // dev fallback

      const sigHeader = headers['x-fedapay-signature'] ?? '';
      const parts = Object.fromEntries(
        sigHeader
          .split(',')
          .map((s) => s.split('='))
          .filter((p) => p.length === 2)
          .map(([k, v]) => [k!.trim(), v!.trim()]),
      );
      const ts = parts['t'];
      const v1 = parts['v1'];
      if (!ts || !v1) return { valid: false, reason: 'Missing x-fedapay-signature fields' };

      const expected = createHmac('sha256', secret).update(`${ts}.`).update(rawBody).digest('hex');

      const a = Buffer.from(v1);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { valid: false, reason: 'FedaPay HMAC mismatch' };
      }
      return { valid: true };
    },

    parsePayload(rawBody: Buffer): FedapayWebhookPayload {
      return JSON.parse(rawBody.toString('utf-8')) as FedapayWebhookPayload;
    },

    extractIds(payload: FedapayWebhookPayload): ParsedIds {
      const id = payload.object?.id ?? payload.id;
      const externalId = id ? String(id) : `fedapay-unknown-${Date.now()}`;
      const status = payload.object?.status;
      const kind = classifyFedapayStatus(status);
      return {
        externalId,
        eventType: payload.entity ?? status ?? 'unknown',
        kind,
      };
    },
  };

  return { provider, webhookProvider };
}
