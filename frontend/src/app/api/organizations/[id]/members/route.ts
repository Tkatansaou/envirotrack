export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireOrgRole } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import type { OrgRole } from '@/lib/server/middleware/require-org-role';
import { ORG_ROLE_RANK } from '@/lib/server/middleware/require-org-role';

type Params = { params: Promise<{ id: string }> };

// GET /api/organizations/[id]/members — list members (MEMBER+ required)
export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const { id: orgId } = await params;
    const auth = await requireOrgRole(orgId, 'MEMBER');
    if (auth instanceof NextResponse) return auth;

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
        isCurrentUser: m.userId === auth.orgMember.userId,
      })),
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const InviteBody = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// POST /api/organizations/[id]/members — invite a user by email (OWNER/ADMIN)
export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const { id: orgId } = await params;
    const auth = await requireOrgRole(orgId, 'ADMIN');
    if (auth instanceof NextResponse) return auth;

    const parsed = InviteBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { email, role } = parsed.data;

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Aucun compte trouvé avec cet email.' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const existing = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: target.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'ALREADY_MEMBER', message: 'Cet utilisateur est déjà membre.' },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const member = await prisma.organizationMember.create({
      data: { organizationId: orgId, userId: target.id, role },
      include: { user: { select: { id: true, email: true } } },
    });

    return NextResponse.json(
      {
        id: member.id,
        userId: member.userId,
        email: member.user.email,
        role: member.role,
        joinedAt: member.createdAt,
        isCurrentUser: false,
      },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const PatchBody = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MEMBER']),
});

// PATCH /api/organizations/[id]/members — change role (OWNER only)
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const { id: orgId } = await params;
    const auth = await requireOrgRole(orgId, 'OWNER');
    if (auth instanceof NextResponse) return auth;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { userId, role } = parsed.data;

    // Can't change own role
    if (userId === auth.orgMember.userId) {
      return NextResponse.json(
        { error: 'CANNOT_MODIFY_SELF', message: "You can't change your own role." },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const target = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if ((target.role as OrgRole) === 'OWNER') {
      return NextResponse.json(
        { error: 'CANNOT_MODIFY_OWNER', message: "Owner role can't be changed here." },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const updated = await prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      data: { role },
    });

    return NextResponse.json(
      { id: updated.id, userId: updated.userId, role: updated.role },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

// DELETE /api/organizations/[id]/members?userId=xxx — remove member (OWNER only)
export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const { id: orgId } = await params;
    const auth = await requireOrgRole(orgId, 'OWNER');
    if (auth instanceof NextResponse) return auth;

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'userId required' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    if (userId === auth.orgMember.userId) {
      return NextResponse.json(
        { error: 'CANNOT_REMOVE_SELF', message: "You can't remove yourself." },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const target = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if ((target.role as OrgRole) === 'OWNER') {
      return NextResponse.json(
        { error: 'CANNOT_REMOVE_OWNER', message: "Can't remove the org owner." },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    await prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    return NextResponse.json({}, { status: 200, headers: { 'x-request-id': ctx.requestId } });
  });
}

// Silence unused import warning — ORG_ROLE_RANK is used by consumers
void (ORG_ROLE_RANK satisfies Record<OrgRole, number>);
