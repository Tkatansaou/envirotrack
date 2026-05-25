'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Zap,
  Plus,
  Check,
  Tag,
  Crown,
  RefreshCw,
  X,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApi, invalidateCache } from '@/lib/useApi';
import { useToast } from '@/contexts/ToastContext';

interface Org {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface CreditTx {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  reason: string;
  description: string | null;
  createdAt: string;
}

interface BalanceData {
  balance: number;
  transactions: CreditTx[];
}

interface CreditPack {
  id: string;
  name: string;
  priceXOF: number;
  credits: number;
  bonusPct: number;
}

interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  creditsPerMonth: number;
  creditsPerYear: number | null;
  priceXOF: number;
  priceAnnualXOF: number | null;
  maxProjects: number | null;
  features: string[];
  highlighted: boolean;
  sortOrder: number;
}

interface Subscription {
  id: string;
  planId: string;
  cycle: 'MONTHLY' | 'ANNUAL';
  status: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextRenewalAt: string;
  cancelAtPeriodEnd: boolean;
  renewalFailures: number;
  plan: SubscriptionPlan;
}

const STATIC_PACKS: CreditPack[] = [
  { id: 'starter', name: 'Starter', priceXOF: 25000, credits: 250, bonusPct: 0 },
  { id: 'pro', name: 'Pro', priceXOF: 50000, credits: 550, bonusPct: 10 },
  { id: 'business', name: 'Business', priceXOF: 100000, credits: 1200, bonusPct: 20 },
  { id: 'enterprise', name: 'Enterprise', priceXOF: 150000, credits: 2000, bonusPct: 33 },
];

const CREDIT_COSTS = [
  { action: 'Activation projet / PGES', cost: 50, icon: '📁' },
  { action: 'Export PDF rapport', cost: 10, icon: '📄' },
  { action: 'Export CSV / Excel', cost: 5, icon: '📊' },
  { action: 'Invitation agent terrain', cost: 20, icon: '👤' },
  { action: 'Partage bailleur', cost: 15, icon: '🤝' },
  { action: 'Synchronisation réglementaire', cost: 30, icon: '⚖️' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-500' },
  ACTIVE: { label: 'Actif', color: 'bg-blue-100 text-blue-700' },
  EIES_SUBMITTED: { label: 'EIES soumise', color: 'bg-yellow-100 text-yellow-700' },
  PGES_TRACKING: { label: 'Suivi PGES', color: 'bg-purple-100 text-purple-700' },
  ARCHIVED: { label: 'Archivé', color: 'bg-gray-100 text-gray-400' },
};

const TYPE_ICONS: Record<string, string> = {
  ROUTE: '🛣️',
  BATIMENT: '🏗️',
  MINE: '⛏️',
  ENERGIE: '⚡',
  AGRICULTURE: '🌾',
  AUTRE: '📁',
};

const REASON_LABELS: Record<string, string> = {
  PACK_PURCHASE: 'Achat de crédits',
  PROJECT_ACTIVATION: 'Activation projet',
  PDF_EXPORT: 'Export PDF',
  REGULATORY_SYNC: 'Sync réglementaire',
  TERRAIN_INVITE: 'Invitation terrain',
  CSV_EXPORT: 'Export CSV/Excel',
  BAILLEUR_SHARE: 'Partage bailleur',
  ADMIN_ADJUSTMENT: 'Ajustement admin',
  COUPON_REDEMPTION: 'Code promo',
  SUBSCRIPTION_START: 'Abonnement activé',
  SUBSCRIPTION_RENEWAL: 'Renouvellement abonnement',
};

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700' },
  PAST_DUE: { label: 'Paiement en retard', color: 'bg-amber-100 text-amber-700' },
  SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Résilié', color: 'bg-gray-100 text-gray-500' },
};

