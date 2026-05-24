export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { slugify } from '@/lib/server/slug';

// GET /api/organizations — list orgs the current user belongs to
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: auth.user.sub },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const orgs = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));

    return NextResponse.json(orgs, {
      status: 200,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}

const CreateBody = z.object({
  name: z.string().min(2).max(100),
});

// POST /api/organizations — create an org and make the caller OWNER
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const slug = slugify(parsed.data.name);

    const org = await prisma.$transaction(async (tx) => {
      const o = await tx.organization.create({
        data: { name: parsed.data.name, slug, ownerId: auth.user.sub },
      });
      await tx.organizationMember.create({
        data: { organizationId: o.id, userId: auth.user.sub, role: 'OWNER' },
      });
      return o;
    });

    return NextResponse.json(org, {
      status: 201,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
