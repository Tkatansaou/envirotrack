export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

// GET /api/experts?disponibilite=DISPONIBLE&specialite=EAU&paysActivite=TG&page=1
// Annuaire des experts indépendants — accessible à tout utilisateur authentifié.
// Utile aux bureaux d'études qui cherchent un sous-traitant pour un projet.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const sp = req.nextUrl.searchParams;
    const disponibilite = sp.get('disponibilite') ?? undefined;
    const specialite = sp.get('specialite') ?? undefined;
    const paysActivite = sp.get('paysActivite') ?? undefined;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
    const PAGE_SIZE = 20;
    const skip = (page - 1) * PAGE_SIZE;

    const where = {
      ...(disponibilite ? { disponibilite } : {}),
      ...(specialite ? { specialites: { has: specialite } } : {}),
      ...(paysActivite ? { paysActivite } : {}),
    };

    const [total, experts] = await Promise.all([
      prisma.expertProfile.count({ where }),
      prisma.expertProfile.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          specialites: true,
          anneesExperience: true,
          bio: true,
          paysActivite: true,
          disponibilite: true,
          tarifJournalier: true,
          agrementPersonnel: true,
          createdAt: true,
          user: {
            select: { name: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return NextResponse.json(
      { experts, total, page, pages: Math.ceil(total / PAGE_SIZE) },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
