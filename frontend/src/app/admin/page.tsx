'use client';

import Link from 'next/link';
import { useApi } from '@/lib/useApi';

interface Stats {
  users: {
    total: number;
    today: number;
    last7d: number;
    last30d: number;
    growthPct: number | null;
    verified: number;
    active: number;
  };
  projects: { total: number; active: number; byType: Record<string, number> };
  revenue: { total: number; last30d: number; paidOrders30d: number; totalOrders: number };
  credits: { issued: number; consumed: number };
  feedback: {
    total: number;
    pending: number;
    byCategory: Record<string, number>;
    avgRating: number | null;
  };
  recent: {
    users: Array<{
      id: string;
      email: string;
      role: string;
      createdAt: string;
      emailVerifiedAt: string | null;
    }>;
    orders: Array<{
      id: string;
      customerEmail: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
    }>;
    feedback: Array<{
      id: string;
      title: string;
      category: string;
      rating: number | null;
      status: string;
      createdAt: string;
      user: { email: string };
    }>;
  };
}

const TYPE_LABELS: Record<string, string> = {
  ROUTE: 'Route',
  BATIMENT: 'Bâtiment',
  MINE: 'Mine',
  ENERGIE: 'Énergie',
  AGRICULTURE: 'Agriculture',
  AUTRE: 'Autre',
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  BUG: { label: 'Bug', color: 'bg-red-100 text-red-700', icon: '🐛' },
  FEATURE: { label: 'Fonctionnalité', color: 'bg-blue-100 text-blue-700', icon: '✨' },
  UX: { label: 'UX/Design', color: 'bg-purple-100 text-purple-700', icon: '🎨' },
  PERFORMANCE: { label: 'Performance', color: 'bg-orange-100 text-orange-700', icon: '⚡' },
  OTHER: { label: 'Autre', color: 'bg-gray-100 text-gray-600', icon: '💬' },
};

