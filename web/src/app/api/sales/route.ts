import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, internalError, notFound, conflict } from "@/lib/api-response";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, isManagerRole } from "@/lib/authz";

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { if (!can(context.role, "sales", "read")) return forbidden(); } catch { return forbidden(); }
  class SaleOfferUnavailableError extends Error {}
class SaleAlreadyCreatedError extends Error {}

const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  try {
    const sales = await prisma.sale.findMany({
    where: { ...(customerId ? { customerId } : {}), customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
    include: { customer: { select: { id: true, name: true, ownerUserId: true } }, consultant: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true, status: true, purpose: true } }, offer: { select: { id: true, status: true, offeredAt: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
    return NextResponse.json({ sales, currentUser: { id: context.userId, role: context.role } });
  } catch {
    return internalError();
  }
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { if (!can(context.role, "sales", "create")) return forbidden(); } catch { return forbidden(); }
  let body: { offerId?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  if (!offerId) return validationError("Kabul edilmiş teklif zorunludur.");

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findFirst({
        where: {
          id: offerId,
          status: "KABUL",
          customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) },
          listing: { organizationId: context.organizationId, officeId: context.officeId, status: { in: ["AKTIF", "REZERVE"] } },
        },
        include: {
          sale: { select: { id: true } },
          listing: { select: { id: true, status: true, purpose: true, currency: true, consultantUserId: true } },
        },
      });
      if (!offer) throw new SaleOfferUnavailableError("Teklif bulunamadı, kabul edilmemiş, portföy uygun değil veya yetkiniz yok.");
      if (offer.sale) throw new SaleAlreadyCreatedError("Bu teklif zaten satış kaydına dönüştürülmüş.");
      if (offer.currency !== offer.listing.currency) throw new Error("Teklif para birimi portföy para birimi ile aynı olmalıdır.");

      const consultantUserId = offer.listing.consultantUserId ?? context.userId;
      const commissionPlan = await tx.consultantCommissionPlan.findFirst({
        where: {
          userId: consultantUserId,
          organizationId: context.organizationId,
          officeId: context.officeId,
          active: true,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
        },
        select: {
          id: true,
          officeShareRate: true,
          consultantShareRate: true,
        },
      });

      const sale = await tx.sale.create({
        data: {
          customerId: offer.customerId,
          listingId: offer.listingId,
          offerId: offer.id,
          amount: offer.amount,
          currency: offer.currency,
          note: typeof body.note === "string" ? body.note.trim() || null : null,
          consultantUserId,
          sourceCommissionPlanId: commissionPlan?.id ?? null,
          sourceOfficeShareRate: commissionPlan?.officeShareRate ?? null,
          sourceConsultantShareRate: commissionPlan?.consultantShareRate ?? null,
          officeShareRate: commissionPlan?.officeShareRate ?? null,
        },
        include: {
          customer: { select: { id: true, name: true } },
          listing: { select: { id: true, code: true, title: true, price: true, currency: true, status: true } },
          offer: { select: { id: true, status: true } },
          consultant: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
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
          metadata: { offerId: offer.id, customerId: offer.customerId, listingId: offer.listingId, consultantUserId, sourceCommissionPlanId: commissionPlan?.id ?? null, sourceOfficeShareRate: commissionPlan?.officeShareRate?.toString() ?? null, sourceConsultantShareRate: commissionPlan?.consultantShareRate?.toString() ?? null, amount: offer.amount.toString(), currency: offer.currency },
        },
      });
      return sale;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    if (error instanceof SaleAlreadyCreatedError) return conflict(error.message);
    if (error instanceof SaleOfferUnavailableError) return notFound(error.message);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return conflict("Bu teklif zaten satış kaydına dönüştürülmüş.");
    }
    return validationError(error instanceof Error ? error.message : "Satış oluşturulamadı.");
  }
}
