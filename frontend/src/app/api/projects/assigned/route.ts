export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

// GET /api/projects/assigned — liste les projets auxquels l'utilisateur est assigné
// comme agent de suivi terrain (via ProjectAssignment).
// Endpoint pensé pour le tableau de bord "suivi terrain" :
// les agents n'ont pas d'orgId ni d'ExpertProfile — ils accèdent à leurs projets ici.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const assignments = await prisma.projectAssignment.findMany({
      where: { userId: auth.user.sub },
      orderBy: { createdAt: 'desc' },
      select: {
        role: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            type: true,
            region: true,
            prefecture: true,
            maitreOuvrage: true,
            status: true,
            updatedAt: true,
            _count: {
              select: { pgesMeasures: true, fieldEntries: true },
            },
          },
        },
      },
    });

    const projects = assignments.map(({ role, project }) => ({ ...project, assignmentRole: role }));

    return NextResponse.json(projects, { status: 200, headers: { 'x-request-id': ctx.requestId } });
  });
}
