'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Smartphone, CreditCard, Zap, Tag, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useToast } from '@/contexts/ToastContext';

interface CreditPack {
  id: string;
  name: string;
  priceXOF: number;
  credits: number;
  bonusPct: number;
}

type PaymentMethod = 'MOBILE_MONEY' | 'CARD';

function RechargePageInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [couponCode, setCouponCode] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponPreview, setCouponPreview] = useState<{
    discountPct: number | null;
    description: string | null;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: packsData, loading: packsLoading } = useApi<{ packs: CreditPack[] }>(
    '/api/credits/packs',
  );
  const { data: balanceData } = useApi<{
    balance: number;
    transactions: { reason: string }[];
  }>('/api/credits/balance');

  const packs = packsData?.packs ?? [];

  useEffect(() => {
    if (!selectedPackId && packs.length > 0 && packs[0]) {
      setSelectedPackId(packs[0].id);
    }
  }, [packs, selectedPackId]);

  const selectedPack = packs.find((p) => p.id === selectedPackId);

  const applyCoupon = useCallback(
    async (codeOverride?: string) => {
      const code = (codeOverride ?? couponInput).trim().toUpperCase();
      if (!code) return;
      setCouponChecking(true);
      setCouponError(null);
      setCouponPreview(null);
      if (!codeOverride) setCouponInput(code);
      try {
        const res = await api<{
          discountPct: number | null;
          credits: number;
          description: string | null;
        }>(`/api/credits/coupon?code=${encodeURIComponent(code)}`);
        setCouponPreview({ discountPct: res.discountPct, description: res.description });
        setCouponCode(code);
        if (codeOverride) setCouponInput(code);
      } catch (err) {
        setCouponError(err instanceof Error ? err.message : 'Code invalide.');
      } finally {
        setCouponChecking(false);
      }
    },
    [couponInput],
  );

  useEffect(() => {
    const urlCoupon = searchParams.get('coupon')?.toUpperCase().trim();
    if (urlCoupon) applyCoupon(urlCoupon);
  }, []); // intentionally run once on mount to apply coupon from URL

  // Auto-apply welcome discount for new users (balance=0, no past purchases)
  useEffect(() => {
    if (!balanceData || couponCode) return;
    const welcomeCode = process.env.NEXT_PUBLIC_WELCOME_COUPON;
    if (!welcomeCode) return;
    const isNewUser =
      balanceData.balance === 0 &&
      !balanceData.transactions.some((tx) => tx.reason === 'PACK_PURCHASE');
    if (isNewUser) applyCoupon(welcomeCode);
  }, [balanceData, couponCode, applyCoupon]);

  function removeCoupon() {
    setCouponCode('');
    setCouponInput('');
    setCouponPreview(null);
    setCouponError(null);
  }

  async function handleCheckout() {
    if (!selectedPackId || loading) return;
    setLoading(true);
    try {
      const result = await api<{ paymentUrl: string; orderId: string; creditOrderId: string }>(
        '/api/credits/checkout',
        {
          method: 'POST',
          body: {
            packId: selectedPackId,
            paymentMethod: method,
            ...(couponCode ? { couponCode } : {}),
          },
        },
      );
      window.location.href = result.paymentUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de paiement';
      toast(msg, 'error');
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Facturation
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Recharger vos crédits</h1>
        <p className="text-sm text-gray-500 mt-0.5">Choisissez un pack et un mode de paiement</p>
      </div>

      {/* Coupon — BEFORE pack grid so prices update immediately */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Tag size={13} className="text-gray-400" />
          Code promo
        </p>

        {couponPreview ? (
          <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-2.5">
            <div>
              <p className="text-sm font-semibold text-green-800">{couponCode}</p>
              <p className="text-xs text-green-700">
                {couponPreview.discountPct
                  ? `−${couponPreview.discountPct}% appliqué sur tous les packs`
                  : (couponPreview.description ?? 'Code promo appliqué')}
              </p>
            </div>
            <button onClick={removeCoupon} className="text-gray-400 hover:text-gray-600 ml-3">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
              placeholder="ex : BIENVENUE"
              maxLength={30}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm tracking-wider placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24]"
            />
            <button
              type="button"
              onClick={() => applyCoupon()}
              disabled={!couponInput.trim() || couponChecking}
              className="rounded-xl bg-[#123C24] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f2d1c] disabled:opacity-50 transition-colors"
            >
              {couponChecking ? '…' : 'Vérifier'}
            </button>
          </div>
        )}

        {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
      </div>

      {/* Pack grid */}
      {packsLoading ? (
        <div className="text-center text-gray-400 text-sm py-12">Chargement des offres…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {packs.map((pack) => {
            const isSelected = pack.id === selectedPackId;
            const isPopular = pack.bonusPct > 10;
            const discountedPrice = couponPreview?.discountPct
              ? Math.max(1, Math.round(pack.priceXOF * (1 - couponPreview.discountPct / 100)))
              : null;
            const displayPrice = discountedPrice ?? pack.priceXOF;
            const pricePerCredit = Math.round(displayPrice / pack.credits);

            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPackId(pack.id)}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
                  isSelected
                    ? 'border-[#123C24] bg-[#123C24]/5 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {/* Top badges */}
                <div className="flex items-center gap-1.5 mb-3 min-h-[22px]">
                  {isPopular && (
                    <span className="bg-[#123C24] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      POPULAIRE
                    </span>
                  )}
                  {pack.bonusPct > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      +{pack.bonusPct}% OFFERT
                    </span>
                  )}
                  {couponPreview?.discountPct && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      −{couponPreview.discountPct}%
                    </span>
                  )}
                </div>

                {/* Selected check */}
                {isSelected && (
                  <span className="absolute top-4 right-4 w-5 h-5 bg-[#123C24] rounded-full flex items-center justify-center">
                    <Check size={11} className="text-white" strokeWidth={3} />
                  </span>
                )}

                <p className="text-sm font-semibold text-gray-500 mb-1">{pack.name}</p>
                <p className="text-3xl font-bold text-gray-900 leading-none">
                  {pack.credits.toLocaleString('fr-FR')}
                  <span className="text-base font-normal text-gray-400 ml-1.5">crédits</span>
                </p>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between">
                  <div>
                    {discountedPrice ? (
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-lg font-bold text-[#123C24]">
                          {discountedPrice.toLocaleString('fr-FR')}
                          <span className="text-xs font-semibold text-gray-500 ml-1">FCFA</span>
                        </p>
                        <p className="text-xs text-gray-400 line-through">
                          {pack.priceXOF.toLocaleString('fr-FR')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-[#123C24]">
                        {pack.priceXOF.toLocaleString('fr-FR')}
                        <span className="text-xs font-semibold text-gray-500 ml-1">FCFA</span>
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{pricePerCredit} F/cr</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Payment method */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Mode de paiement
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMethod('MOBILE_MONEY')}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all text-left ${
              method === 'MOBILE_MONEY'
                ? 'border-[#123C24] bg-[#123C24]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Smartphone
              size={18}
              className={method === 'MOBILE_MONEY' ? 'text-[#123C24]' : 'text-gray-400'}
            />
            <div>
              <p
                className={`text-sm font-semibold ${
                  method === 'MOBILE_MONEY' ? 'text-[#123C24]' : 'text-gray-700'
                }`}
              >
                Mobile Money
              </p>
              <p className="text-xs text-gray-400">Wave, Orange, MTN…</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMethod('CARD')}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all text-left ${
              method === 'CARD'
                ? 'border-[#123C24] bg-[#123C24]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <CreditCard
              size={18}
              className={method === 'CARD' ? 'text-[#123C24]' : 'text-gray-400'}
            />
            <div>
              <p
                className={`text-sm font-semibold ${
                  method === 'CARD' ? 'text-[#123C24]' : 'text-gray-700'
                }`}
              >
                Carte bancaire
              </p>
              <p className="text-xs text-gray-400">Visa / Mastercard</p>
            </div>
          </button>
        </div>
      </div>

      {/* CTA */}
      {(() => {
        const basePrice = selectedPack?.priceXOF ?? 0;
        const discountedPrice =
          couponPreview?.discountPct && basePrice
            ? Math.max(1, Math.round(basePrice * (1 - couponPreview.discountPct / 100)))
            : null;
        return (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!selectedPackId || loading || packsLoading}
            className="w-full bg-[#123C24] text-white py-3.5 rounded-full font-semibold text-sm hover:bg-green-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              'Redirection vers le paiement…'
            ) : selectedPack ? (
              <>
                <Zap size={15} />
                {discountedPrice ? (
                  <>
                    Payer{' '}
                    <span className="line-through opacity-60 mr-1">
                      {basePrice.toLocaleString('fr-FR')}
                    </span>
                    {discountedPrice.toLocaleString('fr-FR')} FCFA
                  </>
                ) : (
                  <>Payer {basePrice.toLocaleString('fr-FR')} FCFA</>
                )}
              </>
            ) : (
              'Sélectionnez un pack'
            )}
          </button>
        );
      })()}

      <p className="text-xs text-gray-400 text-center mt-3">
        Paiement sécurisé — vos crédits sont disponibles dès confirmation du paiement
      </p>
    </div>
  );
}

export default function RechargePage() {
  return (
    <Suspense>
      <RechargePageInner />
    </Suspense>
  );
}
