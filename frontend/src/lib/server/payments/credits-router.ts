/**
 * Multi-provider router pour les achats de crédits EnviroTrack.
 *
 * Routing :
 *   paymentMethod = "MOBILE_MONEY"
 *     → Bictorys (principal, UEMOA)
 *     → Moneroo  (fallback si BICTORYS_* absent ou circuit ouvert)
 *   paymentMethod = "CARD"
 *     → PayTech (cartes Visa/Mastercard en FCFA)
 *
 * Chaque provider est lazy-initialized (env manquant → UnconfiguredError, pas crash).
 */
import 'server-only';
import { createBictorysProvider } from '@/lib/server/payments/bictorys';
import { createMonerooProvider } from '@/lib/server/payments/moneroo';
import { createPaytechProvider } from '@/lib/server/payments/paytech';
import type { PaymentProvider } from '@/lib/server/payments/provider';
import type { WebhookProvider } from '@/lib/server/webhook/handler';

export type CreditPaymentMethod = 'MOBILE_MONEY' | 'CARD';

export class CreditProviderUnconfiguredError extends Error {
  constructor(method: CreditPaymentMethod) {
    super(`No payment provider configured for method: ${method}`);
    this.name = 'CreditProviderUnconfiguredError';
  }
}

export interface CreditProviderBundle {
  provider: PaymentProvider;
  webhookProvider: WebhookProvider<unknown>;
}

// ─── Lazy singletons ──────────────────────────────────────────────────────

let _bictorys: CreditProviderBundle | null = null;
let _moneroo: CreditProviderBundle | null = null;
let _paytech: CreditProviderBundle | null = null;

function getBictorys(): CreditProviderBundle | null {
  if (_bictorys) return _bictorys;
  const url = process.env.BICTORYS_API_URL ?? '';
  const key = process.env.BICTORYS_API_KEY ?? '';
  const secret = process.env.BICTORYS_WEBHOOK_SECRET ?? '';
  if (!url || !key || !secret) return null;
  const handle = createBictorysProvider({
    BICTORYS_API_URL: url,
    BICTORYS_API_KEY: key,
    BICTORYS_WEBHOOK_SECRET: secret,
  });
  _bictorys = { provider: handle, webhookProvider: handle.webhookProvider };
  return _bictorys;
}

function getMoneroo(): CreditProviderBundle | null {
  if (_moneroo) return _moneroo;
  const key = process.env.MONEROO_SECRET_KEY ?? '';
  if (!key) return null;
  const handle = createMonerooProvider({
    MONEROO_SECRET_KEY: key,
    MONEROO_WEBHOOK_SECRET: process.env.MONEROO_WEBHOOK_SECRET,
  });
  _moneroo = { provider: handle.provider, webhookProvider: handle.webhookProvider };
  return _moneroo;
}

function getPaytech(): CreditProviderBundle | null {
  if (_paytech) return _paytech;
  const apiKey = process.env.PAYTECH_API_KEY ?? '';
  const apiSecret = process.env.PAYTECH_API_SECRET ?? '';
  const ipnUrl = process.env.PAYTECH_IPN_URL ?? '';
  if (!apiKey || !apiSecret || !ipnUrl) return null;
  const handle = createPaytechProvider({
    PAYTECH_API_KEY: apiKey,
    PAYTECH_API_SECRET: apiSecret,
    PAYTECH_IPN_URL: ipnUrl,
  });
  _paytech = { provider: handle.provider, webhookProvider: handle.webhookProvider };
  return _paytech;
}

/**
 * Résout le provider selon la méthode choisie.
 * MOBILE_MONEY : Moneroo (principal) → Bictorys (fallback si Moneroo absent).
 * CARD         : PayTech.
 * Lève CreditProviderUnconfiguredError si aucun provider n'est configuré.
 */
export function getCreditProvider(method: CreditPaymentMethod): CreditProviderBundle {
  if (method === 'MOBILE_MONEY') {
    const m = getMoneroo();
    if (m) return m;
    const b = getBictorys();
    if (b) return b;
    throw new CreditProviderUnconfiguredError('MOBILE_MONEY');
  }
  // CARD
  const p = getPaytech();
  if (p) return p;
  throw new CreditProviderUnconfiguredError('CARD');
}

/** Test-only reset — never call from application code. */
export function __resetCreditProviderSingletons(): void {
  _bictorys = null;
  _moneroo = null;
  _paytech = null;
}
