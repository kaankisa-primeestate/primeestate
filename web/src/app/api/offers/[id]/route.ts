import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound, conflict } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";

const OFFER_STATUSES = new Set(["TASLAK", "SUNULDU", "KARSILIKLI_TEKLIF", "KABUL", "REDDEDILDI"]);

class OfferConvertedConflictError extends Error {}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "offers", "update")) return forbidden();

  const { id } = await params;
  const offer = await prisma.offer.findFirst({
    where: {
      id,
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerOwnershipScope(context),
      },
    },
    select: { id: true, sale: { select: { id: true } } },
  });
  if (!offer) return notFound("Teklif bulunamadı veya yetkiniz yok.");

  let body: { status?: unknown; nextAction?: unknown; amount?: unknown };
  try {
    body = await request.json();
  } catch {
    return validationError("Geçersiz JSON.");
  }

  const status = typeof body.status === "string" && OFFER_STATUSES.has(body.status) ? body.status : undefined;
  const amount = body.amount === undefined ? undefined : Number(body.amount);

  if (body.status !== undefined && !status) return validationError("Geçersiz teklif durumu.");
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) return validationError("Geçerli bir teklif tutarı girilmelidir.");
  if (!status && body.nextAction === undefined && amount === undefined) return validationError("Güncellenecek alan bulunamadı.");
  if (offer.sale && (status !== undefined || amount !== undefined)) {
    throw new OfferConvertedConflictError("Satışa dönüştürülmüş teklifin durumu veya tutarı değiştirilemez.");
  }

  try {
    const updated = await prisma.offer.update({
    where: { id },
    data: {
      ...(status ? { status: status as never } : {}),
      ...(body.nextAction !== undefined ? { nextAction: typeof body.nextAction === "string" ? body.nextAction.trim() || null : null } : {}),
      ...(amount !== undefined ? { amount } : {}),
    },
      include: {
        customer: { select: { id: true, name: true, ownerUserId: true } },
        listing: { select: { id: true, code: true, title: true, price: true, currency: true } },
      },
    });

    await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "OFFER_UPDATED",
      entityType: "Offer",
      entityId: id,
      metadata: {
        ...(status ? { status } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(body.nextAction !== undefined ? { nextAction: updated.nextAction } : {}),
      },
    },
    });

    return NextResponse.json({ offer: updated });
  } catch (error) {
    if (error instanceof OfferConvertedConflictError) return conflict(error.message);
    return validationError(error instanceof Error ? error.message : "Teklif güncellenemedi.");
  }
}
