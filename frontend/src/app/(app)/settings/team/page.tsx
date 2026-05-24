'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useToast } from '@/contexts/ToastContext';

interface Org {
  id: string;
  name: string;
  role: string;
}

interface Member {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
  isCurrentUser: boolean;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER: { label: 'Propriétaire', color: 'bg-purple-50 text-purple-700' },
  ADMIN: { label: 'Administrateur', color: 'bg-blue-50 text-blue-700' },
  MEMBER: { label: 'Membre', color: 'bg-gray-100 text-gray-600' },
};

const ROLE_ICONS: Record<string, string> = {
  OWNER: '👑',
  ADMIN: '🔧',
  MEMBER: '👤',
};

function avatarColor(email: string) {
  const colors = [
    'bg-green-100 text-green-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-100 text-teal-700',
  ];
  return colors[email.charCodeAt(0) % colors.length]!;
}

export default function TeamSettingsPage() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api('/api/organizations')
      .then((data: unknown) => {
        const list = data as Org[];
        setOrgs(list);
        if (list.length > 0 && list[0]) setSelectedOrgId(list[0].id);
      })
      .catch(() => toast('Impossible de charger les organisations.', 'error'))
      .finally(() => setLoadingOrgs(false));
  }, [toast]);

  const {
    data: members,
    loading,
    refresh,
  } = useApi<Member[]>(`/api/organizations/${selectedOrgId ?? ''}/members`, {
    skip: !selectedOrgId,
  });

  const currentOrg = orgs.find((o) => o.id === selectedOrgId);
  const isOwner = currentOrg?.role === 'OWNER';
  const isAdmin = currentOrg?.role === 'ADMIN' || isOwner;

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!selectedOrgId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api(`/api/organizations/${selectedOrgId}/members`, {
        method: 'POST',
        body: { email: inviteEmail.trim(), role: inviteRole },
      });
      toast(`${inviteEmail} ajouté à l'équipe.`, 'success');
      setInviteEmail('');
      setShowInvite(false);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(
        msg.includes('USER_NOT_FOUND')
          ? 'Aucun compte EnviroTrack trouvé avec cet email.'
          : msg.includes('ALREADY_MEMBER')
            ? 'Cet utilisateur est déjà membre.'
            : msg,
        'error',
      );
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, role: 'ADMIN' | 'MEMBER') {
    if (!selectedOrgId) return;
    setActionLoading(userId);
    try {
      await api(`/api/organizations/${selectedOrgId}/members`, {
        method: 'PATCH',
        body: { userId, role },
      });
      await refresh();
      toast('Rôle mis à jour.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function removeMember(userId: string, email: string) {
    if (!selectedOrgId) return;
    if (!confirm(`Retirer ${email} de l'équipe ?`)) return;
    setActionLoading(userId);
    try {
      await api(`/api/organizations/${selectedOrgId}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      await refresh();
      toast('Membre retiré.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  // Loading skeleton
  if (loadingOrgs) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-100" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  // No org — redirect prompt
  if (orgs.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les membres de votre bureau</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl">
            👥
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Aucun bureau enregistré</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
            Créez d&apos;abord votre bureau d&apos;études pour pouvoir inviter des membres.
          </p>
          <Link
            href="/settings/bureau"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800 transition-colors shadow-sm"
          >
            <span>🏢</span>
            <span>Créer mon bureau</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez les membres de votre bureau</p>
        </div>
        {isAdmin && !showInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="shrink-0 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
          >
            + Ajouter un membre
          </button>
        )}
      </div>

      {/* Org selector (multi-org) */}
      {orgs.length > 1 && (
        <div className="mb-5">
          <select
            value={selectedOrgId ?? ''}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className={inputClass}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Invite form */}
      {showInvite && isAdmin && (
        <form
          onSubmit={handleInvite}
          className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-green-800">Ajouter un membre</h3>
          <p className="text-xs text-green-700">
            L&apos;utilisateur doit déjà avoir un compte EnviroTrack.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemple.com"
              required
              className="flex-1 border border-green-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="border border-green-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="MEMBER">Membre</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowInvite(false);
                setInviteEmail('');
              }}
              className="rounded-lg border border-green-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {inviting ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {/* Member list */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && members && members.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {members.length} membre{members.length !== 1 ? 's' : ''}
            </span>
            {currentOrg && <span className="text-xs text-gray-400">{currentOrg.name}</span>}
          </div>

          <ul className="divide-y divide-gray-50">
            {members.map((member) => {
              const roleStyle = ROLE_LABELS[member.role] ?? ROLE_LABELS['MEMBER']!;
              const icon = ROLE_ICONS[member.role] ?? '👤';
              const isLoading = actionLoading === member.userId;
              const canModify = isOwner && !member.isCurrentUser && member.role !== 'OWNER';

              return (
                <li key={member.id} className="flex items-center gap-3 px-5 py-4">
                  {/* Avatar */}
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(member.email)}`}
                  >
                    {member.email[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {member.email}
                      </span>
                      {member.isCurrentUser && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          vous
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Depuis le{' '}
                      {new Date(member.joinedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-2 shrink-0">
                    {canModify ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          changeRole(member.userId, e.target.value as 'ADMIN' | 'MEMBER')
                        }
                        disabled={isLoading}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
                      >
                        <option value="ADMIN">Administrateur</option>
                        <option value="MEMBER">Membre</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleStyle.color}`}
                      >
                        <span>{icon}</span>
                        {roleStyle.label}
                      </span>
                    )}

                    {canModify && (
                      <button
                        onClick={() => removeMember(member.userId, member.email)}
                        disabled={isLoading}
                        title="Retirer ce membre"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? (
                          <span className="text-xs">…</span>
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Empty members */}
      {!loading && members && members.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="font-medium text-gray-700">Aucun membre</p>
          <p className="text-sm text-gray-400 mt-1">
            {isAdmin
              ? 'Ajoutez des collaborateurs à votre bureau.'
              : "Votre bureau n'a pas encore de membres."}
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
            >
              + Ajouter le premier membre
            </button>
          )}
        </div>
      )}

      {!isOwner && members && members.length > 0 && (
        <p className="mt-4 text-center text-xs text-gray-400">
          Seul le propriétaire peut modifier les rôles et retirer des membres.
        </p>
      )}
    </div>
  );
}
