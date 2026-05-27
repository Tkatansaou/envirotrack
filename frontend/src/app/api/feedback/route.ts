// POST /api/feedback — soumettre un avis (utilisateur authentifié)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { enqueueOutbox } from '@/lib/server/outbox';

const Body = z.object({
  category: z.enum(['BUG', 'FEATURE', 'UX', 'PERFORMANCE', 'OTHER']).default('OTHER'),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(3).max(120).trim(),
  body: z.string().min(10).max(2000).trim(),
  page: z.string().max(200).trim().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const { rating, page, ...rest } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.sub },
      select: { email: true, name: true },
    });

    const feedback = await prisma.$transaction(async (tx) => {
      const fb = await tx.feedback.create({
        data: {
          userId: auth.user.sub,
          ...rest,
          ...(rating !== undefined ? { rating } : {}),
          ...(page !== undefined ? { page } : {}),
        },
        select: { id: true, category: true, title: true, createdAt: true },
      });

      const adminEmail = process.env['ADMIN_CONTACT_EMAIL'] ?? 'contact@envirotrack.uk';
      await enqueueOutbox(tx, {
        kind: 'email.contact_feedback',
        payload: {
          to: adminEmail,
          fromEmail: user?.email ?? 'inconnu',
          fromName: user?.name ?? user?.email ?? 'Utilisateur',
          category: fb.category,
          title: fb.title,
          body: rest.body,
          ...(page !== undefined ? { page } : {}),
          feedbackId: fb.id,
        },
      });

      return fb;
    });

    return NextResponse.json(feedback, {
      status: 201,
      headers: { 'x-request-id': ctx.requestId },
    });
  });
}
