'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Circle,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface EIESField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'list';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
}

interface EIESSectionDef {
  sectionNumber: number;
  title: string;
  description: string;
  article: string;
  fields: EIESField[];
}

interface EIESSectionRow {
  id: string;
  sectionNumber: number;
  title: string;
  status: string;
  content: Record<string, unknown>;
  updatedAt: string;
}

interface SectionResponse {
  section: EIESSectionRow;
  definition: EIESSectionDef;
}

const TOTAL_SECTIONS = 9;

const STATUS_CONFIG = {
  COMPLETE: {
    label: 'Terminé',
    icon: <CheckCircle size={14} className="text-green-600" />,
    badgeClass: 'bg-green-100 text-green-700',
  },
  DRAFT: {
    label: 'En cours',
    icon: <Clock size={14} className="text-blue-500" />,
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  EMPTY: {
    label: 'Non démarré',
    icon: <Circle size={14} className="text-gray-300" />,
    badgeClass: 'bg-gray-100 text-gray-500',
  },
} as const;

export default function EIESSectionPage() {
  const params = useParams();
  const projectId = params.id as string;
  const sectionNum = params.section as string;
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data, loading } = useApi<SectionResponse>(
    `/api/projects/${projectId}/eies/${sectionNum}`,
  );

  useEffect(() => {
    if (data?.section.content) {
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.section.content)) {
        initial[k] = String(v ?? '');
      }
      setValues(initial);
      setDirty(false);
    }
  }, [data]);

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  }

  async function save(complete = false) {
    setSaving(true);
    try {
      const content: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v.trim()) content[k] = v;
      }
      await api(`/api/projects/${projectId}/eies/${sectionNum}`, {
        method: 'PUT',
        body: {
          content,
          ...(complete ? { status: 'COMPLETE' } : {}),
        },
      });
      setDirty(false);
      toast(complete ? 'Section marquée comme terminée.' : 'Section sauvegardée.', 'success');
      if (complete) router.push(`/projects/${projectId}/eies`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 pb-24">
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="h-3 bg-gray-100 rounded w-1/4 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { section, definition } = data;
  const sectionIndex = parseInt(sectionNum, 10);
  const hasPrev = sectionIndex > 1;
  const hasNext = sectionIndex < TOTAL_SECTIONS;
  const statusKey =
    (section.status as keyof typeof STATUS_CONFIG) in STATUS_CONFIG
      ? (section.status as keyof typeof STATUS_CONFIG)
      : 'EMPTY';
  const statusCfg = STATUS_CONFIG[statusKey];

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors';

  return (
    <div className="pb-28">
      {/* Section header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Link
            href={`/projects/${projectId}/eies`}
            className="flex items-center gap-1 hover:text-[#123C24] transition-colors"
          >
            <ArrowLeft size={12} />
            EIES
          </Link>
          <span>/</span>
          <span className="text-gray-500">Section {sectionIndex}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-[#123C24]/10 flex items-center justify-center text-[#123C24] font-bold text-sm">
            {sectionIndex}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-base leading-tight">{definition.title}</h2>
            {definition.article && (
              <p className="text-xs text-gray-400 mt-0.5">{definition.article}</p>
            )}
            {definition.description && (
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {definition.description}
              </p>
            )}
          </div>
          <div
            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${statusCfg.badgeClass}`}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 mr-1.5">Sections</span>
          {Array.from({ length: TOTAL_SECTIONS }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/projects/${projectId}/eies/${n}`}
              title={`Section ${n}`}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                n === sectionIndex
                  ? 'bg-[#123C24] text-white scale-110'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {n}
            </Link>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {definition.fields.map((field) => (
          <div key={field.key} className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.hint && <p className="text-xs text-gray-400 italic mb-2">{field.hint}</p>}

            {field.type === 'textarea' && (
              <textarea
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                className={`${inputClass} resize-none`}
                rows={5}
                placeholder={field.placeholder}
              />
            )}

            {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
              <input
                type={field.type}
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                className={inputClass}
                placeholder={field.placeholder}
              />
            )}

            {field.type === 'select' && field.options && (
              <select
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                className={inputClass}
              >
                <option value="">— Sélectionner —</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'list' && (
              <textarea
                value={values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                className={`${inputClass} resize-none`}
                rows={4}
                placeholder={field.placeholder ?? 'Une entrée par ligne…'}
              />
            )}
          </div>
        ))}

        {definition.fields.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-sm text-gray-400">Aucun champ configuré pour cette section.</p>
          </div>
        )}
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 md:static md:mt-6 bg-white border-t border-gray-200 md:border md:rounded-xl px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Prev */}
          <div>
            {hasPrev ? (
              <Link
                href={`/projects/${projectId}/eies/${sectionIndex - 1}`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Section</span> {sectionIndex - 1}
              </Link>
            ) : (
              <div />
            )}
          </div>

          {/* Center actions */}
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                <Save size={13} />
                <span className="hidden sm:inline">Brouillon</span>
              </button>
            )}
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex items-center gap-1.5 bg-[#123C24] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-900 disabled:opacity-60 transition-colors"
            >
              <CheckCircle size={14} />
              {saving ? '…' : 'Marquer terminé'}
            </button>
          </div>

          {/* Next */}
          <div>
            {hasNext ? (
              <Link
                href={`/projects/${projectId}/eies/${sectionIndex + 1}`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="hidden sm:inline">Section</span> {sectionIndex + 1}
                <ChevronRight size={14} />
              </Link>
            ) : (
              <Link
                href={`/projects/${projectId}/eies`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#123C24] border border-[#123C24]/30 rounded-lg hover:bg-green-50 transition-colors font-medium"
              >
                Voir EIES
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
