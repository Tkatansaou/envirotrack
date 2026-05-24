'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useToast } from '@/contexts/ToastContext';

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface BureauProfile {
  id: string;
  orgId: string;
  agrementANGE: string | null;
  logoUrl: string | null;
  adresse: string | null;
  telephone: string | null;
  siteWeb: string | null;
}

interface BureauResponse {
  org: { id: string; name: string; slug: string; createdAt: string };
  profile: BureauProfile | null;
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function CreateOrgModal({
  onCreated,
  onClose,
}: {
  onCreated: (org: Org) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const org = (await api('/api/organizations', {
        method: 'POST',
        body: { name: name.trim() },
      })) as Org;
      toast('Bureau créé avec succès.', 'success');
      onCreated(org);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la création.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Créer votre bureau</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Donnez un nom officiel à votre structure.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className={labelClass}>Nom du bureau d&apos;études</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Cabinet Environnement & Développement"
              className={inputClass}
              autoFocus
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Création…' : 'Créer le bureau'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BureauSettingsPage() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [form, setForm] = useState({
    agrementANGE: '',
    logoUrl: '',
    adresse: '',
    telephone: '',
    siteWeb: '',
  });

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

  const { data, refresh } = useApi<BureauResponse>(`/api/bureaux?orgId=${selectedOrgId ?? ''}`, {
    skip: !selectedOrgId,
  });

  useEffect(() => {
    if (data?.profile) {
      setForm({
        agrementANGE: data.profile.agrementANGE ?? '',
        logoUrl: data.profile.logoUrl ?? '',
        adresse: data.profile.adresse ?? '',
        telephone: data.profile.telephone ?? '',
        siteWeb: data.profile.siteWeb ?? '',
      });
    } else if (data) {
      setForm({ agrementANGE: '', logoUrl: '', adresse: '', telephone: '', siteWeb: '' });
    }
  }, [data]);

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const currentOrg = orgs.find((o) => o.id === selectedOrgId);
  const canEdit = currentOrg?.role === 'OWNER' || currentOrg?.role === 'ADMIN';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedOrgId) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { orgId: selectedOrgId };
      if (form.agrementANGE.trim()) body.agrementANGE = form.agrementANGE.trim();
      if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
      if (form.adresse.trim()) body.adresse = form.adresse.trim();
      if (form.telephone.trim()) body.telephone = form.telephone.trim();
      if (form.siteWeb.trim()) body.siteWeb = form.siteWeb.trim();

      await api('/api/bureaux', { method: 'PATCH', body });
      toast('Profil du bureau mis à jour.', 'success');
      await refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleOrgCreated(org: Org) {
    const newOrg: Org = { ...org, role: 'OWNER' };
    setOrgs((prev) => [...prev, newOrg]);
    setSelectedOrgId(newOrg.id);
    setShowCreate(false);
  }

  const roleLabel: Record<string, string> = {
    OWNER: 'Propriétaire',
    ADMIN: 'Administrateur',
    MEMBER: 'Membre',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {showCreate && (
        <CreateOrgModal onCreated={handleOrgCreated} onClose={() => setShowCreate(false)} />
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon bureau</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Informations officielles du bureau d&apos;études
          </p>
        </div>
        {orgs.length === 0 && !loadingOrgs && (
          <button
            onClick={() => setShowCreate(true)}
            className="shrink-0 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
          >
            + Créer mon bureau
          </button>
        )}
      </div>

      {/* Loading */}
      {loadingOrgs && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* No org — empty state */}
      {!loadingOrgs && orgs.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl">
            🏢
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Aucun bureau enregistré</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
            Créez votre bureau d&apos;études pour gérer vos projets, votre équipe et vos
            informations officielles.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800 transition-colors shadow-sm"
          >
            <span>+</span>
            <span>Créer mon bureau d&apos;études</span>
          </button>
          <p className="mt-4 text-xs text-gray-400">
            Vous pourrez ensuite inviter des membres et lier vos projets.
          </p>
        </div>
      )}

      {/* Org selector (multi-org) */}
      {orgs.length > 1 && (
        <div className="mb-6">
          <label className={labelClass}>Organisation active</label>
          <select
            value={selectedOrgId ?? ''}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className={inputClass}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {roleLabel[o.role] ?? o.role}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Role badge (single org) */}
      {orgs.length === 1 && currentOrg && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {roleLabel[currentOrg.role] ?? currentOrg.role}
        </div>
      )}

      {/* Form */}
      {data && (
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Identity */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Identité
            </h2>
            <div>
              <label className={labelClass}>Nom du bureau</label>
              <input type="text" value={data.org.name} disabled className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">
                Modifiable depuis les paramètres de l&apos;organisation.
              </p>
            </div>
            <div>
              <label className={labelClass}>Numéro d&apos;agrément ANGE</label>
              <input
                type="text"
                value={form.agrementANGE}
                onChange={(e) => setField('agrementANGE', e.target.value)}
                placeholder="Ex : ANGE/BET/2023/001"
                className={inputClass}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Contact
            </h2>
            <div>
              <label className={labelClass}>Adresse</label>
              <textarea
                value={form.adresse}
                onChange={(e) => setField('adresse', e.target.value)}
                placeholder="Rue, quartier, ville…"
                className={`${inputClass} resize-none`}
                rows={3}
                disabled={!canEdit}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setField('telephone', e.target.value)}
                  placeholder="+228 XX XX XX XX"
                  className={inputClass}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className={labelClass}>Site web</label>
                <input
                  type="url"
                  value={form.siteWeb}
                  onChange={(e) => setField('siteWeb', e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Logo</h2>
            <div>
              <label className={labelClass}>URL du logo</label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => setField('logoUrl', e.target.value)}
                placeholder="https://res.cloudinary.com/…"
                className={inputClass}
                disabled={!canEdit}
              />
              {form.logoUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={form.logoUrl}
                    alt="Logo aperçu"
                    className="w-14 h-14 object-contain rounded-xl border border-gray-200 bg-gray-50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-gray-400">Aperçu du logo</span>
                </div>
              )}
            </div>
          </div>

          {!canEdit && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <span className="text-amber-500 text-lg leading-none">⚠</span>
              <p className="text-sm text-amber-700">
                Seuls les administrateurs et propriétaires peuvent modifier le profil.
              </p>
            </div>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-green-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Loading form */}
      {!data && selectedOrgId && (
        <div className="space-y-4 mt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}
    </div>
  );
}
