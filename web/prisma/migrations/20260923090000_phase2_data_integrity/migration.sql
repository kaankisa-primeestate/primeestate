/*
  Phase 2 data integrity:
  - A listing can have at most one Sale.
  - PaymentInstallment derives its Sale through PaymentPlan; the duplicate saleId link is removed.
  - Existing inconsistent installment links or duplicate sales block the migration instead of silently discarding data.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PaymentInstallment" pi
    JOIN "PaymentPlan" pp ON pp.id = pi."planId"
    WHERE pi."saleId" <> pp."saleId"
  ) THEN
    RAISE EXCEPTION 'Cannot remove PaymentInstallment.saleId: inconsistent plan/sale relationships exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Sale"
    GROUP BY "listingId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one Sale per Listing: duplicate Sale rows exist for at least one listing';
  END IF;
END $$;

ALTER TABLE "PaymentInstallment"
DROP CONSTRAINT "PaymentInstallment_saleId_fkey";

DROP INDEX "PaymentInstallment_saleId_dueAt_status_idx";

ALTER TABLE "PaymentInstallment"
DROP COLUMN "saleId";

CREATE UNIQUE INDEX "Sale_listingId_key" ON "Sale"("listingId");
