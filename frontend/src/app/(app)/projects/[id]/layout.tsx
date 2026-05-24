'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useApi } from '@/lib/useApi';

interface Project {
  id: string;
  name: string;
  status: string;
  type: string;
  region: string;
  prefecture: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  EIES_SUBMITTED: 'bg-yellow-100 text-yellow-700',
  PGES_TRACKING: 'bg-purple-100 text-purple-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  EIES_SUBMITTED: 'EIES soumise',
  PGES_TRACKING: 'Suivi PGES',
  ARCHIVED: 'Archivé',
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.id as string;
  const pathname = usePathname();

  const { data: project } = useApi<Project>(`/api/projects/${projectId}`);

  const tabs = [
    { href: `/projects/${projectId}`, label: "Vue d'ensemble", exact: true },
    { href: `/projects/${projectId}/checklist`, label: 'Checklist' },
    { href: `/projects/${projectId}/eies`, label: 'EIES' },
    { href: `/projects/${projectId}/pges`, label: 'PGES' },
    { href: `/projects/${projectId}/suivi`, label: 'Suivi terrain' },
    { href: `/projects/${projectId}/non-conformities`, label: 'Non-conformités' },
    { href: `/projects/${projectId}/terrain`, label: 'Données terrain' },
    { href: `/projects/${projectId}/rapport`, label: 'Rapport' },
  ];

  return (
    <div className="min-h-full">
      {/* Project header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link href="/dashboard" className="hover:text-green-700 transition-colors">
                  Tableau de bord
                </Link>
                <span>/</span>
                <span className="truncate max-w-xs">{project?.name ?? '…'}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{project?.name ?? '…'}</h1>
              {project && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {project.region} · {project.prefecture}
                </p>
              )}
            </div>
            {project && (
              <span
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            )}
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-green-700 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>
    </div>
  );
}
