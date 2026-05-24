export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth, requireOrgRole } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { getChecklistForProject } from '@/lib/envirotrack/checklist-templates';
import { EIES_SECTIONS } from '@/lib/envirotrack/eies-sections';
import { getPGESForProject } from '@/lib/envirotrack/pges-templates';

// Sélection commune pour les listes de projets
const PROJECT_LIST_SELECT = {
  id: true,
  name: true,
  type: true,
  region: true,
  prefecture: true,
  maitreOuvrage: true,
  financement: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      checklist: true,
      eiesSections: true,
      pgesMeasures: true,
      nonConformities: true,
    },
  },
} as const;

// GET /api/projects?orgId=xxx  → projets du bureau (membre requis)
// GET /api/projects             → projets de l'expert courant
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const orgId = req.nextUrl.searchParams.get('orgId');
    const status = req.nextUrl.searchParams.get('status') ?? undefined;

    if (orgId) {
      // ── Projets du bureau d'études ──────────────────────────────────
      const org = await requireOrgRole(orgId, 'MEMBER');
      if (org instanceof NextResponse) return org;

      const projects = await prisma.project.findMany({
        where: { orgId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        select: PROJECT_LIST_SELECT,
      });

      return NextResponse.json(projects, {
        status: 200,
        headers: { 'x-request-id': ctx.requestId },
      });
    }

    // ── Projets de l'expert indépendant ─────────────────────────────
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const expertProfile = await prisma.expertProfile.findUnique({
      where: { userId: auth.user.sub },
      select: { id: true },
    });
    if (!expertProfile) {
      return NextResponse.json(
        {
          error: 'EXPERT_PROFILE_REQUIRED',
          message: 'Créez votre profil expert avant de gérer des projets',
        },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const projects = await prisma.project.findMany({
      where: { expertId: expertProfile.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      select: PROJECT_LIST_SELECT,
    });

    return NextResponse.json(projects, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}

// Champs communs aux deux types de projets
const BASE_PROJECT_FIELDS = {
  name: z.string().min(3).max(200),
  type: z.enum(['ROUTE', 'BATIMENT', 'MINE', 'ENERGIE', 'AGRICULTURE', 'AUTRE']),
  region: z.string().min(1).max(100),
  prefecture: z.string().min(1).max(100),
  canton: z.string().max(100).optional(),
  maitreOuvrage: z.string().min(1).max(200),
  financement: z.enum(['STANDARD', 'BAILLEUR']).default('STANDARD'),
  bailleur: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
};

const OrgProjectBody = z.object({ orgId: z.string().min(1), ...BASE_PROJECT_FIELDS });
const ExpertProjectBody = z.object(BASE_PROJECT_FIELDS);

// POST /api/projects
// Avec orgId  → projet du bureau (requiert membership MEMBER+)
// Sans orgId  → projet de l'expert indépendant (requiert ExpertProfile existant)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const body: unknown = await req.json().catch(() => null);

    // ── Projet bureau d'études ──────────────────────────────────────────
    if (body !== null && typeof body === 'object' && 'orgId' in body && body.orgId) {
      const parsed = OrgProjectBody.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
          { status: 400, headers: { 'x-request-id': ctx.requestId } },
        );
      }

      const { orgId, ...data } = parsed.data;
      const org = await requireOrgRole(orgId, 'MEMBER');
      if (org instanceof NextResponse) return org;

      const project = await seedProject({
        createdBy: org.user.sub,
        orgId,
        expertId: null,
        ...data,
      });

      return NextResponse.json(project, {
        status: 201,
        headers: { 'x-request-id': ctx.requestId },
      });
    }

    // ── Projet expert indépendant ────────────────────────────────────────
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // Auto-création du profil expert si inexistant (tous les champs sont optionnels)
    const expertProfile = await prisma.expertProfile.upsert({
      where: { userId: auth.user.sub },
      create: { userId: auth.user.sub },
      update: {},
      select: { id: true },
    });

    const parsed = ExpertProjectBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const project = await seedProject({
      createdBy: auth.user.sub,
      orgId: null,
      expertId: expertProfile.id,
      ...parsed.data,
    });

    return NextResponse.json(project, {
      status: 201,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}

type ProjectType = 'ROUTE' | 'BATIMENT' | 'MINE' | 'ENERGIE' | 'AGRICULTURE' | 'AUTRE';
type Financement = 'STANDARD' | 'BAILLEUR';

// Crée un projet et ensemence checklist / sections EIES / mesures PGES dans une tx atomique.
async function seedProject(params: {
  createdBy: string;
  orgId: string | null;
  expertId: string | null;
  name: string;
  type: ProjectType;
  region: string;
  prefecture: string;
  canton?: string | undefined;
  maitreOuvrage: string;
  financement: Financement;
  bailleur?: string | undefined;
  startDate?: string | undefined;
}) {
  const checklistTemplates = getChecklistForProject(params.type, params.financement);
  const pgesTemplates = getPGESForProject(params.type);

  return prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        orgId: params.orgId,
        expertId: params.expertId,
        createdBy: params.createdBy,
        name: params.name,
        type: params.type,
        region: params.region,
        prefecture: params.prefecture,
        canton: params.canton ?? null,
        maitreOuvrage: params.maitreOuvrage,
        financement: params.financement,
        bailleur: params.bailleur ?? null,
        startDate: params.startDate ? new Date(params.startDate) : null,
        status: 'DRAFT',
      },
    });

    await tx.checklistItem.createMany({
      data: checklistTemplates.map((t) => ({
        projectId: p.id,
        code: t.code,
        article: t.article,
        description: t.description,
        category: t.category,
        status: 'PENDING',
        sortOrder: t.sortOrder,
      })),
    });

    await tx.eIESSection.createMany({
      data: EIES_SECTIONS.map((s) => ({
        projectId: p.id,
        sectionNumber: s.sectionNumber,
        title: s.title,
        content: {},
        status: 'EMPTY',
      })),
    });

    await tx.pGESMeasure.createMany({
      data: pgesTemplates.map((t) => ({
        projectId: p.id,
        code: t.code,
        title: t.title,
        description: t.description,
        phase: t.phase,
        composante: t.composante,
        sortOrder: t.sortOrder,
      })),
    });

    return p;
  });
}
