// POST /api/webhooks/fedapay — transaction.approved / declined / canceled + crédit utilisateur.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { prisma } from '@/lib/server/prisma';
import { createFedapayProvider } from '@/lib/server/payments/fedapay';
import { creditUser } from '@/lib/server/credits';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

function getFedapayWebhookProvider() {
  const key = process.env.FEDAPAY_SECRET_KEY ?? '';
  if (!key) throw new Error('FEDAPAY_SECRET_KEY not configured');
  return createFedapayProvider({
    FEDAPAY_SECRET_KEY: key,
    FEDAPAY_WEBHOOK_SECRET: process.env.FEDAPAY_WEBHOOK_SECRET,
  }).webhookProvider;
}

const handler = createWebhookHandler({
  prisma,
  get provider() {
    return getFedapayWebhookProvider();
  },

  async onPaid(payload, tx) {
    // externalRef = Order.id stocké dans custom_metadata.externalRef au moment du charge()
    const obj = (payload as { object?: { custom_metadata?: Record<string, unknown>; id?: number } })
      .object;
    const orderId = obj?.custom_metadata?.['externalRef'] as string | undefined;
    if (!orderId) return {};

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });
    if (!order?.userId || order.status === 'PAID') return {};

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(obj?.id ? { providerChargeId: String(obj.id) } : {}),
      },
    });

    const creditOrder = await tx.creditOrder.findFirst({
      where: { orderId, status: 'PENDING' },
      include: { pack: { select: { credits: true, name: true } } },
    });
    if (!creditOrder) {
      log.warn('[webhook:fedapay] onPaid: CreditOrder not found', { orderId });
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
    const obj = (payload as { object?: { custom_metadata?: Record<string, unknown> } }).object;
    const orderId = obj?.custom_metadata?.['externalRef'] as string | undefined;
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
