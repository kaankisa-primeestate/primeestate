import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope, officeListingScope } from "@/lib/authz";
import { commercialNextAction } from "@/core/prime-commercial";

const OFFER_STATUSES = new Set(["TASLAK", "SUNULDU", "KARSILIKLI_TEKLIF", "KABUL", "REDDEDILDI"]);
const SALE_STATUSES = new Set(["ACIK", "TAMAMLANDI", "IPTAL"]);

function rate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${label} 0 ile 100 arasında olmalıdır.`);
  return new Prisma.Decimal(String(n));
}

function commission(amount: Prisma.Decimal, commissionRate: Prisma.Decimal | null, officeShareRate: Prisma.Decimal | null) {
  if (!commissionRate || !officeShareRate) return { grossCommission: null, officeShare: null, consultantShare: null };
  const grossCommission = amount.mul(commissionRate).div(100).toDecimalPlaces(2);
  const officeShare = grossCommission.mul(officeShareRate).div(100).toDecimalPlaces(2);
  return { grossCommission, officeShare, consultantShare: grossCommission.sub(officeShare).toDecimalPlaces(2) };
}

function dueAt(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function setPrimeNextAction(tx: Prisma.TransactionClient, customerId: string, event: Parameters<typeof commercialNextAction>[0]["event"], remainingAmount?: Prisma.Decimal | number | null) {
  const next = commercialNextAction({ event, remainingAmount });
  await tx.customer.update({
    where: { id: customerId },
    data: { nextAction: next.label, nextActionAt: dueAt(next.dueInHours) },
  });
  return next;
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }

  const action = typeof body.action === "string" ? body.action : "";
  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";

  try {
    if (action === "OFFER_CREATE") {
      assertCan(context, "offers", "create");
      const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
      const amount = Number(body.amount);
      if (!customerId || !listingId || !Number.isFinite(amount) || amount <= 0) throw new Error("Müşteri, portföy ve geçerli teklif tutarı zorunludur.");

      const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) }, select: { id: true, name: true } });
        if (!customer) throw new Error("Müşteri bulunamadı veya yetkiniz yok.");
        const listing = await tx.listing.findFirst({ where: { id: listingId, ...officeListingScope(context), status: { in: ["AKTIF", "REZERVE"] } }, select: { id: true, code: true, title: true, currency: true } });
        if (!listing) throw new Error("Portföy bulunamadı veya uygun değil.");
        const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : listing.currency;
        if (currency !== listing.currency) throw new Error("Teklif para birimi portföy para birimi ile aynı olmalıdır.");

        const offer = await tx.offer.create({
          data: { customerId, listingId, amount: new Prisma.Decimal(String(amount)), currency, offeredAt: new Date(), nextAction: "Teklif takip et" },
          include: { customer: { select: { id: true, name: true, ownerUserId: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true } } },
        });
        const next = await setPrimeNextAction(tx, customerId, "OFFER_CREATED");
        await tx.activity.create({ data: { customerId, listingId, ownerUserId: context.userId, type: "TEKLIF", summary: `Teklif oluşturuldu · ${listing.code}`, outcome: typeof body.outcome === "string" ? body.outcome.trim() || null : null, metadata: { source: "PRIME_BRAIN", workflow: "COMMERCIAL_CONVERSION", event: "OFFER_CREATED", offerId: offer.id } } });
        await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PRIME_OFFER_CREATED", entityType: "Offer", entityId: offer.id, metadata: { customerId, listingId, amount: String(amount), currency } } });
        return { offer, next };
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "OFFER_STATUS") {
      assertCan(context, "offers", "update");
      const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
      const status = typeof body.status === "string" ? body.status : "";
      if (!offerId || !OFFER_STATUSES.has(status)) throw new Error("Teklif ve geçerli durum zorunludur.");

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.offer.findFirst({
          where: { id: offerId, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
          include: { customer: { select: { id: true, name: true } }, listing: { select: { id: true, code: true, title: true, currency: true, status: true, purpose: true } }, sale: { select: { id: true } } },
        });
        if (!existing) throw new Error("Teklif bulunamadı veya yetkiniz yok.");

        const offer = await tx.offer.update({ where: { id: offerId }, data: { status: status as never, nextAction: status === "KABUL" ? "Satış sözleşmesini takip et" : status === "REDDEDILDI" ? null : "Teklif takip et" }, include: { customer: { select: { id: true, name: true, ownerUserId: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true } } } });

        let sale = null;
        let next;
        if (status === "KABUL") {
          if (existing.sale) throw new Error("Bu teklif zaten satış kaydına dönüştürülmüş.");
          if (!["AKTIF", "REZERVE"].includes(existing.listing.status)) throw new Error("Kabul edilen teklif için portföy aktif veya rezerve durumda olmalıdır.");
          sale = await tx.sale.create({ data: { customerId: existing.customerId, listingId: existing.listingId, offerId: existing.id, amount: existing.amount, currency: existing.currency, note: typeof body.note === "string" ? body.note.trim() || null : null }, include: { customer: { select: { id: true, name: true } }, listing: { select: { id: true, code: true, title: true, status: true } }, offer: { select: { id: true, status: true } } } });
          await tx.listing.updateMany({ where: { id: existing.listingId, status: { in: ["AKTIF", "REZERVE"] } }, data: { status: "REZERVE" } });
          next = await setPrimeNextAction(tx, existing.customerId, "SALE_CREATED");
          await tx.task.create({ data: { customerId: existing.customerId, ownerUserId: context.userId, title: `Prime: ${existing.customer.name} satış sözleşmesi · ${existing.listing.code}`, dueAt: dueAt(24), priority: "YUKSEK", source: "PRIME_BRAIN_COMMERCIAL" } });
        } else {
          next = status === "REDDEDILDI" ? null : await setPrimeNextAction(tx, existing.customerId, "OFFER_CREATED");
        }

        await tx.activity.create({ data: { customerId: existing.customerId, listingId: existing.listingId, ownerUserId: context.userId, type: "TEKLIF", summary: status === "KABUL" ? `Teklif kabul edildi · ${existing.listing.code}` : `Teklif durumu: ${status}`, outcome: typeof body.outcome === "string" ? body.outcome.trim() || null : null, metadata: { source: "PRIME_BRAIN", workflow: "COMMERCIAL_CONVERSION", event: status === "KABUL" ? "OFFER_ACCEPTED" : "OFFER_STATUS", offerId: existing.id, status, saleId: sale?.id ?? null } } });
        await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: status === "KABUL" ? "PRIME_OFFER_ACCEPTED" : "PRIME_OFFER_STATUS_UPDATED", entityType: "Offer", entityId: existing.id, metadata: { customerId: existing.customerId, listingId: existing.listingId, status, saleId: sale?.id ?? null } } });
        return { offer, sale, next };
      });
      return NextResponse.json(result);
    }

    if (action === "SALE_COMMISSION") {
      assertCan(context, "sales", "update");
      const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
      if (!saleId) throw new Error("Satış zorunludur.");
      const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findFirst({ where: { id: saleId, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } }, include: { payments: { where: { status: "ODENDI" }, select: { id: true } }, customer: { select: { id: true, name: true } } } });
        if (!sale) throw new Error("Satış bulunamadı veya yetkiniz yok.");
        if (sale.status !== "ACIK" || sale.payments.length) throw new Error("Kapanmış veya tahsilat başlamış satışın komisyonu değiştirilemez.");
        const commissionRate = body.commissionRate === null ? null : rate(body.commissionRate, "Komisyon oranı");
        const officeShareRate = body.officeShareRate === null ? null : rate(body.officeShareRate, "Ofis payı oranı");
        const values = commission(sale.amount, commissionRate, officeShareRate);
        const updated = await tx.sale.update({ where: { id: saleId }, data: { commissionRate, officeShareRate, ...values }, include: { customer: { select: { id: true, name: true } }, listing: { select: { id: true, code: true, title: true, status: true } } } });
        const next = await setPrimeNextAction(tx, sale.customerId, "COMMISSION_UPDATED");
        await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PRIME_COMMISSION_UPDATED", entityType: "Sale", entityId: saleId, metadata: { commissionRate: commissionRate?.toString() ?? null, officeShareRate: officeShareRate?.toString() ?? null } } });
        return { sale: updated, next };
      });
      return NextResponse.json(result);
    }

    if (action === "PAYMENT_PLAN") {
      assertCan(context, "paymentPlans", "create");
      const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const raw = Array.isArray(body.installments) ? body.installments : [];
      if (!saleId || !title || raw.length < 1 || raw.length > 24) throw new Error("Satış, plan adı ve 1-24 taksit zorunludur.");
      const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findFirst({ where: { id: saleId, status: { not: "IPTAL" }, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } }, select: { id: true, customerId: true, amount: true, currency: true } });
        if (!sale) throw new Error("Satış bulunamadı veya yetkiniz yok.");
        if (await tx.paymentPlan.findUnique({ where: { saleId } })) throw new Error("Bu satış için zaten bir ödeme planı var.");
        const installments = raw.map((item, index) => { const row = item as Record<string, unknown>; return { sequence: index + 1, amount: Number(row.amount), dueAt: new Date(String(row.dueAt ?? "")), note: typeof row.note === "string" ? row.note.trim() || null : null }; });
        if (installments.some((x) => !Number.isFinite(x.amount) || x.amount <= 0 || Number.isNaN(x.dueAt.getTime()))) throw new Error("Her taksit için geçerli tutar ve vade tarihi gerekir.");
        const total = installments.reduce((sum, x) => sum + x.amount, 0);
        if (Math.abs(total - Number(sale.amount)) > 0.01) throw new Error("Taksit toplamı satış tutarına eşit olmalıdır.");
        const plan = await tx.paymentPlan.create({ data: { saleId, title, currency: sale.currency, installments: { create: installments.map((x) => ({ sequence: x.sequence, amount: new Prisma.Decimal(x.amount.toFixed(2)), currency: sale.currency, dueAt: x.dueAt, note: x.note })) }, include: { installments: { orderBy: { sequence: "asc" } } } });
        const next = await setPrimeNextAction(tx, sale.customerId, "PAYMENT_PLAN_CREATED");
        await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PRIME_PAYMENT_PLAN_CREATED", entityType: "PaymentPlan", entityId: plan.id, metadata: { saleId, installmentCount: installments.length } } });
        return { plan, next };
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "PAYMENT") {
      assertCan(context, "payments", "create");
      const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
      const amount = Number(body.amount);
      const status = body.status === "ODENDI" ? "ODENDI" : body.status === "IPTAL" ? "IPTAL" : "BEKLIYOR";
      if (!saleId || !Number.isFinite(amount) || amount <= 0) throw new Error("Satış ve pozitif tahsilat tutarı zorunludur.");

      const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findFirst({ where: { id: saleId, status: { not: "IPTAL" }, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } }, select: { id: true, customerId: true, amount: true, currency: true, commissionRate: true, officeShareRate: true } });
        if (!sale) throw new Error("Satış bulunamadı veya yetkiniz yok.");
        const paid = (await tx.payment.aggregate({ _sum: { amount: true }, where: { saleId, status: "ODENDI" } }))._sum.amount ?? new Prisma.Decimal(0);
        const nextPaid = status === "ODENDI" ? paid.add(new Prisma.Decimal(String(amount))) : paid;
        if (nextPaid.gt(sale.amount)) throw new Error("Toplam tahsilat satış tutarını aşamaz.");
        const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : sale.currency;
        if (currency !== sale.currency) throw new Error("Tahsilat para birimi satış para birimi ile aynı olmalıdır.");
        if (status === "ODENDI" && (!sale.commissionRate || !sale.officeShareRate)) throw new Error("Tahsilatı kapatmak için önce komisyon ve ofis payı oranlarını girin.");
        const payment = await tx.payment.create({ data: { saleId, amount: new Prisma.Decimal(String(amount)), currency, status, paidAt: status === "ODENDI" ? new Date() : null, note: typeof body.note === "string" ? body.note.trim() || null : null } });
        if (status === "ODENDI") {
          const split = commission(new Prisma.Decimal(String(amount)), sale.commissionRate, sale.officeShareRate);
          await tx.ledgerEntry.createMany({ data: [
            { saleId, paymentId: payment.id, account: "OFFICE", amount: split.office!, currency, description: "Tahsilat üzerinden ofis payı" },
            { saleId, paymentId: payment.id, account: "CONSULTANT", amount: split.consultantShare!, currency, description: "Tahsilat üzerinden danışman payı" },
          ] });
        }
        const remaining = sale.amount.sub(nextPaid);
        const next = await setPrimeNextAction(tx, sale.customerId, "PAYMENT_RECEIVED", remaining);
        await tx.activity.create({ data: { customerId: sale.customerId, listingId: null, ownerUserId: context.userId, type: "TEKLIF", summary: status === "ODENDI" ? `Tahsilat alındı · ${amount.toLocaleString("tr-TR")} ${currency}` : "Tahsilat kaydı oluşturuldu", outcome: typeof body.note === "string" ? body.note.trim() || null : null, metadata: { source: "PRIME_BRAIN", workflow: "COMMERCIAL_CONVERSION", event: "PAYMENT_RECEIVED", saleId, paymentId: payment.id, remaining: remaining.toString() } } });
        await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PRIME_PAYMENT_RECEIVED", entityType: "Payment", entityId: payment.id, metadata: { saleId, amount: String(amount), currency, status, remaining: remaining.toString() } } });
        return { payment, remaining, next };
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "SALE_STATUS") {
      assertCan(context, "sales", "update");
      const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
      const status = typeof body.status === "string" ? body.status : "";
      if (!saleId || !SALE_STATUSES.has(status)) throw new Error("Satış ve geçerli durum zorunludur.");
      const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findFirst({ where: { id: saleId, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } }, select: { id: true, customerId: true, status: true, listingId: true, listing: { select: { purpose: true } } } });
        if (!sale) throw new Error("Satış bulunamadı veya yetkiniz yok.");
        if (sale.status !== "ACIK" || status === "ACIK") throw new Error("Bu satış durumu geçişi Prime ticari akışında geçersiz.");
        const next = await setPrimeNextAction(tx, sale.customerId, status === "TAMAMLANDI" ? "SALE_COMPLETED" : "SALE_CANCELLED");
        const updated = await tx.sale.update({ where: { id: saleId }, data: { status: status as never, closedAt: status === "TAMAMLANDI" ? new Date() : null } });
        if (status === "TAMAMLANDI") await tx.listing.update({ where: { id: sale.listingId }, data: { status: sale.listing.purpose === "SATILIK" ? "SATILDI" : "KIRALANDI" } });
        if (status === "IPTAL") await tx.listing.updateMany({ where: { id: sale.listingId, status: "REZERVE" }, data: { status: "AKTIF" } });
        await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PRIME_SALE_STATUS_UPDATED", entityType: "Sale", entityId: saleId, metadata: { fromStatus: sale.status, toStatus: status } } });
        return { sale: updated, next };
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: "Geçersiz Prime ticari aksiyonu." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Prime ticari işlem tamamlanamadı." }, { status: 400 });
  }
}
