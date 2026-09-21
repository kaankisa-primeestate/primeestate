import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { hasCapability, saleScope } from "@/lib/authorization";

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!hasCapability(context, "sales:read")) return NextResponse.json({ message: "Satışları görüntüleme yetkiniz yok." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  const sales = await prisma.sale.findMany({
    where: { ...(customerId ? { customerId } : {}), ...saleScope(context) },
    include: { customer: { select: { id: true, name: true, ownerUserId: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true, status: true, purpose: true } }, offer: { select: { id: true, status: true, offeredAt: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return NextResponse.json({ sales });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!hasCapability(context, "sales:write")) return NextResponse.json({ message: "Satış oluşturma yetkiniz yok." }, { status: 403 });
  let body: { offerId?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  if (!offerId) return NextResponse.json({ message: "Kabul edilmiş teklif zorunludur." }, { status: 400 });

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findFirst({
        where: {
          id: offerId,
          status: "KABUL",
          ...saleScope(context),
          listing: { organizationId: context.organizationId, officeId: context.officeId, status: { in: ["AKTIF", "REZERVE"] } },
        },
        include: {
          sale: { select: { id: true } },
          listing: { select: { id: true, status: true, purpose: true, currency: true } },
        },
      });
      if (!offer) throw new Error("Teklif bulunamadı, kabul edilmemiş, portföy uygun değil veya yetkiniz yok.");
      if (offer.sale) throw new Error("Bu teklif zaten satış kaydına dönüştürülmüş.");
      if (offer.currency !== offer.listing.currency) throw new Error("Teklif para birimi portföy para birimi ile aynı olmalıdır.");

      const sale = await tx.sale.create({
        data: {
          customerId: offer.customerId,
          listingId: offer.listingId,
          offerId: offer.id,
          amount: offer.amount,
          currency: offer.currency,
          note: typeof body.note === "string" ? body.note.trim() || null : null,
        },
        include: {
          customer: { select: { id: true, name: true } },
          listing: { select: { id: true, code: true, title: true, price: true, currency: true, status: true } },
          offer: { select: { id: true, status: true } },
        },
      });

      await tx.listing.updateMany({
        where: { id: offer.listingId, status: { in: ["AKTIF", "REZERVE"] } },
        data: { status: "REZERVE" },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: "SALE_CREATED",
          entityType: "Sale",
          entityId: sale.id,
          metadata: { offerId: offer.id, customerId: offer.customerId, listingId: offer.listingId, amount: offer.amount.toString(), currency: offer.currency },
        },
      });
      return sale;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Satış oluşturulamadı." }, { status: 400 });
  }
}
