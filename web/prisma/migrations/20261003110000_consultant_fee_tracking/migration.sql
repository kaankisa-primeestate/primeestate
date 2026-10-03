-- Consultant office fee tracking
CREATE TYPE "ConsultantFeeStatus" AS ENUM ('BEKLIYOR', 'ODENDI', 'IPTAL');

CREATE TABLE "ConsultantFee" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "consultantUserId" TEXT NOT NULL,
  "period" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" "ConsultantFeeStatus" NOT NULL DEFAULT 'BEKLIYOR',
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConsultantFee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsultantFee_consultantUserId_period_key" ON "ConsultantFee"("consultantUserId", "period");
CREATE INDEX "ConsultantFee_officeId_status_dueAt_idx" ON "ConsultantFee"("officeId", "status", "dueAt");
CREATE INDEX "ConsultantFee_organizationId_officeId_period_idx" ON "ConsultantFee"("organizationId", "officeId", "period");

ALTER TABLE "ConsultantFee"
  ADD CONSTRAINT "ConsultantFee_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultantFee"
  ADD CONSTRAINT "ConsultantFee_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultantFee"
  ADD CONSTRAINT "ConsultantFee_consultantUserId_fkey"
  FOREIGN KEY ("consultantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
