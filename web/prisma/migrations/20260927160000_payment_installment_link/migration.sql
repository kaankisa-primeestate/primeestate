-- Link one payment to one installment so the financial chain is explicit.
ALTER TABLE "Payment" ADD COLUMN "installmentId" TEXT;
CREATE UNIQUE INDEX "Payment_installmentId_key" ON "Payment"("installmentId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "PaymentInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
