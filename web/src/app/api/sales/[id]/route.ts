import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
function customerScope(context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  if (MANAGER_ROLES.has(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) return { owner: { teamId: context.teamId } };
  return { ownerUserId: context.userId };
}
const STATUSES = new Set(["ACIK", "TAMAMLANDI", "IPTAL"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.sale.findFirst({
    where: {
      id,
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerScope(context),
      },
    },
    select: {
      id: true,
      status: true,
      customerId: true,
      listingId: true,
    },
  });
  if (!existing) return NextResponse.json({ message: "Satış bulunamadı veya yetkiniz yok." }, { status: 404 });

  let body: { status?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }

  const status = typeof body.status === "string" && STATUSES.has(body.status) ? body.status : undefined;
  if (body.status !== undefined && !status) return NextResponse.json({ message: "Geçersiz satış durumu." }, { status: 400 });
  if (!status && body.note === undefined) return NextResponse.json({ message: "Güncellenecek alan bulunamadı." }, { status: 400 });

  const closingRequested = status === "TAMAMLANDI" && existing.status !== "TAMAMLANDI";

  const updated = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.update({
      where: { id },
      data: {
        ...(status ? { status: status as never, closedAt: status === "TAMAMLANDI" ? new Date() : null } : {}),
        ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, ownerUserId: true } },
        listing: { select: { id: true, code: true, title: true, purpose: true, status: true, price: true, currency: true } },
        offer: { select: { id: true, status: true } },
      },
    });

    if (closingRequested) {
      const closedListingStatus = sale.listing.purpose === "SATILIK" ? "SATILDI" : "KIRALANDI";

      await tx.listing.update({
        where: { id: sale.listingId },
        data: { status: closedListingStatus },
      });

      const activity = await tx.activity.create({
        data: {
          customerId: sale.customerId,
          listingId: sale.listingId,
          ownerUserId: sale.customer.ownerUserId,
          type: "NOT",
          occurredAt: sale.closedAt ?? new Date(),
          summary: "Satış tamamlandı",
          outcome: `Kapanış: ${sale.listing.title}`,
          metadata: {
            saleId: sale.id,
            offerId: sale.offerId,
            listingStatus: closedListingStatus,
          },
        },
        select: { id: true },
      });

      await tx.customer.update({
        where: { id: sale.customerId },
        data: { lastContactAt: sale.closedAt ?? new Date() },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: "SALE_CLOSED",
          entityType: "Sale",
          entityId: sale.id,
          metadata: {
            listingId: sale.listingId,
            listingStatus: closedListingStatus,
            activityId: activity.id,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: "LISTING_CLOSED",
          entityType: "Listing",
          entityId: sale.listingId,
          metadata: { saleId: sale.id, status: closedListingStatus },
        },
      });
    } else {
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: "SALE_UPDATED",
          entityType: "Sale",
          entityId: id,
          metadata: { ...(status ? { status } : {}), ...(body.note !== undefined ? { note: sale.note } : {}) },
        },
      });
    }

    return sale;
  });

  return NextResponse.json({ sale: updated });
}
