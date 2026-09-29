import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound, conflict } from "@/lib/api-response";

class PaymentConflictError extends Error {}
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { assertCan(context, "payments", "update"); } catch { return forbidden(); }
  const { id } = await params;
  let body: { status?: unknown; paidAt?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  const status = body.status === undefined
    ? undefined
    : body.status === "ODENDI" || body.status === "IPTAL" || body.status === "BEKLIYOR"
      ? body.status
      : null;
  if (status === null) return validationError("Geçersiz tahsilat durumu.");
  if (!status && body.paidAt === undefined && body.note === undefined) return validationError("Güncellenecek alan bulunamadı.");

  const existing = await prisma.payment.findFirst({
    where: { id, sale: { customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } } },
    include: { installment: { select: { id: true, planId: true, sequence: true, status: true } }, sale: { select: { id: true, amount: true, currency: true, commissionRate: true, officeShareRate: true, approvalStatus: true } }, ledgerEntries: true },
  });
  if (!existing) return notFound("Tahsilat bulunamadı veya yetkiniz yok.");
  if (existing.sale.approvalStatus !== "ONAYLANDI") return conflict("Tahsilat işlemleri için satışın broker tarafından onaylanmış olması gerekir.");

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const targetStatus = status ?? existing.status;
      if (targetStatus === "ODENDI" && existing.status !== "ODENDI") {
        const otherPaid = await tx.payment.aggregate({ _sum: { amount: true }, where: { saleId: existing.saleId, status: "ODENDI", id: { not: id } } });
        const total = (otherPaid._sum.amount ?? new Prisma.Decimal(0)).add(existing.amount);
        if (total.gt(existing.sale.amount)) throw new PaymentConflictError("Toplam tahsilat satış tutarını aşamaz.");
        if (!existing.sale.commissionRate || !existing.sale.officeShareRate) throw new Error("Tahsilatı kapatmak için önce komisyon ve ofis payı oranlarını girin.");
        const gross = existing.amount.mul(existing.sale.commissionRate).div(100).toDecimalPlaces(2);
        const office = gross.mul(existing.sale.officeShareRate).div(100).toDecimalPlaces(2);
        const consultant = gross.sub(office).toDecimalPlaces(2);
        await tx.ledgerEntry.deleteMany({ where: { paymentId: id } });
        await tx.ledgerEntry.createMany({ data: [
          { saleId: existing.saleId, paymentId: id, account: "OFFICE", amount: office, currency: existing.currency, description: "Tahsilat üzerinden ofis payı" },
          { saleId: existing.saleId, paymentId: id, account: "CONSULTANT", amount: consultant, currency: existing.currency, description: "Tahsilat üzerinden danışman payı" },
        ] });
      } else if (targetStatus !== "ODENDI") {
        await tx.ledgerEntry.deleteMany({ where: { paymentId: id } });
      }

      const paidAt = body.paidAt !== undefined ? new Date(String(body.paidAt)) : (targetStatus === "ODENDI" ? (existing.paidAt ?? new Date()) : null);
      if (paidAt && Number.isNaN(paidAt.getTime())) throw new Error("Geçersiz tahsilat tarihi.");

      if (existing.installment) {
        await tx.paymentInstallment.update({ where: { id: existing.installment.id }, data: { status: targetStatus === "ODENDI" ? "ODENDI" : "BEKLIYOR" } });
      }

      const payment = await tx.payment.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(body.paidAt !== undefined ? { paidAt: targetStatus === "ODENDI" ? paidAt : null } : {}),
          ...(status && targetStatus !== "ODENDI" && body.paidAt === undefined ? { paidAt: null } : {}),
          ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}),
        },
        include: { ledgerEntries: true },
      });
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PAYMENT_UPDATED", entityType: "Payment", entityId: id, metadata: { status: payment.status, amount: payment.amount.toString(), ledgerEntryCount: payment.ledgerEntries.length } } });
      return payment;
    });
    return NextResponse.json({ payment: updated });
  } catch (error) {
    if (error instanceof PaymentConflictError) return conflict(error.message);
    return validationError(error instanceof Error ? error.message : "Tahsilat güncellenemedi.");
  }
}
