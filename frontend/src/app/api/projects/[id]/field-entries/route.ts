export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import type { Prisma } from '@prisma/client';
import { assertProjectAccess } from '@/lib/envirotrack/project-access';

const createSchema = z.object({
  measureId: z.string().min(1),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis'),
  status: z.enum(['CONFORME', 'NON_CONFORME', 'PARTIEL', 'NON_EVALUE']),
  observation: z.string().max(2000).optional(),
  photos: z.array(z.string()).max(5).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// GET /api/projects/[id]/field-entries?date=YYYY-MM-DD  (entrées du jour)
// GET /api/projects/[id]/field-entries?year=2024&month=1  (entrées du mois)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id: projectId } = await params;
    const project = await assertProjectAccess(projectId, auth.user.sub);
    if (!project) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const date = req.nextUrl.searchParams.get('date');
    const yearStr = req.nextUrl.searchParams.get('year');
    const monthStr = req.nextUrl.searchParams.get('month');

    let dateFilter: Prisma.FieldEntryWhereInput['entryDate'];

    if (date) {
      const day = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dateFilter = { gte: day, lt: dayEnd };
    } else if (yearStr && monthStr) {
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      dateFilter = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = { gte: today, lt: tomorrow };
    }

    const entries = await prisma.fieldEntry.findMany({
      where: { projectId, entryDate: dateFilter },
      include: {
        measure: { select: { id: true, code: true, title: true, phase: true, composante: true } },
      },
      orderBy: { entryDate: 'desc' },
    });

    return NextResponse.json({ entries, measures: project.pgesMeasures });
  });
}

// POST /api/projects/[id]/field-entries — upsert (un relevé par mesure par agent par jour)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrf = await verifyCsrf(req);
    if (csrf) return csrf;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id: projectId } = await params;
    const project = await assertProjectAccess(projectId, auth.user.sub);
    if (!project) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const body = (await req.json()) as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { measureId, entryDate, status, observation, photos, latitude, longitude } = parsed.data;

    const measure = await prisma.pGESMeasure.findFirst({
      where: { id: measureId, projectId },
      select: { id: true },
    });
    if (!measure) return NextResponse.json({ error: 'MEASURE_NOT_FOUND' }, { status: 404 });

    const dateObj = new Date(entryDate);

    const entry = await prisma.fieldEntry.upsert({
      where: {
        measureId_agentId_entryDate: { measureId, agentId: auth.user.sub, entryDate: dateObj },
      },
      create: {
        projectId,
        measureId,
        agentId: auth.user.sub,
        entryDate: dateObj,
        status,
        observation: observation ?? null,
        photos: photos ?? [],
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
      update: {
        status,
        observation: observation ?? null,
        photos: photos ?? [],
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
      include: {
        measure: { select: { id: true, code: true, title: true } },
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  });
}
