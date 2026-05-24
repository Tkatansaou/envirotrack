import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/server/logger';
import { triggerActorRun, getRunStatus, getDatasetItems, type ApifyRegulatoryItem } from './client';

const log = createLogger();

// ---------------------------------------------------------------------------
// Source definitions
//
// Each source maps to one Apify actor.  For Togo government sites, the
// recommended actor is `apify/cheerio-scraper` with a custom pageFunction
// that extracts the document title, type and full text.
//
// Configure actor IDs and seed URLs via env vars so forks can point at
// their own actors without touching this file.
// ---------------------------------------------------------------------------

export interface ApifySource {
  id: string;
  actorId: string;
  input: Record<string, unknown>;
}

function buildSources(): ApifySource[] {
  const sources: ApifySource[] = [];

  // ANGE Togo — publications réglementaires
  if (process.env.APIFY_ACTOR_ANGE && process.env.APIFY_URL_ANGE) {
    sources.push({
      id: 'ange-tg',
      actorId: process.env.APIFY_ACTOR_ANGE,
      input: buildCheerioInput(process.env.APIFY_URL_ANGE, 'ange-tg'),
    });
  }

  // Journal Officiel du Togo
  if (process.env.APIFY_ACTOR_JO && process.env.APIFY_URL_JO) {
    sources.push({
      id: 'jo-tg',
      actorId: process.env.APIFY_ACTOR_JO,
      input: buildCheerioInput(process.env.APIFY_URL_JO, 'jo-tg'),
    });
  }

  // MERF — Ministère de l'Environnement
  if (process.env.APIFY_ACTOR_MERF && process.env.APIFY_URL_MERF) {
    sources.push({
      id: 'merf-tg',
      actorId: process.env.APIFY_ACTOR_MERF,
      input: buildCheerioInput(process.env.APIFY_URL_MERF, 'merf-tg'),
    });
  }

  return sources;
}

// Generic cheerio-scraper input.  The pageFunction extracts the page title,
// guesses the document type from keywords in the title, and returns the
// visible text as content.  Forks can replace this with a more precise
// extractor for their target sites.
function buildCheerioInput(startUrl: string, sourceId: string): Record<string, unknown> {
  return {
    startUrls: [{ url: startUrl }],
    maxCrawlingDepth: 2,
    maxPagesPerCrawl: 200,
    pageFunction: /* javascript */ `
async function pageFunction(context) {
  const { $, request } = context;
  const title = $('h1, h2').first().text().trim() || $('title').text().trim();
  if (!title) return;

  const text = $('article, main, .content, body')
    .first()
    .text()
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 50000);

  const up = title.toUpperCase();
  let type = 'AUTRE';
  if (up.includes('LOI')) type = 'LOI';
  else if (up.includes('DÉCRET') || up.includes('DECRET')) type = 'DECRET';
  else if (up.includes('ARRÊTÉ') || up.includes('ARRETE')) type = 'ARRETE';
  else if (up.includes('NORME') || up.includes('STANDARD')) type = 'NORME';
  else if (up.includes('GUIDE') || up.includes('MANUEL')) type = 'GUIDE';
  else if (up.includes('RAPPORT') || up.includes('BILAN')) type = 'RAPPORT';

  await context.pushData({
    url: request.url,
    title,
    type,
    content: text,
    applicableTypes: [],
    source: '${sourceId}',
  });
}`,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Trigger actor runs for all configured sources that have not run recently. */
export async function triggerRegulatorySync(prisma: PrismaClient): Promise<{
  triggered: number;
  skipped: number;
}> {
  const sources = buildSources();
  if (sources.length === 0) {
    log.warn('No Apify sources configured — set APIFY_ACTOR_* and APIFY_URL_* env vars');
    return { triggered: 0, skipped: 0 };
  }

  // Skip sources that already have a run in the last 20 h to avoid duplicate
  // work if the cron fires twice due to clock drift.
  const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const recentJobs = await prisma.apifySyncJob.findMany({
    where: { triggeredAt: { gte: cutoff } },
    select: { source: true },
  });
  const recentSources = new Set(recentJobs.map((j) => j.source));

  let triggered = 0;
  let skipped = 0;

  for (const source of sources) {
    if (recentSources.has(source.id)) {
      skipped++;
      log.info('Apify source skipped (recent run)', { source: source.id });
      continue;
    }

    try {
      const { runId } = await triggerActorRun(source.actorId, source.input);
      await prisma.apifySyncJob.create({
        data: { source: source.id, actorRunId: runId, status: 'RUNNING' },
      });
      triggered++;
      log.info('Apify run triggered', { source: source.id, runId });
    } catch (err) {
      log.error('Failed to trigger Apify run', { source: source.id, error: String(err) });
    }
  }

  return { triggered, skipped };
}

/** Poll RUNNING jobs and import datasets for completed ones. */
export async function collectCompletedRuns(prisma: PrismaClient): Promise<{
  collected: number;
  itemsUpserted: number;
}> {
  const pending = await prisma.apifySyncJob.findMany({
    where: { status: 'RUNNING' },
    orderBy: { triggeredAt: 'asc' },
    take: 20,
  });

  let collected = 0;
  let itemsUpserted = 0;

  for (const job of pending) {
    try {
      const run = await getRunStatus(job.actorRunId);

      if (run.status === 'SUCCEEDED') {
        const items = await getDatasetItems(run.defaultDatasetId);
        const count = await upsertRegulatoryTexts(prisma, job.source, items);

        await prisma.apifySyncJob.update({
          where: { id: job.id },
          data: { status: 'SUCCEEDED', itemsUpserted: count, finishedAt: new Date() },
        });

        itemsUpserted += count;
        collected++;
        log.info('Apify run collected', { source: job.source, runId: job.actorRunId, count });
      } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status)) {
        await prisma.apifySyncJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: run.status, finishedAt: new Date() },
        });
        log.error('Apify run failed', {
          source: job.source,
          runId: job.actorRunId,
          status: run.status,
        });
      }
      // READY / RUNNING / ABORTING — still in progress, skip this tick
    } catch (err) {
      log.error('Failed to check Apify run', { jobId: job.id, error: String(err) });
    }
  }

  return { collected, itemsUpserted };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function upsertRegulatoryTexts(
  prisma: PrismaClient,
  source: string,
  items: ApifyRegulatoryItem[],
): Promise<number> {
  let count = 0;

  for (const item of items) {
    if (!item.url || !item.title) continue;

    try {
      await prisma.regulatoryText.upsert({
        where: { externalId: item.url },
        create: {
          externalId: item.url,
          source,
          title: String(item.title),
          url: item.url,
          type: String(item.type ?? 'AUTRE'),
          content: String(item.content ?? ''),
          applicableTypes: Array.isArray(item.applicableTypes)
            ? (item.applicableTypes as string[])
            : [],
        },
        update: {
          title: String(item.title),
          type: String(item.type ?? 'AUTRE'),
          content: String(item.content ?? ''),
          applicableTypes: Array.isArray(item.applicableTypes)
            ? (item.applicableTypes as string[])
            : [],
          updatedAt: new Date(),
        },
      });
      count++;
    } catch (err) {
      log.warn('Failed to upsert regulatory text', { url: item.url, error: String(err) });
    }
  }

  return count;
}
