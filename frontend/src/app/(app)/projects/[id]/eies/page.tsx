'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Circle, AlertTriangle, Download, Clock } from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { ProgressBar } from '@/components/ui/progress-bar';

type SectionStatus = 'EMPTY' | 'DRAFT' | 'COMPLETE';

interface EIESSectionSummary {
  id: string;
  sectionNumber: number;
  title: string;
  status: SectionStatus;
  updatedAt: string;
  article?: string;
  description?: string;
  fieldCount: number;
}

interface EIESResponse {
  sections: EIESSectionSummary[];
  progress: { complete: number; total: number };
}

const STATUS_CONFIG: Record<
  SectionStatus,
  {
    label: string;
    badgeClass: string;
    borderClass: string;
    icon: React.ReactNode;
    showAlert: boolean;
  }
> = {
  COMPLETE: {
    label: 'Validé',
    badgeClass: 'bg-green-100 text-green-800',
    borderClass: 'border-gray-200',
    icon: <CheckCircle size={14} className="text-green-600" />,
    showAlert: false,
  },
  DRAFT: {
    label: 'À corriger',
    badgeClass: 'bg-amber-100 text-amber-800',
    borderClass: 'border-amber-300',
    icon: <AlertTriangle size={14} className="text-amber-500" />,
    showAlert: true,
  },
  EMPTY: {
    label: 'Vide',
    badgeClass: 'bg-gray-100 text-gray-500',
    borderClass: 'border-gray-200',
    icon: <Circle size={14} className="text-gray-300" />,
    showAlert: false,
  },
};

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function EIESListPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { data, loading } = useApi<EIESResponse>(`/api/projects/${projectId}/eies`);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { sections, progress } = data;
  const pct = progress.total > 0 ? Math.round((progress.complete / progress.total) * 100) : 0;
  const draftCount = sections.filter((s) => s.status === 'DRAFT').length;

  return (
    <div className="pb-20">
      {/* Progress card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {progress.complete} / {progress.total} sections terminées
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Décret 2017-040/PR — {progress.total} sections obligatoires
            </p>
          </div>
          <span className="text-2xl font-bold text-[#123C24]">{pct}%</span>
        </div>
        <ProgressBar value={pct} />

        {draftCount > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            <AlertTriangle size={12} className="shrink-0 text-amber-500" />
            <span>
              <strong>
                {draftCount} section{draftCount > 1 ? 's' : ''}
              </strong>{' '}
              nécessite{draftCount > 1 ? 'nt' : ''} des corrections avant soumission à l&apos;ANGE.
            </span>
          </div>
        )}
      </div>

      {/* Guide banner */}
      <div className="bg-[#123C24]/5 border border-[#123C24]/20 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
        <span className="text-lg shrink-0">📝</span>
        <div>
          <p className="text-xs font-bold text-[#123C24]">Saisie et reformatage automatisé</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Remplace Word / Excel — chaque section génère un chapitre conforme au format ANGE.
          </p>
        </div>
      </div>

      {/* Section cards */}
      <div className="space-y-3">
        {sections.map((section) => {
          const cfg = STATUS_CONFIG[section.status] ?? STATUS_CONFIG['EMPTY'];
          return (
            <Link
              key={section.id}
              href={`/projects/${projectId}/eies/${section.sectionNumber}`}
              className={`block bg-white rounded-xl border-2 ${cfg.borderClass} p-4 hover:shadow-sm transition-all active:scale-[0.99]`}
            >
              {/* Section header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#123C24]/10 flex items-center justify-center text-[#123C24] font-bold text-sm">
                    {section.sectionNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                      {section.title}
                    </h3>
                    {section.article && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{section.article}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {cfg.icon}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* ANGE alert for DRAFT sections */}
              {cfg.showAlert && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 text-xs text-amber-800">
                  <AlertTriangle size={11} className="shrink-0 text-amber-500" />
                  <span>Commentaire ANGE en attente de correction</span>
                </div>
              )}

              {section.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{section.description}</p>
              )}

              {/* Footer meta */}
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  {section.fieldCount} champ{section.fieldCount !== 1 ? 's' : ''}
                </span>
                {section.status !== 'EMPTY' && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    Modifié {formatRelativeDate(section.updatedAt)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {sections.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-500">Aucune section EIES configurée pour ce projet.</p>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 md:static md:mt-6 bg-white border-t border-gray-200 md:border md:rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-semibold text-[#123C24]">Rapport d&apos;EIES complet</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-400">{pct}% rédigé</span>
        </div>
        <Link
          href={`/projects/${projectId}/rapport`}
          className="flex items-center gap-1.5 bg-[#123C24] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap"
        >
          <Download size={12} />
          Voir le rapport
        </Link>
      </div>
    </div>
  );
}
