// GET /api/credits/balance — solde + 20 dernières transactions.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const [user, transactions] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: auth.user.sub },
        select: { creditBalance: true },
      }),
      prisma.creditTransaction.findMany({
        where: { userId: auth.user.sub },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          reason: true,
          description: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      { balance: user.creditBalance, transactions },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
