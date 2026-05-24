import Link from 'next/link';
import { XCircle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CreditFailedPage({ searchParams }: PageProps) {
  const { orderId } = await searchParams;

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle size={32} className="text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement non finalisé</h1>
        <p className="text-gray-500 text-sm mb-1">La transaction n'a pas abouti.</p>
        <p className="text-gray-400 text-xs mb-6">
          Votre compte n'a pas été débité. Vous pouvez réessayer.
        </p>

        {orderId && (
          <p className="text-xs text-gray-400 mb-6">
            Référence :{' '}
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {orderId}
            </span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/settings/billing/recharge"
            className="bg-[#123C24] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-green-900 transition-colors"
          >
            Réessayer
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-500 px-6 py-3 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
