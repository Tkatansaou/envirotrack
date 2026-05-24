import 'server-only';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();
const APIFY_BASE = 'https://api.apify.com/v2';

export type ApifyRunStatus =
  | 'READY'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ABORTING'
  | 'ABORTED'
  | 'TIMING-OUT'
  | 'TIMED-OUT';

export interface ApifyRun {
  id: string;
  status: ApifyRunStatus;
  defaultDatasetId: string;
  stats: { itemCount: number };
}

export interface ApifyRegulatoryItem {
  url: string;
  title: string;
  type?: string;
  content?: string;
  applicableTypes?: string[];
  [key: string]: unknown;
}

function token(): string {
  const t = process.env.APIFY_TOKEN;
  if (!t) throw new Error('APIFY_TOKEN is not set');
  return t;
}

export async function triggerActorRun(
  actorId: string,
  input: Record<string, unknown>,
): Promise<{ runId: string }> {
  const res = await fetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${token()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    log.error('Apify trigger failed', { actorId, status: res.status, body });
    throw new Error(`Apify run trigger failed: HTTP ${res.status}`);
  }

  const { data } = (await res.json()) as { data: { id: string } };
  return { runId: data.id };
}

export async function getRunStatus(runId: string): Promise<ApifyRun> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token()}`);

  if (!res.ok) {
    throw new Error(`Apify get run failed: HTTP ${res.status}`);
  }

  const { data } = (await res.json()) as { data: ApifyRun };
  return data;
}

// Paginates up to limit items (default 1 000).
export async function getDatasetItems(
  datasetId: string,
  limit = 1000,
): Promise<ApifyRegulatoryItem[]> {
  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token()}&limit=${limit}&format=json`,
  );

  if (!res.ok) {
    throw new Error(`Apify get dataset items failed: HTTP ${res.status}`);
  }

  return (await res.json()) as ApifyRegulatoryItem[];
}

export function isApifyConfigured(): boolean {
  return Boolean(process.env.APIFY_TOKEN);
}
