export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

async function resolveNC(projectId: string, ncId: string, userId: string) {
  const nc = await prisma.nonConformity.findUnique({
    where: { id: ncId },
    include: { measure: { select: { code: true, title: true } } },
  });
  if (!nc || nc.projectId !== projectId) return null;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (!project.orgId) return null;

  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: project.orgId, userId } },
  });
  if (!membership) return null;

  return nc;
}

// GET /api/projects/[id]/non-conformities/[ncId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ncId: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, ncId } = await params;
    const nc = await resolveNC(id, ncId, auth.user.sub);
    if (!nc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(nc, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}

const PatchBody = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'OVERDUE']).optional(),
  recommendation: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  photos: z.array(z.string()).max(10).optional(),
});

// PATCH /api/projects/[id]/non-conformities/[ncId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ncId: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, ncId } = await params;
    const nc = await resolveNC(id, ncId, auth.user.sub);
    if (!nc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const d = parsed.data;
    const recommendation: string | null | undefined =
      d.recommendation !== undefined ? d.recommendation : undefined;
    const photos: string[] | undefined = d.photos !== undefined ? d.photos : undefined;
    const dueDateVal: Date | null | undefined =
      d.dueDate !== undefined ? new Date(d.dueDate) : undefined;
    const resolvedAt: Date | undefined = d.status === 'RESOLVED' ? new Date() : undefined;

    const updated = await prisma.nonConformity.update({
      where: { id: ncId },
      data: {
        ...(d.status !== undefined && { status: d.status }),
        ...(recommendation !== undefined && { recommendation }),
        ...(photos !== undefined && { photos }),
        ...(dueDateVal !== undefined && { dueDate: dueDateVal }),
        ...(resolvedAt !== undefined && { resolvedAt }),
      },
    });

    return NextResponse.json(updated, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
