-- PrimeEstate now uses one-time payment collection with ledger entries.
-- Test data is disposable in the current product stage, so obsolete installment
-- tables and their payment link are removed instead of being migrated.
DROP INDEX IF EXISTS "Payment_installmentId_key";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_installmentId_fkey";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "installmentId";
DROP TABLE IF EXISTS "PaymentInstallment";
DROP TABLE IF EXISTS "PaymentPlan";
DROP TYPE IF EXISTS "InstallmentStatus";
