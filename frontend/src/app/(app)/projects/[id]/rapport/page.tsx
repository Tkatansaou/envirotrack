'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useApi } from '@/lib/useApi';

// ── Types ──────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  region: string;
  prefecture: string;
  commune: string | null;
  canton: string | null;
  maitreOuvrage: string;
  maitreOeuvre: string | null;
  financement: string;
  superficie: number | null;
  budget: number | null;
  description: string | null;
  createdAt: string;
  _count: {
    checklist: number;
    eiesSections: number;
    pgesMeasures: number;
    nonConformities: number;
  };
}

interface ChecklistStats {
  items: { status: string }[];
  stats: Record<string, number>;
}

interface EIESProgress {
  sections: { sectionNumber: number; title: string; status: string }[];
  progress: { complete: number; total: number };
}

interface QuarterlyStatus {
  id: string;
  year: number;
  quarter: number;
  status: 'RESPECTED' | 'PARTIALLY' | 'NOT_RESPECTED' | 'NOT_EVALUATED';
  comment: string | null;
  updatedAt: string;
}

interface PGESMeasure {
  id: string;
  code: string;
  title: string;
  phase: string;
  composante: string | null;
  quarterlyStatuses: QuarterlyStatus[];
}

interface PGESSummary {
  measures: PGESMeasure[];
  summary: {
    total: number;
    respected: number;
    partially: number;
    notRespected: number;
    notEvaluated: number;
  };
}

interface NonConformity {
  id: string;
  gravity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  status: string;
  description: string;
  createdAt: string;
  year: number;
  quarter: number;
  measure: { code: string; title: string } | null;
}

type TabId = 'mensuel' | 'trimestriel';

// ── Labels ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  ROUTE: 'Route',
  BATIMENT: 'Bâtiment',
  MINE: 'Mine',
  ENERGIE: 'Énergie',
  AGRICULTURE: 'Agriculture',
  AUTRE: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  EIES_SUBMITTED: 'EIES soumise',
  PGES_TRACKING: 'Suivi PGES',
  ARCHIVED: 'Archivé',
};

const GRAVITY_LABELS: Record<string, { label: string; color: string }> = {
  MINOR: { label: 'Mineure', color: 'text-yellow-700' },
  MAJOR: { label: 'Majeure', color: 'text-orange-600' },
  CRITICAL: { label: 'Critique', color: 'text-red-700' },
};

const NC_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ouverte',
  IN_PROGRESS: 'En cours',
  CLOSED: 'Clôturée',
};

const PGES_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RESPECTED: { label: 'Respectée', color: 'bg-green-100 text-green-700' },
  PARTIALLY: { label: 'Partielle', color: 'bg-yellow-100 text-yellow-700' },
  NOT_RESPECTED: { label: 'Non respectée', color: 'bg-red-100 text-red-700' },
  NOT_EVALUATED: { label: 'Non évaluée', color: 'bg-gray-100 text-gray-500' },
};

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

function currentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

// ── Component ───────────────────────────────────────────────────────────────

