import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { Prisma } from "@/generated/prisma/client";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
function customerScope(context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  if (MANAGER_ROLES.has(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) return { owner: { teamId: context.teamId } };
  return { ownerUserId: context.userId };
}
const STATUSES = new Set(["ACIK", "TAMAMLANDI", "IPTAL"]);

function parseRate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error(`${label} 0 ile 100 arasında olmalıdır.`);
  return new Prisma.Decimal(String(rate));
}

function calculateCommission(amount: Prisma.Decimal, commissionRate: Prisma.Decimal | null, officeShareRate: Prisma.Decimal | null) {
  if (!commissionRate || !officeShareRate) {
    return { grossCommission: null, officeShare: null, consultantShare: null };
  }
  const grossCommission = amount.mul(commissionRate).div(100).toDecimalPlaces(2);
  const officeShare = grossCommission.mul(officeShareRate).div(100).toDecimalPlaces(2);
  const consultantShare = grossCommission.sub(officeShare).toDecimalPlaces(2);
  return { grossCommission, officeShare, consultantShare };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.sale.findFirst({
    where: { id, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerScope(context) } },
    select: { id: true, status: true, customerId: true, listingId: true, amount: true, commissionRate: true, officeShareRate: true },
  });
  if (!existing) return NextResponse.json({ message: "Satış bulunamadı veya yetkiniz yok." }, { status: 404 });

  let body: { status?: unknown; note?: unknown; commissionRate?: unknown; officeShareRate?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }

  const status = typeof body.status === "string" && STATUSES.has(body.status) ? body.status : undefined;
  if (body.status !== undefined && !status) return NextResponse.json({ message: "Geçersiz satış durumu." }, { status: 400 });

  let commissionRate: Prisma.Decimal | null = existing.commissionRate;
  let officeShareRate: Prisma.Decimal | null = existing.officeShareRate;
  try {
    if (body.commissionRate !== undefined) commissionRate = parseRate(body.commissionRate, "Komisyon oranı");
    if (body.officeShareRate !== undefined) officeShareRate = parseRate(body.officeShareRate, "Ofis payı oranı");
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Geçersiz oran." }, { status: 400 });
  }

  if (!status && body.note === undefined && body.commissionRate === undefined && body.officeShareRate === undefined) {
    return NextResponse.json({ message: "Güncellenecek alan bulunamadı." }, { status: 400 });
  }

  const commission = calculateCommission(existing.amount, commissionRate, officeShareRate);
  const closingRequested = status === "TAMAMLANDI" && existing.status !== "TAMAMLANDI";

  const updated = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.update({
      where: { id },
      data: {
        ...(status ? { status: status as never, closedAt: status === "TAMAMLANDI" ? new Date() : null } : {}),
        ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}),
        ...(body.commissionRate !== undefined || body.officeShareRate !== undefined
          ? { commissionRate, officeShareRate, grossCommission: commission.grossCommission, officeShare: commission.officeShare, consultantShare: commission.consultantShare }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true, ownerUserId: true } },
        listing: { select: { id: true, code: true, title: true, purpose: true, status: true, price: true, currency: true } },
        offer: { select: { id: true, status: true } },
      },
    });

    if (closingRequested) {
      const closedListingStatus = sale.listing.purpose === "SATILIK" ? "SATILDI" : "KIRALANDI";
      await tx.listing.update({ where: { id: sale.listingId }, data: { status: closedListingStatus } });
      const activity = await tx.activity.create({
        data: {
          customerId: sale.customerId,
          listingId: sale.listingId,
          ownerUserId: sale.customer.ownerUserId,
          type: "NOT",
          occurredAt: sale.closedAt ?? new Date(),
          summary: "Satış tamamlandı",
          outcome: `Kapanış: ${sale.listing.title}`,
          metadata: { saleId: sale.id, offerId: sale.offerId, listingStatus: closedListingStatus },
        },
        select: { id: true },
      });
      await tx.customer.update({ where: { id: sale.customerId }, data: { lastContactAt: sale.closedAt ?? new Date() } });
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SALE_CLOSED", entityType: "Sale", entityId: sale.id, metadata: { listingId: sale.listingId, listingStatus: closedListingStatus, activityId: activity.id } } });
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "LISTING_CLOSED", entityType: "Listing", entityId: sale.listingId, metadata: { saleId: sale.id, status: closedListingStatus } } });
    } else {
      await tx.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SALE_UPDATED", entityType: "Sale", entityId: id, metadata: { ...(status ? { status } : {}), ...(body.note !== undefined ? { note: sale.note } : {}), ...(body.commissionRate !== undefined || body.officeShareRate !== undefined ? { commissionRate: commissionRate?.toString() ?? null, officeShareRate: officeShareRate?.toString() ?? null, grossCommission: commission.grossCommission?.toString() ?? null, officeShare: commission.officeShare?.toString() ?? null, consultantShare: commission.consultantShare?.toString() ?? null } : {}) } } });
    }
    return sale;
  });

  return NextResponse.json({ sale: updated });
}
