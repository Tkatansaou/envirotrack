'use client';

import { useState } from 'react';
import { useApi } from '@/lib/useApi';

interface Order {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string | null;
  provider: string | null;
  providerChargeId: string | null;
  paymentMethod: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface OrdersPage {
  items: Order[];
  nextCursor: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-orange-100 text-orange-700' },
  PAID: { label: 'Payé', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expiré', color: 'bg-gray-100 text-gray-500' },
  REFUNDED: { label: 'Remboursé', color: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-500' },
};

const PROVIDER_ICONS: Record<string, string> = {
  bictorys: '🏦',
  moneroo: '📱',
  stripe: '💳',
  paytech: '💵',
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
}

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (since) params.set('since', since);
  if (until) params.set('until', until);

  const { data, loading } = useApi<OrdersPage>(`/api/admin/orders?${params.toString()}`);

  const inputClass =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

  const totalPaid =
    data?.items.filter((o) => o.status === 'PAID').reduce((sum, o) => sum + o.amount, 0) ?? 0;

  const currency = data?.items[0]?.currency ?? 'FCFA';

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data
              ? `${data.items.length} commande${data.items.length !== 1 ? 's' : ''} · ${formatAmount(totalPaid, currency)} encaissés`
              : 'Chargement…'}
          </p>
        </div>
      </div>

      {/* Status summary */}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = data.items.filter((o) => o.status === key).length;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                className={`rounded-xl border p-3 text-center transition-all hover:shadow-sm ${
                  statusFilter === key
                    ? 'border-green-300 bg-green-50 ring-2 ring-green-400'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className={`mt-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                  {cfg.label}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
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
        {(statusFilter || since || until) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setSince('');
              setUntil('');
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Effacer ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl">💳</p>
            <p className="mt-3 font-medium text-gray-600">Aucune commande trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Client', 'Montant', 'Statut', 'Fournisseur', 'Méthode', 'Date', 'Payé le'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map((order) => {
                  const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING']!;
                  const providerIcon = order.provider
                    ? (PROVIDER_ICONS[order.provider] ?? '💳')
                    : '—';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {order.customerEmail ?? order.userId.slice(0, 8) + '…'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{order.id.slice(0, 12)}…</p>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">
                        {formatAmount(order.amount, order.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        <span className="flex items-center gap-1.5">
                          {providerIcon}
                          <span className="capitalize">{order.provider ?? '—'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {order.paymentMethod ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {order.paidAt ? (
                          new Date(order.paidAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.nextCursor && (
        <p className="text-center text-xs text-gray-400">
          Affichage limité à {data.items.length} entrées. Affinez les filtres pour voir plus.
        </p>
      )}
    </div>
  );
}