export default function RapportPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [tab, setTab] = useState<TabId>('mensuel');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentQ = currentQuarter();

  const { data: project, loading: loadingProject } = useApi<Project>(`/api/projects/${projectId}`);
  const { data: checklistData } = useApi<ChecklistStats>(`/api/projects/${projectId}/checklist`, {
    skip: !project,
  });
  const { data: eiesData } = useApi<EIESProgress>(`/api/projects/${projectId}/eies`, {
    skip: !project,
  });
  const { data: pgesData } = useApi<PGESSummary>(`/api/projects/${projectId}/pges`, {
    skip: !project,
  });
  const { data: ncs } = useApi<NonConformity[]>(`/api/projects/${projectId}/non-conformities`, {
    skip: !project,
  });

  if (loadingProject || !project) {
    return <div className="text-center text-gray-400 text-sm py-16">Chargement…</div>;
  }

  // ── Monthly derived data ─────────────────────────────────────────────────

  const monthStart = new Date(currentYear, currentMonth, 1);
  const ncsThisMonth = ncs?.filter((nc) => new Date(nc.createdAt) >= monthStart) ?? [];
  const ncsOpenedThisMonth = ncsThisMonth.filter((nc) => nc.status !== 'CLOSED');
  const ncsClosedThisMonth = (ncs ?? []).filter((nc) => {
    if (nc.status !== 'CLOSED') return false;
    return new Date(nc.createdAt) >= monthStart;
  });
  const ncsCriticalOpen = (ncs ?? []).filter(
    (nc) => nc.gravity === 'CRITICAL' && nc.status !== 'CLOSED',
  );

  const currentQStatuses =
    pgesData?.measures.flatMap((m) =>
      m.quarterlyStatuses.filter((s) => s.year === currentYear && s.quarter === currentQ),
    ) ?? [];

  const qRespected = currentQStatuses.filter((s) => s.status === 'RESPECTED').length;
  const qPartially = currentQStatuses.filter((s) => s.status === 'PARTIALLY').length;
  const qNotRespected = currentQStatuses.filter((s) => s.status === 'NOT_RESPECTED').length;
  const qTotal = currentQStatuses.length;
  const qCompliancePct =
    qTotal > 0 ? Math.round(((qRespected + qPartially * 0.5) / qTotal) * 100) : null;

  const measuresWithCurrentQ =
    pgesData?.measures.filter((m) =>
      m.quarterlyStatuses.some((s) => s.year === currentYear && s.quarter === currentQ),
    ) ?? [];

  // ── Quarterly derived data ───────────────────────────────────────────────

  const checklistCompliant = checklistData?.stats['COMPLIANT'] ?? 0;
  const checklistTotal = checklistData?.items.length ?? 0;
  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistCompliant / checklistTotal) * 100) : 0;

  const eiesPct = eiesData
    ? Math.round((eiesData.progress.complete / Math.max(eiesData.progress.total, 1)) * 100)
    : 0;

  const pges = pgesData?.summary;
  const pgesCompliance = pges
    ? Math.round(((pges.respected + pges.partially * 0.5) / Math.max(pges.total, 1)) * 100)
    : 0;

  const openNCs = ncs?.filter((nc) => nc.status !== 'CLOSED') ?? [];
  const criticalNCs = openNCs.filter((nc) => nc.gravity === 'CRITICAL');

  return (
    <div className="max-w-3xl">
      {/* Tab switcher */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['mensuel', 'trimestriel'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'mensuel' ? 'Mensuel' : 'Trimestriel'}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
        >
          Imprimer / Exporter PDF
        </button>
      </div>

      {tab === 'mensuel' ? (
        // ── RAPPORT MENSUEL ──────────────────────────────────────────────
        <div className="space-y-6 print:space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                  Rapport mensuel de suivi — EnviroTrack
                </p>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {TYPE_LABELS[project.type] ?? project.type} · {project.region} ·{' '}
                  {project.prefecture}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-sm font-semibold text-green-700">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <span className="block text-xs text-gray-400 mt-0.5">
                  T{currentQ} {currentYear}
                </span>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <div
                className={`text-3xl font-bold ${
                  qCompliancePct === null
                    ? 'text-gray-400'
                    : qCompliancePct >= 80
                      ? 'text-green-700'
                      : qCompliancePct >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                }`}
              >
                {qCompliancePct !== null ? `${qCompliancePct}%` : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Conformité PGES T{currentQ}</p>
              <p className="text-xs text-gray-400">{qTotal} mesures évaluées</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <div
                className={`text-3xl font-bold ${ncsOpenedThisMonth.length > 0 ? 'text-orange-600' : 'text-green-700'}`}
              >
                {ncsOpenedThisMonth.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">NC ouvertes ce mois</p>
              <p className="text-xs text-gray-400">{ncsClosedThisMonth.length} clôturées</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <div
                className={`text-3xl font-bold ${ncsCriticalOpen.length > 0 ? 'text-red-600' : 'text-green-700'}`}
              >
                {ncsCriticalOpen.length}
              </div>
              <p className="text-xs text-gray-500 mt-1">NC critiques ouvertes</p>
              <p className="text-xs text-gray-400">toutes périodes</p>
            </div>
          </div>

          {/* PGES Q current */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Suivi PGES — T{currentQ} {currentYear}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {measuresWithCurrentQ.length} mesure{measuresWithCurrentQ.length !== 1 ? 's' : ''}{' '}
              évaluée{measuresWithCurrentQ.length !== 1 ? 's' : ''} ce trimestre
            </p>

            {measuresWithCurrentQ.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune mesure évaluée pour T{currentQ} {currentYear}.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 text-center mb-5">
                  {[
                    { label: 'Respectées', value: qRespected, color: 'bg-green-50 text-green-700' },
                    {
                      label: 'Partielles',
                      value: qPartially,
                      color: 'bg-yellow-50 text-yellow-700',
                    },
                    { label: 'Non resp.', value: qNotRespected, color: 'bg-red-50 text-red-700' },
                    {
                      label: 'Non éval.',
                      value: qTotal - qRespected - qPartially - qNotRespected,
                      color: 'bg-gray-50 text-gray-500',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-xl p-3 ${color}`}>
                      <div className="text-xl font-bold">{value}</div>
                      <div className="text-xs mt-0.5 opacity-80">{label}</div>
                    </div>
                  ))}
                </div>

                <ul className="space-y-2">
                  {measuresWithCurrentQ.map((m) => {
                    const qs = m.quarterlyStatuses.find(
                      (s) => s.year === currentYear && s.quarter === currentQ,
                    );
                    if (!qs) return null;
                    const style =
                      PGES_STATUS_LABELS[qs.status] ?? PGES_STATUS_LABELS['NOT_EVALUATED']!;
                    return (
                      <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-gray-400 mr-2 text-xs">{m.code}</span>
                          <span className="text-gray-700 truncate">{m.title}</span>
                          {qs.comment && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{qs.comment}</p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${style.color}`}
                        >
                          {style.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* NCs this month */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Non-conformités — {MONTH_NAMES[currentMonth]} {currentYear}
              {ncsThisMonth.length === 0 && (
                <span className="ml-2 text-gray-400 normal-case font-normal">(aucune)</span>
              )}
            </h2>

            {ncsThisMonth.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune non-conformité ce mois-ci.</p>
            ) : (
              <ul className="space-y-3">
                {ncsThisMonth.map((nc) => {
                  const g = GRAVITY_LABELS[nc.gravity] ?? GRAVITY_LABELS['MINOR']!;
                  return (
                    <li
                      key={nc.id}
                      className="flex items-start gap-3 text-sm border-l-2 pl-3 border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`font-semibold ${g.color}`}>{g.label}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">
                            {NC_STATUS_LABELS[nc.status] ?? nc.status}
                          </span>
                          {nc.measure && (
                            <>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500 text-xs">{nc.measure.code}</span>
                            </>
                          )}
                        </div>
                        <p className="text-gray-700">{nc.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(nc.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 pb-4">
            Rapport mensuel EnviroTrack · {MONTH_NAMES[currentMonth]} {currentYear}
          </p>
        </div>
      ) : (
        // ── RAPPORT TRIMESTRIEL ──────────────────────────────────────────
        <div className="space-y-6 print:space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 print:border-0 print:rounded-none print:pb-4 print:border-b print:border-gray-400">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                  Rapport trimestriel de synthèse — EnviroTrack
                </p>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {TYPE_LABELS[project.type] ?? project.type} · {project.region} ·{' '}
                  {project.prefecture}
                  {project.commune ? ` · ${project.commune}` : ''}
                </p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date().toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Project info grid */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 print:border-gray-300">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Informations générales
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Statut', value: STATUS_LABELS[project.status] ?? project.status },
                { label: 'Type', value: TYPE_LABELS[project.type] ?? project.type },
                { label: "Maître d'ouvrage", value: project.maitreOuvrage },
                { label: "Maître d'œuvre", value: project.maitreOeuvre ?? '—' },
                { label: 'Financement', value: project.financement },
                {
                  label: 'Superficie',
                  value: project.superficie
                    ? `${project.superficie.toLocaleString('fr-FR')} ha`
                    : '—',
                },
                {
                  label: 'Budget estimé',
                  value: project.budget ? `${project.budget.toLocaleString('fr-FR')} FCFA` : '—',
                },
                {
                  label: 'Date de création',
                  value: new Date(project.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="text-sm font-medium text-gray-800 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
            {project.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-xs text-gray-400 mb-1">Description</dt>
                <dd className="text-sm text-gray-700">{project.description}</dd>
              </div>
            )}
          </div>

          {/* Progress summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 print:border-gray-300">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Avancement global
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <ProgressBlock
                label="Checklist"
                pct={checklistPct}
                detail={`${checklistCompliant}/${checklistTotal} conformes`}
              />
              <ProgressBlock
                label="EIES"
                pct={eiesPct}
                detail={`${eiesData?.progress.complete ?? 0}/${eiesData?.progress.total ?? 9} sections`}
              />
              <ProgressBlock
                label="PGES"
                pct={pgesCompliance}
                detail={pges ? `${pges.respected} resp. / ${pges.total} mesures` : '—'}
              />
            </div>
          </div>

          {/* EIES sections */}
          {eiesData && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 print:border-gray-300">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Sections EIES
              </h2>
              <ul className="space-y-2">
                {eiesData.sections.map((s) => (
                  <li key={s.sectionNumber} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <span className="text-gray-400 font-mono mr-2">{s.sectionNumber}.</span>
                      {s.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.status === 'COMPLETE'
                          ? 'bg-green-100 text-green-700'
                          : s.status === 'DRAFT'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {s.status === 'COMPLETE'
                        ? '✓ Terminé'
                        : s.status === 'DRAFT'
                          ? 'En cours'
                          : 'Non démarré'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* PGES summary */}
          {pges && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 print:border-gray-300">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Suivi PGES — Récapitulatif cumulé
              </h2>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  {
                    label: 'Respectées',
                    value: pges.respected,
                    color: 'bg-green-50 text-green-700',
                  },
                  {
                    label: 'Partielles',
                    value: pges.partially,
                    color: 'bg-yellow-50 text-yellow-700',
                  },
                  {
                    label: 'Non resp.',
                    value: pges.notRespected,
                    color: 'bg-red-50 text-red-700',
                  },
                  {
                    label: 'Non éval.',
                    value: pges.notEvaluated,
                    color: 'bg-gray-50 text-gray-500',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl p-3 ${color}`}>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs mt-0.5 opacity-80">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-conformities */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 print:border-gray-300">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Non-conformités
              {openNCs.length > 0 && (
                <span className="ml-2 text-red-600 normal-case font-normal">
                  ({openNCs.length} ouverte{openNCs.length > 1 ? 's' : ''})
                </span>
              )}
            </h2>

            {criticalNCs.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                ⚠️ {criticalNCs.length} non-conformité(s) critique(s) en attente
              </div>
            )}

            {!ncs || ncs.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune non-conformité enregistrée.</p>
            ) : (
              <ul className="space-y-3">
                {ncs.map((nc) => {
                  const g = GRAVITY_LABELS[nc.gravity] ?? GRAVITY_LABELS['MINOR']!;
                  return (
                    <li
                      key={nc.id}
                      className="flex items-start gap-3 text-sm border-l-2 pl-3 border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`font-semibold ${g.color}`}>{g.label}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-500">
                            {NC_STATUS_LABELS[nc.status] ?? nc.status}
                          </span>
                          {nc.measure && (
                            <>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500 text-xs">{nc.measure.code}</span>
                            </>
                          )}
                        </div>
                        <p className="text-gray-700">{nc.description}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(nc.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 pb-4 print:block">
            Rapport trimestriel EnviroTrack ·{' '}
            {new Date().toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

function ProgressBlock({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center mb-2">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke={pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'}
            strokeWidth="3"
            strokeDasharray={`${(pct / 100) * 87.96} 87.96`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-sm font-bold text-gray-700">{pct}%</span>
      </div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
    </div>
  );
}
