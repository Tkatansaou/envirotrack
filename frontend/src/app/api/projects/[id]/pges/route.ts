export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
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

// GET /api/projects/[id]/pges
// Returns all PGES measures with their quarterly statuses.
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

    const phase = req.nextUrl.searchParams.get('phase') ?? undefined;
    const composante = req.nextUrl.searchParams.get('composante') ?? undefined;

    const measures = await prisma.pGESMeasure.findMany({
      where: {
        projectId: id,
        ...(phase ? { phase } : {}),
        ...(composante ? { composante } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        quarterlyStatuses: {
          orderBy: [{ year: 'asc' }, { quarter: 'asc' }],
        },
      },
    });

    // Compliance summary
    const totalStatuses = measures.flatMap((m) => m.quarterlyStatuses);
    const summary = {
      total: totalStatuses.length,
      respected: totalStatuses.filter((s) => s.status === 'RESPECTED').length,
      partially: totalStatuses.filter((s) => s.status === 'PARTIALLY').length,
      notRespected: totalStatuses.filter((s) => s.status === 'NOT_RESPECTED').length,
      notEvaluated: totalStatuses.filter((s) => s.status === 'NOT_EVALUATED').length,
    };

    return NextResponse.json(
      { measures, summary },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
