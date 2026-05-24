export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { enqueueOutbox } from '@/lib/server/outbox';

async function assertMember(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (!project.orgId) return null;
  const m = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: project.orgId, userId } },
  });
  return m ? project : null;
}

// GET /api/projects/[id]/non-conformities
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

    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const gravity = req.nextUrl.searchParams.get('gravity') ?? undefined;

    const ncs = await prisma.nonConformity.findMany({
      where: {
        projectId: id,
        ...(status ? { status } : {}),
        ...(gravity ? { gravity } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        measure: { select: { code: true, title: true, phase: true } },
      },
    });

    return NextResponse.json(ncs, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}

const CreateBody = z.object({
  measureId: z.string().optional(),
  year: z.number().int().min(2000).max(2100),
  quarter: z.number().int().min(1).max(4),
  description: z.string().min(10).max(3000),
  gravity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).default('MAJOR'),
  recommendation: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  photos: z.array(z.string()).max(10).default([]),
});

// POST /api/projects/[id]/non-conformities
export async function POST(
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

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const d = parsed.data;
    const measureId: string | null = d.measureId !== undefined ? d.measureId : null;
    const recommendation: string | null = d.recommendation !== undefined ? d.recommendation : null;
    const dueDateVal: Date | null = d.dueDate !== undefined ? new Date(d.dueDate) : null;

    const nc = await prisma.$transaction(async (tx) => {
      const created = await tx.nonConformity.create({
        data: {
          projectId: id,
          createdBy: auth.user.sub,
          status: 'OPEN',
          year: d.year,
          quarter: d.quarter,
          description: d.description,
          gravity: d.gravity,
          photos: d.photos,
          measureId,
          recommendation,
          dueDate: dueDateVal,
        },
      });

      await enqueueOutbox(tx, {
        kind: 'notification.non_conformity_open',
        payload: {
          userId: auth.user.sub,
          projectId: id,
          projectName: (project as { name: string }).name,
          nonConformityId: created.id,
          gravity: d.gravity,
        },
      });

      return created;
    });

    return NextResponse.json(nc, {
      status: 201,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
