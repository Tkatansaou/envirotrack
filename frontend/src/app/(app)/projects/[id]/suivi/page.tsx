'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Circle,
  ChevronDown,
  ChevronUp,
  MapPin,
  BarChart3,
  WifiOff,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type EntryStatus = 'CONFORME' | 'NON_CONFORME' | 'PARTIEL' | 'NON_EVALUE';

interface Measure {
  id: string;
  code: string;
  title: string;
  phase: string;
}

interface FieldEntry {
  measureId: string;
  status: EntryStatus;
  observation: string | null;
}

interface ApiData {
  entries: FieldEntry[];
  measures: Measure[];
}

const STATUS_BTN: Record<
  Exclude<EntryStatus, 'NON_EVALUE'>,
  {
    label: string;
    icon: React.ReactNode;
    selectedBg: string;
    selectedBorder: string;
    textColor: string;
    borderColor: string;
  }
> = {
  CONFORME: {
    label: 'Conforme',
    icon: <CheckCircle size={16} />,
    selectedBg: 'bg-green-600',
    selectedBorder: 'border-green-600',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  PARTIEL: {
    label: 'Partiel',
    icon: <AlertTriangle size={16} />,
    selectedBg: 'bg-amber-500',
    selectedBorder: 'border-amber-500',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  NON_CONFORME: {
    label: 'Non conforme',
    icon: <XCircle size={16} />,
    selectedBg: 'bg-red-600',
    selectedBorder: 'border-red-600',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
};

const CARD_BORDER: Record<EntryStatus, string> = {
  CONFORME: 'border-green-200',
  NON_CONFORME: 'border-red-300',
  PARTIEL: 'border-amber-200',
  NON_EVALUE: 'border-gray-200',
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function SuiviTerrainPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(todayString());
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, EntryStatus>>({});
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<ApiData>(
        `/api/projects/${projectId}/field-entries?date=${selectedDate}`,
      );
      setData(result);
      const newDrafts: Record<string, EntryStatus> = {};
      const newObs: Record<string, string> = {};
      for (const e of result.entries) {
        newDrafts[e.measureId] = e.status;
        if (e.observation) newObs[e.measureId] = e.observation;
      }
      setDrafts(newDrafts);
      setObservations(newObs);
    } catch {
      toast('Impossible de charger les données terrain.', 'error');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedDate, toast]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function submitEntry(measureId: string, status: EntryStatus) {
    setDrafts((d) => ({ ...d, [measureId]: status }));
    setSaving(measureId);
    try {
      await api(`/api/projects/${projectId}/field-entries`, {
        method: 'POST',
        body: {
          measureId,
          entryDate: selectedDate,
          status,
          observation: observations[measureId] ?? undefined,
        },
      });
    } catch {
      toast("Erreur lors de l'enregistrement.", 'error');
      setDrafts((d) => {
        const copy = { ...d };
        delete copy[measureId];
        return copy;
      });
    } finally {
      setSaving(null);
    }
  }

  async function saveObservation(measureId: string) {
    const status = drafts[measureId] ?? 'NON_EVALUE';
    setSaving(measureId);
    try {
      await api(`/api/projects/${projectId}/field-entries`, {
        method: 'POST',
        body: {
          measureId,
          entryDate: selectedDate,
          status,
          observation: observations[measureId] ?? undefined,
        },
      });
      toast('Observation enregistrée.', 'success');
      setExpanded(null);
    } catch {
      toast("Erreur lors de l'enregistrement.", 'error');
    } finally {
      setSaving(null);
    }
  }

  const measures = data?.measures ?? [];
  const totalCount = measures.length;
  const evaluatedCount = measures.filter((m) => {
    const s = drafts[m.id];
    return s && s !== 'NON_EVALUE';
  }).length;

  const conformeCount = Object.values(drafts).filter((s) => s === 'CONFORME').length;
  const partielCount = Object.values(drafts).filter((s) => s === 'PARTIEL').length;
  const ncCount = Object.values(drafts).filter((s) => s === 'NON_CONFORME').length;

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 flex items-center gap-2 text-xs font-medium">
          <WifiOff size={13} />
          <span>Mode hors-ligne — les données seront envoyées à la reconnexion.</span>
        </div>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold text-[#123C24] text-base">Collecte journalière</h1>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{formatDate(selectedDate)}</p>
          </div>
          <Link
            href={`/projects/${projectId}/suivi/mensuel`}
            className="flex items-center gap-1.5 text-xs font-medium text-[#123C24] border border-[#123C24]/30 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            <BarChart3 size={13} />
            Rapport mensuel
          </Link>
        </div>

        {/* Date selector */}
        <input
          type="date"
          value={selectedDate}
          max={todayString()}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24]"
        />

        {/* Progress indicator */}
        {!loading && totalCount > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>
                {evaluatedCount} / {totalCount} mesures évaluées
              </span>
              <span className="font-bold text-[#123C24]">
                {Math.round((evaluatedCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#123C24] rounded-full transition-all duration-500"
                style={{
                  width: `${totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Measure cards */}
      <div className="px-4 py-4 space-y-3">
        {loading && (
          <>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && measures.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm font-medium text-gray-700 mb-1">Aucune mesure PGES</p>
            <p className="text-xs text-gray-400">
              Ajoutez des mesures PGES au projet pour démarrer la collecte.
            </p>
          </div>
        )}

        {!loading &&
          measures.map((measure) => {
            const currentStatus = drafts[measure.id] ?? 'NON_EVALUE';
            const isSavingThis = saving === measure.id;
            const isExpanded = expanded === measure.id;

            return (
              <div
                key={measure.id}
                className={`bg-white rounded-xl border-2 transition-colors ${CARD_BORDER[currentStatus]}`}
              >
                <div className="p-4">
                  {/* Measure info */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {measure.code}
                        </span>
                        <span className="text-[10px] text-gray-400">{measure.phase}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                        {measure.title}
                      </h3>
                    </div>
                    {currentStatus === 'NON_EVALUE' ? (
                      <Circle size={16} className="text-gray-300 shrink-0 mt-0.5" />
                    ) : currentStatus === 'CONFORME' ? (
                      <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                    ) : currentStatus === 'NON_CONFORME' ? (
                      <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Status buttons — large touch targets */}
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(STATUS_BTN) as Exclude<EntryStatus, 'NON_EVALUE'>[]).map((s) => {
                      const cfg = STATUS_BTN[s];
                      const isSelected = currentStatus === s;
                      return (
                        <button
                          key={s}
                          disabled={isSavingThis}
                          onClick={() => submitEntry(measure.id, s)}
                          className={`min-h-[52px] rounded-lg border-2 text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? `${cfg.selectedBg} ${cfg.selectedBorder} text-white`
                              : `bg-white ${cfg.borderColor} ${cfg.textColor} hover:bg-gray-50`
                          } ${isSavingThis ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {cfg.icon}
                          <span className="leading-none">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Observation expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : measure.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors rounded-b-xl"
                >
                  <span>
                    {observations[measure.id] ? (
                      <span className="text-[#123C24] font-medium">Observation ajoutée ✓</span>
                    ) : (
                      'Ajouter une observation…'
                    )}
                  </span>
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <textarea
                      value={observations[measure.id] ?? ''}
                      onChange={(e) =>
                        setObservations((o) => ({ ...o, [measure.id]: e.target.value }))
                      }
                      rows={3}
                      placeholder="Détails, écarts constatés, mesures correctives prises…"
                      className="w-full mt-3 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] resize-none"
                    />
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#123C24] transition-colors">
                        <MapPin size={12} />
                        <span>Géolocalisation GPS</span>
                      </button>
                      <button
                        onClick={() => saveObservation(measure.id)}
                        disabled={isSavingThis}
                        className="flex items-center gap-1.5 bg-[#123C24] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-900 disabled:opacity-60 transition-colors"
                      >
                        <Save size={12} />
                        {isSavingThis ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Fixed bottom summary */}
      {!loading && totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-green-700 font-semibold">
                <CheckCircle size={13} />
                {conformeCount} conforme{conformeCount !== 1 ? 's' : ''}
              </span>
              {partielCount > 0 && (
                <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                  <AlertTriangle size={13} />
                  {partielCount} partiel{partielCount !== 1 ? 's' : ''}
                </span>
              )}
              {ncCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 font-semibold">
                  <XCircle size={13} />
                  {ncCount} NC
                </span>
              )}
            </div>
            <Link
              href={`/projects/${projectId}/suivi/mensuel`}
              className="flex items-center gap-1.5 bg-[#123C24] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-900 transition-colors"
            >
              <BarChart3 size={13} />
              Rapport mensuel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
