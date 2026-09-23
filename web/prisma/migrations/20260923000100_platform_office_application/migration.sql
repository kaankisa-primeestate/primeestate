CREATE TYPE "OfficeApplicationStatus" AS ENUM ('BEKLEMEDE', 'ONAYLANDI', 'REDDEDILDI');

CREATE TABLE "OfficeApplication" (
  "id" TEXT NOT NULL,
  "officeName" TEXT NOT NULL,
  "ownerFirstName" TEXT NOT NULL,
  "ownerLastName" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "ownerPhone" TEXT NOT NULL,
  "passwordHash" TEXT,
  "status" "OfficeApplicationStatus" NOT NULL DEFAULT 'BEKLEMEDE',
  "rejectionNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OfficeApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfficeApplication_status_createdAt_idx" ON "OfficeApplication"("status", "createdAt");
CREATE INDEX "OfficeApplication_ownerEmail_idx" ON "OfficeApplication"("ownerEmail");
