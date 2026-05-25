/**
 * One-off: delete a CouponRedemption so the user can retry a payment
 * with the same coupon after a failed checkout.
 *
 * Usage:
 *   pnpm --filter frontend exec tsx scripts/reset-coupon-redemption.ts <email> <couponCode>
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [email, code] = process.argv.slice(2);
  if (!email || !code) {
    console.error('Usage: tsx scripts/reset-coupon-redemption.ts <email> <couponCode>');
    process.exit(1);
  }

  const couponCode = code.toUpperCase().trim();

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
    select: { id: true, usedCount: true },
  });
  if (!coupon) {
    console.error(`Coupon not found: ${couponCode}`);
    process.exit(1);
  }

  const redemption = await prisma.couponRedemption.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId: user.id } },
  });

  if (!redemption) {
    console.log('No redemption record found — nothing to reset.');
    process.exit(0);
  }

  await prisma.$transaction([
    prisma.couponRedemption.delete({
      where: { couponId_userId: { couponId: coupon.id, userId: user.id } },
    }),
    prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { decrement: 1 } },
    }),
  ]);

  console.log(
    `Done — coupon ${couponCode} reset for ${email}. usedCount was ${coupon.usedCount}, now ${coupon.usedCount - 1}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
