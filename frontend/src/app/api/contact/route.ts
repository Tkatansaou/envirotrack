// POST /api/contact — formulaire de contact public (sans authentification)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { enqueueOutbox } from '@/lib/server/outbox';
import { createEmailLimiter } from '@/lib/server/middleware/rate-limit-by-email';
import { getRedis } from '@/lib/server/redis';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const redis = getRedis() ?? undefined;
const limiter = createEmailLimiter(
  { ...(redis ? { redis } : {}) },
  {
    bucket: 'public:contact',
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5,
    code: 'CONTACT_RATE_LIMIT',
    message: 'Trop de messages envoyés. Réessayez dans une heure.',
  },
);

const Body = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(200).trim().toLowerCase(),
  subject: z.string().min(2).max(120).trim().default('Contact depuis le site'),
  message: z.string().min(10).max(2000).trim(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', issues: parsed.error.issues },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const rl = await limiter.check(req, parsed.data.email);
    if (rl) return rl;

    const adminEmail = process.env['ADMIN_CONTACT_EMAIL'] ?? 'contact@envirotrack.uk';

    await prisma.$transaction(async (tx) => {
      await enqueueOutbox(tx, {
        kind: 'email.contact_feedback',
        payload: {
          to: adminEmail,
          fromEmail: parsed.data.email,
          fromName: parsed.data.name,
          category: 'CONTACT',
          title: parsed.data.subject,
          body: parsed.data.message,
          feedbackId: `contact-${Date.now()}`,
        },
      });
    });

    return NextResponse.json(
      { success: true },
      { status: 201, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
