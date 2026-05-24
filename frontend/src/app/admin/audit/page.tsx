'use client';

import { useState } from 'react';
import { useApi } from '@/lib/useApi';

interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditPage {
  items: AuditEntry[];
  nextCursor: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  'user.ban': 'bg-red-100 text-red-700',
  'user.unban': 'bg-green-100 text-green-700',
  'user.role_change': 'bg-purple-100 text-purple-700',
  'withdrawal.cancel': 'bg-orange-100 text-orange-700',
  'feedback.update': 'bg-blue-100 text-blue-700',
};

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600';
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    'user.ban': 'Bannissement',
    'user.unban': 'Réactivation',
    'user.role_change': 'Changement rôle',
    'withdrawal.cancel': 'Retrait annulé',
    'feedback.update': 'Feedback mis à jour',
  };
  return map[action] ?? action;
}

function MetadataCell({ data }: { data: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return <span className="text-gray-300">—</span>;
  const preview = Object.entries(data)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ');
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-blue-600 hover:underline">
        {open ? '▲ Masquer' : `▼ ${preview.slice(0, 40)}…`}
      </button>
      {open && (
        <pre className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-600 whitespace-pre-wrap max-w-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

const TARGET_ICONS: Record<string, string> = {
  User: '👤',
  Withdrawal: '💸',
  Feedback: '💬',
  Order: '💳',
};

export default function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const params = new URLSearchParams();
  if (actionFilter) params.set('action', actionFilter);
  if (targetTypeFilter) params.set('targetType', targetTypeFilter);
  if (since) params.set('since', since);
  if (until) params.set('until', until);

  const { data, loading } = useApi<AuditPage>(`/api/admin/audit-log?${params.toString()}`);

  const inputClass =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

  const hasFilter = actionFilter || targetTypeFilter || since || until;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Journal d&apos;audit</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Toutes les actions administratives — traçabilité complète et immuable.
        </p>
      </div>

      {/* Stats */}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.keys(ACTION_COLORS).map((key) => {
            const count = data.items.filter((e) => e.action === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setActionFilter(actionFilter === key ? '' : key)}
                className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
                  actionFilter === key
                    ? 'border-green-300 bg-green-50 ring-2 ring-green-400'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionColor(key)}`}
                >
                  {actionLabel(key)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Toutes les actions</option>
          {Object.keys(ACTION_COLORS).map((k) => (
            <option key={k} value={k}>
              {actionLabel(k)}
            </option>
          ))}
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Tous les types</option>
          {Object.keys(TARGET_ICONS).map((k) => (
            <option key={k} value={k}>
              {TARGET_ICONS[k]} {k}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          className={inputClass}
          title="Depuis"
        />
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className={inputClass}
          title="Jusqu'au"
        />
        {hasFilter && (
          <button
            onClick={() => {
              setActionFilter('');
              setTargetTypeFilter('');
              setSince('');
              setUntil('');
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Effacer ✕
          </button>
        )}
      </div>

      {/* Log */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-4xl">📋</p>
          <p className="mt-3 font-semibold text-gray-700">Aucune entrée d&apos;audit</p>
          <p className="mt-1 text-sm text-gray-400">
            Les actions administratives apparaîtront ici dès qu&apos;elles seront effectuées.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Date', 'Action', 'Cible', 'Acteur', 'Détails', 'IP'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map((entry) => {
                  const targetIcon = entry.targetType
                    ? (TARGET_ICONS[entry.targetType] ?? '📄')
                    : null;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${actionColor(entry.action)}`}
                        >
                          {actionLabel(entry.action)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {targetIcon && (
                          <span className="flex items-center gap-1.5">
                            {targetIcon}
                            <span>
                              {entry.targetType}
                              {entry.targetId && (
                                <span className="ml-1 font-mono text-gray-400">
                                  #{entry.targetId.slice(0, 8)}
                                </span>
                              )}
                            </span>
                          </span>
                        )}
                        {!targetIcon && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-500">
                          {entry.actorId.slice(0, 10)}…
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <MetadataCell data={entry.metadata} />
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono">
                        {entry.ip ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.nextCursor && (
        <p className="text-center text-xs text-gray-400">
          Affichage limité à {data.items.length} entrées. Affinez les filtres pour voir plus.
        </p>
      )}
    </div>
  );
}
