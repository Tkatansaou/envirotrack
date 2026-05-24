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
  return m ? { project, membership: m } : null;
}

const PutBody = z.object({
  year: z.number().int().min(2000).max(2100),
  quarter: z.number().int().min(1).max(4),
  status: z.enum(['RESPECTED', 'PARTIALLY', 'NOT_RESPECTED', 'NOT_EVALUATED']),
  comment: z.string().max(2000).optional(),
});

// PUT /api/projects/[id]/pges/[measureId]/status — upsert quarterly evaluation
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; measureId: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, measureId } = await params;
    const resolved = await assertMember(id, auth.user.sub);
    if (!resolved) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const measure = await prisma.pGESMeasure.findUnique({ where: { id: measureId } });
    if (!measure || measure.projectId !== id) {
      return NextResponse.json({ error: 'Measure not found' }, { status: 404 });
    }

    const parsed = PutBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { year, quarter, status } = parsed.data;
    const commentVal: string | null =
      parsed.data.comment !== undefined ? parsed.data.comment : null;

    const qs = await prisma.pGESQuarterlyStatus.upsert({
      where: { measureId_year_quarter: { measureId, year, quarter } },
      create: {
        measureId,
        year,
        quarter,
        status,
        comment: commentVal,
        evaluatedBy: auth.user.sub,
        evaluatedAt: new Date(),
      },
      update: {
        status,
        comment: commentVal,
        evaluatedBy: auth.user.sub,
        evaluatedAt: new Date(),
      },
    });

    // If a non-conformity is implied (NOT_RESPECTED), enqueue a notification
    if (status === 'NOT_RESPECTED') {
      await prisma.$transaction(async (tx) => {
        const nc = await tx.nonConformity.create({
          data: {
            projectId: id,
            measureId,
            year,
            quarter,
            description: `Non-conformité détectée : mesure "${measure.title}" (${measure.code}) non respectée en T${quarter}/${year}.`,
            gravity: 'MAJOR',
            status: 'OPEN',
            createdBy: auth.user.sub,
          },
        });

        await enqueueOutbox(tx, {
          kind: 'notification.non_conformity_open',
          payload: {
            userId: auth.user.sub,
            projectId: id,
            projectName: resolved.project.name,
            nonConformityId: nc.id,
            gravity: 'MAJOR',
          },
        });
      });
    }

    return NextResponse.json(qs, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
