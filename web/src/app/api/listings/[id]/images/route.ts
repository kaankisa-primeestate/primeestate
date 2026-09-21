import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, isManagerRole } from "@/lib/authz";

async function authorizedListing(id: string, context: Awaited<ReturnType<typeof getUserContext>>) {
  if (!context) return null;
  const listing = await prisma.listing.findFirst({
    where: { id, organizationId: context.organizationId, officeId: context.officeId },
    include: { consultant: { select: { id: true, teamId: true } } },
  });
  if (!listing) return null;
  const isManager = isManagerRole(context.role);
  const isOwner = listing.consultantUserId === context.userId;
  const isTeamLeader = context.role === "TEAM_LEADER" && !!context.teamId && listing.consultant?.teamId === context.teamId;
  return isManager || isOwner || isTeamLeader ? listing : false;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  try { assertCan(context, "listings", "update"); } catch { return NextResponse.json({ message: "Yetkiniz yok." }, { status: 403 }); }
  const { id } = await params;
  const listing = await authorizedListing(id, context);
  if (listing === false) return NextResponse.json({ message: "Bu portföye fotoğraf ekleme yetkiniz yok." }, { status: 403 });
  if (!listing) return NextResponse.json({ message: "Portföy bulunamadı." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const alt = typeof body?.alt === "string" ? body.alt.trim() || null : null;
  if (!url || !/^https?:\/\//i.test(url)) return NextResponse.json({ message: "Geçerli bir fotoğraf URL'si girin." }, { status: 400 });

  const count = await prisma.listingImage.count({ where: { listingId: listing.id } });
  if (count >= 30) return NextResponse.json({ message: "Bir portföy için en fazla 30 fotoğraf eklenebilir." }, { status: 400 });

  const image = await prisma.listingImage.create({ data: { listingId: listing.id, url, alt, sortOrder: count } });
  await prisma.auditLog.create({
    data: { organizationId: context.organizationId, actorUserId: context.userId, action: "LISTING_IMAGE_ADDED", entityType: "ListingImage", entityId: image.id, metadata: { listingId: listing.id } },
  });
  return NextResponse.json({ image }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  try { assertCan(context, "listings", "delete"); } catch { return NextResponse.json({ message: "Yetkiniz yok." }, { status: 403 }); }
  const { id } = await params;
  const listing = await authorizedListing(id, context);
  if (listing === false) return NextResponse.json({ message: "Bu portföyün fotoğraflarını düzenleme yetkiniz yok." }, { status: 403 });
  if (!listing) return NextResponse.json({ message: "Portföy bulunamadı." }, { status: 404 });

  const imageId = new URL(request.url).searchParams.get("imageId");
  if (!imageId) return NextResponse.json({ message: "imageId zorunludur." }, { status: 400 });
  const image = await prisma.listingImage.findFirst({ where: { id: imageId, listingId: listing.id } });
  if (!image) return NextResponse.json({ message: "Fotoğraf bulunamadı." }, { status: 404 });
  await prisma.listingImage.delete({ where: { id: image.id } });
  await prisma.listingImage.updateMany({ where: { listingId: listing.id, sortOrder: { gt: image.sortOrder } }, data: { sortOrder: { decrement: 1 } } });
  return NextResponse.json({ ok: true });
}
