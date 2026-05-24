export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';

// GET /api/bureaux?orgId=xxx — fetch bureau profile for the org
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const orgId = req.nextUrl.searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', message: 'orgId required' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: auth.user.sub } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const [org, profile] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, slug: true, createdAt: true },
      }),
      prisma.bureauProfile.findUnique({ where: { orgId } }),
    ]);
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    return NextResponse.json(
      { org, profile },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

const PatchBody = z.object({
  orgId: z.string().min(1),
  agrementANGE: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
  adresse: z.string().max(500).optional(),
  telephone: z.string().max(30).optional(),
  siteWeb: z.string().url().optional(),
});

// PATCH /api/bureaux — upsert bureau profile (ADMIN or OWNER only)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { orgId, ...profileData } = parsed.data;

    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: auth.user.sub } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (membership.role === 'MEMBER') {
      return NextResponse.json(
        { error: 'ORG_ROLE_INSUFFICIENT', message: 'Admin or Owner required' },
        { status: 403, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const p = profileData;
    // Explicit string | null to satisfy exactOptionalPropertyTypes + Prisma nullable fields
    const agrementANGE: string | null = p.agrementANGE !== undefined ? p.agrementANGE : null;
    const logoUrl: string | null = p.logoUrl !== undefined ? p.logoUrl : null;
    const adresse: string | null = p.adresse !== undefined ? p.adresse : null;
    const telephone: string | null = p.telephone !== undefined ? p.telephone : null;
    const siteWeb: string | null = p.siteWeb !== undefined ? p.siteWeb : null;

    const profile = await prisma.bureauProfile.upsert({
      where: { orgId },
      create: { orgId, agrementANGE, logoUrl, adresse, telephone, siteWeb },
      update: { agrementANGE, logoUrl, adresse, telephone, siteWeb },
    });

    return NextResponse.json(profile, { status: 200, headers: { 'x-request-id': ctx.requestId } });
  });
}
