'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import DocumentImportButton, { type AppliedFields } from '@/components/DocumentImportButton';

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const PROJECT_TYPES = [
  { value: 'ROUTE', label: '🛣️ Route / Infrastructure routière' },
  { value: 'BATIMENT', label: '🏗️ Bâtiment / Construction' },
  { value: 'MINE', label: '⛏️ Mine / Carrière' },
  { value: 'ENERGIE', label: '⚡ Énergie / Électricité' },
  { value: 'AGRICULTURE', label: '🌾 Agriculture / Agro-industrie' },
  { value: 'AUTRE', label: '📁 Autre' },
];

const REGIONS_TOGO = ['Lomé-Commune', 'Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'];

function normalizeFinancement(val: string): 'STANDARD' | 'BAILLEUR' {
  const bailleurs = ['BANQUE_MONDIALE', 'BAD', 'BOAD', 'AFD', 'BAILLEUR', 'MIXTE', 'PRIVE'];
  return bailleurs.includes(val.toUpperCase()) ? 'BAILLEUR' : 'STANDARD';
}

type AutoFilledKey = keyof AppliedFields;

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [autoFilled, setAutoFilled] = useState<Set<AutoFilledKey>>(new Set());
  const [form, setForm] = useState({
    orgId: '',
    name: '',
    type: 'ROUTE',
    region: 'Maritime',
    prefecture: '',
    commune: '',
    canton: '',
    maitreOuvrage: '',
    maitreOeuvre: '',
    superficie: '',
    budget: '',
    financement: 'STANDARD' as 'STANDARD' | 'BAILLEUR',
    bailleur: '',
    description: '',
  });

  async function loadOrgs() {
    try {
      const data = await api('/api/organizations');
      const list = data as Org[];
      setOrgs(list);
      if (list.length > 0 && list[0]) {
        setForm((f) => ({ ...f, orgId: list[0]!.id }));
      }
    } catch {
      toast('Impossible de charger vos organisations.', 'error');
    } finally {
      setOrgsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrgs();
  }, []);

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      await api('/api/organizations', { method: 'POST', body: { name: newOrgName.trim() } });
      setNewOrgName('');
      await loadOrgs();
      toast('Bureau créé avec succès.', 'success');
    } catch {
      toast('Erreur lors de la création du bureau.', 'error');
    } finally {
      setCreatingOrg(false);
    }
  }

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImportApply(fields: AppliedFields) {
    const filled = new Set<AutoFilledKey>();
    setForm((prev) => {
      const next = { ...prev };
      if (fields.projectName) {
        next.name = fields.projectName;
        filled.add('projectName');
      }
      if (fields.projectType) {
        next.type = fields.projectType;
        filled.add('projectType');
      }
      if (fields.region && REGIONS_TOGO.includes(fields.region)) {
        next.region = fields.region;
        filled.add('region');
      }
      if (fields.prefecture) {
        next.prefecture = fields.prefecture;
        filled.add('prefecture');
      }
      if (fields.canton) {
        next.canton = fields.canton;
        filled.add('canton');
      }
      if (fields.maitreOuvrage) {
        next.maitreOuvrage = fields.maitreOuvrage;
        filled.add('maitreOuvrage');
      }
      if (fields.financement) {
        next.financement = normalizeFinancement(fields.financement);
        if (next.financement === 'BAILLEUR') next.bailleur = fields.financement;
        filled.add('financement');
      }
      if (fields.description) {
        next.description = fields.description;
        filled.add('description');
      }
      if (fields.superficie != null) {
        next.superficie = String(fields.superficie);
        filled.add('superficie');
      }
      return next;
    });
    setAutoFilled(filled);
    setStep(1);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        region: form.region,
        prefecture: form.prefecture,
        maitreOuvrage: form.maitreOuvrage,
        financement: form.financement,
      };
      if (form.orgId) body.orgId = form.orgId;
      if (form.bailleur && form.financement === 'BAILLEUR') body.bailleur = form.bailleur;
      if (form.commune) body.commune = form.commune;
      if (form.canton) body.canton = form.canton;
      if (form.maitreOeuvre) body.maitreOeuvre = form.maitreOeuvre;
      if (form.superficie) body.superficie = parseFloat(form.superficie);
      if (form.budget) body.budget = parseInt(form.budget, 10);
      if (form.description) body.description = form.description;

      const project = await api<{ id: string }>('/api/projects', { method: 'POST', body });
      toast('Projet créé avec succès !', 'success');
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la création.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  function aiField(key: AutoFilledKey, children: React.ReactNode) {
    if (!autoFilled.has(key)) return <>{children}</>;
    return (
      <div className="relative">
        {children}
        <span className="absolute -top-2 right-2 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
          ✦ IA
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau projet EIES</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Renseignez les informations de base pour démarrer.
        </p>
      </div>

      {/* Document import */}
      <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
        <p className="text-sm font-medium text-green-800 mb-1">Vous avez un document existant ?</p>
        <p className="text-xs text-green-700 mb-3">
          Importez votre document — les informations du projet seront extraites automatiquement.
        </p>
        <DocumentImportButton onApply={handleImportApply} />
      </div>

      {autoFilled.size > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
          <span>✦</span>
          <span>
            <strong>{autoFilled.size} champ(s)</strong> pré-rempli(s) par l&apos;IA — vérifiez et
            corrigez si besoin.
          </span>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => s < step && setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step === s
                  ? 'bg-[#123C24] text-white'
                  : step > s
                    ? 'bg-green-100 text-[#123C24] cursor-pointer'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s}
            </button>
            {s < 2 && <div className="w-12 h-0.5 bg-gray-200" />}
          </div>
        ))}
        <span className="text-sm text-gray-500 ml-2">
          {step === 1 ? 'Identification du projet' : 'Détails administratifs'}
        </span>
      </div>

      <form onSubmit={onSubmit}>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          {step === 1 && (
            <>
              {/* Sélection / création du bureau d'études */}
              {!orgsLoading && orgs.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-amber-800">
                    Vous n&apos;appartenez à aucun bureau d&apos;études.
                  </p>
                  <p className="text-xs text-amber-700">
                    Créez votre bureau pour associer ce projet, ou continuez sans (mode expert
                    indépendant).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Nom du bureau d'études"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateOrg()}
                      disabled={creatingOrg || !newOrgName.trim()}
                      className="shrink-0 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                    >
                      {creatingOrg ? '…' : 'Créer'}
                    </button>
                  </div>
                </div>
              )}

              {orgs.length > 1 && (
                <div>
                  <label className={labelClass}>Bureau d&apos;études</label>
                  <select
                    value={form.orgId}
                    onChange={(e) => setField('orgId', e.target.value)}
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

              <div>
                <label className={labelClass}>Nom du projet *</label>
                {aiField(
                  'projectName',
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Construction de la route Lomé-Vogan"
                    required
                    minLength={3}
                    maxLength={200}
                  />,
                )}
              </div>

              <div>
                <label className={labelClass}>Type de projet *</label>
                {aiField(
                  'projectType',
                  <select
                    value={form.type}
                    onChange={(e) => setField('type', e.target.value)}
                    className={inputClass}
                    required
                  >
                    {PROJECT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>,
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Région *</label>
                  {aiField(
                    'region',
                    <select
                      value={form.region}
                      onChange={(e) => setField('region', e.target.value)}
                      className={inputClass}
                      required
                    >
                      {REGIONS_TOGO.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>,
                  )}
                </div>
                <div>
                  <label className={labelClass}>Préfecture *</label>
                  {aiField(
                    'prefecture',
                    <input
                      type="text"
                      value={form.prefecture}
                      onChange={(e) => setField('prefecture', e.target.value)}
                      className={inputClass}
                      placeholder="Ex: Vo"
                      required
                    />,
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Commune</label>
                  <input
                    type="text"
                    value={form.commune}
                    onChange={(e) => setField('commune', e.target.value)}
                    className={inputClass}
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <label className={labelClass}>Canton</label>
                  {aiField(
                    'canton',
                    <input
                      type="text"
                      value={form.canton}
                      onChange={(e) => setField('canton', e.target.value)}
                      className={inputClass}
                      placeholder="Optionnel"
                    />,
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className={labelClass}>Maître d&apos;ouvrage *</label>
                {aiField(
                  'maitreOuvrage',
                  <input
                    type="text"
                    value={form.maitreOuvrage}
                    onChange={(e) => setField('maitreOuvrage', e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Ministère des Infrastructures"
                    required
                  />,
                )}
              </div>

              <div>
                <label className={labelClass}>Maître d&apos;œuvre</label>
                <input
                  type="text"
                  value={form.maitreOeuvre}
                  onChange={(e) => setField('maitreOeuvre', e.target.value)}
                  className={inputClass}
                  placeholder="Optionnel"
                />
              </div>

              <div>
                <label className={labelClass}>Source de financement *</label>
                {aiField(
                  'financement',
                  <select
                    value={form.financement}
                    onChange={(e) =>
                      setField('financement', e.target.value as 'STANDARD' | 'BAILLEUR')
                    }
                    className={inputClass}
                    required
                  >
                    <option value="STANDARD">National / Budget État</option>
                    <option value="BAILLEUR">Bailleur international</option>
                  </select>,
                )}
              </div>

              {form.financement === 'BAILLEUR' && (
                <div>
                  <label className={labelClass}>Nom du bailleur</label>
                  <input
                    type="text"
                    value={form.bailleur}
                    onChange={(e) => setField('bailleur', e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Banque Mondiale, BAD, AFD…"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Superficie (ha)</label>
                  {aiField(
                    'superficie',
                    <input
                      type="number"
                      value={form.superficie}
                      onChange={(e) => setField('superficie', e.target.value)}
                      className={inputClass}
                      placeholder="Ex: 150"
                      min="0"
                      step="0.1"
                    />,
                  )}
                </div>
                <div>
                  <label className={labelClass}>Budget estimé (FCFA)</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => setField('budget', e.target.value)}
                    className={inputClass}
                    placeholder="Ex: 500000000"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description / Objectifs</label>
                {aiField(
                  'description',
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    className={`${inputClass} resize-none`}
                    rows={4}
                    placeholder="Décrivez brièvement le projet et ses objectifs environnementaux..."
                  />,
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Retour
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={() => {
                if (!form.name || !form.prefecture) {
                  toast('Veuillez remplir tous les champs obligatoires.', 'error');
                  return;
                }
                setStep(2);
              }}
              className="bg-[#123C24] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0f2d1c] transition-colors"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="bg-[#123C24] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0f2d1c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Création…' : 'Créer le projet'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
