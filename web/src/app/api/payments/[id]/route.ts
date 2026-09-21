import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
function customerScope(context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  if (MANAGER_ROLES.has(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) return { owner: { teamId: context.teamId } };
  return { ownerUserId: context.userId };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;
  let body: { status?: unknown; paidAt?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const status = body.status === "ODENDI" || body.status === "IPTAL" || body.status === "BEKLIYOR" ? body.status : undefined;
  if (!status && body.paidAt === undefined && body.note === undefined) return NextResponse.json({ message: "Güncellenecek alan bulunamadı." }, { status: 400 });

  const existing = await prisma.payment.findFirst({
    where: { id, sale: { customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerScope(context) } } },
    include: { sale: { select: { id: true, amount: true, currency: true, commissionRate: true, officeShareRate: true } }, ledgerEntries: true },
  });
  if (!existing) return NextResponse.json({ message: "Tahsilat bulunamadı veya yetkiniz yok." }, { status: 404 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const targetStatus = status ?? existing.status;
      if (targetStatus === "ODENDI" && existing.status !== "ODENDI") {
        const otherPaid = await tx.payment.aggregate({ _sum: { amount: true }, where: { saleId: existing.saleId, status: "ODENDI", id: { not: id } } });
        const total = (otherPaid._sum.amount ?? new Prisma.Decimal(0)).add(existing.amount);
        if (total.gt(existing.sale.amount)) throw new Error("Toplam tahsilat satış tutarını aşamaz.");
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
    return NextResponse.json({ message: error instanceof Error ? error.message : "Tahsilat güncellenemedi." }, { status: 400 });
  }
}
