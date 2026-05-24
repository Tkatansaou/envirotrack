// Cron quotidien à 6h UTC — renouvellement des abonnements arrivant à échéance.
// Sécurisé par Authorization: Bearer ${CRON_SECRET} (standard de toutes les crons).
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/server/cron/auth';
import { renewDueSubscriptions } from '@/lib/server/subscriptions/renew';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { log } from '@/lib/server/observability/log';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const authErr = verifyCronSecret(req);
    if (authErr) return authErr;

    log.info('subscription-renewal cron start');
    const result = await renewDueSubscriptions();
    log.info('subscription-renewal cron done', { ...result });

    return NextResponse.json(result, { headers: { 'x-request-id': ctx.requestId } });
  });
}
