import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";
import { commercialNextAction } from "@/core/prime-commercial";

const STATUSES = new Set(["TASLAK", "SUNULDU", "KARSILIKLI_TEKLIF", "KABUL", "REDDEDILDI"]);

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  try { assertCan(context, "offers", "update"); } catch { return NextResponse.json({ message: "Yetkiniz yok." }, { status: 403 }); }

  let body: { offerId?: unknown; status?: unknown; outcome?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }

  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!offerId || !STATUSES.has(status)) return NextResponse.json({ message: "Teklif ve geçerli durum zorunludur." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.offer.findFirst({
        where: { id: offerId, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
        include: {
          customer: { select: { id: true, name: true } },
          listing: { select: { id: true, code: true, title: true, currency: true, status: true } },
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
        if (!["AKTIF", "REZERVE"].includes(existing.listing.status)) throw new Error("Kabul edilen teklif için portföy aktif veya rezerve durumda olmalıdır.");
        sale = await tx.sale.create({
          data: { customerId: existing.customerId, listingId: existing.listingId, offerId: existing.id, amount: existing.amount, currency: existing.currency },
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
    return NextResponse.json({ message: error instanceof Error ? error.message : "Prime ticari işlem tamamlanamadı." }, { status: 400 });
  }
}
