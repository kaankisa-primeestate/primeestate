import { NextResponse } from "next/server";
import { authenticationRequired, forbidden } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, isManagerRole, officeListingScope } from "@/lib/authz";
import { findPrimeListingOpportunities } from "@/core/prime-listing-opportunities";

const PROPERTY_TYPES = ["DAIRE", "VILLA", "ARSA", "IS_YERI", "BINA", "DEVRE_MULK"] as const;
const PURPOSES = ["SATILIK", "KIRALIK"] as const;
const STATUSES = ["AKTIF", "REZERVE", "PASIF", "SATILDI", "KIRALANDI"] as const;

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();

  try {
    if (!can(context.role, "listings", "read")) return forbidden();
  } catch {
    return NextResponse.json({ message: "Portföy görüntüleme yetkiniz yok." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const purpose = searchParams.get("purpose")?.trim();
  const propertyType = searchParams.get("propertyType")?.trim();

  const listings = await prisma.listing.findMany({
    where: {
      ...officeListingScope(context),
      ...(q ? { OR: [
        { code: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { property: { city: { contains: q, mode: "insensitive" } } },
        { property: { district: { contains: q, mode: "insensitive" } } },
        { property: { neighborhood: { contains: q, mode: "insensitive" } } },
      ] } : {}),
      ...(purpose ? { purpose: purpose as never } : {}),
      ...(propertyType ? { property: { propertyType: propertyType as never } } : {}),
    },
    include: {
      property: { select: {
        id: true, propertyType: true, city: true, district: true, neighborhood: true,
        address: true, sizeM2: true, rooms: true, floor: true, ownerName: true,
      } },
      consultant: { select: { id: true, name: true, email: true } },
      _count: { select: { matches: true, showings: true, offers: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();

  try {
    if (!can(context.role, "listings", "create")) return forbidden();
  } catch {
    return NextResponse.json({ message: "Portföy oluşturma yetkiniz yok." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ message: "Geçersiz istek." }, { status: 400 });

  const propertyType = String(body.propertyType ?? "");
  const purpose = String(body.purpose ?? "");
  const title = String(body.title ?? "").trim();
  const city = String(body.city ?? "").trim();
  const district = String(body.district ?? "").trim();
  const neighborhood = String(body.neighborhood ?? "").trim();
  const price = Number(body.price);
  const sizeM2 = body.sizeM2 === "" || body.sizeM2 == null ? null : Number(body.sizeM2);
  const rooms = body.rooms ? String(body.rooms).trim() : null;
  const floor = body.floor ? String(body.floor).trim() : null;
  const address = body.address ? String(body.address).trim() : null;
  const ownerName = body.ownerName ? String(body.ownerName).trim() : null;
  const currency = body.currency ? String(body.currency).trim().toUpperCase() : "TRY";
  const details =
    body.details && typeof body.details === "object" && !Array.isArray(body.details)
      ? body.details
      : {};
  const requestedConsultantUserId = body.consultantUserId ? String(body.consultantUserId).trim() : null;
  let consultantUserId = context.userId;

  if (requestedConsultantUserId) {
    if (!isManagerRole(context.role)) {
      return NextResponse.json({ message: "Danışman atamasını yalnızca ofis yönetimi yapabilir." }, { status: 403 });
    }
    const consultant = await prisma.user.findFirst({
      where: {
        id: requestedConsultantUserId,
        organizationId: context.organizationId,
        officeId: context.officeId,
        role: "AGENT",
        active: true,
      },
      select: { id: true },
    });
    if (!consultant) {
      return NextResponse.json({ message: "Seçilen danışman bu ofiste aktif değil." }, { status: 400 });
    }
    consultantUserId = consultant.id;
  }

  if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) return NextResponse.json({ message: "Geçerli bir portföy türü seçin." }, { status: 400 });
  if (!PURPOSES.includes(purpose as (typeof PURPOSES)[number])) return NextResponse.json({ message: "Geçerli bir ilan amacı seçin." }, { status: 400 });
  if (!title || !city || !district || !neighborhood) return NextResponse.json({ message: "Başlık, il, ilçe ve mahalle zorunludur." }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ message: "Geçerli bir fiyat girin." }, { status: 400 });
  if (sizeM2 !== null && (!Number.isFinite(sizeM2) || sizeM2 <= 0)) return NextResponse.json({ message: "m² değeri geçersiz." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ message: "Para birimi 3 harfli olmalıdır." }, { status: 400 });

  const requiredDetailFields: Record<string, string[]> = {
    DAIRE: ["buildingAge", "heating"],
    VILLA: ["landSize", "heating"],
    ARSA: ["zoning"],
    IS_YERI: ["commercialType"],
    BINA: ["landSize", "totalFloors"],
    DEVRE_MULK: ["period", "season"],
  };
  for (const field of requiredDetailFields[propertyType] ?? []) {
    if (details[field] == null || String(details[field]).trim() === "") {
      return NextResponse.json({ message: `Seçilen portföy tipi için "${field}" bilgisi zorunludur.` }, { status: 400 });
    }
  }

  const code = `PR-${Date.now().toString(36).toUpperCase()}`;

  const created = await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        consultantUserId,
        propertyType: propertyType as never,
        title,
        city,
        district,
        neighborhood,
        address,
        sizeM2,
        rooms,
        floor,
        ownerName,
        details,
      },
    });

    const listing = await tx.listing.create({
      data: {
        propertyId: property.id,
        organizationId: context.organizationId,
        officeId: context.officeId,
        consultantUserId,
        code,
        title,
        purpose: purpose as never,
        status: "AKTIF",
        price,
        currency,
      },
      include: { property: true, consultant: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "LISTING_CREATED",
        entityType: "Listing",
        entityId: listing.id,
        metadata: { code: listing.code, purpose: listing.purpose, propertyType },
      },
    });

    return listing;
  });

  let primeOpportunities: Awaited<ReturnType<typeof findPrimeListingOpportunities>> = [];
  try {
    primeOpportunities = await findPrimeListingOpportunities(created, context);
  } catch {
    // Prime matching is additive; a matching failure must not undo a successful listing save.
  }

  return NextResponse.json({ listing: created, primeOpportunities }, { status: 201 });
}
