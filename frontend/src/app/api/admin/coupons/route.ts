// GET  /api/admin/coupons — liste paginée (ADMIN)
// POST /api/admin/coupons — créer un coupon (SUPERADMIN)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { requireAdmin, requireSuperadmin } from '@/lib/server/middleware';
import { verifyCsrf } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin/audit';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';

const PAGE_SIZE = 20;

const CreateBody = z.object({
  code: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric (A-Z, 0-9, -, _)')
    .transform((v) => v.toUpperCase()),
  discountPct: z.number().int().min(1).max(100).optional(),
  credits: z.number().int().min(0).optional().default(0),
  description: z.string().max(200).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const cursor = req.nextUrl.searchParams.get('cursor') ?? undefined;
    const activeOnly = req.nextUrl.searchParams.get('active') === '1';

    const items = await prisma.coupon.findMany({
      ...(activeOnly ? { where: { active: true } } : {}),
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        code: true,
        discountPct: true,
        credits: true,
        description: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = items.length > PAGE_SIZE;
    const page = hasMore ? items.slice(0, PAGE_SIZE) : items;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json(
      { items: page, nextCursor },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfErr = verifyCsrf(req);
    if (csrfErr) return csrfErr;

    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { code, discountPct, credits, description, maxUses, expiresAt } = parsed.data;

    // Un coupon doit avoir soit un discountPct, soit des credits
    if (!discountPct && credits === 0) {
      return NextResponse.json(
        { error: 'COUPON_INVALID', message: 'Specify discountPct or credits (or both).' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    try {
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json(
          { error: 'COUPON_CODE_EXISTS', message: `Le code "${code}" existe déjà.` },
          { status: 409, headers: { 'x-request-id': ctx.requestId } },
        );
      }

      const coupon = await prisma.coupon.create({
        data: {
          code,
          discountPct: discountPct ?? null,
          credits: credits ?? 0,
          description: description ?? null,
          maxUses: maxUses ?? null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      await logAdminAction(prisma, {
        actorId: auth.admin.id,
        action: 'COUPON_CREATE',
        targetType: 'Coupon',
        targetId: coupon.id,
        metadata: { code, discountPct, credits, maxUses },
      });

      return NextResponse.json(
        { coupon },
        { status: 201, headers: { 'x-request-id': ctx.requestId } },
      );
    } catch (err) {
      log.error('coupon create failed', { err });
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: String(err) },
        { status: 500, headers: { 'x-request-id': ctx.requestId } },
      );
    }
  });
}
