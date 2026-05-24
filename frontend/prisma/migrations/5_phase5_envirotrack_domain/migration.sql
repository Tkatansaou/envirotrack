-- Phase 5: Credits, Subscriptions, Coupons + EnviroTrack domain models
-- Covers everything added via db:push since migration 4_phase3_admin_orders.
-- Run on a FRESH DB after migrations 0-4 to build the complete schema.
-- On the existing dev/prod DB (already set up via db:push): mark as applied
-- with `prisma migrate resolve --applied 5_phase5_envirotrack_domain`.

-- AlterTable User: add accountType + creditBalance
ALTER TABLE "User" ADD COLUMN "accountType" TEXT;
ALTER TABLE "User" ADD COLUMN "creditBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable CreditPack
CREATE TABLE "CreditPack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceXOF" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "bonusPct" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable CreditOrder
CREATE TABLE "CreditOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreditOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable CreditTransaction
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "creditOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable SubscriptionPlan
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "creditsPerMonth" INTEGER NOT NULL,
    "creditsPerYear" INTEGER,
    "priceXOF" INTEGER NOT NULL,
    "priceAnnualXOF" INTEGER,
    "maxProjects" INTEGER,
    "features" JSONB NOT NULL DEFAULT '[]',
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextRenewalAt" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "renewalFailures" INTEGER NOT NULL DEFAULT 0,
    "lastRenewalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable Feedback
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "rating" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "page" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable Coupon
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "discountPct" INTEGER,
    "description" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable CouponRedemption
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable BureauProfile
CREATE TABLE "BureauProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agrementANGE" TEXT,
    "logoUrl" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "siteWeb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BureauProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExpertProfile
CREATE TABLE "ExpertProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agrementPersonnel" TEXT,
    "specialites" TEXT[],
    "anneesExperience" INTEGER,
    "bio" TEXT,
    "telephone" TEXT,
    "siteWeb" TEXT,
    "linkedinUrl" TEXT,
    "paysActivite" TEXT NOT NULL DEFAULT 'TG',
    "disponibilite" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "tarifJournalier" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpertProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProjectAssignment
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AGENT',
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable Project
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "expertId" TEXT,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "canton" TEXT,
    "maitreOuvrage" TEXT NOT NULL,
    "financement" TEXT NOT NULL DEFAULT 'STANDARD',
    "bailleur" TEXT,
    "startDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable ChecklistItem
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable EIESSection
CREATE TABLE "EIESSection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sectionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'EMPTY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EIESSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable PGESMeasure
CREATE TABLE "PGESMeasure" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "composante" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PGESMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable PGESQuarterlyStatus
CREATE TABLE "PGESQuarterlyStatus" (
    "id" TEXT NOT NULL,
    "measureId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_EVALUATED',
    "comment" TEXT,
    "evaluatedBy" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PGESQuarterlyStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable RegulatoryText
CREATE TABLE "RegulatoryText" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'AUTRE',
    "content" TEXT NOT NULL,
    "applicableTypes" TEXT[],
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegulatoryText_pkey" PRIMARY KEY ("id")
);

-- CreateTable ApifySyncJob
CREATE TABLE "ApifySyncJob" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actorRunId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "itemsUpserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "ApifySyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable FieldEntry
CREATE TABLE "FieldEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "measureId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NON_EVALUE',
    "observation" TEXT,
    "photos" TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FieldEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable MonthlyReport
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "preparedBy" TEXT NOT NULL,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable NonConformity
CREATE TABLE "NonConformity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "measureId" TEXT,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "gravity" TEXT NOT NULL DEFAULT 'MAJOR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "recommendation" TEXT,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "photos" TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NonConformity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditPack_active_idx" ON "CreditPack"("active");

CREATE UNIQUE INDEX "CreditOrder_orderId_key" ON "CreditOrder"("orderId");
CREATE INDEX "CreditOrder_userId_createdAt_idx" ON "CreditOrder"("userId", "createdAt");
CREATE INDEX "CreditOrder_status_idx" ON "CreditOrder"("status");

CREATE UNIQUE INDEX "CreditTransaction_creditOrderId_key" ON "CreditTransaction"("creditOrderId");
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");
CREATE INDEX "CreditTransaction_type_createdAt_idx" ON "CreditTransaction"("type", "createdAt");

CREATE UNIQUE INDEX "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");
CREATE INDEX "SubscriptionPlan_active_idx" ON "SubscriptionPlan"("active");

CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_nextRenewalAt_idx" ON "Subscription"("status", "nextRenewalAt");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");
CREATE INDEX "Feedback_category_idx" ON "Feedback"("category");
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");
CREATE INDEX "Coupon_active_idx" ON "Coupon"("active");

CREATE UNIQUE INDEX "CouponRedemption_couponId_userId_key" ON "CouponRedemption"("couponId", "userId");
CREATE INDEX "CouponRedemption_userId_idx" ON "CouponRedemption"("userId");

