CREATE TABLE "ConsultantProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "tcIdentityEncrypted" TEXT NOT NULL,
  "tcIdentityHash" TEXT NOT NULL,
  "tcIdentityLast4" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConsultantProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsultantCompany" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT,
  "taxNumber" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConsultantCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsultantCommissionPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "officeId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "officeShareRate" DECIMAL(7,4),
  "consultantShareRate" DECIMAL(7,4),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConsultantCommissionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsultantProfile_userId_key" ON "ConsultantProfile"("userId");
CREATE UNIQUE INDEX "ConsultantProfile_officeId_tcIdentityHash_key" ON "ConsultantProfile"("officeId","tcIdentityHash");
CREATE UNIQUE INDEX "ConsultantCompany_userId_key" ON "ConsultantCompany"("userId");
CREATE UNIQUE INDEX "ConsultantCommissionPlan_userId_key" ON "ConsultantCommissionPlan"("userId");

CREATE INDEX "ConsultantProfile_organizationId_officeId_idx" ON "ConsultantProfile"("organizationId","officeId");
CREATE INDEX "ConsultantCompany_organizationId_officeId_idx" ON "ConsultantCompany"("organizationId","officeId");
CREATE INDEX "ConsultantCommissionPlan_organizationId_officeId_active_idx" ON "ConsultantCommissionPlan"("organizationId","officeId","active");

ALTER TABLE "ConsultantProfile" ADD CONSTRAINT "ConsultantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantProfile" ADD CONSTRAINT "ConsultantProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantProfile" ADD CONSTRAINT "ConsultantProfile_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultantCompany" ADD CONSTRAINT "ConsultantCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantCompany" ADD CONSTRAINT "ConsultantCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantCompany" ADD CONSTRAINT "ConsultantCompany_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultantCommissionPlan" ADD CONSTRAINT "ConsultantCommissionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantCommissionPlan" ADD CONSTRAINT "ConsultantCommissionPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultantCommissionPlan" ADD CONSTRAINT "ConsultantCommissionPlan_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;