/**
 * Middleware HOF — vérifie que l'utilisateur a assez de crédits pour une action.
 *
 * Usage dans un Route Handler :
 *   const creditsFail = await requireCredits(auth.user.sub, 'PDF_EXPORT');
 *   if (creditsFail) return creditsFail;
 *
 * Si le solde est insuffisant, retourne 402 INSUFFICIENT_CREDITS.
 * Ne déduit PAS les crédits — c'est à la route de l'appeler après la vérification
 * en utilisant `deductCredits()` (qui est atomique en Serializable tx).
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { CREDIT_COSTS, type CreditReason } from '@/lib/server/credits';

export async function requireCredits(
  userId: string,
  reason: Exclude<CreditReason, 'PACK_PURCHASE' | 'ADMIN_ADJUSTMENT'>,
): Promise<NextResponse | null> {
  const cost = CREDIT_COSTS[reason];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  if (!user || user.creditBalance < cost) {
    return NextResponse.json(
      {
        error: 'INSUFFICIENT_CREDITS',
        message: `Cette action nécessite ${cost} crédits. Solde actuel : ${user?.creditBalance ?? 0}.`,
        required: cost,
        available: user?.creditBalance ?? 0,
      },
      { status: 402 },
    );
  }
  return null;
}
