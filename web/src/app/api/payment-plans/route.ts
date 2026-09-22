import { NextResponse } from "next/server";
import { authenticationRequired, forbidden } from "@/lib/api-response";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";
import { commercialNextAction } from "@/core/prime-commercial";

export async function GET() {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { if (!can(context.role, "paymentPlans", "read")) return forbidden(); } catch { return forbidden(); }
  const plans = await prisma.paymentPlan.findMany({
    where: { sale: { customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } } },
    include: {
      installments: { orderBy: { sequence: "asc" } },
      sale: { select: { id: true, amount: true, currency: true, customer: { select: { id: true, name: true } }, listing: { select: { code: true, title: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { if (!can(context.role, "paymentPlans", "create")) return forbidden(); } catch { return forbidden(); }
  let body: { saleId?: unknown; title?: unknown; installments?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const raw = Array.isArray(body.installments) ? body.installments : [];
  if (!saleId || !title || raw.length < 1 || raw.length > 24) return NextResponse.json({ message: "Satış, plan adı ve 1-24 taksit zorunludur." }, { status: 400 });

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, status: { not: "IPTAL" }, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
    select: { id: true, customerId: true, amount: true, currency: true },
  });
  if (!sale) return NextResponse.json({ message: "Satış bulunamadı veya yetkiniz yok." }, { status: 404 });

  const installments = raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    const amount = Number(row.amount);
    const dueAt = new Date(String(row.dueAt ?? ""));
    return { sequence: index + 1, amount, dueAt, note: typeof row.note === "string" ? row.note.trim() || null : null };
  });
  if (installments.some((x) => !Number.isFinite(x.amount) || x.amount <= 0 || Number.isNaN(x.dueAt.getTime()))) {
    return NextResponse.json({ message: "Her taksit için geçerli tutar ve vade tarihi gerekir." }, { status: 400 });
  }
  const total = installments.reduce((sum, x) => sum + x.amount, 0);
  const saleAmount = Number(sale.amount);
  if (Math.abs(total - saleAmount) > 0.01) return NextResponse.json({ message: `Taksit toplamı satış tutarına eşit olmalıdır: ${saleAmount.toFixed(2)} ${sale.currency}` }, { status: 400 });

  try {
    const plan = await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentPlan.findUnique({ where: { saleId } });
      if (existing) throw new Error("Bu satış için zaten bir ödeme planı var.");
      const created = await tx.paymentPlan.create({
        data: {
          saleId, title, currency: sale.currency,
          installments: { create: installments.map((x) => ({ sequence: x.sequence, amount: new Prisma.Decimal(x.amount.toFixed(2)), currency: sale.currency, dueAt: x.dueAt, note: x.note })) },
        },
        include: { installments: { orderBy: { sequence: "asc" } } },
      });
      const next = commercialNextAction({ event: "PAYMENT_PLAN_CREATED" });
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { nextAction: next.label, nextActionAt: new Date(Date.now() + next.dueInHours * 60 * 60 * 1000) },
      });
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PAYMENT_PLAN_CREATED", entityType: "PaymentPlan", entityId: created.id, metadata: { saleId, installmentCount: installments.length, total: sale.amount.toString() } } });
      return created;
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Ödeme planı oluşturulamadı." }, { status: 400 });
  }
}
