import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope, officeListingScope } from "@/lib/authz";

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  assertCan(context, "showings", "read");
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
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  assertCan(context, "showings", "create");
  let body: { customerId?: unknown; listingId?: unknown; dateTime?: unknown; attendees?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
  const dateTime = typeof body.dateTime === "string" ? new Date(body.dateTime) : null;
  const attendees = typeof body.attendees === "number" && Number.isInteger(body.attendees) && body.attendees > 0 ? body.attendees : 1;
  if (!customerId || !listingId || !dateTime || Number.isNaN(dateTime.getTime())) return NextResponse.json({ message: "Müşteri, portföy ve geçerli gösterim tarihi zorunludur." }, { status: 400 });

  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: context.organizationId, officeId: context.officeId, ...customerScope(context) }, select: { id: true } });
  if (!customer) return NextResponse.json({ message: "Bu müşteri için gösterim oluşturma yetkiniz yok." }, { status: 403 });

  const listing = await prisma.listing.findFirst({ where: { id: listingId, ...officeListingScope(context), status: { in: ["AKTIF", "REZERVE"] } }, select: { id: true } });
  if (!listing) return NextResponse.json({ message: "Geçerli bir aktif ofis portföyü bulunamadı." }, { status: 400 });

  const showing = await prisma.showing.create({ data: { customerId, listingId, dateTime, attendees, note: typeof body.note === "string" ? body.note.trim() || null : null } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SHOWING_CREATED", entityType: "Showing", entityId: showing.id, metadata: { customerId, listingId } } });
  return NextResponse.json({ showing }, { status: 201 });
}