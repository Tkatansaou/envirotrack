import 'server-only';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

export interface ClimateMonthly {
  month: number; // 1-12
  tempMeanC: number;
  tempMaxC: number;
  tempMinC: number;
  precipMm: number;
}

export interface ClimateData {
  annual: {
    tempMeanC: number;
    tempMaxC: number;
    tempMinC: number;
    precipMm: number;
  };
  monthly: ClimateMonthly[];
  dataYear: number;
  source: 'open-meteo';
}

interface OpenMeteoArchiveResponse {
  monthly: {
    time: string[];
    temperature_2m_mean: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

export async function fetchClimateData(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ClimateData | null> {
  const year = new Date().getFullYear() - 1; // last complete year
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('start_date', `${year}-01-01`);
  url.searchParams.set('end_date', `${year}-12-31`);
  url.searchParams.set(
    'monthly',
    'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum',
  );
  url.searchParams.set('timezone', 'auto');

  try {
    const res = await fetch(url.toString(), { signal: signal ?? null });
    if (!res.ok) {
      log.warn('Open-Meteo climate fetch failed', { status: res.status });
      return null;
    }

    const data = (await res.json()) as OpenMeteoArchiveResponse;
    const m = data.monthly;
    if (!m?.time?.length) return null;

    const monthly: ClimateMonthly[] = m.time.map((_, i) => ({
      month: i + 1,
      tempMeanC: round1(m.temperature_2m_mean[i] ?? 0),
      tempMaxC: round1(m.temperature_2m_max[i] ?? 0),
      tempMinC: round1(m.temperature_2m_min[i] ?? 0),
      precipMm: round1(m.precipitation_sum[i] ?? 0),
    }));

    const annual = {
      tempMeanC: round1(avg(monthly.map((x) => x.tempMeanC))),
      tempMaxC: round1(Math.max(...monthly.map((x) => x.tempMaxC))),
      tempMinC: round1(Math.min(...monthly.map((x) => x.tempMinC))),
      precipMm: round1(monthly.reduce((s, x) => s + x.precipMm, 0)),
    };

    return { annual, monthly, dataYear: year, source: 'open-meteo' };
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      log.warn('Climate fetch error', { error: String(err) });
    }
    return null;
  }
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
