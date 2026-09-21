-- AlterTable
ALTER TABLE "Sale"
ADD COLUMN "commissionRate" DECIMAL(7,4),
ADD COLUMN "grossCommission" DECIMAL(18,2),
ADD COLUMN "officeShareRate" DECIMAL(7,4),
ADD COLUMN "officeShare" DECIMAL(18,2),
ADD COLUMN "consultantShare" DECIMAL(18,2);
