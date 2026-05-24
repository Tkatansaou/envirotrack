export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth, requireOrgRole } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

// ──────────────────────────────────────────────────────────────────────────────
// Résolution de projet — supporte deux types d'ownership :
//   ORG  : le projet appartient à un bureau d'études (via orgId)
//   EXPERT : le projet appartient à un expert indépendant (via expertId)
// ──────────────────────────────────────────────────────────────────────────────

type ResolvedProject =
  | { project: Awaited<ReturnType<typeof fetchProject>>; ownerType: 'ORG'; orgId: string }
  | { project: Awaited<ReturnType<typeof fetchProject>>; ownerType: 'EXPERT' };

async function fetchProject(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

async function resolveProject(id: string, userId: string): Promise<ResolvedProject | null> {
  const project = await fetchProject(id);
  if (!project) return null;

  if (project.orgId) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: project.orgId, userId } },
    });
    if (!membership) return null;
    return { project, ownerType: 'ORG', orgId: project.orgId };
  }

  if (project.expertId) {
    const expert = await prisma.expertProfile.findUnique({
      where: { id: project.expertId },
      select: { userId: true },
    });
    if (!expert || expert.userId !== userId) return null;
    return { project, ownerType: 'EXPERT' };
  }

  return null; // projet orphelin (ne devrait pas arriver)
}

// GET /api/projects/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const resolved = await resolveProject(id, auth.user.sub);
    if (!resolved) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const full = await prisma.project.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        _count: {
          select: {
            checklist: true,
            eiesSections: true,
            pgesMeasures: true,
            nonConformities: true,
          },
        },
      },
    });

    return NextResponse.json(full, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}

const PatchBody = z.object({
  name: z.string().min(3).max(200).optional(),
  region: z.string().min(1).max(100).optional(),
  prefecture: z.string().min(1).max(100).optional(),
  canton: z.string().max(100).optional(),
  maitreOuvrage: z.string().min(1).max(200).optional(),
  bailleur: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EIES_SUBMITTED', 'PGES_TRACKING', 'ARCHIVED']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// PATCH /api/projects/[id]
export async function PATCH(
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
    const resolved = await resolveProject(id, auth.user.sub);
    if (!resolved) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const d = parsed.data;
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.region !== undefined && { region: d.region }),
        ...(d.prefecture !== undefined && { prefecture: d.prefecture }),
        ...(d.maitreOuvrage !== undefined && { maitreOuvrage: d.maitreOuvrage }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.canton !== undefined && { canton: d.canton }),
        ...(d.bailleur !== undefined && { bailleur: d.bailleur }),
        ...(d.startDate !== undefined && { startDate: new Date(d.startDate) }),
        ...(d.latitude !== undefined && { latitude: d.latitude }),
        ...(d.longitude !== undefined && { longitude: d.longitude }),
      },
    });

    return NextResponse.json(updated, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}

// DELETE /api/projects/[id] — soft-delete (ARCHIVED)
// Bureau : requiert rôle ADMIN minimum. Expert : propriétaire = accès direct.
export async function DELETE(
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
    const resolved = await resolveProject(id, auth.user.sub);
    if (!resolved) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    if (resolved.ownerType === 'ORG') {
      const orgCtx = await requireOrgRole(resolved.orgId, 'ADMIN');
      if (orgCtx instanceof NextResponse) return orgCtx;
    }
    // Expert : resolveProject a déjà vérifié la propriété — pas de contrôle supplémentaire

    await prisma.project.update({ where: { id }, data: { status: 'ARCHIVED' } });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
