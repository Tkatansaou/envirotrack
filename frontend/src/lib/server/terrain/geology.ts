import 'server-only';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

export interface GeologyData {
  soil: {
    clayPercent: number | null;
    sandPercent: number | null;
    siltPercent: number | null;
    phH2O: number | null;
    organicCarbonDgKg: number | null;
  };
  seismicity: {
    eventCount: number;
    maxMagnitude: number | null;
    periodYears: number;
  };
  source: 'soilgrids+usgs';
}

interface SoilGridsResponse {
  properties: {
    layers: Array<{
      name: string;
      unit_measure: { d_factor: number };
      depths: Array<{
        label: string;
        values: { mean: number | null };
      }>;
    }>;
  };
}

interface UsgsEarthquakeResponse {
  features: Array<{
    properties: { mag: number };
  }>;
}

export async function fetchGeologyData(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeologyData | null> {
  const [soilResult, seismResult] = await Promise.allSettled([
    fetchSoilGrids(lat, lon, signal),
    fetchSeismicity(lat, lon, signal),
  ]);

  const soil = soilResult.status === 'fulfilled' ? soilResult.value : null;
  const seismicity = seismResult.status === 'fulfilled' ? seismResult.value : null;

  if (!soil && !seismicity) return null;

  return {
    soil: soil ?? {
      clayPercent: null,
      sandPercent: null,
      siltPercent: null,
      phH2O: null,
      organicCarbonDgKg: null,
    },
    seismicity: seismicity ?? { eventCount: 0, maxMagnitude: null, periodYears: 20 },
    source: 'soilgrids+usgs',
  };
}

async function fetchSoilGrids(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeologyData['soil'] | null> {
  const url = new URL('https://rest.soilgrids.org/soilgrids/v2.0/properties/query');
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('property', 'clay,sand,silt,phh2o,soc');
  url.searchParams.set('depth', '0-5cm');
  url.searchParams.set('value', 'mean');

  try {
    const res = await fetch(url.toString(), { signal: signal ?? null });
    if (!res.ok) {
      log.warn('SoilGrids fetch failed', { status: res.status });
      return null;
    }

    const data = (await res.json()) as SoilGridsResponse;
    const layers = data.properties?.layers ?? [];

    function getVal(name: string): number | null {
      const layer = layers.find((l) => l.name === name);
      const raw = layer?.depths[0]?.values?.mean;
      if (raw == null) return null;
      return Math.round((raw / (layer?.unit_measure.d_factor ?? 10)) * 10) / 10;
    }

    return {
      clayPercent: getVal('clay'),
      sandPercent: getVal('sand'),
      siltPercent: getVal('silt'),
      phH2O: getVal('phh2o'),
      organicCarbonDgKg: getVal('soc'),
    };
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      log.warn('SoilGrids fetch error', { error: String(err) });
    }
    return null;
  }
}

async function fetchSeismicity(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GeologyData['seismicity'] | null> {
  const PERIOD_YEARS = 20;
  const startYear = new Date().getFullYear() - PERIOD_YEARS;
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('maxradiuskm', '200');
  url.searchParams.set('minmagnitude', '3.0');
  url.searchParams.set('starttime', `${startYear}-01-01`);
  url.searchParams.set('endtime', new Date().toISOString().split('T')[0]!);
  url.searchParams.set('limit', '50');
  url.searchParams.set('orderby', 'magnitude');

  try {
    const res = await fetch(url.toString(), { signal: signal ?? null });
    if (!res.ok) {
      log.warn('USGS seismicity fetch failed', { status: res.status });
      return null;
    }

    const data = (await res.json()) as UsgsEarthquakeResponse;
    const features = data.features ?? [];
    const maxMag = features.length > 0 ? Math.max(...features.map((f) => f.properties.mag)) : null;

    return {
      eventCount: features.length,
      maxMagnitude: maxMag !== null ? Math.round(maxMag * 10) / 10 : null,
      periodYears: PERIOD_YEARS,
    };
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      log.warn('USGS fetch error', { error: String(err) });
    }
    return null;
  }
}
