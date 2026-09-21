import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope, officeListingScope } from "@/lib/authz";

const OFFER_STATUSES = ["TASLAK", "SUNULDU", "KARSILIKLI_TEKLIF", "KABUL", "REDDEDILDI"] as const;

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  assertCan(context, "offers", "read");

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  const status = searchParams.get("status")?.trim();

  const offers = await prisma.offer.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      ...(status && OFFER_STATUSES.includes(status as (typeof OFFER_STATUSES)[number]) ? { status: status as never } : {}),
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerOwnershipScope(context),
      },
    },
    include: {
      customer: { select: { id: true, name: true, ownerUserId: true } },
      listing: {
        select: {
          id: true,
          code: true,
          title: true,
          price: true,
          currency: true,
          status: true,
          property: { select: { city: true, district: true, neighborhood: true } },
        },
      },
    },
    orderBy: { offeredAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ offers });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  assertCan(context, "offers", "create");

  let body: {
    customerId?: unknown;
    listingId?: unknown;
    amount?: unknown;
    currency?: unknown;
    offeredAt?: unknown;
    nextAction?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 });
  }

  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().toUpperCase() : "TRY";
  const offeredAt = typeof body.offeredAt === "string" && body.offeredAt.trim() ? new Date(body.offeredAt) : new Date();

  if (!customerId || !listingId || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(offeredAt.getTime())) {
    return NextResponse.json({ message: "Müşteri, portföy, geçerli teklif tutarı ve tarih zorunludur." }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...customerScope(context),
    },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ message: "Bu müşteri için teklif oluşturma yetkiniz yok." }, { status: 403 });

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      ...officeListingScope(context),
      status: { in: ["AKTIF", "REZERVE"] },
    },
    select: { id: true },
  });
  if (!listing) return NextResponse.json({ message: "Geçerli bir aktif ofis portföyü bulunamadı." }, { status: 400 });

  const offer = await prisma.offer.create({
    data: {
      customerId,
      listingId,
      amount,
      currency,
      offeredAt,
      nextAction: typeof body.nextAction === "string" ? body.nextAction.trim() || null : null,
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
      action: "OFFER_CREATED",
      entityType: "Offer",
      entityId: offer.id,
      metadata: { customerId, listingId, amount, currency, status: "TASLAK" },
    },
  });

  return NextResponse.json({ offer }, { status: 201 });
}
