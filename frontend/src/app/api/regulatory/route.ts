export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const querySchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(['LOI', 'DECRET', 'ARRETE', 'NORME', 'GUIDE', 'RAPPORT', 'AUTRE']).optional(),
  source: z.string().max(50).optional(),
  projectType: z.enum(['ROUTE', 'BATIMENT', 'MINE', 'ENERGIE', 'AGRICULTURE', 'AUTRE']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_QUERY', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { q, type, source, projectType, limit, offset } = parsed.data;

    const where = {
      ...(type ? { type } : {}),
      ...(source ? { source } : {}),
      ...(projectType
        ? {
            OR: [{ applicableTypes: { has: projectType } }, { applicableTypes: { isEmpty: true } }],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { content: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.regulatoryText.findMany({
        where,
        select: {
          id: true,
          source: true,
          title: true,
          url: true,
          type: true,
          applicableTypes: true,
          scrapedAt: true,
          // content omitted from list — fetch individually if needed
        },
        orderBy: { scrapedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.regulatoryText.count({ where }),
    ]);

    return NextResponse.json(
      { items, total, limit, offset },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
