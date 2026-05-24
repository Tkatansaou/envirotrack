'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, FolderOpen, FileText, Building2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusBadge } from '@/components/ui/status-badge';

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  type: string;
  region: string;
  prefecture: string;
  maitreOuvrage: string;
  financement: string;
  status: string;
  createdAt: string;
  _count: {
    checklist: number;
    eiesSections: number;
    pgesMeasures: number;
    nonConformities: number;
  };
}

type TabId = 'projets' | 'rapports' | 'bureau';

const STATUS_META: Record<
  string,
  { label: string; variant: 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'purple' }
> = {
  DRAFT: { label: 'Brouillon', variant: 'gray' },
  ACTIVE: { label: 'Actif', variant: 'blue' },
  EIES_SUBMITTED: { label: 'EIES soumise', variant: 'amber' },
  PGES_TRACKING: { label: 'Suivi PGES', variant: 'purple' },
  ARCHIVED: { label: 'Archivé', variant: 'gray' },
};

const TYPE_ICONS: Record<string, string> = {
  ROUTE: '🛣️',
  BATIMENT: '🏗️',
  MINE: '⛏️',
  ENERGIE: '⚡',
  AGRICULTURE: '🌾',
  AUTRE: '📁',
};

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'projets', label: 'Mes Projets', icon: <FolderOpen size={14} /> },
  { id: 'rapports', label: 'Rapports ANGE', icon: <FileText size={14} /> },
  { id: 'bureau', label: 'Mon Bureau', icon: <Building2 size={14} /> },
];

