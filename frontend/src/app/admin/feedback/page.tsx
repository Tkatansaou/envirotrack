'use client';

import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface FeedbackItem {
  id: string;
  category: string;
  rating: number | null;
  title: string;
  body: string;
  page: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; email: string };
}

interface FeedbackPage {
  items: FeedbackItem[];
  nextCursor: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  BUG: { label: 'Bug', color: 'bg-red-100 text-red-700', icon: '🐛' },
  FEATURE: { label: 'Fonctionnalité', color: 'bg-blue-100 text-blue-700', icon: '✨' },
  UX: { label: 'UX/Design', color: 'bg-purple-100 text-purple-700', icon: '🎨' },
  PERFORMANCE: { label: 'Performance', color: 'bg-orange-100 text-orange-700', icon: '⚡' },
  OTHER: { label: 'Autre', color: 'bg-gray-100 text-gray-600', icon: '💬' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Nouveau', color: 'bg-orange-100 text-orange-700' },
  REVIEWED: { label: 'Examiné', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-indigo-100 text-indigo-700' },
  DONE: { label: 'Traité', color: 'bg-green-100 text-green-700' },
  WONT_FIX: { label: 'Non retenu', color: 'bg-gray-100 text-gray-500' },
};

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="text-sm text-yellow-500">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

function FeedbackCard({
  item,
  onUpdate,
}: {
  item: FeedbackItem;
  onUpdate: (id: string, status: string, note: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(item.adminNote ?? '');
  const [status, setStatus] = useState(item.status);
  const [saving, setSaving] = useState(false);

  const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG['OTHER']!;
  const st = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['NEW']!;

  async function save() {
    setSaving(true);
    await onUpdate(item.id, status, note);
    setSaving(false);
  }

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
        item.status === 'NEW' ? 'border-orange-200' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xl mt-0.5 shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>
              {cat.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
              {st.label}
            </span>
            <Stars rating={item.rating} />
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {item.user.email}
            {' · '}
            {new Date(item.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {item.page && (
              <>
                {' '}
                · <span className="font-mono">{item.page}</span>
              </>
            )}
          </p>
        </div>
        <span className="text-gray-300 text-sm shrink-0 mt-1">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Body */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.body}</p>
          </div>

          {/* Admin actions */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Note interne</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Commentaire interne (non visible par l'utilisateur)"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (categoryFilter) params.set('category', categoryFilter);

  const { data, loading, refresh } = useApi<FeedbackPage>(
    `/api/admin/feedback?${params.toString()}`,
  );

  async function handleUpdate(id: string, status: string, adminNote: string) {
    try {
      await api('/api/admin/feedback', {
        method: 'PATCH',
        body: { id, status, adminNote: adminNote || undefined },
      });
      toast('Feedback mis à jour.', 'success');
      await refresh();
    } catch {
      toast('Erreur lors de la mise à jour.', 'error');
    }
  }

  const inputClass =
    'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const pending = data?.items.filter((f) => f.status === 'NEW').length ?? 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedbacks & Observations</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Retours utilisateurs pour l&apos;amélioration continue de la plateforme
          </p>
        </div>
        {pending > 0 && (
          <span className="rounded-full bg-orange-100 px-3 py-1.5 text-sm font-semibold text-orange-700">
            {pending} nouveau{pending > 1 ? 'x' : ''}
          </span>
        )}
      </div>

      {/* Summary bars */}
      {data && data.items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = data.items.filter((f) => f.status === key).length;
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
                <p className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
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
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={inputClass}
        >
          <option value="">Toutes les catégories</option>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.label}
            </option>
          ))}
        </select>
        {(statusFilter || categoryFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setCategoryFilter('');
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Effacer filtres ✕
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <p className="text-4xl">💬</p>
          <p className="mt-3 font-semibold text-gray-700">Aucun feedback</p>
          <p className="mt-1 text-sm text-gray-400">
            Les retours utilisateurs apparaîtront ici dès qu&apos;ils en soumettront.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
            <FeedbackCard key={item.id} item={item} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
