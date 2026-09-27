import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, isManagerRole, officeListingScope } from "@/lib/authz";
import { findPrimeListingOpportunities } from "@/core/prime-listing-opportunities";

const PROPERTY_TYPES = ["DAIRE", "VILLA", "ARSA", "IS_YERI", "BINA", "DEVRE_MULK"] as const;
const PURPOSES = ["SATILIK", "KIRALIK"] as const;
const STATUSES = ["AKTIF", "REZERVE", "PASIF", "SATILDI", "KIRALANDI"] as const;
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try {
    if (!can(context.role, "listings", "read")) return forbidden();
  } catch {
    return forbidden("Portföy görüntüleme yetkiniz yok.");
  }
  const { id } = await params;
  const listing = await prisma.listing.findFirst({
    where: { id, ...officeListingScope(context) },
    include: {
      property: true,
      consultant: { select: { id: true, name: true, email: true, teamId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { matches: true, showings: true, offers: true } },
    },
  });
  if (!listing) return notFound("Portföy bulunamadı.");
  return NextResponse.json({ listing });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try {
    if (!can(context.role, "listings", "update")) return forbidden();
  } catch {
    return forbidden("Portföy düzenleme yetkiniz yok.");
  }
  const { id } = await params;
  const listing = await prisma.listing.findFirst({
    where: { id, ...officeListingScope(context) },
    include: { property: true, consultant: { select: { id: true, teamId: true } } },
  });
  if (!listing) return notFound("Portföy bulunamadı.");

  const isManager = isManagerRole(context.role);
  const isOwner = listing.consultantUserId === context.userId;
  const isTeamLeader = context.role === "TEAM_LEADER" && !!context.teamId && listing.consultant?.teamId === context.teamId;
  if (!isManager && !isOwner && !isTeamLeader) return forbidden("Bu portföyü düzenleme yetkiniz yok.");

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return validationError("Geçersiz istek.");

  const title = String(body.title ?? listing.title).trim();
  const purpose = String(body.purpose ?? listing.purpose);
  const status = String(body.status ?? listing.status);
  const propertyType = String(body.propertyType ?? listing.property.propertyType);
  const city = String(body.city ?? listing.property.city).trim();
  const district = String(body.district ?? listing.property.district).trim();
  const neighborhood = String(body.neighborhood ?? listing.property.neighborhood).trim();
  const toNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  };
  const price = toNumber(body.price ?? listing.price);
  const sizeM2 = toNumber(body.sizeM2);
  const rooms = body.rooms ? String(body.rooms).trim() : null;
  const floor = body.floor ? String(body.floor).trim() : null;
  const address = body.address ? String(body.address).trim() : null;
  const ownerName = body.ownerName ? String(body.ownerName).trim() : null;
  const currency = body.currency ? String(body.currency).trim().toUpperCase() : listing.currency;
  const incomingDetails = body.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details : null;

  if (!title || !city || !district || !neighborhood) return validationError("Başlık, il, ilçe ve mahalle zorunludur.");
  if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) return validationError("Geçerli bir portföy türü seçin.");
  if (!PURPOSES.includes(purpose as (typeof PURPOSES)[number])) return validationError("Geçerli bir ilan amacı seçin.");
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return validationError("Geçerli bir ilan durumu seçin.");
  if (price === null || price <= 0) return validationError("Geçerli bir fiyat girin.");
  if (sizeM2 !== null && sizeM2 <= 0) return validationError("m² değeri geçersiz.");
  if (!/^[A-Z]{3}$/.test(currency)) return validationError("Para birimi 3 harfli olmalıdır.");

  const updated = await prisma.$transaction(async (tx) => {
    const property = await tx.property.update({
      where: { id: listing.propertyId },
      data: { title, propertyType: propertyType as never, city, district, neighborhood, address, sizeM2, rooms, floor, ownerName, ...(incomingDetails ? { details: incomingDetails } : {}) },
    });
    const result = await tx.listing.update({
      where: { id: listing.id },
      data: { title, purpose: purpose as never, status: status as never, price, currency },
      include: { property: true, consultant: { select: { id: true, name: true, email: true } }, images: { orderBy: { sortOrder: "asc" } } },
    });
    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "LISTING_UPDATED",
        entityType: "Listing",
        entityId: listing.id,
        metadata: { code: listing.code },
      },
    });
    return { property, listing: result };
  });
  let primeOpportunities: Awaited<ReturnType<typeof findPrimeListingOpportunities>> = [];
  try {
    primeOpportunities = await findPrimeListingOpportunities(updated.listing, context);
  } catch {
    // Prime matching is additive; a matching failure must not undo a successful listing update.
  }

  return NextResponse.json({ ...updated, primeOpportunities });
}