function projectProgress(p: Project): number {
  if (p._count.eiesSections === 0 && p._count.pgesMeasures === 0) return 0;
  const total = p._count.eiesSections + p._count.pgesMeasures;
  if (total === 0) return 0;
  return Math.round((p._count.checklist / Math.max(total, 1)) * 100);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('projets');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api('/api/organizations')
      .then((data: unknown) => {
        const list = data as Org[];
        setOrgs(list);
        if (list.length > 0 && list[0]) setSelectedOrgId(list[0].id);
      })
      .catch(() => toast('Impossible de charger vos organisations.', 'error'));
  }, [toast]);

  const { data: projects, loading } = useApi<Project[]>(
    `/api/projects?orgId=${selectedOrgId ?? ''}`,
    { skip: !selectedOrgId },
  );

  const allActive = useMemo(
    () => projects?.filter((p) => p.status !== 'ARCHIVED') ?? [],
    [projects],
  );
  const archived = useMemo(
    () => projects?.filter((p) => p.status === 'ARCHIVED') ?? [],
    [projects],
  );
  const submitted = useMemo(
    () => projects?.filter((p) => p.status === 'EIES_SUBMITTED') ?? [],
    [projects],
  );

  const tabProjects = activeTab === 'rapports' ? submitted : allActive;

  const filtered = useMemo(() => {
    if (!search.trim()) return tabProjects;
    const q = search.toLowerCase();
    return tabProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.maitreOuvrage.toLowerCase().includes(q),
    );
  }, [tabProjects, search]);

  const ncTotal = allActive.reduce((s, p) => s + p._count.nonConformities, 0);
  const pgesCount = allActive.filter((p) => p.status === 'PGES_TRACKING').length;

  return (
    <div className="min-h-full bg-gray-50">
      {/* Mobile / compact header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-0 md:px-6 md:pt-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-[#123C24] leading-tight">Tableau de bord</h1>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
          {orgs.length > 1 && (
            <select
              value={selectedOrgId ?? ''}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#123C24] text-[#123C24]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'projets' && allActive.length > 0 && (
                <span className="ml-0.5 bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {allActive.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 md:flex md:gap-6 max-w-6xl mx-auto">
        {/* Left / main column */}
        <div className="flex-1 min-w-0">
          {activeTab === 'bureau' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">Paramètres du bureau</p>
              <p className="text-xs text-gray-400 mb-4">
                Gérez les informations de votre bureau et votre équipe.
              </p>
              <Link
                href="/settings/bureau"
                className="inline-flex items-center gap-2 bg-[#123C24] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-900 transition-colors"
              >
                Ouvrir les paramètres
              </Link>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un projet, une région…"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>

              {activeTab === 'rapports' && submitted.length === 0 && !loading && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center mb-4">
                  <FileText size={32} className="mx-auto text-amber-400 mb-2" />
                  <p className="text-sm font-medium text-amber-800">
                    Aucun rapport soumis à l&apos;ANGE
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Les projets au statut &quot;EIES soumise&quot; apparaîtront ici.
                  </p>
                </div>
              )}

              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
                    >
                      <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && activeTab === 'projets' && allActive.length === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Aucun projet actif</p>
                  <p className="text-xs text-gray-400 mb-5">
                    Créez votre premier projet EIES en quelques secondes.
                  </p>
                  <Link
                    href="/projects/new"
                    className="inline-flex items-center gap-2 bg-[#123C24] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-900 transition-colors"
                  >
                    <Plus size={14} />
                    Créer un projet
                  </Link>
                </div>
              )}

              {!loading && filtered.length > 0 && (
                <div className="space-y-3">
                  {filtered.map((project) => {
                    const meta = STATUS_META[project.status] ?? {
                      label: project.status,
                      variant: 'gray' as const,
                    };
                    const pct = projectProgress(project);
                    return (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="text-xl shrink-0 mt-0.5">
                              {TYPE_ICONS[project.type] ?? '📁'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                                {project.name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {project.region} · {project.prefecture}
                              </p>
                            </div>
                          </div>
                          <StatusBadge
                            label={meta.label}
                            variant={meta.variant}
                            className="shrink-0"
                          />
                        </div>

                        <ProgressBar value={pct} className="mb-2.5" />

                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{project._count.eiesSections} sections EIES</span>
                          <div className="flex items-center gap-2">
                            {project._count.nonConformities > 0 && (
                              <span className="flex items-center gap-1 text-red-500 font-medium">
                                <AlertTriangle size={11} />
                                {project._count.nonConformities} NC
                              </span>
                            )}
                            <span>{project._count.pgesMeasures} mesures PGES</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {search && filtered.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-8">
                      Aucun projet ne correspond à &quot;{search}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Archived section */}
              {activeTab === 'projets' && !loading && archived.length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                    {archived.length} projet{archived.length > 1 ? 's' : ''} archivé
                    {archived.length > 1 ? 's' : ''}
                  </summary>
                  <div className="space-y-2 mt-2">
                    {archived.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-2.5 hover:border-gray-200 transition-colors opacity-60"
                      >
                        <span className="text-sm text-gray-600 truncate">{p.name}</span>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{p.region}</span>
                      </Link>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        {/* Right stats panel — desktop only */}
        <aside className="hidden md:flex md:flex-col gap-4 w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Vue d&apos;ensemble
            </h2>
            <div className="space-y-3">
              <StatRow label="Projets actifs" value={allActive.length} color="text-[#123C24]" />
              <StatRow label="Soumis ANGE" value={submitted.length} color="text-amber-600" />
              <StatRow label="Suivi PGES" value={pgesCount} color="text-purple-600" />
              <StatRow
                label="Non-conformités"
                value={ncTotal}
                color={ncTotal > 0 ? 'text-red-600' : 'text-gray-400'}
                icon={ncTotal > 0 ? <AlertTriangle size={12} /> : undefined}
              />
            </div>
          </div>

          <div className="bg-[#123C24] rounded-xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-green-300 mb-1">
              Nouveau projet
            </p>
            <p className="text-xs text-green-200 mb-4 leading-relaxed">
              Lancez une étude EIES ou démarrez un suivi PGES en quelques clics.
            </p>
            <Link
              href="/projects/new"
              className="flex items-center justify-center gap-2 bg-white text-[#123C24] font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-green-50 transition-colors"
            >
              <Plus size={14} />
              Créer un projet
            </Link>
          </div>
        </aside>
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-4 md:hidden">
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-[#123C24] text-white px-4 py-3 rounded-full shadow-lg text-sm font-bold hover:bg-green-900 transition-colors active:scale-95"
        >
          <Plus size={16} />
          Nouveau projet
        </Link>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`flex items-center gap-1 text-sm font-bold ${color}`}>
        {icon}
        {value}
      </span>
    </div>
  );
}
