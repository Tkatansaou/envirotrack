'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type ItemStatus = 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';

interface ChecklistItem {
  id: string;
  code: string;
  article: string;
  description: string;
  category: string;
  status: ItemStatus;
  note: string | null;
  sortOrder: number;
}

interface ChecklistResponse {
  items: ChecklistItem[];
  stats: Record<string, number>;
}

const CATEGORY_LABELS: Record<string, string> = {
  TDR: 'Termes de Référence',
  EIES: "Étude d'Impact",
  PGES: 'Plan de Gestion',
  CONSULTATION: 'Consultation publique',
  ADMINISTRATIF: 'Administratif',
};

const STATUS_OPTIONS: { value: ItemStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'À faire', color: 'bg-gray-100 text-gray-600' },
  { value: 'COMPLIANT', label: 'Conforme', color: 'bg-green-100 text-green-700' },
  { value: 'NON_COMPLIANT', label: 'Non conforme', color: 'bg-red-100 text-red-700' },
  { value: 'NOT_APPLICABLE', label: 'N/A', color: 'bg-gray-50 text-gray-400' },
];

function statusColor(s: ItemStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === s)?.color ?? 'bg-gray-100 text-gray-500';
}

export default function ChecklistPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Record<string, ItemStatus>>({});

  const { data, loading, refresh } = useApi<ChecklistResponse>(
    `/api/projects/${projectId}/checklist`,
  );

  function markPending(itemId: string, status: ItemStatus) {
    setPending((p) => ({ ...p, [itemId]: status }));
  }

  async function saveAll() {
    const items = Object.entries(pending).map(([id, status]) => ({ id, status }));
    if (items.length === 0) return;
    setSaving(true);
    try {
      await api(`/api/projects/${projectId}/checklist`, {
        method: 'PATCH',
        body: { items },
      });
      setPending({});
      await refresh();
      toast('Checklist mise à jour.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 bg-gray-100 rounded w-48" />
            <div className="h-6 bg-gray-100 rounded w-12" />
          </div>
          <div className="h-2 bg-gray-100 rounded-full w-full mb-3" />
          <div className="flex gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-2 bg-gray-100 rounded w-20" />
            ))}
          </div>
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
            <div className="divide-y divide-gray-50">
              {[1, 2, 3, 4].map((m) => (
                <div key={m} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 rounded w-16 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                  </div>
                  <div className="h-6 bg-gray-100 rounded-full w-20 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { items, stats } = data;
  const total = items.length;
  const compliant = stats['COMPLIANT'] ?? 0;
  const nonCompliant = stats['NON_COMPLIANT'] ?? 0;
  const na = stats['NOT_APPLICABLE'] ?? 0;
  const pct = total > 0 ? Math.round(((compliant + na) / total) * 100) : 0;

  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(item);
    return acc;
  }, {});

  const hasPending = Object.keys(pending).length > 0;

  return (
    <div>
      {/* Progress header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Progression — {compliant}/{total} items conformes
            </p>
            {na > 0 && <p className="text-xs text-gray-400">{na} non applicables exclus</p>}
          </div>
          <span className="text-2xl font-bold text-green-700">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {compliant} conformes
          </span>
          {nonCompliant > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              {nonCompliant} non conformes
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
            {stats['PENDING'] ?? 0} à faire
          </span>
        </div>
      </div>

      {hasPending && (
        <div className="sticky top-4 z-10 flex justify-end mb-4">
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-lg hover:bg-green-800 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Sauvegarde…' : `Enregistrer (${Object.keys(pending).length})`}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">
                {CATEGORY_LABELS[cat] ?? cat}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({catItems.length} items)
                </span>
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {catItems.map((item) => {
                const currentStatus = pending[item.id] ?? item.status;
                return (
                  <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-gray-400">{item.code}</span>
                        <span className="text-xs text-gray-400">{item.article}</span>
                      </div>
                      <p className="text-sm text-gray-800">{item.description}</p>
                      {item.note && (
                        <p className="text-xs text-gray-500 mt-1 italic">{item.note}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <select
                        value={currentStatus}
                        onChange={(e) => markPending(item.id, e.target.value as ItemStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 ${statusColor(currentStatus)}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
