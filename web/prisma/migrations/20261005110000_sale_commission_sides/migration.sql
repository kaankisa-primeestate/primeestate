ALTER TABLE "Sale" ADD COLUMN "buyerCommissionRate" DECIMAL(7,4);
ALTER TABLE "Sale" ADD COLUMN "sellerCommissionRate" DECIMAL(7,4);

UPDATE "Sale"
SET "buyerCommissionRate" = "commissionRate" / 2,
    "sellerCommissionRate" = "commissionRate" / 2
WHERE "commissionRate" IS NOT NULL;
