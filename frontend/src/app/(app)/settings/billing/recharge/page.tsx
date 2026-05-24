'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Smartphone, CreditCard, Zap } from 'lucide-react';
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

export default function RechargePage() {
  const { toast } = useToast();
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [loading, setLoading] = useState(false);

  const { data: packsData, loading: packsLoading } = useApi<{ packs: CreditPack[] }>(
    '/api/credits/packs',
  );

  const packs = packsData?.packs ?? [];

  useEffect(() => {
    if (!selectedPackId && packs.length > 0 && packs[0]) {
      setSelectedPackId(packs[0].id);
    }
  }, [packs, selectedPackId]);

  const selectedPack = packs.find((p) => p.id === selectedPackId);

  async function handleCheckout() {
    if (!selectedPackId || loading) return;
    setLoading(true);
    try {
      const result = await api<{ paymentUrl: string; orderId: string; creditOrderId: string }>(
        '/api/credits/checkout',
        {
          method: 'POST',
          body: { packId: selectedPackId, paymentMethod: method },
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

      {/* Pack grid */}
      {packsLoading ? (
        <div className="text-center text-gray-400 text-sm py-12">Chargement des offres…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {packs.map((pack) => {
            const isSelected = pack.id === selectedPackId;
            const isPopular = pack.bonusPct > 10;
            const pricePerCredit = Math.round(pack.priceXOF / pack.credits);

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
                    <p className="text-lg font-bold text-[#123C24]">
                      {pack.priceXOF.toLocaleString('fr-FR')}
                      <span className="text-xs font-semibold text-gray-500 ml-1">FCFA</span>
                    </p>
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
            Payer {selectedPack.priceXOF.toLocaleString('fr-FR')} FCFA
          </>
        ) : (
          'Sélectionnez un pack'
        )}
      </button>

      <p className="text-xs text-gray-400 text-center mt-3">
        Paiement sécurisé — vos crédits sont disponibles dès confirmation du paiement
      </p>
    </div>
  );
}
