export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { getEIESSectionDef } from '@/lib/envirotrack/eies-sections';

async function assertMember(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  if (!project.orgId) return null;
  const m = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: project.orgId, userId } },
  });
  return m ? project : null;
}

// GET /api/projects/[id]/eies/[section]
// Returns section content + field definitions for guided form rendering.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; section: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, section } = await params;
    const sectionNumber = parseInt(section, 10);
    if (isNaN(sectionNumber) || sectionNumber < 1 || sectionNumber > 9) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'section must be 1-9' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const project = await assertMember(id, auth.user.sub);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const row = await prisma.eIESSection.findUnique({
      where: { projectId_sectionNumber: { projectId: id, sectionNumber } },
    });
    if (!row) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

    const def = getEIESSectionDef(sectionNumber);

    return NextResponse.json(
      { section: row, definition: def },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const PutBody = z.object({
  content: z.record(z.string(), z.unknown()),
  status: z.enum(['EMPTY', 'DRAFT', 'COMPLETE']).optional(),
});

// PUT /api/projects/[id]/eies/[section] — save section content
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; section: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id, section } = await params;
    const sectionNumber = parseInt(section, 10);
    if (isNaN(sectionNumber) || sectionNumber < 1 || sectionNumber > 9) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'section must be 1-9' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const project = await assertMember(id, auth.user.sub);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const parsed = PutBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // Auto-derive status: if the caller doesn't specify, infer from content emptiness
    const derivedStatus =
      parsed.data.status ?? (Object.keys(parsed.data.content).length === 0 ? 'EMPTY' : 'DRAFT');

    const updated = await prisma.eIESSection.update({
      where: { projectId_sectionNumber: { projectId: id, sectionNumber } },
      data: {
        content: parsed.data.content as unknown as Prisma.InputJsonValue,
        status: derivedStatus,
      },
    });

    return NextResponse.json(updated, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
