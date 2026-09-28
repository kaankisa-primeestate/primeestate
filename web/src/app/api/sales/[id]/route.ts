import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope, isManagerRole } from "@/lib/authz";
import { commercialNextAction } from "@/core/prime-commercial";

type SaleStatus = "ACIK" | "TAMAMLANDI" | "IPTAL";
type SaleApprovalStatus = "BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI";
const STATUSES = new Set<SaleStatus>(["ACIK", "TAMAMLANDI", "IPTAL"]);
const APPROVAL_STATUSES = new Set<SaleApprovalStatus>(["BEKLIYOR", "ONAYLANDI", "REDDEDILDI"]);

class SaleNotFoundError extends Error {}

function parseRate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error(label + " 0 ile 100 arasında olmalıdır.");
  return new Prisma.Decimal(String(rate));
}

function calculateCommission(amount: Prisma.Decimal, commissionRate: Prisma.Decimal | null, officeShareRate: Prisma.Decimal | null) {
  if (commissionRate === null || officeShareRate === null) return { grossCommission: null, officeShare: null, consultantShare: null };
  const grossCommission = amount.mul(commissionRate).div(100).toDecimalPlaces(2);
  const officeShare = grossCommission.mul(officeShareRate).div(100).toDecimalPlaces(2);
  const consultantShare = grossCommission.sub(officeShare).toDecimalPlaces(2);
  return { grossCommission, officeShare, consultantShare };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { assertCan(context, "sales", "update"); } catch { return forbidden(); }

  const { id } = await params;
  let body: {
    status?: unknown;
    note?: unknown;
    commissionRate?: unknown;
    officeShareRate?: unknown;
    approvalStatus?: unknown;
    approvalNote?: unknown;
  };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }

  const status = typeof body.status === "string" && STATUSES.has(body.status as SaleStatus) ? body.status as SaleStatus : undefined;
  if (body.status !== undefined && !status) return validationError("Geçersiz satış durumu.");

  const requestedApproval = typeof body.approvalStatus === "string" && APPROVAL_STATUSES.has(body.approvalStatus as SaleApprovalStatus)
    ? body.approvalStatus as SaleApprovalStatus
    : undefined;
  if (body.approvalStatus !== undefined && !requestedApproval) return validationError("Geçersiz onay durumu.");

  if (requestedApproval && !isManagerRole(context.role)) {
    return forbidden("Satış onayını yalnızca ofis yönetimi verebilir.");
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findFirst({
        where: {
          id,
          customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) },
        },
        include: {
          listing: { select: { id: true, purpose: true, status: true } },
          payments: { where: { status: "ODENDI" }, select: { id: true, amount: true } },
        },
      });
      if (!existing) throw new SaleNotFoundError("Satış bulunamadı veya yetkiniz yok.");

      if (status && status !== existing.status) {
        const valid = existing.status === "ACIK" && (status === "TAMAMLANDI" || status === "IPTAL");
        if (!valid) throw new Error("Satış " + existing.status + " durumundan " + status + " durumuna geçirilemez.");
        if (status === "TAMAMLANDI" && existing.approvalStatus !== "ONAYLANDI") {
          throw new Error("Satış kesinleşmeden önce broker onayı gerekir.");
        }
      }

      if (requestedApproval && requestedApproval !== existing.approvalStatus) {
        if (existing.approvalStatus === "ONAYLANDI") throw new Error("Onaylanmış satışın onay durumu geri alınamaz.");
        if (requestedApproval === "ONAYLANDI" && (!existing.commissionRate || !existing.officeShareRate)) {
          throw new Error("Broker onayı için komisyon oranı ve ofis payı oranı tamamlanmalıdır.");
        }
      }

      const commissionChanged = body.commissionRate !== undefined || body.officeShareRate !== undefined;
      if (commissionChanged && (existing.status !== "ACIK" || existing.payments.length > 0 || existing.approvalStatus === "ONAYLANDI")) {
        throw new Error("Onaylanmış, tahsilat gerçekleşmiş veya kapanmış satışın komisyon bilgileri değiştirilemez.");
      }

      let commissionRate = existing.commissionRate;
      let officeShareRate = existing.officeShareRate;
      if (body.commissionRate !== undefined) commissionRate = parseRate(body.commissionRate, "Komisyon oranı");
      if (body.officeShareRate !== undefined) officeShareRate = parseRate(body.officeShareRate, "Ofis payı oranı");

      if (commissionChanged && officeShareRate !== null) {
        const consultantShare = 100 - Number(officeShareRate);
        if (consultantShare < 0) throw new Error("Ofis payı geçersiz.");
      }

      const commission = calculateCommission(existing.amount, commissionRate, officeShareRate);
      const nextStatus = status ?? existing.status;
      const closing = nextStatus === "TAMAMLANDI";
      const cancelling = nextStatus === "IPTAL";
      const approvalChanged = requestedApproval !== undefined && requestedApproval !== existing.approvalStatus;
      const approvalNote = body.approvalNote !== undefined
        ? (typeof body.approvalNote === "string" ? body.approvalNote.trim() || null : null)
        : existing.approvalNote;

      const sale = await tx.sale.update({
        where: { id },
        data: {
          ...(status ? { status: nextStatus, closedAt: closing ? new Date() : null } : {}),
          ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}),
          ...(commissionChanged ? {
            commissionRate,
            officeShareRate,
            grossCommission: commission.grossCommission,
            officeShare: commission.officeShare,
            consultantShare: commission.consultantShare,
          } : {}),
          ...(approvalChanged ? {
            approvalStatus: requestedApproval,
            approvalNote,
            approvedAt: requestedApproval === "ONAYLANDI" ? new Date() : null,
            approvedByUserId: requestedApproval === "ONAYLANDI" ? context.userId : null,
          } : {}),
          ...(body.approvalNote !== undefined && !approvalChanged ? { approvalNote } : {}),
        },
        include: {
          customer: { select: { id: true, name: true, ownerUserId: true } },
          consultant: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
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

      const primeEvent = closing ? "SALE_COMPLETED" : cancelling ? "SALE_CANCELLED" : commissionChanged ? "COMMISSION_UPDATED" : null;
      if (primeEvent) {
        const next = commercialNextAction({ event: primeEvent });
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { nextAction: next.label, nextActionAt: new Date(Date.now() + next.dueInHours * 60 * 60 * 1000) },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          actorUserId: context.userId,
          action: approvalChanged ? "SALE_APPROVAL_UPDATED" : status ? "SALE_STATUS_UPDATED" : "SALE_UPDATED",
          entityType: "Sale",
          entityId: sale.id,
          metadata: {
            fromStatus: existing.status,
            toStatus: sale.status,
            fromApprovalStatus: existing.approvalStatus,
            toApprovalStatus: sale.approvalStatus,
            listingStatus: existing.listing.status,
            commissionChanged,
            paidPaymentCount: existing.payments.length,
            approvalNote,
          },
        },
      });

      return sale;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ sale: updated });
  } catch (error) {
    if (error instanceof SaleNotFoundError) return notFound(error.message);
    return validationError(error instanceof Error ? error.message : "Satış güncellenemedi.");
  }
}
