import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { hasCapability, listingReadScope, listingWriteScope } from "@/lib/authorization";

const PROPERTY_TYPES = ["DAIRE", "VILLA", "ARSA", "IS_YERI", "BINA", "DEVRE_MULK"] as const;
const PURPOSES = ["SATILIK", "KIRALIK"] as const;
const STATUSES = ["AKTIF", "REZERVE", "PASIF", "SATILDI", "KIRALANDI"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;
  if (!hasCapability(context, "listings:write")) return NextResponse.json({ message: "Portföy düzenleme yetkiniz yok." }, { status: 403 });
  const listing = await prisma.listing.findFirst({
    where: { id, ...listingReadScope(context) },
    include: {
      property: true,
      consultant: { select: { id: true, name: true, email: true, teamId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { matches: true, showings: true, offers: true } },
    },
  });
  if (!listing) return NextResponse.json({ message: "Portföy bulunamadı." }, { status: 404 });
  return NextResponse.json({ listing });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const listing = await prisma.listing.findFirst({
    where: { id, ...listingWriteScope(context) },
    include: { property: true, consultant: { select: { id: true, teamId: true } } },
  });
  if (!listing) return NextResponse.json({ message: "Portföy bulunamadı." }, { status: 404 });



  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });

  const title = String(body.title ?? listing.title).trim();
  const purpose = String(body.purpose ?? listing.purpose);
  const status = String(body.status ?? listing.status);
  const propertyType = String(body.propertyType ?? listing.property.propertyType);
  const city = String(body.city ?? listing.property.city).trim();
  const district = String(body.district ?? listing.property.district).trim();
  const neighborhood = String(body.neighborhood ?? listing.property.neighborhood).trim();
  const price = Number(body.price ?? listing.price);
  const sizeM2 = body.sizeM2 === "" || body.sizeM2 == null ? null : Number(body.sizeM2);
  const rooms = body.rooms ? String(body.rooms).trim() : null;
  const floor = body.floor ? String(body.floor).trim() : null;
  const address = body.address ? String(body.address).trim() : null;
  const ownerName = body.ownerName ? String(body.ownerName).trim() : null;
  const currency = body.currency ? String(body.currency).trim().toUpperCase() : listing.currency;

  if (!title || !city || !district || !neighborhood) return NextResponse.json({ message: "Başlık, il, ilçe ve mahalle zorunludur." }, { status: 400 });
  if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) return NextResponse.json({ message: "Geçerli bir portföy türü seçin." }, { status: 400 });
  if (!PURPOSES.includes(purpose as (typeof PURPOSES)[number])) return NextResponse.json({ message: "Geçerli bir ilan amacı seçin." }, { status: 400 });
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return NextResponse.json({ message: "Geçerli bir ilan durumu seçin." }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ message: "Geçerli bir fiyat girin." }, { status: 400 });
  if (sizeM2 !== null && (!Number.isFinite(sizeM2) || sizeM2 <= 0)) return NextResponse.json({ message: "m² değeri geçersiz." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ message: "Para birimi 3 harfli olmalıdır." }, { status: 400 });

  const updated = await prisma.$transaction(async (tx) => {
    const property = await tx.property.update({
      where: { id: listing.propertyId },
      data: { title, propertyType: propertyType as never, city, district, neighborhood, address, sizeM2, rooms, floor, ownerName },
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
  return NextResponse.json(updated);
}
