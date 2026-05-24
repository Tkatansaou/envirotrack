export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

// GET /api/experts/profile — profil expert de l'utilisateur courant
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const profile = await prisma.expertProfile.findUnique({
      where: { userId: auth.user.sub },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'EXPERT_PROFILE_NOT_FOUND' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    return NextResponse.json(profile, { status: 200, headers: { 'x-request-id': ctx.requestId } });
  });
}

const SPECIALITES = ['EAU', 'AIR', 'SOL', 'BIODIVERSITE', 'SOCIAL', 'SANTE', 'AUTRE'] as const;
const DISPONIBILITES = ['DISPONIBLE', 'EN_MISSION', 'INDISPONIBLE'] as const;

const UpsertBody = z.object({
  agrementPersonnel: z.string().max(100).optional(),
  specialites: z.array(z.enum(SPECIALITES)).max(7).optional(),
  anneesExperience: z.number().int().min(0).max(60).optional(),
  bio: z.string().max(2000).optional(),
  telephone: z.string().max(30).optional(),
  siteWeb: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  paysActivite: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  disponibilite: z.enum(DISPONIBILITES).optional(),
  tarifJournalier: z.number().int().min(0).optional(),
});

// PATCH /api/experts/profile — upsert profil expert
// Positionne également accountType = "EXPERT" sur le User dans la même transaction.
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = UpsertBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const d = parsed.data;
    const userId = auth.user.sub;

    // Construit uniquement les champs explicitement fournis — préserve les valeurs existantes
    const profileData = {
      ...(d.agrementPersonnel !== undefined && { agrementPersonnel: d.agrementPersonnel }),
      ...(d.specialites !== undefined && { specialites: d.specialites }),
      ...(d.anneesExperience !== undefined && { anneesExperience: d.anneesExperience }),
      ...(d.bio !== undefined && { bio: d.bio }),
      ...(d.telephone !== undefined && { telephone: d.telephone }),
      ...(d.siteWeb !== undefined && { siteWeb: d.siteWeb }),
      ...(d.linkedinUrl !== undefined && { linkedinUrl: d.linkedinUrl }),
      ...(d.paysActivite !== undefined && { paysActivite: d.paysActivite }),
      ...(d.disponibilite !== undefined && { disponibilite: d.disponibilite }),
      ...(d.tarifJournalier !== undefined && { tarifJournalier: d.tarifJournalier }),
    };

    const [profile] = await prisma.$transaction([
      prisma.expertProfile.upsert({
        where: { userId },
        create: { userId, ...profileData },
        update: profileData,
      }),
      prisma.user.update({
        where: { id: userId },
        data: { accountType: 'EXPERT' },
      }),
    ]);

    return NextResponse.json(profile, { status: 200, headers: { 'x-request-id': ctx.requestId } });
  });
}
