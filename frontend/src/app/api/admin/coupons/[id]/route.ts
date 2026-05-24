// PATCH /api/admin/coupons/[id] — modifier/désactiver un coupon (SUPERADMIN)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { requireSuperadmin } from '@/lib/server/middleware';
import { logAdminAction } from '@/lib/server/admin/audit';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const PatchBody = z.object({
  active: z.boolean().optional(),
  discountPct: z.number().int().min(1).max(100).optional(),
  credits: z.number().int().min(0).optional(),
  description: z.string().max(200).optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const parsed = PatchBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return NextResponse.json(
        { error: 'COUPON_NOT_FOUND' },
        { status: 404, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.active !== undefined) data.active = parsed.data.active;
    if (parsed.data.discountPct !== undefined) data.discountPct = parsed.data.discountPct;
    if (parsed.data.credits !== undefined) data.credits = parsed.data.credits;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.maxUses !== undefined) data.maxUses = parsed.data.maxUses;
    if (parsed.data.expiresAt !== undefined)
      data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

    const updated = await prisma.coupon.update({ where: { id }, data });

    await logAdminAction(prisma, {
      actorId: auth.admin.id,
      action: 'COUPON_UPDATE',
      targetType: 'Coupon',
      targetId: id,
      metadata: data,
    });

    return NextResponse.json(
      { coupon: updated },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
