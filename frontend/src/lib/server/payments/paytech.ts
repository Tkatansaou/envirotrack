/**
 * PayTech payment provider — implements PaymentProvider + WebhookProvider.
 * Cartes bancaires (Visa/Mastercard) + mobile money en FCFA (SN, CI, ML, BJ).
 * IPN livré en application/x-www-form-urlencoded — le handler gère les deux.
 * API docs: https://docs.intech.sn/doc_paytech.php
 */
import 'server-only';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider, ChargeInput, ChargeResult } from '@/lib/server/payments/provider';
import type { WebhookProvider, ParsedIds } from '@/lib/server/webhook/handler';

const PAYTECH_API_URL = 'https://paytech.sn/api';
const FETCH_TIMEOUT_MS = 15_000;

// ─── Config ───────────────────────────────────────────────────────────────

export interface PaytechConfig {
  PAYTECH_API_KEY: string;
  PAYTECH_API_SECRET: string;
  /** IPN public URL — MUST be HTTPS, no localhost. */
  PAYTECH_IPN_URL: string;
}

// ─── Internal fetch ───────────────────────────────────────────────────────

async function paytechFetch(path: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${PAYTECH_API_URL}${path}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── IPN payload shape ────────────────────────────────────────────────────

interface PaytechIPNPayload {
  type_event: 'sale_complete' | 'sale_canceled' | 'refund_complete' | string;
  ref_command: string;
  token: string;
  item_price: string | number;
  currency: string;
  payment_method?: string;
  custom_field?: string;
  api_key_sha256: string;
  api_secret_sha256: string;
  hmac_compute?: string;
}

function parsePaytechBody(rawBody: Buffer): PaytechIPNPayload {
  const ct = 'application/x-www-form-urlencoded';
  // Try form-encoded first (PayTech standard).
  const text = rawBody.toString('utf-8');
  try {
    const params = new URLSearchParams(text);
    if (params.has('type_event') && params.has('token')) {
      return Object.fromEntries(params.entries()) as unknown as PaytechIPNPayload;
    }
  } catch {
    void ct;
  }
  // Fallback: JSON
  return JSON.parse(text) as PaytechIPNPayload;
}

function verifyPaytechIPN(payload: PaytechIPNPayload, apiKey: string, apiSecret: string): boolean {
  // Method 1 — HMAC-SHA256 (preferred)
  if (payload.hmac_compute) {
    const message = `${payload.item_price}|${payload.ref_command}|${apiKey}`;
    const expected = createHmac('sha256', apiSecret).update(message).digest('hex');
    const a = Buffer.from(payload.hmac_compute);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
    // HMAC failed — fall through to SHA256-of-keys (don't short-circuit)
  }
  // Method 2 — SHA256-of-keys (always present)
  const expectedKeyHash = createHash('sha256').update(apiKey).digest('hex');
  const expectedSecretHash = createHash('sha256').update(apiSecret).digest('hex');
  const aK = Buffer.from(payload.api_key_sha256 ?? '');
  const bK = Buffer.from(expectedKeyHash);
  const aS = Buffer.from(payload.api_secret_sha256 ?? '');
  const bS = Buffer.from(expectedSecretHash);
  return (
    aK.length === bK.length &&
    timingSafeEqual(aK, bK) &&
    aS.length === bS.length &&
    timingSafeEqual(aS, bS)
  );
}

// ─── Factory ──────────────────────────────────────────────────────────────

export interface PaytechProviderHandle {
  provider: PaymentProvider & { name: 'paytech' };
  webhookProvider: WebhookProvider<PaytechIPNPayload>;
}

export function createPaytechProvider(cfg: PaytechConfig): PaytechProviderHandle {
  const provider: PaymentProvider & { name: 'paytech' } = {
    name: 'paytech',

    async charge(input: ChargeInput): Promise<ChargeResult> {
      const env = process.env.NODE_ENV === 'production' ? 'prod' : 'test';

      const body: Record<string, unknown> = {
        item_name: `Recharge crédits EnviroTrack`,
        item_price: input.amount,
        currency: input.currency,
        ref_command: input.externalRef,
        command_name: `Recharge crédits EnviroTrack — réf. ${input.externalRef}`.slice(0, 200),
        env,
        ipn_url: cfg.PAYTECH_IPN_URL,
        success_url: input.successUrl,
        cancel_url: input.failureUrl,
        custom_field: JSON.stringify({
          externalRef: input.externalRef,
          ...(input.customer.email ? { customer_email: input.customer.email } : {}),
          ...(input.customer.name ? { customer_name: input.customer.name } : {}),
          ...(input.customer.phone ? { customer_phone: input.customer.phone } : {}),
          ...(input.metadata
            ? Object.fromEntries(
                Object.entries(input.metadata)
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => [k, String(v)]),
              )
            : {}),
        }),
      };

      const res = await paytechFetch('/payment/request-payment', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          API_KEY: cfg.PAYTECH_API_KEY,
          API_SECRET: cfg.PAYTECH_API_SECRET,
        },
        body: JSON.stringify(body),
      });

      const parsed = (await res.json().catch(() => null)) as {
        success?: number;
        token?: string;
        redirect_url?: string;
        redirectUrl?: string;
        message?: string;
      } | null;

      if (parsed?.success !== 1 || !parsed.token) {
        throw new Error(parsed?.message ?? `PayTech charge failed (HTTP ${res.status})`);
      }

      const checkoutUrl = parsed.redirect_url ?? parsed.redirectUrl;
      if (!checkoutUrl) throw new Error('PayTech response missing redirect_url');

      return {
        providerChargeId: parsed.token,
        paymentUrl: checkoutUrl,
        status: 'PENDING',
      };
    },
  };

  const webhookProvider: WebhookProvider<PaytechIPNPayload> = {
    name: 'paytech',

    verifySignature(rawBody: Buffer, _headers: Record<string, string>) {
      let payload: PaytechIPNPayload;
      try {
        payload = parsePaytechBody(rawBody);
      } catch {
        return { valid: false, reason: 'Unparseable IPN body' };
      }
      const ok = verifyPaytechIPN(payload, cfg.PAYTECH_API_KEY, cfg.PAYTECH_API_SECRET);
      return ok ? { valid: true } : { valid: false, reason: 'PayTech IPN signature invalid' };
    },

    parsePayload(rawBody: Buffer): PaytechIPNPayload {
      return parsePaytechBody(rawBody);
    },

    extractIds(payload: PaytechIPNPayload): ParsedIds {
      const token = payload.token ?? `paytech-unknown-${Date.now()}`;
      let kind: ParsedIds['kind'] = 'other';
      if (payload.type_event === 'sale_complete') kind = 'paid';
      else if (payload.type_event === 'sale_canceled') kind = 'failed';
      else if (payload.type_event === 'refund_complete') kind = 'refunded';

      // ref_command carries our Order.id (externalRef) — used to correlate.
      // We store both token + ref_command in externalId so the webhook log
      // key is stable and unique per transaction event.
      return {
        externalId: token,
        eventType: payload.type_event,
        kind,
      };
    },
  };

  return { provider, webhookProvider };
}
