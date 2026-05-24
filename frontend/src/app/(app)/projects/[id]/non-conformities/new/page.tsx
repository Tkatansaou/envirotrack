'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface PGESMeasure {
  id: string;
  code: string;
  title: string;
  phase: string;
}

interface PGESResponse {
  measures: PGESMeasure[];
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3);

export default function NewNCPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: pgesData } = useApi<PGESResponse>(`/api/projects/${projectId}/pges`);

  const [form, setForm] = useState({
    measureId: '',
    year: CURRENT_YEAR,
    quarter: CURRENT_QUARTER as 1 | 2 | 3 | 4,
    gravity: 'MAJOR' as 'MINOR' | 'MAJOR' | 'CRITICAL',
    description: '',
    recommendation: '',
    dueDate: '',
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        year: form.year,
        quarter: form.quarter,
        gravity: form.gravity,
        description: form.description,
      };
      if (form.measureId) body.measureId = form.measureId;
      if (form.recommendation.trim()) body.recommendation = form.recommendation;
      if (form.dueDate) body.dueDate = new Date(form.dueDate).toISOString();

      await api(`/api/projects/${projectId}/non-conformities`, {
        method: 'POST',
        body: body,
      });
      toast('Non-conformité signalée.', 'success');
      router.push(`/projects/${projectId}/non-conformities`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link
          href={`/projects/${projectId}/non-conformities`}
          className="hover:text-green-700 transition-colors"
        >
          ← Non-conformités
        </Link>
        <span>/</span>
        <span>Nouvelle NC</span>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-6">Signaler une non-conformité</h2>

      <form onSubmit={onSubmit}>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          {pgesData && pgesData.measures.length > 0 && (
            <div>
              <label className={labelClass}>Mesure PGES concernée</label>
              <select
                value={form.measureId}
                onChange={(e) => setField('measureId', e.target.value)}
                className={inputClass}
              >
                <option value="">— Non liée à une mesure spécifique —</option>
                {pgesData.measures.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.title} ({m.phase})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Année *</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setField('year', parseInt(e.target.value, 10))}
                className={inputClass}
                min={2020}
                max={2100}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Trimestre *</label>
              <select
                value={form.quarter}
                onChange={(e) => setField('quarter', parseInt(e.target.value, 10) as 1 | 2 | 3 | 4)}
                className={inputClass}
                required
              >
                <option value={1}>T1 (Jan–Mar)</option>
                <option value={2}>T2 (Avr–Jun)</option>
                <option value={3}>T3 (Jul–Sep)</option>
                <option value={4}>T4 (Oct–Déc)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Gravité *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['MINOR', 'MAJOR', 'CRITICAL'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setField('gravity', g)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.gravity === g
                      ? g === 'CRITICAL'
                        ? 'bg-red-600 text-white border-red-600'
                        : g === 'MAJOR'
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-yellow-500 text-white border-yellow-500'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {g === 'MINOR' ? 'Mineure' : g === 'MAJOR' ? 'Majeure' : 'Critique'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className={`${inputClass} resize-none`}
              rows={4}
              required
              minLength={10}
              placeholder="Décrivez la non-conformité constatée, sa localisation, son étendue…"
            />
          </div>

          <div>
            <label className={labelClass}>Recommandation / Action corrective</label>
            <textarea
              value={form.recommendation}
              onChange={(e) => setField('recommendation', e.target.value)}
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Actions à entreprendre pour corriger la non-conformité…"
            />
          </div>

          <div>
            <label className={labelClass}>Date d&apos;échéance</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setField('dueDate', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <Link
            href={`/projects/${projectId}/non-conformities`}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Enregistrement…' : 'Signaler la NC'}
          </button>
        </div>
      </form>
    </div>
  );
}
