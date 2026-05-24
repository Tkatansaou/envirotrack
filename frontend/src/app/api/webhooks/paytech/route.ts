// POST /api/webhooks/paytech — IPN form-encoded + SHA256-keys / HMAC + crédit.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { prisma } from '@/lib/server/prisma';
import { createPaytechProvider } from '@/lib/server/payments/paytech';
import { creditUser } from '@/lib/server/credits';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

function getPaytechWebhookProvider() {
  const apiKey = process.env.PAYTECH_API_KEY ?? '';
  const apiSecret = process.env.PAYTECH_API_SECRET ?? '';
  const ipnUrl = process.env.PAYTECH_IPN_URL ?? '';
  if (!apiKey || !apiSecret) throw new Error('PAYTECH_API_KEY / PAYTECH_API_SECRET not configured');
  return createPaytechProvider({
    PAYTECH_API_KEY: apiKey,
    PAYTECH_API_SECRET: apiSecret,
    PAYTECH_IPN_URL: ipnUrl,
  }).webhookProvider;
}

const handler = createWebhookHandler({
  prisma,
  get provider() {
    return getPaytechWebhookProvider();
  },

  async onPaid(payload, tx) {
    // payload.ref_command = notre Order.id (externalRef passé à la charge)
    const ipn = payload as { ref_command?: string; token?: string };
    const orderId = ipn.ref_command;
    if (!orderId) return {};

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });
    if (!order?.userId || order.status === 'PAID') return {};

    // Mettre à jour le providerChargeId avec le token PayTech
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(ipn.token ? { providerChargeId: ipn.token } : {}),
      },
    });

    const creditOrder = await tx.creditOrder.findFirst({
      where: { orderId, status: 'PENDING' },
      include: { pack: { select: { credits: true, name: true } } },
    });
    if (!creditOrder) {
      log.warn('[webhook:paytech] onPaid: CreditOrder not found', { orderId });
      return {};
    }

    await creditUser(
      tx,
      order.userId,
      creditOrder.pack.credits,
      'PACK_PURCHASE',
      creditOrder.id,
      `Pack ${creditOrder.pack.name} — ${creditOrder.pack.credits} crédits`,
    );

    await tx.creditOrder.update({ where: { id: creditOrder.id }, data: { status: 'PAID' } });
    return {};
  },

  async onFailed(payload, tx) {
    const ipn = payload as { ref_command?: string };
    const orderId = ipn.ref_command;
    if (!orderId) return {};

    await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    await tx.creditOrder.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    return {};
  },
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handler(req);
}
