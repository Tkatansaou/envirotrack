export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { enqueueOutbox } from '@/lib/server/outbox';
import { prisma } from '@/lib/server/prisma';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const log = createLogger();

// POST /api/cron/pges-reminders
// Runs on the 1st of each month. For every project in PGES_TRACKING status,
// enqueues notification + email reminders for the current quarter's PGES tracking.
// Vercel cron schedule: "0 8 1 * *" (8h00 UTC on the 1st of each month)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;

    const projects = await prisma.project.findMany({
      where: { status: 'PGES_TRACKING' },
      select: { id: true, name: true, orgId: true },
    });

    let queued = 0;

    for (const project of projects) {
      if (!project.orgId) continue;

      // Get all OWNER/ADMIN members of the org to notify
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: project.orgId, role: { in: ['OWNER', 'ADMIN'] } },
        include: { user: { select: { id: true, email: true } } },
      });

      await prisma.$transaction(async (tx) => {
        for (const member of members) {
          await enqueueOutbox(tx, {
            kind: 'notification.pges_reminder',
            payload: {
              userId: member.userId,
              projectId: project.id,
              projectName: project.name,
              year,
              quarter,
            },
          });

          await enqueueOutbox(tx, {
            kind: 'email.pges_reminder',
            payload: {
              to: member.user.email,
              projectId: project.id,
              projectName: project.name,
              year,
              quarter,
            },
          });

          queued += 2;
        }
      });
    }

    log.info('pges-reminders: cron done', {
      projects: projects.length,
      year,
      quarter,
      eventsQueued: queued,
    });

    return NextResponse.json(
      { ok: true, projects: projects.length, year, quarter, eventsQueued: queued },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
