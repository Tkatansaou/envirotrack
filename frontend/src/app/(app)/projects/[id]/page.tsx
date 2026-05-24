'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  status: string;
  type: string;
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
  organization: { id: string; name: string } | null;
  bailleur: string | null;
  _count: {
    checklist: number;
    eiesSections: number;
    pgesMeasures: number;
    nonConformities: number;
  };
}

interface ChecklistResponse {
  items: { status: string }[];
  stats: Record<string, number>;
}

const TYPE_LABELS: Record<string, string> = {
  ROUTE: '🛣️ Route',
  BATIMENT: '🏗️ Bâtiment',
  MINE: '⛏️ Mine',
  ENERGIE: '⚡ Énergie',
  AGRICULTURE: '🌾 Agriculture',
  AUTRE: '📁 Autre',
};

const FINANCEMENT_LABELS: Record<string, string> = {
  STANDARD: 'National / Budget État',
  BAILLEUR: 'Bailleur international',
};

function formatBudget(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Mds FCFA`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M FCFA`;
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [activating, setActivating] = useState(false);

  const { data: project, loading, refresh } = useApi<Project>(`/api/projects/${projectId}`);
  const { data: checklistData } = useApi<ChecklistResponse>(
    `/api/projects/${projectId}/checklist`,
    { skip: !project },
  );

  async function handleActivate() {
    setActivating(true);
    try {
      await api(`/api/projects/${projectId}/activate`, { method: 'POST' });
      toast('Projet activé avec succès !', 'success');
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erreur lors de l'activation.", 'error');
    } finally {
      setActivating(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce projet ? Cette action est irréversible.')) return;
    try {
      await api(`/api/projects/${projectId}`, { method: 'DELETE' });
      toast('Projet supprimé.', 'success');
      router.push('/dashboard');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la suppression.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-gray-100 p-4 h-24">
              <div className="h-2 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-1.5 bg-gray-100 rounded-full w-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="h-4 bg-gray-100 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n}>
                <div className="h-2 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-sm font-medium text-gray-700">Projet introuvable</p>
        <p className="text-xs text-gray-400 mt-1">Ce projet n&apos;existe pas ou a été supprimé.</p>
        <Link href="/dashboard" className="mt-4 text-xs text-[#123C24] hover:underline">
          ← Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const checklistTotal = checklistData?.items.length ?? project?._count.checklist ?? 0;
  const checklistCompliant = checklistData?.stats['COMPLIANT'] ?? 0;
  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistCompliant / checklistTotal) * 100) : 0;

  const eiesPct =
    project._count.eiesSections > 0 ? Math.round((project._count.eiesSections / 9) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Action banner for DRAFT */}
      {project.status === 'DRAFT' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-amber-800 text-sm">Ce projet est en brouillon</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Complétez la checklist et les sections EIES, puis activez le projet.
            </p>
          </div>
          <button
            onClick={handleActivate}
            disabled={activating}
            className="shrink-0 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition-colors"
          >
            {activating ? 'Activation…' : 'Activer'}
          </button>
        </div>
      )}

      {/* Progress cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ProgressCard
          label="Checklist"
          pct={checklistPct}
          value={`${checklistCompliant}/${checklistTotal}`}
          href={`/projects/${projectId}/checklist`}
          color="green"
        />
        <ProgressCard
          label="EIES"
          pct={eiesPct}
          value={`${project._count.eiesSections}/9 sections`}
          href={`/projects/${projectId}/eies`}
          color="blue"
        />
        <ProgressCard
          label="Mesures PGES"
          pct={0}
          value={`${project._count.pgesMeasures} mesures`}
          href={`/projects/${projectId}/pges`}
          color="purple"
        />
        <ProgressCard
          label="Non-conformités"
          pct={0}
          value={`${project._count.nonConformities} NC`}
          href={`/projects/${projectId}/non-conformities`}
          color={project._count.nonConformities > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Project details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Informations du projet</h2>
          <Link
            href={`/projects/${projectId}/edit`}
            className="text-sm text-green-700 hover:underline"
          >
            Modifier
          </Link>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <InfoField label="Type" value={TYPE_LABELS[project.type] ?? project.type} />
          <InfoField label="Région" value={project.region} />
          <InfoField label="Préfecture" value={project.prefecture} />
          {project.commune && <InfoField label="Commune" value={project.commune} />}
          {project.canton && <InfoField label="Canton" value={project.canton} />}
          <InfoField label="Maître d'ouvrage" value={project.maitreOuvrage} />
          {project.maitreOeuvre && (
            <InfoField label="Maître d'œuvre" value={project.maitreOeuvre} />
          )}
          <InfoField
            label="Financement"
            value={FINANCEMENT_LABELS[project.financement] ?? project.financement}
          />
          {project.financement === 'BAILLEUR' && project.bailleur && (
            <InfoField label="Bailleur" value={project.bailleur} />
          )}
          {project.superficie && (
            <InfoField label="Superficie" value={`${project.superficie} ha`} />
          )}
          {project.budget && <InfoField label="Budget" value={formatBudget(project.budget)} />}
          {project.organization && (
            <InfoField label="Bureau d'études" value={project.organization.name} />
          )}
          <InfoField
            label="Créé le"
            value={new Date(project.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          />
        </dl>
        {project.description && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink
          href={`/projects/${projectId}/checklist`}
          icon="✅"
          label="Ouvrir la checklist"
        />
        <QuickLink href={`/projects/${projectId}/eies`} icon="📄" label="Rédiger l'EIES" />
        <QuickLink href={`/projects/${projectId}/pges`} icon="📊" label="Suivi PGES" />
        <QuickLink
          href={`/projects/${projectId}/non-conformities/new`}
          icon="⚠️"
          label="Signaler une NC"
        />
      </div>

      {/* Danger zone */}
      {project.status === 'DRAFT' && (
        <div className="border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-red-700 mb-1">Zone de danger</h3>
          <p className="text-xs text-gray-500 mb-3">
            La suppression est définitive et ne peut pas être annulée.
          </p>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Supprimer ce projet →
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressCard({
  label,
  pct,
  value,
  href,
  color,
}: {
  label: string;
  pct: number;
  value: string;
  href: string;
  color: 'green' | 'blue' | 'purple' | 'red' | 'gray';
}) {
  const colors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    gray: 'bg-gray-300',
  };
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-200 hover:shadow-sm transition-all"
    >
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className="text-sm font-medium text-gray-800 mb-2">{value}</p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-green-200 hover:shadow-sm transition-all text-sm font-medium text-gray-700"
    >
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  );
}
