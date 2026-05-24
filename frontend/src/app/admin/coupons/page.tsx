'use client';

import { useState } from 'react';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Plus, X } from 'lucide-react';

interface AdminMe {
  admin: { id: string; email: string; role: 'ADMIN' | 'SUPERADMIN' };
}

interface Coupon {
  id: string;
  code: string;
  discountPct: number | null;
  credits: number;
  description: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

interface CouponsPage {
  items: Coupon[];
  nextCursor: string | null;
}

const EMPTY_FORM = {
  code: '',
  type: 'discount' as 'discount' | 'credits' | 'both',
  discountPct: '',
  credits: '',
  description: '',
  maxUses: '',
  expiresAt: '',
};

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Sans limite';
  const d = new Date(expiresAt);
  if (d < new Date()) return '⚠ Expiré';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CouponTypeBadge({ coupon }: { coupon: Coupon }) {
  const parts: string[] = [];
  if (coupon.discountPct) parts.push(`-${coupon.discountPct}%`);
  if (coupon.credits > 0) parts.push(`+${coupon.credits} crédits`);
  if (parts.length === 0) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <span
          key={p}
          className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700"
        >
          {p}
        </span>
      ))}
    </div>
  );
}

export default function AdminCouponsPage() {
  const { toast } = useToast();
  const { data: me } = useApi<AdminMe>('/api/admin/me');
  const isSuperadmin = me?.admin.role === 'SUPERADMIN';

  const [activeOnly, setActiveOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const qs = activeOnly ? '?active=1' : '';
  const { data, loading, refresh } = useApi<CouponsPage>(`/api/admin/coupons${qs}`);

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

  function resetModal() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      setFormError('Le code doit faire 3 à 30 caractères (A-Z, 0-9, -, _).');
      return;
    }

    const discountPct =
      form.type !== 'credits' && form.discountPct !== ''
        ? parseInt(form.discountPct, 10)
        : undefined;
    const credits =
      form.type !== 'discount' && form.credits !== '' ? parseInt(form.credits, 10) : 0;

    if (!discountPct && credits === 0) {
      setFormError('Indiquez au moins un rabais (%) ou des crédits offerts.');
      return;
    }

    const body: Record<string, unknown> = { code, credits };
    if (discountPct) body.discountPct = discountPct;
    if (form.description.trim()) body.description = form.description.trim();
    if (form.maxUses !== '') body.maxUses = parseInt(form.maxUses, 10);
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();

    setCreating(true);
    try {
      await api('/api/admin/coupons', { method: 'POST', body });
      toast('Coupon créé avec succès.', 'success');
      resetModal();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création.';
      setFormError(msg.includes('COUPON_CODE_EXISTS') ? `Le code "${code}" existe déjà.` : msg);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    setTogglingId(coupon.id);
    try {
      await api(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        body: { active: !coupon.active },
      });
      toast(coupon.active ? 'Coupon désactivé.' : 'Coupon activé.', 'success');
      await refresh();
    } catch {
      toast('Erreur lors de la mise à jour.', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data
              ? `${data.items.length} coupon${data.items.length !== 1 ? 's' : ''}${data.nextCursor ? '+' : ''}`
              : 'Chargement…'}
          </p>
        </div>
        {isSuperadmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#123C24] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a5233] transition-colors"
          >
            <Plus size={15} />
            Créer un coupon
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2">
        {[
          { value: false, label: 'Tous' },
          { value: true, label: 'Actifs seulement' },
        ].map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setActiveOnly(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeOnly === opt.value
                ? 'bg-green-100 text-green-800'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
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
            <p className="text-3xl">🏷</p>
            <p className="mt-3 font-medium text-gray-600">Aucun coupon trouvé</p>
            {isSuperadmin && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 text-sm text-green-700 hover:underline"
              >
                Créer le premier coupon →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {[
                    'Code',
                    'Avantage',
                    'Utilisations',
                    'Expiration',
                    'Statut',
                    'Créé le',
                    ...(isSuperadmin ? ['Actions'] : []),
                  ].map((h) => (
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
                {data.items.map((coupon) => {
                  const expiredAt = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                  const limitReached =
                    coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
                  const isToggling = togglingId === coupon.id;

                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-3">
                        <div>
                          <span className="font-mono font-semibold text-gray-900 tracking-wider">
                            {coupon.code}
                          </span>
                          {coupon.description && (
                            <p className="mt-0.5 text-xs text-gray-400 truncate max-w-[180px]">
                              {coupon.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Avantage */}
                      <td className="px-5 py-3">
                        <CouponTypeBadge coupon={coupon} />
                      </td>

                      {/* Utilisations */}
                      <td className="px-5 py-3 text-gray-700">
                        <span className={limitReached ? 'text-orange-600 font-semibold' : ''}>
                          {coupon.usedCount}
                        </span>
                        <span className="text-gray-400">
                          {' / '}
                          {coupon.maxUses !== null ? coupon.maxUses : '∞'}
                        </span>
                      </td>

                      {/* Expiration */}
                      <td className="px-5 py-3 text-xs">
                        <span className={expiredAt ? 'text-red-500 font-medium' : 'text-gray-500'}>
                          {formatExpiry(coupon.expiresAt)}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            coupon.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {coupon.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      {/* Créé le */}
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(coupon.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      {isSuperadmin && (
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleActive(coupon)}
                            disabled={isToggling}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                              coupon.active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {isToggling ? '…' : coupon.active ? 'Désactiver' : 'Activer'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.nextCursor && (
        <p className="text-center text-xs text-gray-400">
          Plus de coupons disponibles — affinez les filtres pour les voir.
        </p>
      )}

      {/* Create modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && resetModal()}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Créer un coupon</h2>
              <button
                onClick={resetModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {/* Code */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Code promo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="EX : NOEL2025 ou BIENVENUE"
                  maxLength={30}
                  className={inputClass}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  Majuscules, chiffres, tirets — 3 à 30 caractères.
                </p>
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Type d&apos;avantage <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as typeof f.type,
                      discountPct: '',
                      credits: '',
                    }))
                  }
                  className={inputClass}
                >
                  <option value="discount">Remise en %</option>
                  <option value="credits">Crédits offerts</option>
                  <option value="both">Les deux (remise + crédits)</option>
                </select>
              </div>

              {/* discountPct */}
              {(form.type === 'discount' || form.type === 'both') && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Remise (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.discountPct}
                    onChange={(e) => setForm((f) => ({ ...f, discountPct: e.target.value }))}
                    placeholder="Ex : 20"
                    min={1}
                    max={100}
                    className={inputClass}
                    required={form.type === 'discount' || form.type === 'both'}
                  />
                </div>
              )}

              {/* credits */}
              {(form.type === 'credits' || form.type === 'both') && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Crédits offerts <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.credits}
                    onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
                    placeholder="Ex : 100"
                    min={1}
                    className={inputClass}
                    required={form.type === 'credits' || form.type === 'both'}
                  />
                </div>
              )}

              {/* description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex : Offre de lancement — 20% de réduction"
                  maxLength={200}
                  className={inputClass}
                />
              </div>

              {/* maxUses + expiresAt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Utilisations max
                  </label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                    placeholder="Illimité"
                    min={1}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Expiration
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Error */}
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-[#123C24] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a5233] disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Création…' : 'Créer le coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
