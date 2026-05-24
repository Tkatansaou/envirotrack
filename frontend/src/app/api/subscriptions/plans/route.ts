// GET /api/subscriptions/plans — liste les plans actifs
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { seedDefaultPlans } from '@/lib/server/subscriptions/renew';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    // Auto-seed plans if none exist (first boot)
    const count = await prisma.subscriptionPlan.count();
    if (count === 0) await seedDefaultPlans();

    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ plans }, { headers: { 'x-request-id': ctx.requestId } });
  });
}
