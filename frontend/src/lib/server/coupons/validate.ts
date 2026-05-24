// Shared coupon validator — used by checkout, subscriptions, and the legacy
// /api/credits/coupon route. Must be called inside a Prisma transaction so the
// CouponRedemption insert and usedCount increment are atomic with the
// surrounding business logic.
import type { Prisma } from '@prisma/client';

export interface ValidatedCoupon {
  id: string;
  code: string;
  credits: number;
  discountPct: number | null;
  description: string | null;
}

type TxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type CouponValidationError =
  | 'COUPON_NOT_FOUND'
  | 'COUPON_INACTIVE'
  | 'COUPON_EXPIRED'
  | 'COUPON_EXHAUSTED'
  | 'COUPON_ALREADY_USED';

export class CouponError extends Error {
  constructor(public readonly code: CouponValidationError) {
    super(code);
    this.name = 'CouponError';
  }
}

/**
 * Validate a coupon code and record its use atomically.
 * Throws CouponError with a stable code on any validation failure.
 * Must be called inside a Prisma $transaction.
 */
export async function validateAndRedeemCoupon(
  tx: TxClient,
  couponCode: string,
  userId: string,
): Promise<ValidatedCoupon> {
  const code = couponCode.toUpperCase().trim();

  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon) throw new CouponError('COUPON_NOT_FOUND');
  if (!coupon.active) throw new CouponError('COUPON_INACTIVE');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new CouponError('COUPON_EXPIRED');
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    throw new CouponError('COUPON_EXHAUSTED');

  const alreadyUsed = await tx.couponRedemption.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
  });
  if (alreadyUsed) throw new CouponError('COUPON_ALREADY_USED');

  await tx.couponRedemption.create({ data: { couponId: coupon.id, userId } });
  await tx.coupon.update({
    where: { id: coupon.id },
    data: { usedCount: { increment: 1 } },
  });

  return {
    id: coupon.id,
    code: coupon.code,
    credits: coupon.credits,
    discountPct: coupon.discountPct,
    description: coupon.description,
  };
}

/** Translate a CouponValidationError code to a French user-facing message. */
export function couponErrorMessage(code: CouponValidationError): string {
  switch (code) {
    case 'COUPON_NOT_FOUND':
      return 'Code promo introuvable.';
    case 'COUPON_INACTIVE':
      return 'Ce code promo est désactivé.';
    case 'COUPON_EXPIRED':
      return 'Ce code promo a expiré.';
    case 'COUPON_EXHAUSTED':
      return "Ce code promo a atteint sa limite d'utilisation.";
    case 'COUPON_ALREADY_USED':
      return 'Vous avez déjà utilisé ce code promo.';
  }
}
