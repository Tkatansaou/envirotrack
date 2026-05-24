/// <reference types="node" />
// Dev seed script. Creates 3 sample users with bcrypt-hashed passwords for
// local development against a real Postgres. Refuses to run with
// NODE_ENV=production to prevent accidental destructive seeding in prod.
//
// Usage: pnpm seed:dev
//
// Idempotent — uses upsert keyed on email, so running multiple times
// does not duplicate rows.
//
// SCRIPT-01 refactor: exports `main(args, deps)` so tests can inject a
// mocked PrismaClient (no DB connection at module import time). The CLI
// guard at the bottom mirrors `make-superadmin.ts:85-92`.

import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SEED_USERS = [
  { email: 'admin@example.com', password: 'AdminPassword123!', role: 'SUPERADMIN' },
  { email: 'user@example.com', password: 'UserPassword123!', role: 'USER' },
  {
    email: 'unverified@example.com',
    password: 'UnverifiedPwd123!',
    role: 'USER',
    skipVerify: true,
  },
] as const;

interface SeedDeps {
  // Injectable for tests — defaults to a freshly-instantiated PrismaClient
  // when called as a CLI.
  prisma?: PrismaClient;
}

export async function main(_args: string[] = [], deps: SeedDeps = {}): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run seed-dev in production.');
    process.exit(1);
  }

  const prisma = deps.prisma ?? new PrismaClient();
  try {
    for (const seed of SEED_USERS) {
      const passwordHash = await bcrypt.hash(seed.password, 12);
      const user = await prisma.user.upsert({
        where: { email: seed.email },
        update: { passwordHash, role: seed.role },
        create: {
          email: seed.email,
          passwordHash,
          role: seed.role,
          emailVerifiedAt: 'skipVerify' in seed && seed.skipVerify ? null : new Date(),
        },
        select: { email: true, role: true, emailVerifiedAt: true },
      });
      const verified = user.emailVerifiedAt ? 'verified' : 'unverified';
      console.log(`✓ ${user.email} (${user.role}, ${verified})`);
    }
    console.log('\nLogin with the password from this file (do NOT use these in prod).');

    // Seed credit packs (idempotent — upsert par name)
    const CREDIT_PACKS = [
      { name: 'Starter', priceXOF: 25000, credits: 250, bonusPct: 0, sortOrder: 0 },
      { name: 'Pro', priceXOF: 50000, credits: 550, bonusPct: 10, sortOrder: 1 },
      { name: 'Business', priceXOF: 100000, credits: 1200, bonusPct: 20, sortOrder: 2 },
      { name: 'Enterprise', priceXOF: 150000, credits: 2000, bonusPct: 33, sortOrder: 3 },
    ];
    for (const pack of CREDIT_PACKS) {
      const existing = await prisma.creditPack.findFirst({ where: { name: pack.name } });
      if (existing) {
        await prisma.creditPack.update({ where: { id: existing.id }, data: pack });
      } else {
        await prisma.creditPack.create({ data: { ...pack, active: true } });
      }
      console.log(
        `✓ Pack "${pack.name}" — ${pack.priceXOF.toLocaleString()} FCFA → ${pack.credits} crédits (+${pack.bonusPct}%)`,
      );
    }
    // Seed demo coupons (idempotent — upsert par code)
    const DEMO_COUPONS = [
      { code: 'ENVIRO25K', credits: 250, description: '+250 crédits offerts (valeur 25 000 FCFA)' },
      { code: 'ENVIRO50K', credits: 550, description: '+550 crédits offerts (valeur 50 000 FCFA)' },
      {
        code: 'ENVIRO100K',
        credits: 1200,
        description: '+1 200 crédits offerts (valeur 100 000 FCFA)',
      },
      {
        code: 'ENVIRO150K',
        credits: 2000,
        description: '+2 000 crédits offerts (valeur 150 000 FCFA)',
      },
    ];
    for (const coupon of DEMO_COUPONS) {
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        update: { credits: coupon.credits, description: coupon.description, active: true },
        create: { ...coupon, maxUses: null, active: true },
      });
      console.log(`✓ Coupon "${coupon.code}" → ${coupon.credits} crédits`);
    }
  } finally {
    // Only disconnect the real client; tests pass their own mock and close
    // it themselves.
    if (!deps.prisma) {
      await prisma.$disconnect();
    }
  }
}

// CLI entrypoint guard — only run when invoked as a script, not when
// imported by tests.
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
