export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

async function assertMember(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (!project.orgId) return null;
  const m = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: project.orgId, userId } },
  });
  return m ? project : null;
}

// GET /api/projects/[id]/checklist
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const project = await assertMember(id, auth.user.sub);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const category = req.nextUrl.searchParams.get('category') ?? undefined;

    const items = await prisma.checklistItem.findMany({
      where: { projectId: id, ...(category ? { category } : {}) },
      orderBy: { sortOrder: 'asc' },
    });

    // Aggregate compliance stats
    const stats = items.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json(
      { items, stats },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const PatchBody = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        status: z.enum(['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE']),
        note: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(50),
});

// PATCH /api/projects/[id]/checklist — bulk update item statuses
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const project = await assertMember(id, auth.user.sub);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    await prisma.$transaction(
      parsed.data.items.map(({ id: itemId, status, note }) =>
        prisma.checklistItem.updateMany({
          where: { id: itemId, projectId: id },
          data: { status, ...(note !== undefined ? { note } : {}) },
        }),
      ),
    );

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: { 'x-request-id': ctx.requestId },
      },
    );
  });
}
