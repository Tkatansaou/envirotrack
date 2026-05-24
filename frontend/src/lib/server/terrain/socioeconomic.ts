import 'server-only';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

export interface SocioeconomicData {
  year: number;
  population: number | null;
  gdpPerCapitaUsd: number | null;
  waterAccessPercent: number | null;
  electricityAccessPercent: number | null;
  povertyPercent: number | null;
  source: 'worldbank';
  countryCode: 'TG';
}

// World Bank API returns [metadata, [{ value, date }]]
type WbResponse = [unknown, Array<{ value: number | null; date: string }>];

const INDICATORS: Record<string, keyof Omit<SocioeconomicData, 'year' | 'source' | 'countryCode'>> =
  {
    'SP.POP.TOTL': 'population',
    'NY.GDP.PCAP.CD': 'gdpPerCapitaUsd',
    'SH.H2O.BASW.ZS': 'waterAccessPercent',
    'EG.ELC.ACCS.ZS': 'electricityAccessPercent',
    'SI.POV.NAHC': 'povertyPercent',
  };

export async function fetchSocioeconomicData(
  signal?: AbortSignal,
): Promise<SocioeconomicData | null> {
  try {
    const results = await Promise.allSettled(
      Object.keys(INDICATORS).map((indicator) => fetchIndicator(indicator, signal)),
    );

    const data: SocioeconomicData = {
      year: 0,
      population: null,
      gdpPerCapitaUsd: null,
      waterAccessPercent: null,
      electricityAccessPercent: null,
      povertyPercent: null,
      source: 'worldbank',
      countryCode: 'TG',
    };

    let latestYear = 0;
    const keys = Object.keys(INDICATORS);
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const key = keys[i];
      if (!key || result?.status !== 'fulfilled' || !result.value) continue;
      const fieldKey = INDICATORS[key];
      if (!fieldKey) continue;
      (data[fieldKey] as number | null) = result.value.value;
      const yr = parseInt(result.value.date, 10);
      if (yr > latestYear) latestYear = yr;
    }

    data.year = latestYear;
    if (latestYear === 0) return null;

    return data;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      log.warn('Socioeconomic fetch error', { error: String(err) });
    }
    return null;
  }
}

async function fetchIndicator(
  indicator: string,
  signal?: AbortSignal,
): Promise<{ value: number | null; date: string } | null> {
  const url = `https://api.worldbank.org/v2/country/TG/indicator/${indicator}?format=json&mrv=1&per_page=1`;
  const res = await fetch(url, { signal: signal ?? null });
  if (!res.ok) return null;

  const data = (await res.json()) as WbResponse;
  const row = data[1]?.[0];
  if (!row) return null;

  return { value: row.value, date: row.date };
}
