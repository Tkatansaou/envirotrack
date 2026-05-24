'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { WifiOff, CheckCircle, AlertTriangle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type QStatus = 'RESPECTED' | 'PARTIALLY' | 'NOT_RESPECTED' | 'NOT_EVALUATED';

interface QuarterlyStatus {
  id: string;
  measureId: string;
  year: number;
  quarter: number;
  status: QStatus;
  comment: string | null;
}

interface PGESMeasure {
  id: string;
  code: string;
  title: string;
  description: string;
  phase: string;
  composante: string;
  responsable: string | null;
  cout: number | null;
  sortOrder: number;
  quarterlyStatuses: QuarterlyStatus[];
}

interface PGESResponse {
  measures: PGESMeasure[];
  summary: {
    total: number;
    respected: number;
    partially: number;
    notRespected: number;
    notEvaluated: number;
  };
}

const Q_STATUS_CONFIG: Record<
  QStatus,
  { label: string; shortLabel: string; badgeClass: string; dotClass: string; borderClass: string }
> = {
  RESPECTED: {
    label: 'Respecté',
    shortLabel: 'CONFORME',
    badgeClass: 'bg-[#123C24] text-white',
    dotClass: 'bg-green-500',
    borderClass: 'border-gray-200',
  },
  PARTIALLY: {
    label: 'Partiel',
    shortLabel: 'PARTIEL',
    badgeClass: 'bg-amber-100 text-amber-800',
    dotClass: 'bg-amber-400',
    borderClass: 'border-amber-300',
  },
  NOT_RESPECTED: {
    label: 'Non respecté',
    shortLabel: 'NON-CONFORME',
    badgeClass: 'bg-red-600 text-white',
    dotClass: 'bg-red-500',
    borderClass: 'border-red-500',
  },
  NOT_EVALUATED: {
    label: 'Non évalué',
    shortLabel: 'N/É',
    badgeClass: 'bg-gray-100 text-gray-500',
    dotClass: 'bg-gray-200',
    borderClass: 'border-gray-200',
  },
};

const CURRENT_YEAR = new Date().getFullYear();
const QUARTERS = [1, 2, 3, 4] as const;

function currentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

