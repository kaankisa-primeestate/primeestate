-- CreateEnum
CREATE TYPE "ConsultantApplicationStatus" AS ENUM ('BEKLEMEDE', 'ONAYLANDI', 'REDDEDILDI');

-- CreateTable
CREATE TABLE "ConsultantApplication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "tcIdentityEncrypted" TEXT NOT NULL,
    "tcIdentityHash" TEXT NOT NULL,
    "tcIdentityLast4" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyTitle" TEXT,
    "companyTaxNumber" TEXT,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "commissionModel" TEXT NOT NULL,
    "officeShareRate" DECIMAL(7,4),
    "consultantShareRate" DECIMAL(7,4),
    "passwordHash" TEXT,
    "status" "ConsultantApplicationStatus" NOT NULL DEFAULT 'BEKLEMEDE',
    "rejectionNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsultantApplication_officeId_tcIdentityHash_key" ON "ConsultantApplication"("officeId", "tcIdentityHash");
CREATE INDEX "ConsultantApplication_organizationId_officeId_status_createdAt_idx" ON "ConsultantApplication"("organizationId", "officeId", "status", "createdAt");
CREATE INDEX "ConsultantApplication_officeId_email_idx" ON "ConsultantApplication"("officeId", "email");

ALTER TABLE "ConsultantApplication" ADD CONSTRAINT "ConsultantApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantApplication" ADD CONSTRAINT "ConsultantApplication_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