export default function BillingPage() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [subCouponCode, setSubCouponCode] = useState('');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  // Active discount coupon applied to pack cards
  const [packDiscountPct, setPackDiscountPct] = useState<number | null>(null);
  const [packDiscountCode, setPackDiscountCode] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('plans') === '1') setShowPlans(true);
    }
  }, []);

  const {
    data: balanceData,
    loading: balanceLoading,
    error: balanceError,
  } = useApi<BalanceData>('/api/credits/balance');

  const { data: packsData } = useApi<{ packs: CreditPack[] }>('/api/credits/packs');
  const packs = packsData?.packs?.length ? packsData.packs : STATIC_PACKS;

  const { data: subData, loading: subLoading } = useApi<{ subscription: Subscription | null }>(
    '/api/subscriptions/me',
  );

  const { data: plansData, loading: plansLoading } = useApi<{ plans: SubscriptionPlan[] }>(
    '/api/subscriptions/plans',
  );

  useEffect(() => {
    api('/api/organizations')
      .then((data: unknown) => {
        const list = data as Org[];
        setOrgs(list);
        if (list.length > 0 && list[0]) setSelectedOrgId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const { data: projects, loading: projectsLoading } = useApi<Project[]>(
    `/api/projects?orgId=${selectedOrgId ?? ''}`,
    { skip: !selectedOrgId },
  );

  async function handleCoupon(e: FormEvent) {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponSuccess(null);
    try {
      // Preview first (no redemption yet)
      const preview = await api<{
        discountPct: number | null;
        credits: number;
        description: string | null;
      }>(`/api/credits/coupon?code=${encodeURIComponent(code)}`);

      // If discount coupon → apply to pack cards
      if (preview.discountPct) {
        setPackDiscountPct(preview.discountPct);
        setPackDiscountCode(code);
      }

      // If gift credits coupon → redeem immediately
      if (preview.credits > 0) {
        const res = await api<{ credits: number; newBalance: number; description: string }>(
          '/api/credits/coupon',
          { method: 'POST', body: { code } },
        );
        setCouponSuccess(
          res.description ?? `+${res.credits.toLocaleString('fr-FR')} crédits ajoutés !`,
        );
        invalidateCache('/api/credits/balance');
        toast(`+${res.credits.toLocaleString('fr-FR')} crédits ajoutés !`, 'success');
      } else if (preview.discountPct) {
        setCouponSuccess(`−${preview.discountPct}% appliqué sur les packs de crédits`);
        toast(`Code promo −${preview.discountPct}% activé !`, 'success');
      }

      setCouponCode('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Code invalide.';
      toast(msg, 'error');
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    setSubscribing(planId);
    try {
      await api('/api/subscriptions', {
        method: 'POST',
        body: {
          planId,
          cycle: selectedCycle,
          ...(subCouponCode.trim() ? { couponCode: subCouponCode.trim().toUpperCase() } : {}),
        },
      });
      toast('Abonnement activé avec succès !', 'success');
      invalidateCache('/api/credits/balance');
      invalidateCache('/api/subscriptions/me');
      setShowPlans(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la souscription.';
      toast(msg, 'error');
    } finally {
      setSubscribing(null);
    }
  }

  async function handleCancelToggle(cancel: boolean) {
    setCancelling(true);
    try {
      await api('/api/subscriptions/me', {
        method: 'PATCH',
        body: { cancelAtPeriodEnd: cancel },
      });
      toast(
        cancel
          ? 'Abonnement programmé pour résiliation en fin de période.'
          : 'Résiliation annulée — votre abonnement sera renouvelé.',
        'success',
      );
      invalidateCache('/api/subscriptions/me');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    } finally {
      setCancelling(false);
    }
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const activeProjects = projects?.filter((p) => p.status !== 'ARCHIVED') ?? [];
  const balance = balanceData?.balance ?? 0;
  const sub = subData?.subscription ?? null;
  const plans = plansData?.plans ?? [];

  const inputClass =
    'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24]';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plan, crédits et utilisation</p>
      </div>

      {/* Org selector */}
      {orgs.length > 1 && (
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
      )}

      {/* ── Subscription status ── */}
      {subLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-100 mb-3" />
          <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        </div>
      ) : sub && sub.status !== 'CANCELLED' ? (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#123C24] to-[#0f2d1c] p-5 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Crown size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-200 uppercase tracking-widest">Plan actuel</p>
                  <h2 className="text-xl font-bold">{sub.plan.name}</h2>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SUB_STATUS[sub.status]?.color ?? 'bg-gray-100 text-gray-500'}`}
                >
                  {SUB_STATUS[sub.status]?.label ?? sub.status}
                </span>
                {sub.cancelAtPeriodEnd && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Résiliation prévue
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-xl font-bold">
                  {(sub.cycle === 'ANNUAL'
                    ? (sub.plan.creditsPerYear ?? sub.plan.creditsPerMonth * 12)
                    : sub.plan.creditsPerMonth
                  ).toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-green-200">
                  Crédits / {sub.cycle === 'ANNUAL' ? 'an' : 'mois'}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {(sub.cycle === 'ANNUAL'
                    ? (sub.plan.priceAnnualXOF ?? sub.plan.priceXOF * 12)
                    : sub.plan.priceXOF
                  ).toLocaleString('fr-FR')}{' '}
                  F
                </p>
                <p className="text-xs text-green-200">
                  Prix / {sub.cycle === 'ANNUAL' ? 'an' : 'mois'}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {new Date(sub.nextRenewalAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                <p className="text-xs text-green-200">
                  {sub.cancelAtPeriodEnd ? 'Accès jusqu&apos;au' : 'Prochain renouvellement'}
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          {Array.isArray(sub.plan.features) && sub.plan.features.length > 0 && (
            <div className="p-5 border-b border-gray-100">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(sub.plan.features as string[]).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Check size={10} className="text-[#123C24]" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 flex flex-wrap gap-2">
            {sub.status === 'PAST_DUE' && (
              <div className="flex w-full items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0" />
                Renouvellement échoué — rechargez vos crédits pour rétablir l&apos;abonnement.
              </div>
            )}
            {sub.status === 'SUSPENDED' && (
              <div className="flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle size={14} className="shrink-0" />
                Abonnement suspendu après 3 échecs. Rechargez vos crédits.
              </div>
            )}

            {!sub.cancelAtPeriodEnd ? (
              <button
                onClick={() => handleCancelToggle(true)}
                disabled={cancelling}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Résilier en fin de période
              </button>
            ) : (
              <button
                onClick={() => handleCancelToggle(false)}
                disabled={cancelling}
                className="flex items-center gap-1.5 rounded-lg border border-[#123C24]/30 px-3 py-2 text-xs font-medium text-[#123C24] hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                {cancelling ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Annuler la résiliation
              </button>
            )}

            <button
              onClick={() => setShowPlans(!showPlans)}
              className="flex items-center gap-1.5 rounded-lg bg-[#123C24] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f2d1c] transition-colors"
            >
              <ChevronRight size={12} />
              Changer de plan
            </button>
          </div>
        </div>
      ) : (
        /* No active subscription */
        <div className="rounded-2xl border-2 border-dashed border-[#123C24]/20 bg-green-50/50 p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#123C24]/10 flex items-center justify-center shrink-0">
              <Crown size={18} className="text-[#123C24]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Aucun abonnement actif</h3>
              <p className="mt-1 text-sm text-gray-500">
                Souscrivez à un plan mensuel ou annuel pour débiter automatiquement vos crédits et
                accéder aux fonctionnalités premium.
              </p>
              <button
                onClick={() => setShowPlans(!showPlans)}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#123C24] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f2d1c] transition-colors"
              >
                <Crown size={14} />
                Voir les plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan picker ── */}
      {showPlans && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Choisir un plan</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Les crédits sont débités depuis votre solde à chaque renouvellement.
                </p>
              </div>
              {/* Cycle toggle */}
              <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold gap-1">
                <button
                  onClick={() => setSelectedCycle('MONTHLY')}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${selectedCycle === 'MONTHLY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  Mensuel
                </button>
                <button
                  onClick={() => setSelectedCycle('ANNUAL')}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${selectedCycle === 'ANNUAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  Annuel
                  <span className="ml-1 text-[10px] font-bold text-green-600">-17%</span>
                </button>
              </div>
            </div>

            {/* Coupon code field */}
            <div className="mt-3 flex items-center gap-2">
              <Tag size={13} className="shrink-0 text-gray-400" />
              <input
                type="text"
                value={subCouponCode}
                onChange={(e) => setSubCouponCode(e.target.value.toUpperCase())}
                placeholder="Code promo (optionnel)"
                maxLength={30}
                className="w-48 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs tracking-wider placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24]"
              />
              {subCouponCode && (
                <button
                  onClick={() => setSubCouponCode('')}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {plansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
              {plans.map((plan) => {
                const price =
                  selectedCycle === 'ANNUAL'
                    ? (plan.priceAnnualXOF ?? plan.priceXOF * 12)
                    : plan.priceXOF;
                const credits =
                  selectedCycle === 'ANNUAL'
                    ? (plan.creditsPerYear ?? plan.creditsPerMonth * 12)
                    : plan.creditsPerMonth;
                const isCurrentPlan = sub?.planId === plan.id && sub?.status !== 'CANCELLED';
                const isBusy = subscribing === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-xl border-2 p-4 transition-all ${
                      plan.highlighted
                        ? 'border-[#123C24] bg-green-50/50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#123C24] px-3 py-0.5 text-[10px] font-bold text-white">
                        POPULAIRE
                      </span>
                    )}
                    <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                    <p className="mt-2 text-2xl font-bold text-[#123C24]">
                      {price.toLocaleString('fr-FR')}
                      <span className="text-sm font-normal text-gray-400"> F</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {credits.toLocaleString('fr-FR')} crédits /{' '}
                      {selectedCycle === 'ANNUAL' ? 'an' : 'mois'}
                    </p>
                    {plan.maxProjects !== null && (
                      <p className="mt-1 text-xs text-gray-500">
                        Jusqu&apos;à {plan.maxProjects} projets actifs
                      </p>
                    )}

                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="mt-3 space-y-1.5 flex-1">
                        {(plan.features as string[]).slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <Check
                              size={10}
                              className="mt-0.5 shrink-0 text-[#123C24]"
                              strokeWidth={3}
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isCurrentPlan || isBusy}
                      className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-400 cursor-default'
                          : plan.highlighted
                            ? 'bg-[#123C24] text-white hover:bg-[#0f2d1c]'
                            : 'border border-[#123C24] text-[#123C24] hover:bg-green-50'
                      } disabled:opacity-60`}
                    >
                      {isBusy ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : isCurrentPlan ? (
                        'Plan actuel'
                      ) : (
                        <>
                          <Crown size={11} />
                          Souscrire
                        </>
                      )}
                    </button>

                    {!isCurrentPlan && (
                      <p className="mt-1.5 text-center text-[10px] text-gray-400">
                        Solde requis : {credits.toLocaleString('fr-FR')} crédits
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-gray-50">
            <Calendar size={12} className="text-gray-400 shrink-0" />
            <p className="text-xs text-gray-500">
              Les crédits sont prélevés automatiquement sur votre solde à chaque renouvellement. Si
              le solde est insuffisant, l&apos;abonnement passe en statut <strong>Retard</strong>{' '}
              puis est suspendu après 3 tentatives échouées.
            </p>
          </div>
        </div>
      )}

      {/* ── Credits card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Zap size={16} className="text-[#123C24]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Crédits EnviroTrack</p>
              <p className="text-xs text-gray-400">Solde disponible</p>
            </div>
          </div>
          <Link
            href="/settings/billing/recharge"
            className="flex items-center gap-1 rounded-full bg-[#123C24] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f2d1c] transition-colors shrink-0"
          >
            <Plus size={11} />
            Recharger
          </Link>
        </div>

        {balanceLoading ? (
          <div className="space-y-2">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        ) : balanceError ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            Impossible de charger le solde.{' '}
            <Link href="/settings/billing" className="underline">
              Actualiser
            </Link>
          </div>
        ) : (
          <>
            <p className="text-4xl font-bold text-[#123C24]">
              {balance.toLocaleString('fr-FR')}
              <span className="ml-1.5 text-sm font-normal text-gray-400">crédits</span>
            </p>

            {balance === 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                <span className="text-amber-500">⚠</span>
                <p className="text-xs text-amber-700">
                  Votre solde est vide.{' '}
                  <Link href="/settings/billing/recharge" className="font-semibold underline">
                    Rechargez maintenant
                  </Link>{' '}
                  pour activer des projets.
                </p>
              </div>
            )}

            {balanceData?.transactions && balanceData.transactions.length > 0 ? (
              <div className="mt-4 divide-y divide-gray-50">
                <p className="pb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Dernières transactions
                </p>
                {balanceData.transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          tx.type === 'CREDIT'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {tx.type === 'CREDIT' ? '+' : '−'}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          {REASON_LABELS[tx.reason] ?? tx.reason}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' · '}solde : {tx.balanceAfter.toLocaleString('fr-FR')} cr
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '−'}
                      {tx.amount.toLocaleString('fr-FR')} cr
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400">Aucune transaction pour l&apos;instant.</p>
            )}
          </>
        )}
      </div>

      {/* ── Coupon ── */}
      <div className="rounded-2xl border border-dashed border-green-300 bg-green-50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Tag size={16} className="text-[#123C24]" />
          <h3 className="text-sm font-semibold text-green-800">Code promo</h3>
        </div>

        {couponSuccess ? (
          <div className="flex items-center gap-3 rounded-xl bg-white border border-green-200 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-lg">
              🎉
            </span>
            <div>
              <p className="text-sm font-semibold text-green-800">Code appliqué !</p>
              <p className="text-xs text-green-700">{couponSuccess}</p>
            </div>
            <button
              onClick={() => setCouponSuccess(null)}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        ) : (
          <form onSubmit={handleCoupon} className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="ex : ENVIRO25K"
              maxLength={30}
              className="flex-1 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-mono tracking-wider placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24]"
            />
            <button
              type="submit"
              disabled={couponLoading || !couponCode.trim()}
              className="rounded-xl bg-[#123C24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2d1c] disabled:opacity-50 transition-colors"
            >
              {couponLoading ? '…' : 'Appliquer'}
            </button>
          </form>
        )}
        <p className="mt-2 text-xs text-green-700/70">
          Entrez votre code promotionnel pour recevoir des crédits gratuits.
        </p>
      </div>

      {/* ── Credit cost table ── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Coût des actions</h3>
          <p className="text-xs text-gray-400 mt-0.5">Crédits débités par opération</p>
        </div>
        <ul className="divide-y divide-gray-50">
          {CREDIT_COSTS.map((item) => (
            <li key={item.action} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm text-gray-700">{item.action}</span>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                {item.cost} cr
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Packs ── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Packs de crédits</h3>
            <p className="text-xs text-gray-400 mt-0.5">Rechargez selon vos besoins</p>
          </div>
          <Link
            href={
              packDiscountCode
                ? `/settings/billing/recharge?coupon=${encodeURIComponent(packDiscountCode)}`
                : '/settings/billing/recharge'
            }
            className="rounded-lg bg-[#123C24] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f2d1c] transition-colors"
          >
            Acheter
          </Link>
        </div>

        {packDiscountPct && (
          <div className="flex items-center justify-between border-b border-gray-100 bg-green-50 px-4 py-2">
            <p className="text-xs font-semibold text-green-800">
              Code <span className="font-mono">{packDiscountCode}</span> — −{packDiscountPct}% sur
              tous les packs
            </p>
            <button
              onClick={() => {
                setPackDiscountPct(null);
                setPackDiscountCode('');
              }}
              className="ml-3 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {packs.map((pack) => {
            const isPopular = pack.bonusPct >= 25;
            const discountedPrice = packDiscountPct
              ? Math.max(1, Math.round(pack.priceXOF * (1 - packDiscountPct / 100)))
              : null;
            return (
              <Link
                key={pack.id}
                href={
                  packDiscountCode
                    ? `/settings/billing/recharge?coupon=${encodeURIComponent(packDiscountCode)}`
                    : '/settings/billing/recharge'
                }
                className={`relative rounded-xl border-2 p-4 text-center transition-all hover:shadow-sm ${
                  isPopular
                    ? 'border-[#123C24]/30 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#123C24] px-2 py-0.5 text-[10px] font-bold text-white">
                    POPULAIRE
                  </span>
                )}
                {packDiscountPct && (
                  <span className="absolute top-2 right-2 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
                    −{packDiscountPct}%
                  </span>
                )}
                <p className="text-xs font-semibold text-gray-500 mb-1">{pack.name}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pack.credits.toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-gray-400">crédits</p>
                {pack.bonusPct > 0 && (
                  <p className="mt-1 text-[10px] font-bold text-amber-600">
                    +{pack.bonusPct}% offert
                  </p>
                )}
                {discountedPrice ? (
                  <div className="mt-2 flex flex-col items-center">
                    <p className="text-sm font-bold text-[#123C24]">
                      {discountedPrice.toLocaleString('fr-FR')} F
                    </p>
                    <p className="text-[10px] text-gray-400 line-through">
                      {pack.priceXOF.toLocaleString('fr-FR')} F
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-bold text-[#123C24]">
                    {pack.priceXOF.toLocaleString('fr-FR')} F
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Org info ── */}
      {selectedOrg && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Organisation
          </h3>
          <dl className="space-y-3">
            {[
              { label: 'Nom', value: selectedOrg.name },
              { label: 'Identifiant', value: selectedOrg.slug, mono: true },
              {
                label: 'Membre depuis',
                value: new Date(selectedOrg.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              },
              {
                label: 'Votre rôle',
                value:
                  selectedOrg.role === 'OWNER'
                    ? 'Propriétaire'
                    : selectedOrg.role === 'ADMIN'
                      ? 'Administrateur'
                      : 'Membre',
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className={`${mono ? 'font-mono text-xs' : 'font-medium'} text-gray-900`}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* ── Projects list ── */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Projets</h3>
        </div>

        {projectsLoading && (
          <div className="space-y-3 p-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {!projectsLoading && (!projects || projects.length === 0) && (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-400">Aucun projet</p>
            <Link
              href="/projects/new"
              className="mt-3 inline-block text-sm font-medium text-[#123C24] hover:underline"
            >
              Créer un projet →
            </Link>
          </div>
        )}

        {!projectsLoading && projects && projects.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {projects.map((project) => {
              const s = STATUS_LABELS[project.status] ?? {
                label: project.status,
                color: 'bg-gray-100 text-gray-500',
              };
              return (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="shrink-0 text-lg">{TYPE_ICONS[project.type] ?? '📁'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(project.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}
                    >
                      {s.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Summary stats (only shown without active sub) */}
      {!sub && (
        <div className="rounded-2xl bg-gradient-to-br from-[#123C24] to-[#0f2d1c] p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-green-200">Utilisation actuelle</p>
              <h2 className="text-2xl font-bold mt-0.5">Freemium</h2>
            </div>
            <span className="rounded-full bg-green-600/60 px-3 py-1 text-xs font-medium text-green-100">
              Actif
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-green-600/50 pt-4">
            <div>
              <p className="text-3xl font-bold">{activeProjects.length}</p>
              <p className="mt-0.5 text-xs text-green-200">Projets actifs</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{projects?.length ?? '—'}</p>
              <p className="mt-0.5 text-xs text-green-200">Total projets</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{balance.toLocaleString('fr-FR')}</p>
              <p className="mt-0.5 text-xs text-green-200">Crédits dispo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
