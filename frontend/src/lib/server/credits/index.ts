/**
 * Helpers comptables pour le système de crédits EnviroTrack.
 *
 * Invariants :
 *  - Toutes les mutations du solde passent par ce module — jamais
 *    `prisma.user.update({ creditBalance })` directement.
 *  - `deductCredits` et `creditUser` tournent TOUJOURS dans une
 *    transaction Serializable pour éviter les races.
 *  - `CreditTransaction` est immuable (pas de update/delete).
 */
import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/server/prisma';

// ─── Types ────────────────────────────────────────────────────────────────

export type CreditReason =
  | 'PACK_PURCHASE' // achat d'un pack (CREDIT)
  | 'PROJECT_ACTIVATION' // activation d'un projet PGES supplémentaire (DEBIT 100 cr)
  | 'PDF_EXPORT' // export rapport PDF (DEBIT 15 cr)
  | 'REGULATORY_SYNC' // sync réglementaire manuelle (DEBIT 10 cr)
  | 'TERRAIN_INVITE' // invitation agent terrain (DEBIT 30 cr)
  | 'CSV_EXPORT' // export CSV/Excel (DEBIT 20 cr)
  | 'BAILLEUR_SHARE' // partage rapport bailleur (DEBIT 5 cr)
  | 'ADMIN_ADJUSTMENT'; // ajustement manuel SUPERADMIN

export const CREDIT_COSTS: Record<
  Exclude<CreditReason, 'PACK_PURCHASE' | 'ADMIN_ADJUSTMENT'>,
  number
> = {
  PROJECT_ACTIVATION: 100,
  PDF_EXPORT: 15,
  REGULATORY_SYNC: 10,
  TERRAIN_INVITE: 30,
  CSV_EXPORT: 20,
  BAILLEUR_SHARE: 5,
};

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly available: number,
    public readonly required: number,
  ) {
    super(`Insufficient credits: need ${required}, have ${available}`);
    this.name = 'InsufficientCreditsError';
  }
}

// ─── Debit ────────────────────────────────────────────────────────────────

/**
 * Déduit `amount` crédits du solde de `userId` dans une transaction
 * Serializable. Lève `InsufficientCreditsError` si le solde est insuffisant.
 *
 * Retourne la `CreditTransaction` créée.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: CreditReason,
  description?: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { creditBalance: true },
      });

      if (user.creditBalance < amount) {
        throw new InsufficientCreditsError(user.creditBalance, amount);
      }

      const balanceBefore = user.creditBalance;
      const balanceAfter = balanceBefore - amount;

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      return tx.creditTransaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          balanceBefore,
          balanceAfter,
          reason,
          description: description ?? reason,
        },
      });
    },
    { isolationLevel: 'Serializable' },
  );
}

// ─── Credit ───────────────────────────────────────────────────────────────

/**
 * Crédite `amount` crédits sur le solde de `userId`.
 * Doit être appelé DEPUIS un handler de webhook (dans la tx existante)
 * ou via un creditOrderId (achat confirmé).
 *
 * @param txClient  Client de transaction Prisma (tx déjà ouverte)
 */
export async function creditUser(
  txClient: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >,
  userId: string,
  amount: number,
  reason: CreditReason,
  creditOrderId?: string,
  description?: string,
) {
  const user = await txClient.user.findUniqueOrThrow({
    where: { id: userId },
    select: { creditBalance: true },
  });

  const balanceBefore = user.creditBalance;
  const balanceAfter = balanceBefore + amount;

  await txClient.user.update({
    where: { id: userId },
    data: { creditBalance: balanceAfter },
  });

  return txClient.creditTransaction.create({
    data: {
      userId,
      type: 'CREDIT',
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      description: description ?? reason,
      ...(creditOrderId ? { creditOrderId } : {}),
    },
  });
}
