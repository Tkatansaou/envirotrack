'use client';

import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}

interface UsersPage {
  items: User[];
  nextCursor: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  USER: { label: 'Utilisateur', color: 'bg-gray-100 text-gray-600' },
  ADMIN: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
  SUPERADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Inactif', color: 'bg-gray-100 text-gray-500' },
  BANNED: { label: 'Banni', color: 'bg-red-100 text-red-700' },
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (statusFilter) params.set('status', statusFilter);
  if (roleFilter) params.set('role', roleFilter);

  const { data, loading, refresh } = useApi<UsersPage>(`/api/admin/users?${params.toString()}`);

  async function changeStatus(userId: string, status: string) {
    setActionLoading(userId + status);
    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: { status },
      });
      toast('Statut mis à jour.', 'success');
      await refresh();
    } catch {
      toast('Erreur lors de la mise à jour.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const inputClass =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {data
            ? `${data.items.length} résultat${data.items.length !== 1 ? 's' : ''}`
            : 'Chargement…'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par email ou nom…"
          className={`${inputClass} w-72`}
        />
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
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Tous les rôles</option>
          {Object.entries(ROLE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl">👥</p>
            <p className="mt-3 font-medium text-gray-600">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Utilisateur', 'Rôle', 'Statut', 'Inscription', 'Vérifié', 'Actions'].map((h) => (
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
              {data.items.map((user) => {
                const role = ROLE_CONFIG[user.role] ?? ROLE_CONFIG['USER']!;
                const status = STATUS_CONFIG[user.status] ?? STATUS_CONFIG['ACTIVE']!;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-700">
                          {user.email[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.email}</p>
                          {user.name && <p className="text-xs text-gray-400">{user.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${role.color}`}
                      >
                        {role.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      {user.emailVerifiedAt ? (
                        <span className="text-green-600 text-xs">✓ Vérifié</span>
                      ) : (
                        <span className="text-orange-500 text-xs">En attente</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {user.status !== 'BANNED' ? (
                        <button
                          onClick={() => changeStatus(user.id, 'BANNED')}
                          disabled={actionLoading === user.id + 'BANNED'}
                          className="rounded-lg px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          Bannir
                        </button>
                      ) : (
                        <button
                          onClick={() => changeStatus(user.id, 'ACTIVE')}
                          disabled={actionLoading === user.id + 'ACTIVE'}
                          className="rounded-lg px-2.5 py-1 text-xs text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
                        >
                          Réactiver
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