export default function PGESPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  const [filterPhase, setFilterPhase] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editCell, setEditCell] = useState<{
    measureId: string;
    year: number;
    quarter: number;
  } | null>(null);
  const [editStatus, setEditStatus] = useState<QStatus>('NOT_EVALUATED');
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const { data, loading, refresh } = useApi<PGESResponse>(
    `/api/projects/${projectId}/pges${filterPhase ? `?phase=${filterPhase}` : ''}`,
  );

  function openEdit(measure: PGESMeasure, year: number, quarter: number) {
    const existing = measure.quarterlyStatuses.find(
      (s) => s.year === year && s.quarter === quarter,
    );
    setEditCell({ measureId: measure.id, year, quarter });
    setEditStatus(existing?.status ?? 'NOT_EVALUATED');
    setEditComment(existing?.comment ?? '');
  }

  async function submitEdit() {
    if (!editCell) return;
    setSaving(true);
    try {
      await api(`/api/projects/${projectId}/pges/${editCell.measureId}/status`, {
        method: 'PUT',
        body: {
          year: editCell.year,
          quarter: editCell.quarter,
          status: editStatus,
          ...(editComment ? { comment: editComment } : {}),
        },
      });
      setEditCell(null);
      await refresh();
      if (editStatus === 'NOT_RESPECTED') {
        toast('Statut enregistré. Une non-conformité a été créée automatiquement.', 'error');
      } else {
        toast('Statut enregistré.', 'success');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {isOffline && <OfflineBanner />}
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { measures, summary } = data;
  const phases = [...new Set(measures.map((m) => m.phase))];
  const cq = currentQuarter();

  return (
    <div className="pb-24">
      {/* Offline banner */}
      {isOffline && <OfflineBanner />}

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Respectées" value={summary.respected} dotClass="bg-green-500" />
        <SummaryCard label="Partielles" value={summary.partially} dotClass="bg-amber-400" />
        <SummaryCard
          label="Non respectées"
          value={summary.notRespected}
          dotClass="bg-red-500"
          urgent
        />
        <SummaryCard label="Non évaluées" value={summary.notEvaluated} dotClass="bg-gray-300" />
      </div>

      {/* Phase filter */}
      {phases.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4 overflow-x-auto pb-1">
          <FilterChip
            active={filterPhase === ''}
            onClick={() => setFilterPhase('')}
            label="Toutes"
          />
          {phases.map((ph) => (
            <FilterChip
              key={ph}
              active={filterPhase === ph}
              onClick={() => setFilterPhase(ph)}
              label={ph}
            />
          ))}
        </div>
      )}

      {/* Context: current quarter indicator */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
        <span className="w-2 h-2 rounded-full bg-[#123C24] shrink-0" />
        <span>
          Trimestre en cours :{' '}
          <strong className="text-[#123C24]">
            T{cq} {CURRENT_YEAR}
          </strong>
        </span>
      </div>

      {/* Measure cards */}
      <div className="space-y-3">
        {measures.map((measure) => {
          const currentQS = measure.quarterlyStatuses.find(
            (s) => s.year === CURRENT_YEAR && s.quarter === cq,
          );
          const currentStatus = (currentQS?.status ?? 'NOT_EVALUATED') as QStatus;
          const cfg = Q_STATUS_CONFIG[currentStatus];
          const isExpanded = expandedId === measure.id;
          const isNonConform = currentStatus === 'NOT_RESPECTED';
          const isPartial = currentStatus === 'PARTIALLY';

          return (
            <div
              key={measure.id}
              className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${cfg.borderClass}`}
            >
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {measure.code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-medium">
                        {measure.phase}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                      {measure.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isNonConform ? (
                      <AlertTriangle size={14} className="text-red-500" />
                    ) : currentStatus === 'RESPECTED' ? (
                      <CheckCircle size={14} className="text-green-600" />
                    ) : null}
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider ${cfg.badgeClass}`}
                    >
                      {cfg.shortLabel}
                    </span>
                  </div>
                </div>

                {/* Non-conform alert */}
                {isNonConform && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 text-xs text-red-800">
                    <AlertTriangle size={11} className="shrink-0 text-red-500" />
                    <span>Non-conformité détectée — fiche créée automatiquement.</span>
                  </div>
                )}
                {isPartial && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 text-xs text-amber-800">
                    <AlertTriangle size={11} className="shrink-0 text-amber-500" />
                    <span>Mise en conformité partielle — actions correctives requises.</span>
                  </div>
                )}

                {/* Quick quarter buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    {CURRENT_YEAR}
                  </span>
                  <div className="flex gap-1.5 flex-1">
                    {QUARTERS.map((q) => {
                      const qs = measure.quarterlyStatuses.find(
                        (s) => s.year === CURRENT_YEAR && s.quarter === q,
                      );
                      const st = (qs?.status ?? 'NOT_EVALUATED') as QStatus;
                      const qCfg = Q_STATUS_CONFIG[st];
                      const isCurrent = q === cq;
                      return (
                        <button
                          key={q}
                          onClick={() => openEdit(measure, CURRENT_YEAR, q)}
                          className={`flex-1 flex flex-col items-center py-1.5 rounded-lg border text-[10px] font-bold transition-all min-h-[44px] justify-center ${
                            isCurrent
                              ? 'border-[#123C24] ring-1 ring-[#123C24]/30'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full mb-1 ${qCfg.dotClass}`} />
                          <span className="text-gray-500">T{q}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : measure.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={isExpanded ? 'Réduire' : 'Détails'}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 text-xs text-gray-600 space-y-1.5">
                  {measure.description && <p>{measure.description}</p>}
                  <div className="flex gap-4 flex-wrap">
                    <span className="text-gray-400">
                      Composante : <strong className="text-gray-700">{measure.composante}</strong>
                    </span>
                    {measure.responsable && (
                      <span className="text-gray-400">
                        Responsable :{' '}
                        <strong className="text-gray-700">{measure.responsable}</strong>
                      </span>
                    )}
                    {measure.cout !== null && (
                      <span className="text-gray-400">
                        Coût :{' '}
                        <strong className="text-gray-700">
                          {measure.cout.toLocaleString('fr-FR')} FCFA
                        </strong>
                      </span>
                    )}
                  </div>
                  {/* Previous year dots */}
                  {measure.quarterlyStatuses.some((s) => s.year === CURRENT_YEAR - 1) && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-gray-400">{CURRENT_YEAR - 1} :</span>
                      {QUARTERS.map((q) => {
                        const qs = measure.quarterlyStatuses.find(
                          (s) => s.year === CURRENT_YEAR - 1 && s.quarter === q,
                        );
                        if (!qs) return null;
                        return (
                          <span
                            key={q}
                            title={`T${q} — ${Q_STATUS_CONFIG[qs.status].label}`}
                            className={`inline-block w-2.5 h-2.5 rounded-full ${Q_STATUS_CONFIG[qs.status].dotClass}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {measures.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-400">Aucune mesure PGES pour ce filtre.</p>
        </div>
      )}

      {/* Bottom action panel */}
      <div className="fixed bottom-0 left-0 right-0 md:static md:mt-6 bg-white border-t-2 border-gray-200 px-4 py-3 flex flex-col gap-2">
        <Link
          href={`/projects/${projectId}/non-conformities/new`}
          className="w-full bg-[#123C24] text-white font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-2 uppercase tracking-wider hover:bg-green-900 transition-colors active:scale-[0.98]"
        >
          <Plus size={14} />
          Ajouter un écart / alerte
        </Link>
        <p className="text-center text-[10px] text-gray-400">
          Suivi des mesures d&apos;atténuation — {measures.length} mesure
          {measures.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Edit modal */}
      {editCell && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-0.5">
              Évaluation T{editCell.quarter} / {editCell.year}
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {measures.find((m) => m.id === editCell.measureId)?.title}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.keys(Q_STATUS_CONFIG) as QStatus[]).map((s) => {
                const cfg = Q_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px] ${
                      editStatus === s
                        ? 'border-[#123C24] bg-[#123C24]/5 text-[#123C24]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotClass}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Commentaire (optionnel)
              </label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#123C24]"
                rows={3}
                placeholder="Observations, actions correctives…"
              />
            </div>

            {editStatus === 'NOT_RESPECTED' && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 rounded-xl text-xs text-red-700 border border-red-200">
                <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-500" />
                <span>
                  Une fiche de non-conformité sera créée automatiquement à l&apos;enregistrement.
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditCell(null)}
                className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitEdit}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#123C24] text-white rounded-xl hover:bg-green-900 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OfflineBanner() {
  return (
    <div className="bg-[#123C24] text-white px-4 py-2 flex items-center justify-between text-xs font-mono mb-4 rounded-lg">
      <div className="flex items-center gap-2">
        <WifiOff size={12} className="text-amber-400" />
        <span className="font-bold">MODE HORS-LIGNE ACTIF</span>
      </div>
      <span className="text-green-300 text-[10px]">Données enregistrées localement</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  dotClass,
  urgent,
}: {
  label: string;
  value: number;
  dotClass: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-3 ${urgent && value > 0 ? 'border-red-200' : 'border-gray-200'}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-[10px] text-gray-500 truncate">{label}</span>
      </div>
      <div
        className={`text-xl font-bold ${urgent && value > 0 ? 'text-red-600' : 'text-gray-800'}`}
      >
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#123C24] text-white'
          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
