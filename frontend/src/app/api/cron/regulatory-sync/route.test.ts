import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/server/redis', () => ({ redis: null }));
vi.mock('@/lib/server/leader-lease', () => ({
  withLease: vi.fn((_r, _k, _t, fn: () => Promise<void>) => fn()),
}));
vi.mock('@/lib/server/apify/client', () => ({
  isApifyConfigured: vi.fn(() => false),
}));
vi.mock('@/lib/server/apify/sync', () => ({
  collectCompletedRuns: vi.fn(async () => ({ collected: 0, itemsUpserted: 0 })),
  triggerRegulatorySync: vi.fn(async () => ({ triggered: 0, skipped: 0 })),
}));

function makeReq() {
  return new NextRequest('http://localhost/api/cron/regulatory-sync', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? 'test-secret'}` },
  });
}

describe('POST /api/cron/regulatory-sync', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    vi.clearAllMocks();
  });

  it('returns 401 with wrong secret', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/cron/regulatory-sync', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns skipped when Apify is not configured', async () => {
    const { isApifyConfigured } = await import('@/lib/server/apify/client');
    vi.mocked(isApifyConfigured).mockReturnValue(false);

    const { POST } = await import('./route');
    const res = await POST(makeReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('APIFY_NOT_CONFIGURED');
  });

  it('runs collect + trigger when Apify is configured', async () => {
    const { isApifyConfigured } = await import('@/lib/server/apify/client');
    vi.mocked(isApifyConfigured).mockReturnValue(true);

    const { collectCompletedRuns, triggerRegulatorySync } = await import('@/lib/server/apify/sync');
    vi.mocked(collectCompletedRuns).mockResolvedValue({ collected: 2, itemsUpserted: 15 });
    vi.mocked(triggerRegulatorySync).mockResolvedValue({ triggered: 1, skipped: 0 });

    const { POST } = await import('./route');
    const res = await POST(makeReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.collected).toBe(2);
    expect(body.itemsUpserted).toBe(15);
    expect(body.triggered).toBe(1);
  });
});
