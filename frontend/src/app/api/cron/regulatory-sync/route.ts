export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // actor status checks + dataset fetch can take ~30-50 s

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { withLease } from '@/lib/server/leader-lease';
import { prisma } from '@/lib/server/prisma';
import { redis } from '@/lib/server/redis';
import { createLogger } from '@/lib/server/logger';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { isApifyConfigured } from '@/lib/server/apify/client';
import { collectCompletedRuns, triggerRegulatorySync } from '@/lib/server/apify/sync';

const log = createLogger();
const LEASE_TTL_MS = 90_000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const fail = verifyCronSecret(req);
  if (fail) return fail;

  if (!isApifyConfigured()) {
    log.warn('regulatory-sync skipped: APIFY_TOKEN not set');
    return NextResponse.json({ ok: true, skipped: true, reason: 'APIFY_NOT_CONFIGURED' });
  }

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    let collected = 0;
    let itemsUpserted = 0;
    let triggered = 0;

    await withLease(redis ?? undefined, 'regulatory-sync', LEASE_TTL_MS, async () => {
      // Phase 1: collect any datasets from runs that finished since last tick
      const collectResult = await collectCompletedRuns(prisma);
      collected = collectResult.collected;
      itemsUpserted = collectResult.itemsUpserted;

      // Phase 2: trigger new runs (skips sources with a run in the last 20 h)
      const triggerResult = await triggerRegulatorySync(prisma);
      triggered = triggerResult.triggered;

      log.info('regulatory-sync tick', {
        collected,
        itemsUpserted,
        triggered,
        requestId: ctx.requestId,
      });
    });

    return NextResponse.json(
      { ok: true, collected, itemsUpserted, triggered },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}
