import 'server-only';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

export interface BiodiversityData {
  totalObservations: number;
  byKingdom: Record<string, number>;
  // IUCN threatened species by category (only if IUCN_API_TOKEN is set)
  iucn: {
    CR: number;
    EN: number;
    VU: number;
    total: number;
  } | null;
  source: 'gbif';
  countryCode: 'TG';
}

interface GbifFacetResponse {
  count: number;
  facets: Array<{
    field: string;
    counts: Array<{ name: string; count: number }>;
  }>;
}

interface IucnSpecies {
  category: string;
}

export async function fetchBiodiversityData(
  _lat: number,
  _lon: number,
  signal?: AbortSignal,
): Promise<BiodiversityData | null> {
  try {
    const [gbifResult, iucnResult] = await Promise.allSettled([
      fetchGbif(signal),
      fetchIucn(signal),
    ]);

    const gbif = gbifResult.status === 'fulfilled' ? gbifResult.value : null;
    const iucn = iucnResult.status === 'fulfilled' ? iucnResult.value : null;

    if (!gbif) return null;

    return {
      totalObservations: gbif.total,
      byKingdom: gbif.byKingdom,
      iucn,
      source: 'gbif',
      countryCode: 'TG',
    };
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      log.warn('Biodiversity fetch error', { error: String(err) });
    }
    return null;
  }
}

async function fetchGbif(
  signal?: AbortSignal,
): Promise<{ total: number; byKingdom: Record<string, number> } | null> {
  const url = new URL('https://api.gbif.org/v1/occurrence/search');
  url.searchParams.set('country', 'TG');
  url.searchParams.set('facet', 'kingdom');
  url.searchParams.set('facetLimit', '10');
  url.searchParams.set('limit', '0');

  const res = await fetch(url.toString(), { signal: signal ?? null });
  if (!res.ok) {
    log.warn('GBIF fetch failed', { status: res.status });
    return null;
  }

  const data = (await res.json()) as GbifFacetResponse;
  const kingdoms: Record<string, number> = {};
  const facet = data.facets?.find((f) => f.field === 'KINGDOM');
  for (const entry of facet?.counts ?? []) {
    kingdoms[entry.name] = entry.count;
  }

  return { total: data.count ?? 0, byKingdom: kingdoms };
}

async function fetchIucn(signal?: AbortSignal): Promise<BiodiversityData['iucn']> {
  const token = process.env.IUCN_API_TOKEN;
  if (!token) return null;

  const url = `https://apiv3.iucnredlist.org/api/v3/country/getspecies/TG?token=${token}`;
  const res = await fetch(url, { signal: signal ?? null });
  if (!res.ok) {
    log.warn('IUCN fetch failed', { status: res.status });
    return null;
  }

  const data = (await res.json()) as { result: IucnSpecies[] };
  const species = data.result ?? [];

  const counts = { CR: 0, EN: 0, VU: 0, total: species.length };
  for (const s of species) {
    if (s.category === 'CR') counts.CR++;
    else if (s.category === 'EN') counts.EN++;
    else if (s.category === 'VU') counts.VU++;
  }

  return counts;
}
