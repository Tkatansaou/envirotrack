'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Circle,
  FileCheck,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface MeasureStat {
  measure: { id: string; code: string; title: string; phase: string; composante: string };
  counts: { CONFORME: number; NON_CONFORME: number; PARTIEL: number; NON_EVALUE: number };
  totalEntries: number;
  uniqueDays: number;
  coveragePercent: number;
  dominantStatus: string;
}

interface MonthlyReportData {
  year: number;
  month: number;
  daysInMonth: number;
  report: { id: string; status: string; notes: string | null; submittedAt: string | null } | null;
  summary: {
    totalEntries: number;
    conformeCount: number;
    nonConformeCount: number;
    partielCount: number;
    uniqueAgents: number;
    uniqueDaysWithEntries: number;
    globalCoveragePercent: number;
  };
  measureStats: MeasureStat[];
}

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const STATUS_CONFIG = {
  CONFORME: {
    label: 'Conforme',
    bg: 'bg-green-600',
    text: 'text-green-700',
    light: 'bg-green-50',
    badge: 'bg-green-100 text-green-700',
    icon: <CheckCircle size={13} />,
  },
  NON_CONFORME: {
    label: 'Non conforme',
    bg: 'bg-red-600',
    text: 'text-red-700',
    light: 'bg-red-50',
    badge: 'bg-red-100 text-red-700',
    icon: <XCircle size={13} />,
  },
  PARTIEL: {
    label: 'Partiel',
    bg: 'bg-amber-500',
    text: 'text-amber-700',
    light: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    icon: <AlertTriangle size={13} />,
  },
  NON_EVALUE: {
    label: 'Non évalué',
    bg: 'bg-gray-200',
    text: 'text-gray-500',
    light: 'bg-gray-50',
    badge: 'bg-gray-100 text-gray-500',
    icon: <Circle size={13} />,
  },
};

