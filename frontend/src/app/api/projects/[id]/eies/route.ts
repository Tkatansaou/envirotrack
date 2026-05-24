export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { EIES_SECTIONS } from '@/lib/envirotrack/eies-sections';

// GET /api/projects/[id]/eies — summary of all 9 sections (title, status, completeness)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!project.orgId) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: project.orgId, userId: auth.user.sub } },
    });
    if (!membership) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const sections = await prisma.eIESSection.findMany({
      where: { projectId: id },
      orderBy: { sectionNumber: 'asc' },
      select: {
        id: true,
        sectionNumber: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    // Enrich with the definition metadata (article, description, field count)
    const enriched = sections.map((s) => {
      const def = EIES_SECTIONS.find((d) => d.sectionNumber === s.sectionNumber);
      return {
        ...s,
        article: def?.article,
        description: def?.description,
        fieldCount: def?.fields.length ?? 0,
      };
    });

    const completeCount = sections.filter((s) => s.status === 'COMPLETE').length;

    return NextResponse.json(
      { sections: enriched, progress: { complete: completeCount, total: sections.length } },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
