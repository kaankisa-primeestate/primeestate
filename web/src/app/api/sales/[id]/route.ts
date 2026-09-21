import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { hasCapability, saleScope } from "@/lib/authorization";

type SaleStatus = "ACIK" | "TAMAMLANDI" | "IPTAL";
const STATUSES = new Set<SaleStatus>(["ACIK", "TAMAMLANDI", "IPTAL"]);

function parseRate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error(`${label} 0 ile 100 arasında olmalıdır.`);
  return new Prisma.Decimal(String(rate));
}

function calculateCommission(amount: Prisma.Decimal, commissionRate: Prisma.Decimal | null, officeShareRate: Prisma.Decimal | null) {
  if (!commissionRate || !officeShareRate) return { grossCommission: null, officeShare: null, consultantShare: null };
  const grossCommission = amount.mul(commissionRate).div(100).toDecimalPlaces(2);
  const officeShare = grossCommission.mul(officeShareRate).div(100).toDecimalPlaces(2);
  const consultantShare = grossCommission.sub(officeShare).toDecimalPlaces(2);
  return { grossCommission, officeShare, consultantShare };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!hasCapability(context, "sales:write")) return NextResponse.json({ message: "Satış düzenleme yetkiniz yok." }, { status: 403 });
  const { id } = await params;

  let body: { status?: unknown; note?: unknown; commissionRate?: unknown; officeShareRate?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }

  const status = typeof body.status === "string" && STATUSES.has(body.status as SaleStatus)
    ? body.status as SaleStatus
    : undefined;
  if (body.status !== undefined && !status) return NextResponse.json({ message: "Geçersiz satış durumu." }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findFirst({
        where: { id, ...saleScope(context) },
        include: {
          listing: { select: { id: true, purpose: true, status: true } },
          payments: { where: { status: "ODENDI" }, select: { id: true, amount: true } },
        },
      });
      if (!existing) throw new Error("Satış bulunamadı veya yetkiniz yok.");

      if (status && status !== existing.status) {
        const valid = existing.status === "ACIK" && (status === "TAMAMLANDI" || status === "IPTAL");
        if (!valid) throw new Error(`Satış ${existing.status} durumundan ${status} durumuna geçirilemez.`);
      }

      const commissionChanged = body.commissionRate !== undefined || body.officeShareRate !== undefined;
      if (commissionChanged && (existing.status !== "ACIK" || existing.payments.length > 0)) {
        throw new Error("Tahsilat gerçekleşmiş veya kapanmış satışın komisyon bilgileri değiştirilemez.");
      }

      let commissionRate = existing.commissionRate;
      let officeShareRate = existing.officeShareRate;
      if (body.commissionRate !== undefined) commissionRate = parseRate(body.commissionRate, "Komisyon oranı");
      if (body.officeShareRate !== undefined) officeShareRate = parseRate(body.officeShareRate, "Ofis payı oranı");

      const commission = calculateCommission(existing.amount, commissionRate, officeShareRate);
      const nextStatus = status ?? existing.status;
      const closing = nextStatus === "TAMAMLANDI";
      const cancelling = nextStatus === "IPTAL";

      const sale = await tx.sale.update({
        where: { id },
        data: {
          ...(status ? { status: nextStatus, closedAt: closing ? new Date() : null } : {}),
          ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}),
          ...(commissionChanged ? { commissionRate, officeShareRate, grossCommission: commission.grossCommission, officeShare: commission.officeShare, consultantShare: commission.consultantShare } : {}),
        },
        include: {
          customer: { select: { id: true, name: true, ownerUserId: true } },
          listing: { select: { id: true, code: true, title: true, purpose: true, status: true, price: true, currency: true } },
          offer: { select: { id: true, status: true } },
        },
      });

      if (closing) {
        const finalListingStatus = existing.listing.purpose === "SATILIK" ? "SATILDI" : "KIRALANDI";
        await tx.listing.update({ where: { id: sale.listingId }, data: { status: finalListingStatus } });
      } else if (cancelling) {
        await tx.listing.updateMany({ where: { id: sale.listingId, status: "REZERVE" }, data: { status: "AKTIF" } });
      }

      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: status ? "SALE_STATUS_UPDATED" : "SALE_UPDATED",
          entityType: "Sale",
          entityId: sale.id,
          metadata: {
            fromStatus: existing.status,
            toStatus: sale.status,
            listingStatus: existing.listing.status,
            commissionChanged,
            paidPaymentCount: existing.payments.length,
          },
        },
      });

      return sale;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ sale: updated });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Satış güncellenemedi." }, { status: 400 });
  }
}
