// GET  /api/admin/feedback — liste paginée (ADMIN+)
// PATCH /api/admin/feedback — mettre à jour status + adminNote
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const url = req.nextUrl;
    const status = url.searchParams.get('status') ?? '';
    const category = url.searchParams.get('category') ?? '';
    const take = Math.min(Number(url.searchParams.get('limit') ?? '20'), 50);
    const cursor = url.searchParams.get('cursor');

    const items = await prisma.feedback.findMany({
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        rating: true,
        title: true,
        body: true,
        page: true,
        status: true,
        adminNote: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
      },
    });

    const hasMore = items.length > take;
    if (hasMore) items.pop();

    return NextResponse.json(
      { items, nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const PatchBody = z.object({
  id: z.string().min(1),
  status: z.enum(['NEW', 'REVIEWED', 'IN_PROGRESS', 'DONE', 'WONT_FIX']).optional(),
  adminNote: z.string().max(1000).optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { id, status, adminNote } = parsed.data;
    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(adminNote !== undefined ? { adminNote } : {}),
      },
      select: { id: true, status: true, adminNote: true },
    });

    return NextResponse.json(updated, { headers: { 'x-request-id': ctx.requestId } });
  });
}
