'use client';

import { useRef, useState } from 'react';
import type { ExtractedFields } from '@/lib/server/documents/extract';
import { useToast } from '@/contexts/ToastContext';
import { COOKIE_PREFIX } from '@/lib/constants';

function getCsrfToken(): string | null {
  const name = `${COOKIE_PREFIX}-csrf`;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|; )${escaped}=([^;]*)`).exec(document.cookie);
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

// The API wraps the fields in { fields: ExtractedFields }
interface ExtractResponse {
  fields: ExtractedFields;
}

// Scalar fields that map directly to project form inputs
const FIELD_LABELS: Partial<Record<keyof ExtractedFields, string>> = {
  projectName: 'Nom du projet',
  projectType: 'Type de projet',
  region: 'Région',
  prefecture: 'Préfecture',
  canton: 'Canton',
  maitreOuvrage: "Maître d'ouvrage",
  financement: 'Financement',
  description: 'Description',
  superficie: 'Superficie (ha)',
  latitude: 'Latitude GPS',
  longitude: 'Longitude GPS',
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  ROUTE: '🛣️ Route / Infrastructure routière',
  BATIMENT: '🏗️ Bâtiment / Construction',
  MINE: '⛏️ Mine / Carrière',
  ENERGIE: '⚡ Énergie / Électricité',
  AGRICULTURE: '🌾 Agriculture / Agro-industrie',
  AUTRE: '📁 Autre',
};

export interface AppliedFields {
  projectName?: string;
  projectType?: string;
  region?: string;
  prefecture?: string;
  canton?: string;
  maitreOuvrage?: string;
  financement?: string;
  description?: string;
  superficie?: number;
  latitude?: number;
  longitude?: number;
}

interface Props {
  onApply: (fields: AppliedFields) => void;
  className?: string;
}

export default function DocumentImportButton({ onApply, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [extracted, setExtracted] = useState<ExtractedFields | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  async function handleFile(file: File) {
    setStatus('uploading');
    const body = new FormData();
    body.append('file', file);

    try {
      const headers: Record<string, string> = {};
      const csrf = getCsrfToken();
      if (csrf) headers['x-csrf-token'] = csrf;
      const res = await fetch('/api/documents/extract', { method: 'POST', body, headers });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string; message?: string };
        if (err.error === 'EXTRACTION_NOT_CONFIGURED') {
          toast(
            'Ajoutez ANTHROPIC_API_KEY dans .env.local pour activer cette fonctionnalité.',
            'error',
          );
        } else {
          toast("Erreur lors de l'extraction. Vérifiez le format du document.", 'error');
        }
        setStatus('idle');
        return;
      }

      const data = (await res.json()) as ExtractResponse;
      setExtracted(data.fields);
      // Pre-check all non-null scalar fields
      const initial = new Set<string>();
      for (const key of Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]) {
        if (data.fields[key] != null) initial.add(key);
      }
      setChecked(initial);
      setStatus('done');
      setOpen(true);
    } catch {
      toast("Erreur réseau lors de l'extraction.", 'error');
      setStatus('idle');
    }
  }

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function apply() {
    if (!extracted) return;
    const fields: AppliedFields = {};
    if (checked.has('projectName') && extracted.projectName)
      fields.projectName = extracted.projectName;
    if (checked.has('projectType') && extracted.projectType)
      fields.projectType = extracted.projectType;
    if (checked.has('region') && extracted.region) fields.region = extracted.region;
    if (checked.has('prefecture') && extracted.prefecture) fields.prefecture = extracted.prefecture;
    if (checked.has('canton') && extracted.canton) fields.canton = extracted.canton;
    if (checked.has('maitreOuvrage') && extracted.maitreOuvrage)
      fields.maitreOuvrage = extracted.maitreOuvrage;
    if (checked.has('financement') && extracted.financement)
      fields.financement = extracted.financement;
    if (checked.has('description') && extracted.description)
      fields.description = extracted.description;
    if (checked.has('superficie') && extracted.superficie != null)
      fields.superficie = extracted.superficie;
    if (checked.has('latitude') && extracted.latitude != null) fields.latitude = extracted.latitude;
    if (checked.has('longitude') && extracted.longitude != null)
      fields.longitude = extracted.longitude;

    onApply(fields);
    setOpen(false);
    toast(`${Object.keys(fields).length} champ(s) rempli(s) automatiquement.`, 'success');
  }

  function formatValue(key: string, val: unknown): string {
    if (key === 'projectType' && typeof val === 'string') {
      return PROJECT_TYPE_LABELS[val] ?? val;
    }
    if (key === 'superficie' || key === 'latitude' || key === 'longitude') {
      return String(val);
    }
    if (typeof val === 'string') return val.length > 80 ? val.slice(0, 80) + '…' : val;
    return String(val);
  }

  const confidencePct = extracted ? Math.round(extracted.confidence * 100) : 0;
  const confColor =
    confidencePct >= 80
      ? 'text-green-700'
      : confidencePct >= 50
        ? 'text-yellow-600'
        : 'text-red-500';

  const availableFields = extracted
    ? (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).filter(
        (k) => extracted[k] != null,
      )
    : [];

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'uploading'}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-green-400 text-green-700 text-sm font-medium hover:bg-green-50 disabled:opacity-60 disabled:cursor-wait transition-colors ${className ?? ''}`}
      >
        {status === 'uploading' ? (
          <>
            <span className="animate-spin text-base">⏳</span>
            Extraction en cours…
          </>
        ) : (
          <>
            <span>📄</span>
            Importer un document
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      {/* Review modal */}
      {open && extracted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Données extraites</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Sélectionnez les champs à appliquer au formulaire.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold ${confColor}`}>{confidencePct}%</div>
                  <div className="text-xs text-gray-400">confiance IA</div>
                </div>
              </div>
            </div>

            {/* Field list */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
              {availableFields.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-6">
                  Aucune donnée structurée détectée dans ce document.
                </p>
              )}
              {availableFields.map((key) => {
                const val = extracted[key];
                const label = FIELD_LABELS[key];
                const isChecked = checked.has(key as string);
                return (
                  <label
                    key={key as string}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(key as string)}
                      className="mt-0.5 h-4 w-4 rounded accent-green-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
                      <div className="text-sm text-gray-800 break-words">
                        {formatValue(key as string, val)}
                      </div>
                    </div>
                  </label>
                );
              })}

              {extracted.regulations && extracted.regulations.length > 0 && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="text-xs font-medium text-blue-600 mb-1">
                    Références réglementaires détectées
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extracted.regulations.slice(0, 8).map((r) => (
                      <span
                        key={r}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {extracted.pgesMeasures && extracted.pgesMeasures.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="text-xs font-medium text-purple-600 mb-1">
                    {extracted.pgesMeasures.length} mesure(s) PGES détectée(s)
                  </div>
                  <div className="text-xs text-purple-700">
                    Importables depuis l&apos;onglet PGES une fois le projet créé.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Annuler
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChecked(new Set(availableFields.map((k) => k as string)))}
                  className="text-xs text-green-700 hover:underline"
                >
                  Tout sélectionner
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={checked.size === 0}
                  className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Appliquer ({checked.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
