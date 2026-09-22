import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, officeListingScope } from "@/lib/authz";

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "showings", "read")) return forbidden();
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  const showings = await prisma.showing.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) },
    },
    include: {
      customer: { select: { id: true, name: true, ownerUserId: true } },
      listing: { include: { property: { select: { title: true, city: true, district: true, neighborhood: true, address: true } }, consultant: { select: { id: true, name: true } } } },
    },
    orderBy: { dateTime: "asc" },
    take: 100,
  });
  return NextResponse.json({ showings });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "showings", "create")) return forbidden();
  let body: { customerId?: unknown; listingId?: unknown; dateTime?: unknown; attendees?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
  const dateTime = typeof body.dateTime === "string" ? new Date(body.dateTime) : null;
  const attendees = typeof body.attendees === "number" && Number.isInteger(body.attendees) && body.attendees > 0 ? body.attendees : 1;
  if (!customerId || !listingId || !dateTime || Number.isNaN(dateTime.getTime())) return validationError("Müşteri, portföy ve geçerli gösterim tarihi zorunludur.");

  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) }, select: { id: true } });
  if (!customer) return NextResponse.json({ message: "Bu müşteri için gösterim oluşturma yetkiniz yok." }, { status: 403 });

  const listing = await prisma.listing.findFirst({ where: { id: listingId, ...officeListingScope(context), status: { in: ["AKTIF", "REZERVE"] } }, select: { id: true } });
  if (!listing) return validationError("Geçerli bir aktif ofis portföyü bulunamadı.");

  const showing = await prisma.showing.create({ data: { customerId, listingId, dateTime, attendees, note: typeof body.note === "string" ? body.note.trim() || null : null } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SHOWING_CREATED", entityType: "Showing", entityId: showing.id, metadata: { customerId, listingId } } });
  return NextResponse.json({ showing }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "showings", "update")) return forbidden();

  let body: { id?: unknown; status?: unknown; note?: unknown; dateTime?: unknown; attendees?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return validationError("Gösterim id zorunludur.");

  const showing = await prisma.showing.findFirst({
    where: {
      id,
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerOwnershipScope(context),
      },
      listing: {
        organizationId: context.organizationId,
        officeId: context.officeId,
      },
    },
    include: {
      customer: { select: { id: true, name: true, ownerUserId: true } },
      listing: { select: { id: true, title: true, code: true } },
    },
  });

  if (!showing) return notFound("Gösterim bulunamadı veya erişim yetkiniz yok.");

  const status = typeof body.status === "string" ? body.status : showing.status;
  if (!["PLANLANDI", "GERCEKLESTI", "IPTAL"].includes(status)) return validationError("Geçersiz gösterim durumu.");

  const note = typeof body.note === "string" ? body.note.trim() || null : showing.note;
  const parsedDateTime =
    typeof body.dateTime === "string" && body.dateTime.trim()
      ? new Date(body.dateTime)
      : showing.dateTime;
  if (Number.isNaN(parsedDateTime.getTime())) return validationError("Geçersiz gösterim tarihi.");

  const attendees =
    typeof body.attendees === "number" && Number.isInteger(body.attendees) && body.attendees > 0
      ? body.attendees
      : showing.attendees;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.showing.update({
      where: { id },
      data: { status: status as never, note, dateTime: parsedDateTime, attendees },
      include: {
        listing: {
          select: {
            id: true,
            code: true,
            title: true,
            price: true,
            currency: true,
            property: { select: { city: true, district: true, neighborhood: true } },
          },
        },
      },
    });

    const shouldRememberShowing =
      (status === "GERCEKLESTI" && (showing.status !== "GERCEKLESTI" || note !== showing.note)) ||
      (status === "IPTAL" && showing.status !== "IPTAL");

    if (shouldRememberShowing) {
      await tx.activity.create({
        data: {
          customerId: showing.customer.id,
          listingId: showing.listing.id,
          ownerUserId: context.userId,
          type: "GOSTERIM",
          occurredAt: new Date(),
          summary: status === "GERCEKLESTI"
            ? "Gösterim tamamlandı; Prime gösterim geri bildirimini hafızaya aldı."
            : "Gösterim iptal edildi.",
          outcome: note,
          metadata: {
            source: "PRIME_BRAIN",
            workspace: "RELATIONSHIP",
            showingId: showing.id,
            showingStatus: status,
          },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "SHOWING_UPDATED",
        entityType: "Showing",
        entityId: showing.id,
        metadata: { customerId: showing.customer.id, listingId: showing.listing.id, status },
      },
    });

    return result;
  });

  return NextResponse.json({ showing: updated });
}
