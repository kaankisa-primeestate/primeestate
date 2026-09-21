/*
  Phase 2 tenant hierarchy integrity:
  - Enforce User -> Office -> Organization consistency.
  - Enforce User -> Team -> Office consistency.
  - Existing inconsistent rows block the migration.
  - No data is rewritten or deleted.
*/

DO $$
BEGIN
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

CREATE UNIQUE INDEX "Office_id_organizationId_key"
  ON "Office"("id", "organizationId");

CREATE UNIQUE INDEX "Team_id_officeId_key"
  ON "Team"("id", "officeId");

CREATE UNIQUE INDEX "User_id_organizationId_officeId_key"
  ON "User"("id", "organizationId", "officeId");

ALTER TABLE "User"
DROP CONSTRAINT "User_officeId_fkey";

ALTER TABLE "User"
DROP CONSTRAINT "User_teamId_fkey";

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
