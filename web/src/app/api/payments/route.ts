import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";

function commissionForPayment(amount: Prisma.Decimal, sale: { commissionRate: Prisma.Decimal | null; officeShareRate: Prisma.Decimal | null }) {
  if (!sale.commissionRate || !sale.officeShareRate) throw new Error("Tahsilatı kapatmak için önce komisyon ve ofis payı oranlarını girin.");
  const gross = amount.mul(sale.commissionRate).div(100).toDecimalPlaces(2);
  const office = gross.mul(sale.officeShareRate).div(100).toDecimalPlaces(2);
  return { office, consultant: gross.sub(office).toDecimalPlaces(2) };
}

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  try { assertCan(context, "payments", "read"); } catch { return NextResponse.json({ message: "Yetkiniz yok." }, { status: 403 }); }
  const { searchParams } = new URL(request.url);
  const saleId = searchParams.get("saleId")?.trim();
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
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  try { assertCan(context, "payments", "create"); } catch { return NextResponse.json({ message: "Yetkiniz yok." }, { status: 403 }); }
  let body: { saleId?: unknown; amount?: unknown; currency?: unknown; status?: unknown; paidAt?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
  const amount = Number(body.amount);
  const status = body.status === "ODENDI" ? "ODENDI" : body.status === "IPTAL" ? "IPTAL" : "BEKLIYOR";
  if (!saleId || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ message: "Satış ve pozitif tahsilat tutarı zorunludur." }, { status: 400 });
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, status: { not: "IPTAL" }, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
    select: { id: true, amount: true, currency: true, commissionRate: true, officeShareRate: true },
  });
  if (!sale) return NextResponse.json({ message: "Satış bulunamadı veya yetkiniz yok." }, { status: 404 });
  const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : sale.currency;
  if (currency !== sale.currency) return NextResponse.json({ message: "Tahsilat para birimi satış para birimi ile aynı olmalıdır." }, { status: 400 });
  const paidAt = body.paidAt ? new Date(String(body.paidAt)) : new Date();
  if (Number.isNaN(paidAt.getTime())) return NextResponse.json({ message: "Geçersiz tahsilat tarihi." }, { status: 400 });

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const existingPaid = await tx.payment.aggregate({ _sum: { amount: true }, where: { saleId, status: "ODENDI" } });
      const alreadyPaid = existingPaid._sum.amount ?? new Prisma.Decimal(0);
      const nextPaid = status === "ODENDI" ? alreadyPaid.add(new Prisma.Decimal(String(amount))) : alreadyPaid;
      if (nextPaid.gt(sale.amount)) throw new Error("Toplam tahsilat satış tutarını aşamaz.");
      if (status === "ODENDI") commissionForPayment(new Prisma.Decimal(String(amount)), sale);

      const created = await tx.payment.create({
        data: { saleId, amount: new Prisma.Decimal(String(amount)), currency, status, paidAt: status === "ODENDI" ? paidAt : null, note: typeof body.note === "string" ? body.note.trim() || null : null },
      });
      if (status === "ODENDI") {
        const split = commissionForPayment(new Prisma.Decimal(String(amount)), sale);
        await tx.ledgerEntry.createMany({ data: [
          { saleId, paymentId: created.id, account: "OFFICE", amount: split.office, currency, description: "Tahsilat üzerinden ofis payı" },
          { saleId, paymentId: created.id, account: "CONSULTANT", amount: split.consultant, currency, description: "Tahsilat üzerinden danışman payı" },
        ] });
      }
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PAYMENT_CREATED", entityType: "Payment", entityId: created.id, metadata: { saleId, amount: String(amount), currency, status } } });
      return created;
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Tahsilat oluşturulamadı." }, { status: 400 });
  }
}
