// POST /api/webhooks/moneroo — récepteur HMAC + idempotence + crédit au compte.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { createWebhookHandler } from '@/lib/server/webhook/handler';
import { prisma } from '@/lib/server/prisma';
import { createMonerooProvider } from '@/lib/server/payments/moneroo';
import { creditUser } from '@/lib/server/credits';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

function getMonerooWebhookProvider() {
  const key = process.env.MONEROO_SECRET_KEY ?? '';
  if (!key) throw new Error('MONEROO_SECRET_KEY not configured');
  return createMonerooProvider({
    MONEROO_SECRET_KEY: key,
    MONEROO_WEBHOOK_SECRET: process.env.MONEROO_WEBHOOK_SECRET,
  }).webhookProvider;
}

const handler = createWebhookHandler({
  prisma,
  get provider() {
    return getMonerooWebhookProvider();
  },

  async onPaid(payload, tx) {
    const raw = payload as { data?: { id?: string; reference?: string } };
    const providerChargeId = raw.data?.id;
    if (!providerChargeId) return {};

    // Retrouver l'Order via providerChargeId
    const order = await tx.order.findFirst({
      where: { providerChargeId, provider: 'moneroo' },
      select: { id: true, userId: true },
    });
    if (!order?.userId) {
      log.warn('[webhook:moneroo] onPaid: order not found', { providerChargeId });
      return {};
    }

    // Retrouver la CreditOrder liée
    const creditOrder = await tx.creditOrder.findFirst({
      where: { orderId: order.id, status: 'PENDING' },
      include: { pack: { select: { credits: true, name: true } } },
    });
    if (!creditOrder) {
      log.warn('[webhook:moneroo] onPaid: CreditOrder not found or already processed', {
        orderId: order.id,
      });
      return {};
    }

    // Marquer Order PAID
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    // Créditer l'utilisateur
    await creditUser(
      tx,
      order.userId,
      creditOrder.pack.credits,
      'PACK_PURCHASE',
      creditOrder.id,
      `Pack ${creditOrder.pack.name} — ${creditOrder.pack.credits} crédits`,
    );

    // Marquer CreditOrder PAID
    await tx.creditOrder.update({ where: { id: creditOrder.id }, data: { status: 'PAID' } });

    return {};
  },

  async onFailed(payload, tx) {
    const raw = payload as { data?: { id?: string } };
    const providerChargeId = raw.data?.id;
    if (!providerChargeId) return {};

    const order = await tx.order.findFirst({
      where: { providerChargeId, provider: 'moneroo' },
      select: { id: true },
    });
    if (!order) return {};

    await tx.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    await tx.creditOrder.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
    return {};
  },
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handler(req);
}
