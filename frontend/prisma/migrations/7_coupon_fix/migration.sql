-- Fix: Coupon table was baselined without discountPct and updatedAt columns.
-- Adding the two missing columns that exist in schema.prisma but not in the DB.

ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "discountPct" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
