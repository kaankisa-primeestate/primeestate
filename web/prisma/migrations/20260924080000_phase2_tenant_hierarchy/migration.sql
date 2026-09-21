/*
  Phase 2 data integrity:
  - Preserve the existing Sale/PaymentInstallment safeguards.
  - Enforce User -> Office -> Organization consistency.
  - Enforce User -> Team -> Office consistency.
  - Existing inconsistent rows block the migration; no data is rewritten or deleted.
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

  IF EXISTS (
    SELECT 1
    FROM "User" u
    LEFT JOIN "Office" o ON o.id = u."officeId"
    WHERE o.id IS NULL
       OR o."organizationId" <> u."organizationId"
  ) THEN
    RAISE EXCEPTION 'Cannot enforce User -> Office -> Organization integrity: inconsistent User rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "User" u
    JOIN "Team" t ON t.id = u."teamId"
    WHERE t."officeId" <> u."officeId"
  ) THEN
    RAISE EXCEPTION 'Cannot enforce User -> Team -> Office integrity: inconsistent User rows exist';
  END IF;
END $$;

ALTER TABLE "PaymentInstallment"
DROP CONSTRAINT "PaymentInstallment_saleId_fkey";

DROP INDEX "PaymentInstallment_saleId_dueAt_status_idx";

ALTER TABLE "PaymentInstallment"
DROP COLUMN "saleId";

CREATE UNIQUE INDEX "Sale_listingId_key" ON "Sale"("listingId");

CREATE UNIQUE INDEX "Office_id_organizationId_key" ON "Office"("id", "organizationId");
CREATE UNIQUE INDEX "Team_id_officeId_key" ON "Team"("id", "officeId");
CREATE UNIQUE INDEX "User_id_organizationId_officeId_key" ON "User"("id", "organizationId", "officeId");

ALTER TABLE "User"
ADD CONSTRAINT "User_officeId_organizationId_fkey"
FOREIGN KEY ("officeId", "organizationId")
REFERENCES "Office"("id", "organizationId")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_teamId_officeId_fkey"
FOREIGN KEY ("teamId", "officeId")
REFERENCES "Team"("id", "officeId")
ON DELETE SET NULL
ON UPDATE CASCADE;
