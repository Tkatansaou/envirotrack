export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { assertProjectAccess } from '@/lib/envirotrack/project-access';

const submitSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  notes: z.string().max(2000).optional(),
  action: z.enum(['save', 'submit']).default('save'),
});

// GET /api/projects/[id]/reports/monthly?year=2024&month=6
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

    const year = parseInt(
      req.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()),
      10,
    );
    const month = parseInt(
      req.nextUrl.searchParams.get('month') ?? String(new Date().getMonth() + 1),
      10,
    );

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const measures = await prisma.pGESMeasure.findMany({
      where: { projectId },
      select: { id: true, code: true, title: true, phase: true, composante: true },
      orderBy: { sortOrder: 'asc' },
    });

    const entries = await prisma.fieldEntry.findMany({
      where: { projectId, entryDate: { gte: start, lt: end } },
      select: { measureId: true, status: true, entryDate: true, agentId: true, observation: true },
    });

    const measureStats = measures.map((m) => {
      const mEntries = entries.filter((e) => e.measureId === m.id);
      const counts = {
        CONFORME: mEntries.filter((e) => e.status === 'CONFORME').length,
        NON_CONFORME: mEntries.filter((e) => e.status === 'NON_CONFORME').length,
        PARTIEL: mEntries.filter((e) => e.status === 'PARTIEL').length,
        NON_EVALUE: mEntries.filter((e) => e.status === 'NON_EVALUE').length,
      };
      const evaluatedDays = mEntries.filter((e) => e.status !== 'NON_EVALUE').length;
      const uniqueDays = new Set(mEntries.map((e) => e.entryDate.toISOString().slice(0, 10))).size;
      const coveragePercent = Math.round((uniqueDays / daysInMonth) * 100);

      let dominantStatus = 'NON_EVALUE';
      if (evaluatedDays > 0) {
        if (counts.NON_CONFORME > 0) dominantStatus = 'NON_CONFORME';
        else if (counts.PARTIEL > 0) dominantStatus = 'PARTIEL';
        else dominantStatus = 'CONFORME';
      }

      return {
        measure: m,
        counts,
        totalEntries: mEntries.length,
        uniqueDays,
        coveragePercent,
        dominantStatus,
      };
    });

    const totalEntries = entries.length;
    const conformeCount = entries.filter((e) => e.status === 'CONFORME').length;
    const nonConformeCount = entries.filter((e) => e.status === 'NON_CONFORME').length;
    const partielCount = entries.filter((e) => e.status === 'PARTIEL').length;
    const uniqueAgents = new Set(entries.map((e) => e.agentId)).size;
    const uniqueDaysWithEntries = new Set(
      entries.map((e) => e.entryDate.toISOString().slice(0, 10)),
    ).size;
    const globalCoveragePercent = Math.round((uniqueDaysWithEntries / daysInMonth) * 100);

    const report = await prisma.monthlyReport.findUnique({
      where: { projectId_year_month: { projectId, year, month } },
    });

    return NextResponse.json({
      year,
      month,
      daysInMonth,
      report,
      summary: {
        totalEntries,
        conformeCount,
        nonConformeCount,
        partielCount,
        uniqueAgents,
        uniqueDaysWithEntries,
        globalCoveragePercent,
      },
      measureStats,
    });
  });
}

// POST /api/projects/[id]/reports/monthly — save or submit monthly report
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
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { year, month, notes, action } = parsed.data;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const entries = await prisma.fieldEntry.findMany({
      where: { projectId, entryDate: { gte: start, lt: end } },
      select: { status: true, entryDate: true },
    });

    const uniqueDays = new Set(entries.map((e) => e.entryDate.toISOString().slice(0, 10))).size;
    const summary = {
      totalEntries: entries.length,
      conformeCount: entries.filter((e) => e.status === 'CONFORME').length,
      nonConformeCount: entries.filter((e) => e.status === 'NON_CONFORME').length,
      partielCount: entries.filter((e) => e.status === 'PARTIEL').length,
      uniqueDays,
      coveragePercent: Math.round((uniqueDays / daysInMonth) * 100),
    };

    const report = await prisma.monthlyReport.upsert({
      where: { projectId_year_month: { projectId, year, month } },
      create: {
        projectId,
        year,
        month,
        status: action === 'submit' ? 'SUBMITTED' : 'DRAFT',
        summary,
        notes: notes ?? null,
        preparedBy: auth.user.sub,
        submittedAt: action === 'submit' ? new Date() : null,
      },
      update: {
        status: action === 'submit' ? 'SUBMITTED' : 'DRAFT',
        summary,
        notes: notes ?? null,
        ...(action === 'submit' ? { submittedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ report });
  });
}