CREATE UNIQUE INDEX "BureauProfile_orgId_key" ON "BureauProfile"("orgId");

CREATE UNIQUE INDEX "ExpertProfile_userId_key" ON "ExpertProfile"("userId");
CREATE INDEX "ExpertProfile_disponibilite_idx" ON "ExpertProfile"("disponibilite");
CREATE INDEX "ExpertProfile_paysActivite_idx" ON "ExpertProfile"("paysActivite");

CREATE UNIQUE INDEX "ProjectAssignment_projectId_userId_key" ON "ProjectAssignment"("projectId", "userId");
CREATE INDEX "ProjectAssignment_userId_idx" ON "ProjectAssignment"("userId");
CREATE INDEX "ProjectAssignment_projectId_idx" ON "ProjectAssignment"("projectId");

CREATE UNIQUE INDEX "Project_orderId_key" ON "Project"("orderId");
CREATE INDEX "Project_orgId_idx" ON "Project"("orgId");
CREATE INDEX "Project_orgId_status_idx" ON "Project"("orgId", "status");
CREATE INDEX "Project_expertId_idx" ON "Project"("expertId");
CREATE INDEX "Project_expertId_status_idx" ON "Project"("expertId", "status");
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");

CREATE INDEX "ChecklistItem_projectId_idx" ON "ChecklistItem"("projectId");
CREATE INDEX "ChecklistItem_projectId_status_idx" ON "ChecklistItem"("projectId", "status");

CREATE UNIQUE INDEX "EIESSection_projectId_sectionNumber_key" ON "EIESSection"("projectId", "sectionNumber");
CREATE INDEX "EIESSection_projectId_idx" ON "EIESSection"("projectId");

CREATE INDEX "PGESMeasure_projectId_idx" ON "PGESMeasure"("projectId");

CREATE UNIQUE INDEX "PGESQuarterlyStatus_measureId_year_quarter_key" ON "PGESQuarterlyStatus"("measureId", "year", "quarter");
CREATE INDEX "PGESQuarterlyStatus_measureId_idx" ON "PGESQuarterlyStatus"("measureId");

CREATE UNIQUE INDEX "RegulatoryText_externalId_key" ON "RegulatoryText"("externalId");
CREATE INDEX "RegulatoryText_source_idx" ON "RegulatoryText"("source");
CREATE INDEX "RegulatoryText_type_idx" ON "RegulatoryText"("type");
CREATE INDEX "RegulatoryText_scrapedAt_idx" ON "RegulatoryText"("scrapedAt");

CREATE UNIQUE INDEX "ApifySyncJob_actorRunId_key" ON "ApifySyncJob"("actorRunId");
CREATE INDEX "ApifySyncJob_status_idx" ON "ApifySyncJob"("status");
CREATE INDEX "ApifySyncJob_source_triggeredAt_idx" ON "ApifySyncJob"("source", "triggeredAt");

CREATE UNIQUE INDEX "FieldEntry_measureId_agentId_entryDate_key" ON "FieldEntry"("measureId", "agentId", "entryDate");
CREATE INDEX "FieldEntry_projectId_entryDate_idx" ON "FieldEntry"("projectId", "entryDate");
CREATE INDEX "FieldEntry_measureId_idx" ON "FieldEntry"("measureId");
CREATE INDEX "FieldEntry_agentId_idx" ON "FieldEntry"("agentId");

CREATE UNIQUE INDEX "MonthlyReport_projectId_year_month_key" ON "MonthlyReport"("projectId", "year", "month");
CREATE INDEX "MonthlyReport_projectId_idx" ON "MonthlyReport"("projectId");

CREATE INDEX "NonConformity_projectId_idx" ON "NonConformity"("projectId");
CREATE INDEX "NonConformity_projectId_status_idx" ON "NonConformity"("projectId", "status");
CREATE INDEX "NonConformity_projectId_year_quarter_idx" ON "NonConformity"("projectId", "year", "quarter");

-- AddForeignKey
ALTER TABLE "CreditOrder" ADD CONSTRAINT "CreditOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditOrder" ADD CONSTRAINT "CreditOrder_packId_fkey" FOREIGN KEY ("packId") REFERENCES "CreditPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_creditOrderId_fkey" FOREIGN KEY ("creditOrderId") REFERENCES "CreditOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BureauProfile" ADD CONSTRAINT "BureauProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpertProfile" ADD CONSTRAINT "ExpertProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "ExpertProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EIESSection" ADD CONSTRAINT "EIESSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PGESMeasure" ADD CONSTRAINT "PGESMeasure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PGESQuarterlyStatus" ADD CONSTRAINT "PGESQuarterlyStatus_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "PGESMeasure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FieldEntry" ADD CONSTRAINT "FieldEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldEntry" ADD CONSTRAINT "FieldEntry_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "PGESMeasure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "PGESMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
