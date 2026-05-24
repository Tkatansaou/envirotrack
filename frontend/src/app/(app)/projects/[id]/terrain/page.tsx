'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Locate, Loader2, MapPin } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { TerrainDataResponse } from '@/app/api/projects/[id]/terrain-data/route';

const MONTH_LABELS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Jun',
  'Jul',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

export default function TerrainPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  function useGps() {
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLon(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            'Accès GPS refusé. Autorisez la localisation dans les paramètres du navigateur.',
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('Position GPS indisponible. Vérifiez que le GPS est activé.');
        } else {
          setGpsError(
            "Impossible d'obtenir la position. Réessayez ou entrez les coordonnées manuellement.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const { data, loading, refresh } = useApi<TerrainDataResponse>(
    `/api/projects/${projectId}/terrain-data`,
  );

  async function saveCoords(e: React.FormEvent) {
    e.preventDefault();
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) {
      toast('Coordonnées invalides.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: { latitude: latN, longitude: lonN },
      });
      toast('Coordonnées enregistrées.', 'success');
      void refresh();
    } catch {
      toast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-40"
          />
        ))}
      </div>
    );
  }

  if (!data?.coords) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
            <MapPin size={24} className="text-[#123C24]" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">Coordonnées GPS requises</p>
          <p className="text-sm text-gray-500 mb-5">
            Entrez la latitude et longitude du site pour charger les données terrain (climat, faune,
            sol…).
          </p>

          {/* Auto-locate button */}
          <button
            type="button"
            onClick={useGps}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 bg-[#123C24] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#0f2d1c] disabled:opacity-60 transition-colors mb-4"
          >
            {locating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Localisation en cours…
              </>
            ) : (
              <>
                <Locate size={16} />
                Me localiser automatiquement
              </>
            )}
          </button>

          {/* GPS error */}
          {gpsError && (
            <div className="mb-4 flex items-start gap-2 text-left bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{gpsError}</span>
            </div>
          )}

          {/* GPS success indicator */}
          {(lat || lon) && !gpsError && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
              <MapPin size={12} className="shrink-0 text-[#123C24]" />
              <span className="font-mono">
                {lat}, {lon}
              </span>
              <span className="text-green-600 ml-auto">Position détectée ✓</span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou saisir manuellement</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={saveCoords} className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="ex: 6.137"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="ex: 1.222"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || (!lat && !lon)}
              className="w-full bg-gray-800 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Sauvegarde…' : 'Valider et charger les données'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { coords, climate, biodiversity, socioeconomic, geology } = data;
  const hottestMonth = climate
    ? MONTH_LABELS[
        climate.monthly.reduce(
          (best, m) => (m.tempMeanC > (climate.monthly[best]?.tempMeanC ?? 0) ? m.month - 1 : best),
          0,
        )
      ]
    : null;
  const wettestMonth = climate
    ? MONTH_LABELS[
        climate.monthly.reduce(
          (best, m) => (m.precipMm > (climate.monthly[best]?.precipMm ?? 0) ? m.month - 1 : best),
          0,
        )
      ]
    : null;

  return (
    <div className="space-y-5">
      {/* Coordinates header */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
          <MapPin size={14} className="text-[#123C24] shrink-0" />
          <span className="font-mono text-xs truncate">
            {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setLocating(true);
              setGpsError(null);
              navigator.geolocation?.getCurrentPosition(
                async (pos) => {
                  const latN = parseFloat(pos.coords.latitude.toFixed(6));
                  const lonN = parseFloat(pos.coords.longitude.toFixed(6));
                  setLat(String(latN));
                  setLon(String(lonN));
                  setLocating(false);
                  try {
                    await api(`/api/projects/${projectId}`, {
                      method: 'PATCH',
                      body: { latitude: latN, longitude: lonN },
                    });
                    toast('Position mise à jour.', 'success');
                    void refresh();
                  } catch {
                    toast('Erreur lors de la mise à jour.', 'error');
                  }
                },
                () => {
                  setLocating(false);
                  toast("Impossible d'obtenir la position GPS.", 'error');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
              );
            }}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs text-[#123C24] hover:text-green-800 font-medium transition-colors disabled:opacity-50"
          >
            {locating ? <Loader2 size={12} className="animate-spin" /> : <Locate size={12} />}
            <span className="hidden sm:inline">{locating ? 'Localisation…' : 'Relocaliser'}</span>
          </button>
          <button
            onClick={() => {
              setLat(String(coords.lat));
              setLon(String(coords.lon));
              void refresh();
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Modifier
          </button>
        </div>
      </div>

      {/* Climate */}
      <ThemeCard
        icon="🌡️"
        title="Climat"
        source="Open-Meteo"
        {...(climate?.dataYear !== undefined ? { year: climate.dataYear } : {})}
        empty={!climate}
      >
        {climate && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Temp. moyenne" value={`${climate.annual.tempMeanC}°C`} />
              <Metric label="Temp. max" value={`${climate.annual.tempMaxC}°C`} accent="orange" />
              <Metric label="Temp. min" value={`${climate.annual.tempMinC}°C`} accent="blue" />
              <Metric
                label="Précipitations"
                value={`${climate.annual.precipMm} mm/an`}
                accent="blue"
              />
            </div>
            <div className="text-xs text-gray-500 flex gap-4 flex-wrap">
              {hottestMonth && (
                <span>
                  Mois le plus chaud : <strong>{hottestMonth}</strong>
                </span>
              )}
              {wettestMonth && (
                <span>
                  Mois le plus pluvieux : <strong>{wettestMonth}</strong>
                </span>
              )}
            </div>
            {/* Monthly bar chart — precipitation */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Précipitations mensuelles (mm)</p>
              <div className="flex items-end gap-1 h-16">
                {climate.monthly.map((m) => {
                  const maxPrecip = Math.max(...climate.monthly.map((x) => x.precipMm), 1);
                  const pct = (m.precipMm / maxPrecip) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full bg-blue-400 rounded-t"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        title={`${MONTH_LABELS[m.month - 1]}: ${m.precipMm}mm`}
                      />
                      <span className="text-[9px] text-gray-400">{MONTH_LABELS[m.month - 1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </ThemeCard>

      {/* Biodiversity */}
      <ThemeCard
        icon="🌿"
        title="Faune & Végétation"
        source="GBIF + IUCN Red List"
        empty={!biodiversity}
      >
        {biodiversity && (
          <div className="space-y-4">
            <Metric
              label="Observations biologiques au Togo"
              value={biodiversity.totalObservations.toLocaleString('fr-FR')}
              large
            />
            {Object.keys(biodiversity.byKingdom).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Répartition par règne</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(biodiversity.byKingdom)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([kingdom, count]) => (
                      <div
                        key={kingdom}
                        className="bg-green-50 border border-green-100 rounded-lg px-3 py-1.5"
                      >
                        <div className="text-xs font-medium text-green-800">{kingdom}</div>
                        <div className="text-xs text-green-600">
                          {count.toLocaleString('fr-FR')}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {biodiversity.iucn && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Espèces menacées au Togo (IUCN)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-red-700">{biodiversity.iucn.CR}</div>
                    <div className="text-xs text-red-500">En danger critique</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-orange-600">{biodiversity.iucn.EN}</div>
                    <div className="text-xs text-orange-500">En danger</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-yellow-700">{biodiversity.iucn.VU}</div>
                    <div className="text-xs text-yellow-600">Vulnérable</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ThemeCard>

      {/* Socioeconomic */}
      <ThemeCard
        icon="👥"
        title="Données socio-économiques"
        source="Banque Mondiale"
        {...(socioeconomic?.year !== undefined ? { year: socioeconomic.year } : {})}
        empty={!socioeconomic}
      >
        {socioeconomic && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {socioeconomic.population && (
              <Metric
                label="Population Togo"
                value={`${(socioeconomic.population / 1_000_000).toFixed(1)} M`}
              />
            )}
            {socioeconomic.gdpPerCapitaUsd && (
              <Metric
                label="PIB / habitant"
                value={`$${Math.round(socioeconomic.gdpPerCapitaUsd).toLocaleString('fr-FR')}`}
              />
            )}
            {socioeconomic.waterAccessPercent != null && (
              <Metric
                label="Accès eau potable"
                value={`${socioeconomic.waterAccessPercent.toFixed(1)}%`}
                accent={socioeconomic.waterAccessPercent > 60 ? 'green' : 'orange'}
              />
            )}
            {socioeconomic.electricityAccessPercent != null && (
              <Metric
                label="Accès électricité"
                value={`${socioeconomic.electricityAccessPercent.toFixed(1)}%`}
                accent={socioeconomic.electricityAccessPercent > 50 ? 'green' : 'orange'}
              />
            )}
            {socioeconomic.povertyPercent != null && (
              <Metric
                label="Taux pauvreté"
                value={`${socioeconomic.povertyPercent.toFixed(1)}%`}
                accent="red"
              />
            )}
          </div>
        )}
      </ThemeCard>

      {/* Geology */}
      <ThemeCard
        icon="🪨"
        title="Géologie & Sol"
        source="SoilGrids (ISRIC) + USGS"
        empty={!geology}
      >
        {geology && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Composition du sol (0–5 cm)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {geology.soil.clayPercent != null && (
                  <Metric label="Argile" value={`${geology.soil.clayPercent}%`} />
                )}
                {geology.soil.sandPercent != null && (
                  <Metric label="Sable" value={`${geology.soil.sandPercent}%`} />
                )}
                {geology.soil.siltPercent != null && (
                  <Metric label="Limon" value={`${geology.soil.siltPercent}%`} />
                )}
                {geology.soil.phH2O != null && (
                  <Metric label="pH" value={String(geology.soil.phH2O)} />
                )}
                {geology.soil.organicCarbonDgKg != null && (
                  <Metric
                    label="Carbone organique"
                    value={`${geology.soil.organicCarbonDgKg} dg/kg`}
                  />
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Sismicité (rayon 200 km, {geology.seismicity.periodYears} dernières années, M≥3)
              </p>
              <div className="flex items-center gap-4">
                <Metric
                  label="Séismes enregistrés"
                  value={String(geology.seismicity.eventCount)}
                  accent={geology.seismicity.eventCount > 10 ? 'red' : 'green'}
                />
                {geology.seismicity.maxMagnitude != null && (
                  <Metric
                    label="Magnitude max"
                    value={`M ${geology.seismicity.maxMagnitude}`}
                    accent={geology.seismicity.maxMagnitude > 5 ? 'red' : 'orange'}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </ThemeCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ThemeCard({
  icon,
  title,
  source,
  year,
  empty,
  children,
}: {
  icon: string;
  title: string;
  source: string;
  year?: number;
  empty: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <span className="text-xs text-gray-400">
          {source}
          {year ? ` · ${year}` : ''}
        </span>
      </div>
      {empty ? (
        <p className="text-sm text-gray-400 italic">
          Données non disponibles pour cette localisation.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent = 'gray',
  large = false,
}: {
  label: string;
  value: string;
  accent?: 'gray' | 'green' | 'blue' | 'orange' | 'red';
  large?: boolean;
}) {
  const colors: Record<string, string> = {
    gray: 'text-gray-800',
    green: 'text-green-700',
    blue: 'text-blue-700',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div
        className={`${large ? 'text-2xl' : 'text-lg'} font-bold ${colors[accent] ?? colors.gray}`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