export default function RapportMensuelPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const { data, loading, refresh } = useApi<MonthlyReportData>(
    `/api/projects/${projectId}/reports/monthly?year=${year}&month=${month}`,
  );

  const prevMonth = useCallback(() => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    const nextIsAfterNow = year === now.getFullYear() && month >= now.getMonth() + 1;
    if (nextIsAfterNow) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  }, [month, year, now]);

  async function handleSubmit(action: 'save' | 'submit') {
    setSubmitting(true);
    try {
      await api(`/api/projects/${projectId}/reports/monthly`, {
        method: 'POST',
        body: { year, month, notes, action },
      });
      toast(
        action === 'submit' ? 'Rapport mensuel soumis.' : 'Rapport enregistré en brouillon.',
        'success',
      );
      void refresh();
    } catch {
      toast("Erreur lors de l'enregistrement du rapport.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const isCurrentOrPast =
    year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1);
  const isAfterNow = !isCurrentOrPast;

  return (
    <div className="min-h-full bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-bold text-[#123C24] text-base">Rapport mensuel</h1>
            <p className="text-xs text-gray-500 mt-0.5">Synthèse des relevés journaliers</p>
          </div>
          <Link
            href={`/projects/${projectId}/suivi`}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClipboardList size={13} />
            Saisie du jour
          </Link>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-3 justify-between">
          <button
            onClick={prevMonth}
            className="p-2 text-gray-500 hover:text-[#123C24] hover:bg-green-50 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-900">{MONTH_NAMES[month - 1]}</p>
            <p className="text-xs text-gray-400">{year}</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={isAfterNow || (year === now.getFullYear() && month >= now.getMonth() + 1)}
            className="p-2 text-gray-500 hover:text-[#123C24] hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {loading && (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-8 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </>
        )}

        {!loading && data && (
          <>
            {/* Report status banner */}
            {data.report && (
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-medium ${
                  data.report.status === 'SUBMITTED'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}
              >
                <FileCheck size={14} />
                {data.report.status === 'SUBMITTED'
                  ? `Rapport soumis le ${new Date(data.report.submittedAt!).toLocaleDateString('fr-FR')}`
                  : 'Brouillon enregistré'}
              </div>
            )}

            {/* Global summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-[#123C24]">
                  {data.summary.globalCoveragePercent}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Couverture</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {data.summary.uniqueDaysWithEntries} / {data.daysInMonth} jours
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{data.summary.totalEntries}</p>
                <p className="text-xs text-gray-500 mt-0.5">Relevés saisis</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {data.summary.uniqueAgents} agent{data.summary.uniqueAgents !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Compliance summary bar */}
            {data.summary.totalEntries > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <TrendingUp size={14} className="text-[#123C24]" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Conformité globale
                  </h3>
                </div>
                <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                  {data.summary.conformeCount > 0 && (
                    <div
                      className="bg-green-500 transition-all"
                      style={{
                        width: `${(data.summary.conformeCount / data.summary.totalEntries) * 100}%`,
                      }}
                      title={`Conforme: ${data.summary.conformeCount}`}
                    />
                  )}
                  {data.summary.partielCount > 0 && (
                    <div
                      className="bg-amber-400 transition-all"
                      style={{
                        width: `${(data.summary.partielCount / data.summary.totalEntries) * 100}%`,
                      }}
                      title={`Partiel: ${data.summary.partielCount}`}
                    />
                  )}
                  {data.summary.nonConformeCount > 0 && (
                    <div
                      className="bg-red-500 transition-all"
                      style={{
                        width: `${(data.summary.nonConformeCount / data.summary.totalEntries) * 100}%`,
                      }}
                      title={`Non conforme: ${data.summary.nonConformeCount}`}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />
                    {data.summary.conformeCount} conforme
                    {data.summary.conformeCount !== 1 ? 's' : ''}
                  </span>
                  {data.summary.partielCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                      {data.summary.partielCount} partiel
                      {data.summary.partielCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {data.summary.nonConformeCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
                      {data.summary.nonConformeCount} NC
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Measure breakdown */}
            {data.measureStats.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Détail par mesure
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.measureStats.map((ms) => {
                    const domCfg =
                      STATUS_CONFIG[ms.dominantStatus as keyof typeof STATUS_CONFIG] ??
                      STATUS_CONFIG.NON_EVALUE;
                    return (
                      <div key={ms.measure.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold text-gray-400 font-mono">
                                {ms.measure.code}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-gray-800 leading-tight">
                              {ms.measure.title}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {ms.uniqueDays} jour{ms.uniqueDays !== 1 ? 's' : ''} sur{' '}
                              {ms.coveragePercent}% couverts
                            </p>
                          </div>
                          <span
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${domCfg.badge}`}
                          >
                            {domCfg.icon}
                            {domCfg.label}
                          </span>
                        </div>

                        {/* Mini coverage bar */}
                        {ms.totalEntries > 0 && (
                          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 gap-0.5">
                            {ms.counts.CONFORME > 0 && (
                              <div
                                className="bg-green-500"
                                style={{
                                  width: `${(ms.counts.CONFORME / ms.totalEntries) * 100}%`,
                                }}
                              />
                            )}
                            {ms.counts.PARTIEL > 0 && (
                              <div
                                className="bg-amber-400"
                                style={{ width: `${(ms.counts.PARTIEL / ms.totalEntries) * 100}%` }}
                              />
                            )}
                            {ms.counts.NON_CONFORME > 0 && (
                              <div
                                className="bg-red-500"
                                style={{
                                  width: `${(ms.counts.NON_CONFORME / ms.totalEntries) * 100}%`,
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {data.summary.totalEntries === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                <div className="text-3xl mb-3">📅</div>
                <p className="text-sm font-medium text-gray-700 mb-1">Aucun relevé ce mois-ci</p>
                <p className="text-xs text-gray-400 mb-4">
                  Commencez la collecte journalière pour alimenter ce rapport.
                </p>
                <Link
                  href={`/projects/${projectId}/suivi`}
                  className="inline-flex items-center gap-1.5 bg-[#123C24] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-900 transition-colors"
                >
                  <ClipboardList size={13} />
                  Démarrer la collecte
                </Link>
              </div>
            )}

            {/* Notes + submit */}
            {data.summary.totalEntries > 0 && data.report?.status !== 'SUBMITTED' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Notes du rapport
                </label>
                <textarea
                  value={notes || data.report?.notes || ''}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observations générales, contexte du mois, points d'attention…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] resize-none"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleSubmit('save')}
                    disabled={submitting}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                  >
                    Enregistrer brouillon
                  </button>
                  <button
                    onClick={() => handleSubmit('submit')}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#123C24] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-900 disabled:opacity-60 transition-colors"
                  >
                    <FileCheck size={14} />
                    {submitting ? 'Envoi…' : 'Soumettre le rapport'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  La soumission consolide les données pour le rapport trimestriel PGES.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