const STATUS_ORDER: Record<string, { label: string; color: string }> = {
  PAID: { label: 'Payée', color: 'bg-green-100 text-green-700' },
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  FAILED: { label: 'Échouée', color: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expirée', color: 'bg-gray-100 text-gray-500' },
};

function KpiCard({
  label,
  value,
  sub,
  color = 'text-gray-900',
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string | undefined;
  color?: string | undefined;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {sub && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              sub.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {sub}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="text-xs text-yellow-500">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function AdminDashboard() {
  const { data: stats, loading } = useApi<Stats>('/api/admin/stats');

  if (loading || !stats) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const s = stats;
  const fcfa = (n: number) => n.toLocaleString('fr-FR') + ' F';

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Vue d&apos;ensemble de la plateforme EnviroTrack
          </p>
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          Mis à jour à l&apos;instant
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Utilisateurs total"
          value={s.users.total.toLocaleString('fr-FR')}
          {...(s.users.today > 0 ? { sub: `+${s.users.today} auj.` } : {})}
          icon="👥"
        />
        <KpiCard
          label="Inscrits (30 j)"
          value={s.users.last30d}
          {...(s.users.growthPct !== null
            ? { sub: `${s.users.growthPct > 0 ? '+' : ''}${s.users.growthPct}%` }
            : {})}
          color="text-blue-700"
          icon="📈"
        />
        <KpiCard
          label="Projets actifs"
          value={s.projects.active}
          sub={`/ ${s.projects.total} total`}
          color="text-purple-700"
          icon="📁"
        />
        <KpiCard
          label="Revenus (30 j)"
          value={fcfa(s.revenue.last30d)}
          sub={`${s.revenue.paidOrders30d} commandes`}
          color="text-green-700"
          icon="💰"
        />
        <KpiCard
          label="Revenus total"
          value={fcfa(s.revenue.total)}
          color="text-green-800"
          icon="💳"
        />
        <KpiCard
          label="Crédits émis"
          value={s.credits.issued.toLocaleString('fr-FR')}
          sub={`${s.credits.consumed.toLocaleString('fr-FR')} consommés`}
          color="text-indigo-700"
          icon="⚡"
        />
        <KpiCard
          label="Feedbacks en attente"
          value={s.feedback.pending}
          {...(s.feedback.avgRating ? { sub: `★ ${s.feedback.avgRating}/5` } : {})}
          color={s.feedback.pending > 0 ? 'text-orange-600' : 'text-gray-900'}
          icon="💬"
        />
        <KpiCard
          label="Comptes vérifiés"
          value={`${Math.round((s.users.verified / Math.max(s.users.total, 1)) * 100)}%`}
          sub={`${s.users.verified} / ${s.users.total}`}
          icon="✅"
        />
      </div>

      {/* Middle row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects by type */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Projets par type</h2>
          <div className="space-y-3">
            {Object.entries(s.projects.byType).length === 0 ? (
              <p className="text-sm text-gray-400">Aucun projet</p>
            ) : (
              Object.entries(s.projects.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const pct = Math.round((count / s.projects.total) * 100);
                  return (
                    <div key={type}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-gray-600">{TYPE_LABELS[type] ?? type}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Feedback by category */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Feedbacks par catégorie</h2>
            <Link href="/admin/feedback" className="text-xs text-green-700 hover:underline">
              Voir tout →
            </Link>
          </div>
          {s.feedback.total === 0 ? (
            <p className="text-sm text-gray-400">Aucun feedback reçu</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const count = s.feedback.byCategory[key] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-lg">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">{cfg.label}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${
                            key === 'BUG'
                              ? 'bg-red-500'
                              : key === 'FEATURE'
                                ? 'bg-blue-500'
                                : key === 'UX'
                                  ? 'bg-purple-500'
                                  : key === 'PERFORMANCE'
                                    ? 'bg-orange-500'
                                    : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.round((count / s.feedback.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {s.feedback.avgRating && (
            <div className="mt-4 rounded-xl bg-yellow-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-yellow-700">{s.feedback.avgRating}/5</p>
              <p className="text-xs text-yellow-600 mt-0.5">Note moyenne plateforme</p>
              <p className="text-lg text-yellow-500 mt-1">
                {'★'.repeat(Math.round(s.feedback.avgRating))}
                {'☆'.repeat(5 - Math.round(s.feedback.avgRating))}
              </p>
            </div>
          )}
        </div>

        {/* Credits */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Crédits plateforme</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Émis</span>
                <span className="font-semibold text-green-700">
                  {s.credits.issued.toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-green-500 w-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Consommés</span>
                <span className="font-semibold text-indigo-700">
                  {s.credits.consumed.toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{
                    width:
                      s.credits.issued > 0
                        ? `${Math.min(Math.round((s.credits.consumed / s.credits.issued) * 100), 100)}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-gray-800">
                {(s.credits.issued - s.credits.consumed).toLocaleString('fr-FR')}
              </p>
              <p className="text-xs text-gray-500">crédits en circulation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent users */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Derniers inscrits</h2>
            <Link href="/admin/users" className="text-xs text-green-700 hover:underline">
              Voir tout →
            </Link>
          </div>
          {s.recent.users.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">Aucun utilisateur</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {s.recent.users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-700">
                    {u.email[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-900">{u.email}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' · '}
                      {u.emailVerifiedAt ? (
                        <span className="text-green-600">vérifié</span>
                      ) : (
                        <span className="text-orange-500">non vérifié</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Dernières commandes</h2>
            <Link href="/admin/orders" className="text-xs text-green-700 hover:underline">
              Voir tout →
            </Link>
          </div>
          {s.recent.orders.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">Aucune commande</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {s.recent.orders.map((o) => {
                const st = STATUS_ORDER[o.status] ?? {
                  label: o.status,
                  color: 'bg-gray-100 text-gray-500',
                };
                return (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-900">
                        {o.customerEmail}
                      </p>
                      <p className="text-xs text-gray-400">
                        {o.amount.toLocaleString('fr-FR')} {o.currency}
                        {' · '}
                        {new Date(o.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}
                    >
                      {st.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent feedback */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Derniers feedbacks</h2>
            <Link href="/admin/feedback" className="text-xs text-green-700 hover:underline">
              Voir tout →
            </Link>
          </div>
          {s.recent.feedback.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-2xl">💬</p>
              <p className="mt-2 text-sm text-gray-400">
                Aucun retour utilisateur pour l&apos;instant
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {s.recent.feedback.map((f) => {
                const cat = CATEGORY_CONFIG[f.category] ?? CATEGORY_CONFIG['OTHER']!;
                return (
                  <li key={f.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="flex-1 truncate text-xs font-medium text-gray-900">{f.title}</p>
                      <Stars rating={f.rating} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cat.color}`}
                      >
                        {cat.icon} {cat.label}
                      </span>
                      <span className="text-[10px] text-gray-400">{f.user.email}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            href: '/admin/users',
            label: 'Gérer les utilisateurs',
            icon: '👥',
            color: 'bg-blue-50 text-blue-700 border-blue-100',
          },
          {
            href: '/admin/orders',
            label: 'Voir les commandes',
            icon: '💳',
            color: 'bg-green-50 text-green-700 border-green-100',
          },
          {
            href: '/admin/feedback',
            label: 'Traiter les feedbacks',
            icon: '💬',
            color: 'bg-purple-50 text-purple-700 border-purple-100',
          },
          {
            href: '/admin/audit',
            label: "Journal d'audit",
            icon: '📋',
            color: 'bg-orange-50 text-orange-700 border-orange-100',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-opacity hover:opacity-80 ${item.color}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
