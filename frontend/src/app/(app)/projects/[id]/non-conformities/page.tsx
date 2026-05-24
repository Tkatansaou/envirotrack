'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type NCStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type NCGravity = 'MINOR' | 'MAJOR' | 'CRITICAL';

interface NonConformity {
  id: string;
  year: number;
  quarter: number;
  description: string;
  gravity: NCGravity;
  status: NCStatus;
  recommendation: string | null;
  dueDate: string | null;
  createdAt: string;
  measure: { code: string; title: string; phase: string } | null;
}

const GRAVITY_STYLES: Record<NCGravity, { label: string; color: string }> = {
  MINOR: { label: 'Mineure', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  MAJOR: { label: 'Majeure', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'Critique', color: 'bg-red-50 text-red-700 border-red-200' },
};

const STATUS_STYLES: Record<NCStatus, { label: string; color: string }> = {
  OPEN: { label: 'Ouverte', color: 'bg-red-100 text-red-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  CLOSED: { label: 'Clôturée', color: 'bg-green-100 text-green-700' },
};

export default function NonConformitiesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState('');
  const [closing, setClosing] = useState<string | null>(null);

  const {
    data: ncs,
    loading,
    refresh,
  } = useApi<NonConformity[]>(
    `/api/projects/${projectId}/non-conformities${filterStatus ? `?status=${filterStatus}` : ''}`,
  );

  async function closeNC(id: string) {
    setClosing(id);
    try {
      await api(`/api/projects/${projectId}/non-conformities/${id}`, {
        method: 'PATCH',
        body: { status: 'CLOSED' },
      });
      await refresh();
      toast('Non-conformité clôturée.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur.', 'error');
    } finally {
      setClosing(null);
    }
  }

  const openCount = ncs?.filter((nc) => nc.status === 'OPEN').length ?? 0;
  const criticalCount =
    ncs?.filter((nc) => nc.gravity === 'CRITICAL' && nc.status !== 'CLOSED').length ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 mb-2 text-sm text-red-700 font-medium">
              ⚠️ {criticalCount} non-conformité(s) critique(s) en attente
            </div>
          )}
          <p className="text-sm text-gray-500">
            {openCount} ouverte(s) · {ncs?.length ?? 0} total
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/non-conformities/new`}
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
        >
          + Signaler une NC
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['', 'OPEN', 'IN_PROGRESS', 'CLOSED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-green-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'Toutes' : (STATUS_STYLES[s as NCStatus]?.label ?? s)}
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-gray-400 text-sm py-16">Chargement…</div>}

      {!loading && ncs?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-600 font-medium">Aucune non-conformité</p>
          <p className="text-gray-400 text-sm mt-1">Toutes les mesures PGES sont respectées.</p>
        </div>
      )}

      {!loading && ncs && ncs.length > 0 && (
        <div className="space-y-3">
          {ncs.map((nc) => {
            const g = GRAVITY_STYLES[nc.gravity];
            const s = STATUS_STYLES[nc.status];
            const isOverdue =
              nc.dueDate && nc.status !== 'CLOSED' && new Date(nc.dueDate) < new Date();

            return (
              <div key={nc.id} className={`bg-white rounded-xl border p-5 ${g.color}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${g.color}`}
                      >
                        {g.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        T{nc.quarter}/{nc.year}
                      </span>
                      {nc.measure && (
                        <span className="text-xs text-gray-400">
                          · {nc.measure.code} {nc.measure.title}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs text-red-600 font-medium">
                          ⏰ Échéance dépassée
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-800 mb-2">{nc.description}</p>

                    {nc.recommendation && (
                      <p className="text-xs text-gray-600 italic">
                        Recommandation : {nc.recommendation}
                      </p>
                    )}
                    {nc.dueDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        Échéance :{' '}
                        {new Date(nc.dueDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col gap-2 items-end">
                    <span className="text-xs text-gray-400">
                      {new Date(nc.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {nc.status !== 'CLOSED' && (
                      <button
                        onClick={() => closeNC(nc.id)}
                        disabled={closing === nc.id}
                        className="text-xs text-green-700 hover:text-green-800 font-medium transition-colors disabled:opacity-60"
                      >
                        {closing === nc.id ? '…' : 'Clôturer'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
