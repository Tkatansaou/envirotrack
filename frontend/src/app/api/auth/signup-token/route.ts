// GET /api/auth/signup-token — pre-session CSRF token for the signup form.
//
// Generates a 32-byte random token, stores its SHA-256 hash in Redis
// (TTL: 5 min), and returns the raw token to the client.
// The signup POST verifies and deletes it (one-time use).
//
// When Redis is unavailable (dev without UPSTASH_REDIS_URL) the check is
// skipped gracefully — token is null and the signup route allows the call.
// In production, AUTH_RATE_LIMIT_FAIL_CLOSED should be set so Redis absence
// returns a hard 503 rather than a silent skip.
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { redis } from '@/lib/server/redis';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

const TTL_SECONDS = 300; // 5 minutes

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    if (!redis) {
      // Redis absent → dev mode; signal client to skip the header check.
      return NextResponse.json({ token: null }, { headers: { 'x-request-id': ctx.requestId } });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await redis.set(`presession:signup:${hash}`, '1', { ex: TTL_SECONDS });

    return NextResponse.json({ token }, { headers: { 'x-request-id': ctx.requestId } });
  });
}
