import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError } from "@/lib/api-response";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";
import { commercialNextAction } from "@/core/prime-commercial";

const STATUSES = new Set(["TASLAK", "SUNULDU", "KARSILIKLI_TEKLIF", "KABUL", "REDDEDILDI"]);

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { assertCan(context, "offers", "update"); } catch { return forbidden(); }

  let body: { action?: unknown; offerId?: unknown; status?: unknown; outcome?: unknown; customerId?: unknown; listingId?: unknown; amount?: unknown; currency?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }

  const action = typeof body.action === "string" ? body.action : "OFFER_STATUS";
  if (action === "OFFER_CREATE") {
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
    const amount = Number(body.amount);
    const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : "TRY";
    if (!customerId || !listingId || !Number.isFinite(amount) || amount <= 0) return validationError("Müşteri, portföy ve geçerli teklif tutarı zorunludur.");
    const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) }, select: { id: true } });
    if (!customer) return forbidden("Bu müşteri için teklif oluşturma yetkiniz yok.");
    const listing = await prisma.listing.findFirst({ where: { id: listingId, organizationId: context.organizationId, officeId: context.officeId, status: { in: ["AKTIF", "REZERVE"] } }, select: { id: true } });
    if (!listing) return validationError("Geçerli bir aktif ofis portföyü bulunamadı.");
    const offer = await prisma.offer.create({ data: { customerId, listingId, amount, currency, nextAction: typeof body.outcome === "string" ? body.outcome.trim() || null : null }, include: { customer: { select: { id: true, name: true, ownerUserId: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true } } } });
    const next = commercialNextAction({ event: "OFFER_CREATED" });
    await prisma.customer.update({ where: { id: customerId }, data: { nextAction: next.label, nextActionAt: new Date(Date.now() + next.dueInHours * 60 * 60 * 1000) } });
    await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "OFFER_CREATED", entityType: "Offer", entityId: offer.id, metadata: { customerId, listingId, amount, currency } } });
    return NextResponse.json({ offer }, { status: 201 });
  }
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!offerId || !STATUSES.has(status)) return validationError("Teklif ve geçerli durum zorunludur.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.offer.findFirst({
        where: { id: offerId, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
        include: {
          customer: { select: { id: true, name: true } },
          listing: { select: { id: true, code: true, title: true, currency: true, status: true, consultantUserId: true } },
          sale: { select: { id: true } },
        },
      });
      if (!existing) throw new Error("Teklif bulunamadı veya yetkiniz yok.");

      const offer = await tx.offer.update({
        where: { id: offerId },
        data: { status: status as never, nextAction: status === "KABUL" ? "Komisyon bilgisini tamamla" : status === "REDDEDILDI" ? null : "Teklif takip et" },
        include: { customer: { select: { id: true, name: true, ownerUserId: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true } } },
      });

      let sale = null;
      if (status === "KABUL") {
        if (existing.sale) throw new Error("Bu teklif zaten satış kaydına dönüştürülmüş.");
        const consultantUserId = existing.listing.consultantUserId ?? context.userId;
        const commissionPlan = await tx.consultantCommissionPlan.findFirst({ where: { userId: consultantUserId, organizationId: context.organizationId, officeId: context.officeId, active: true, effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }, select: { id: true, officeShareRate: true, consultantShareRate: true } });
        if (!["AKTIF", "REZERVE"].includes(existing.listing.status)) throw new Error("Kabul edilen teklif için portföy aktif veya rezerve durumda olmalıdır.");
        sale = await tx.sale.create({
          data: { customerId: existing.customerId, listingId: existing.listingId, offerId: existing.id, amount: existing.amount, currency: existing.currency, consultantUserId, sourceCommissionPlanId: commissionPlan?.id ?? null, sourceOfficeShareRate: commissionPlan?.officeShareRate ?? null, sourceConsultantShareRate: commissionPlan?.consultantShareRate ?? null, officeShareRate: commissionPlan?.officeShareRate ?? null },
          include: { customer: { select: { id: true, name: true } }, listing: { select: { id: true, code: true, title: true, status: true } }, offer: { select: { id: true, status: true } } },
        });
        await tx.listing.updateMany({ where: { id: existing.listingId, status: { in: ["AKTIF", "REZERVE"] } }, data: { status: "REZERVE" } });
      }

      const next = commercialNextAction({ event: status === "KABUL" ? "SALE_CREATED" : status === "REDDEDILDI" ? "OFFER_CREATED" : "OFFER_CREATED" });
      await tx.customer.update({ where: { id: existing.customerId }, data: { nextAction: status === "REDDEDILDI" ? null : next.label, nextActionAt: status === "REDDEDILDI" ? null : new Date(Date.now() + next.dueInHours * 60 * 60 * 1000) } });
      await tx.activity.create({
        data: {
          customerId: existing.customerId,
          listingId: existing.listingId,
          ownerUserId: context.userId,
          type: "TEKLIF",
          summary: status === "KABUL" ? `Teklif kabul edildi · ${existing.listing.code}` : `Teklif durumu: ${status}`,
          outcome: typeof body.outcome === "string" ? body.outcome.trim() || null : null,
          metadata: { source: "PRIME_BRAIN", workflow: "COMMERCIAL_CONVERSION", offerId: existing.id, status, saleId: sale?.id ?? null },
        },
      });
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: status === "KABUL" ? "PRIME_OFFER_ACCEPTED" : "PRIME_OFFER_STATUS_UPDATED", entityType: "Offer", entityId: existing.id, metadata: { customerId: existing.customerId, listingId: existing.listingId, status, saleId: sale?.id ?? null } } });
      return { offer, sale, next };
    });
    return NextResponse.json(result);
  } catch (error) {
    return validationError(error instanceof Error ? error.message : "Prime ticari işlem tamamlanamadı.");
  }
}
