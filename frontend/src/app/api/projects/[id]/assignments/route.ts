export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { assertProjectAccess, assertProjectOwnerOrAdmin } from '@/lib/envirotrack/project-access';

// GET /api/projects/[id]/assignments — liste les agents assignés au projet
// Accessible à tout membre/propriétaire du projet.
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

    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(
      { assignments },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const AssignBody = z.object({
  // L'invitation se fait par email — l'utilisateur doit déjà avoir un compte.
  email: z.string().email(),
  role: z.enum(['AGENT', 'REVIEWER']).default('AGENT'),
});

// POST /api/projects/[id]/assignments — assigner un agent au projet
// Réservé au propriétaire (OWNER/ADMIN bureau, expert propriétaire).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id: projectId } = await params;
    const isOwner = await assertProjectOwnerOrAdmin(projectId, auth.user.sub);
    if (!isOwner) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const parsed = AssignBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { email, role } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Aucun compte avec cet email' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // Upsert : si déjà assigné, met à jour le rôle
    const assignment = await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId, userId: targetUser.id } },
      create: { projectId, userId: targetUser.id, role, assignedBy: auth.user.sub },
      update: { role },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(
      { assignment },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const RemoveBody = z.object({
  userId: z.string().min(1),
});

// DELETE /api/projects/[id]/assignments — retirer un agent du projet
// Réservé au propriétaire. Un agent peut aussi se retirer lui-même.
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

    const { id: projectId } = await params;

    const parsed = RemoveBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { userId } = parsed.data;
    const isSelf = userId === auth.user.sub;

    // Un agent peut se retirer lui-même ; sinon il faut être propriétaire/admin
    if (!isSelf) {
      const isOwner = await assertProjectOwnerOrAdmin(projectId, auth.user.sub);
      if (!isOwner) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    await prisma.projectAssignment.deleteMany({
      where: { projectId, userId },
    });

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
