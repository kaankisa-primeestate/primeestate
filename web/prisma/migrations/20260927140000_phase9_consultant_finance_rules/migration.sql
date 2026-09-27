-- Phase 9: consultant office terms + broker sale approval workflow
ALTER TABLE "ConsultantApplication"
  ADD COLUMN "rentAmount" DECIMAL(18,2),
  ADD COLUMN "rentCurrency" TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN "rentStartDate" TIMESTAMP(3),
  ADD COLUMN "rentDueDay" INTEGER,
  ADD COLUMN "termsNote" TEXT;

ALTER TABLE "ConsultantCommissionPlan"
  ADD COLUMN "rentAmount" DECIMAL(18,2),
  ADD COLUMN "rentCurrency" TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN "rentStartDate" TIMESTAMP(3),
  ADD COLUMN "rentDueDay" INTEGER,
  ADD COLUMN "termsNote" TEXT;

CREATE TYPE "SaleApprovalStatus" AS ENUM ('BEKLIYOR', 'ONAYLANDI', 'REDDEDILDI');

ALTER TABLE "Sale"
  ADD COLUMN "approvalStatus" "SaleApprovalStatus" NOT NULL DEFAULT 'BEKLIYOR',
  ADD COLUMN "approvalNote" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedByUserId" TEXT,
  ADD COLUMN "consultantUserId" TEXT,
  ADD COLUMN "sourceCommissionPlanId" TEXT,
  ADD COLUMN "sourceOfficeShareRate" DECIMAL(7,4),
  ADD COLUMN "sourceConsultantShareRate" DECIMAL(7,4);

CREATE INDEX "Sale_approvalStatus_idx" ON "Sale"("approvalStatus");
CREATE INDEX "Sale_consultantUserId_status_idx" ON "Sale"("consultantUserId", "status");

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_consultantUserId_fkey"
  FOREIGN KEY ("consultantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_sourceCommissionPlanId_fkey"
  FOREIGN KEY ("sourceCommissionPlanId") REFERENCES "ConsultantCommissionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
