// GET /api/credits/packs — liste les packs actifs (non authentifié).
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const packs = await prisma.creditPack.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        priceXOF: true,
        credits: true,
        bonusPct: true,
      },
    });
    return NextResponse.json({ packs }, { headers: { 'x-request-id': ctx.requestId } });
  });
}
