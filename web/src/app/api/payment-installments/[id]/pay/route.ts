import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound, conflict } from "@/lib/api-response";

class InstallmentPaymentConflictError extends Error {}
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";
import { commercialNextAction } from "@/core/prime-commercial";

function commissionForPayment(amount: Prisma.Decimal, sale: { commissionRate: Prisma.Decimal | null; officeShareRate: Prisma.Decimal | null }) {
  if (!sale.commissionRate || !sale.officeShareRate) throw new Error("Tahsilatı kapatmak için önce komisyon ve ofis payı oranlarını girin.");
  const gross = amount.mul(sale.commissionRate).div(100).toDecimalPlaces(2);
  const office = gross.mul(sale.officeShareRate).div(100).toDecimalPlaces(2);
  return { office, consultant: gross.sub(office).toDecimalPlaces(2) };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { assertCan(context, "payments", "create"); } catch { return forbidden(); }
  const { id } = await params;

  let body: { paidAt?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }

  const installment = await prisma.paymentInstallment.findFirst({
    where: {
      id,
      plan: {
        sale: {
          status: { not: "IPTAL" },
          approvalStatus: "ONAYLANDI",
          customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) },
        },
      },
    },
    include: {
      payment: true,
      plan: { include: { sale: { select: { id: true, customerId: true, amount: true, currency: true, commissionRate: true, officeShareRate: true } } } },
    },
  });
  if (!installment) return notFound("Taksit bulunamadı veya yetkiniz yok.");
  if (installment.status === "IPTAL") return conflict("İptal edilmiş taksit tahsil edilemez.");
  if (installment.payment) return conflict("Bu taksit için zaten bir tahsilat oluşturulmuş.");

  const paidAt = body.paidAt ? new Date(String(body.paidAt)) : new Date();
  if (Number.isNaN(paidAt.getTime())) return validationError("Geçersiz tahsilat tarihi.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sale = installment.plan.sale;
      const existingPaid = await tx.payment.aggregate({ _sum: { amount: true }, where: { saleId: sale.id, status: "ODENDI" } });
      const alreadyPaid = existingPaid._sum.amount ?? new Prisma.Decimal(0);
      const amount = installment.amount;
      if (alreadyPaid.add(amount).gt(sale.amount)) throw new InstallmentPaymentConflictError("Toplam tahsilat satış tutarını aşamaz.");

      const split = commissionForPayment(amount, sale);
      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          installmentId: installment.id,
          amount,
          currency: sale.currency,
          status: "ODENDI",
          paidAt,
          note: typeof body.note === "string" ? body.note.trim() || null : null,
        },
      });

      await tx.ledgerEntry.createMany({ data: [
        { saleId: sale.id, paymentId: payment.id, account: "OFFICE", amount: split.office, currency: sale.currency, description: "Taksit tahsilatı üzerinden ofis payı" },
        { saleId: sale.id, paymentId: payment.id, account: "CONSULTANT", amount: split.consultant, currency: sale.currency, description: "Taksit tahsilatı üzerinden danışman payı" },
      ] });

      await tx.paymentInstallment.update({ where: { id: installment.id }, data: { status: "ODENDI" } });

      const remaining = sale.amount.sub(alreadyPaid.add(amount));
      const next = commercialNextAction({ event: "PAYMENT_RECEIVED", remainingAmount: remaining });
      await tx.customer.update({ where: { id: sale.customerId }, data: { nextAction: next.label, nextActionAt: new Date(Date.now() + next.dueInHours * 60 * 60 * 1000) } });
      await tx.auditLog.create({ data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "PAYMENT_CREATED_FROM_INSTALLMENT",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { saleId: sale.id, installmentId: installment.id, amount: amount.toString(), currency: sale.currency },
      } });

      return { payment, installmentId: installment.id };
    });

    return NextResponse.json({ payment: result.payment, installmentId: result.installmentId }, { status: 201 });
  } catch (error) {
    if (error instanceof InstallmentPaymentConflictError) return conflict(error.message);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return conflict("Bu taksit için zaten bir tahsilat oluşturulmuş.");
    }
    return validationError(error instanceof Error ? error.message : "Taksit tahsilatı oluşturulamadı.");
  }
}
