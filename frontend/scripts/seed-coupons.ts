/**
 * Seed coupons de lancement EnviroTrack
 * Usage : pnpm --filter frontend exec tsx scripts/seed-coupons.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COUPONS = [
  {
    code: 'BIENVENUE',
    description: '200 crédits offerts — cadeau de bienvenue',
    discountPct: null,
    credits: 200, // > 1 mois Solo Expert (150 cr) — accès complet d'entrée de jeu
    maxUses: null, // illimité
    expiresAt: null,
    active: true,
  },
  {
    code: 'LANCEMENT',
    description: '95 % de remise sur votre premier abonnement',
    discountPct: 95,
    credits: 0,
    maxUses: 100,
    expiresAt: new Date('2026-12-31T23:59:59Z'),
    active: true,
  },
  {
    code: 'BETA',
    description: 'Accès bêta 100 % gratuit — offre limitée',
    discountPct: 100,
    credits: 350, // 1 mois Bureau Pro offert en crédits
    maxUses: 30,
    expiresAt: new Date('2026-09-30T23:59:59Z'),
    active: true,
  },
  {
    code: 'ANGE2025',
    description: 'Partenariat ANGE — 90 % de remise',
    discountPct: 90,
    credits: 150, // 1 mois Solo Expert offert
    maxUses: 50,
    expiresAt: new Date('2026-12-31T23:59:59Z'),
    active: true,
  },
  {
    code: 'EXPLORE',
    description: '100 crédits gratuits pour explorer la plateforme',
    discountPct: null,
    credits: 100,
    maxUses: null,
    expiresAt: null,
    active: true,
  },
] as const;

async function main() {
  console.log('Seeding coupons de lancement…\n');

  for (const coupon of COUPONS) {
    const result = await prisma.coupon.upsert({
      where: { code: coupon.code },
      create: { ...coupon, usedCount: 0 },
      update: {
        description: coupon.description,
        discountPct: coupon.discountPct ?? null,
        credits: coupon.credits,
        maxUses: coupon.maxUses ?? null,
        expiresAt: coupon.expiresAt ?? null,
        active: coupon.active,
      },
    });

    const type =
      result.discountPct != null ? `−${result.discountPct} %` : `+${result.credits} crédits`;
    const limit = result.maxUses != null ? `max ${result.maxUses} uses` : 'illimité';
    const expiry = result.expiresAt
      ? `expire ${result.expiresAt.toISOString().slice(0, 10)}`
      : 'sans expiration';

    console.log(`  ✓ ${result.code.padEnd(12)} ${type.padEnd(16)} ${limit.padEnd(18)} ${expiry}`);
  }

  console.log('\nCoupons créés. Vérifiez dans /admin/coupons.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
