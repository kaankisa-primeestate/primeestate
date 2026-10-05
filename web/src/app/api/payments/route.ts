import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound, conflict, internalError } from "@/lib/api-response";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";
import { commercialNextAction } from "@/core/prime-commercial";

class PaymentConflictError extends Error {}

function commissionSplit(amount: Prisma.Decimal, sale: { commissionRate: Prisma.Decimal | null; officeShareRate: Prisma.Decimal | null }) {
  if (!sale.commissionRate || !sale.officeShareRate) throw new Error("Tahsilatı kapatmak için önce komisyon ve ofis payı oranlarını girin.");
  const office = amount.mul(sale.officeShareRate).div(100).toDecimalPlaces(2);
  return { office, consultant: amount.sub(office).toDecimalPlaces(2) };
}

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { assertCan(context, "payments", "read"); } catch { return forbidden(); }
  const { searchParams } = new URL(request.url);
  const saleId = searchParams.get("saleId")?.trim();
  try {
    const payments = await prisma.payment.findMany({
    where: {
      ...(saleId ? { saleId } : {}),
      sale: { customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
    },
    include: { ledgerEntries: true, sale: { select: { id: true, amount: true, currency: true, customer: { select: { id: true, name: true } }, listing: { select: { code: true, title: true } } } } },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
    return NextResponse.json({ payments });
  } catch {
    return internalError();
  }
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { assertCan(context, "payments", "create"); } catch { return forbidden(); }
  let body: { saleId?: unknown; amount?: unknown; currency?: unknown; status?: unknown; paidAt?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
  const amount = Number(body.amount);
  const status = body.status === undefined
    ? "BEKLIYOR"
    : body.status === "ODENDI" || body.status === "IPTAL" || body.status === "BEKLIYOR"
      ? body.status
      : undefined;
  if (!status) return validationError("Geçersiz tahsilat durumu.");
  if (!saleId || !Number.isFinite(amount) || amount <= 0) return validationError("Satış ve pozitif tahsilat tutarı zorunludur.");
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, status: { not: "IPTAL" }, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
    select: { id: true, customerId: true, amount: true, currency: true, commissionRate: true, officeShareRate: true, grossCommission: true, approvalStatus: true },
  });
  if (!sale) return notFound("Satış bulunamadı veya yetkiniz yok.");
  if (sale.approvalStatus !== "ONAYLANDI") return conflict("Tahsilat için broker tarafından onaylanmış satış gerekir.");
  const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : sale.currency;
  if (currency !== sale.currency) return validationError("Tahsilat para birimi satış para birimi ile aynı olmalıdır.");
  const paidAt = body.paidAt ? new Date(String(body.paidAt)) : new Date();
  if (Number.isNaN(paidAt.getTime())) return validationError("Geçersiz tahsilat tarihi.");

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const existingPaid = await tx.payment.aggregate({ _sum: { amount: true }, where: { saleId, status: "ODENDI" } });
      const alreadyPaid = existingPaid._sum.amount ?? new Prisma.Decimal(0);
      const nextPaid = status === "ODENDI" ? alreadyPaid.add(new Prisma.Decimal(String(amount))) : alreadyPaid;
      const grossCommission = sale.grossCommission ?? (sale.amount.mul(sale.commissionRate ?? 0).div(100).toDecimalPlaces(2));
      if (nextPaid.gt(grossCommission)) throw new PaymentConflictError("Toplam komisyon tahsilatı satışın hesaplanan brüt komisyonunu aşamaz.");
      if (status === "ODENDI") commissionSplit(new Prisma.Decimal(String(amount)), sale);

      const created = await tx.payment.create({
        data: { saleId, amount: new Prisma.Decimal(String(amount)), currency, status, paidAt: status === "ODENDI" ? paidAt : null, note: typeof body.note === "string" ? body.note.trim() || null : null },
      });
      if (status === "ODENDI") {
        const split = commissionSplit(new Prisma.Decimal(String(amount)), sale);
        await tx.ledgerEntry.createMany({ data: [
          { saleId, paymentId: created.id, account: "OFFICE", amount: split.office, currency, description: "Tahsilat üzerinden ofis payı" },
          { saleId, paymentId: created.id, account: "CONSULTANT", amount: split.consultant, currency, description: "Tahsilat üzerinden danışman payı" },
        ] });
      }
      const remaining = grossCommission.sub(nextPaid);
      const next = commercialNextAction({ event: "PAYMENT_RECEIVED", remainingAmount: remaining });
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { nextAction: next.label, nextActionAt: new Date(Date.now() + next.dueInHours * 60 * 60 * 1000) },
      });
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PAYMENT_CREATED", entityType: "Payment", entityId: created.id, metadata: { saleId, amount: String(amount), currency, status } } });
      return created;
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentConflictError) return conflict(error.message);
    return validationError(error instanceof Error ? error.message : "Tahsilat oluşturulamadı.");
  }
}
