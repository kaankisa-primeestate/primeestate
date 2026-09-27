import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";
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
  if (!context) return authenticationRequired();
  try { assertCan(context, "listings", "update"); } catch { return forbidden(); }
  const { id } = await params;
  const listing = await authorizedListing(id, context);
  if (listing === false) return forbidden("Bu portföye fotoğraf ekleme yetkiniz yok.");
  if (!listing) return notFound("Portföy bulunamadı.");

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl.trim() : "";
  const alt = typeof body?.alt === "string" ? body.alt.trim() || null : null;
  const isRemoteUrl = /^https?:\/\//i.test(url);
  const isImageDataUrl = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(dataUrl);
  if (!isRemoteUrl && !isImageDataUrl) {
    return validationError("Geçerli bir fotoğraf dosyası veya fotoğraf URL'si seçin.");
  }
  const storedUrl = isImageDataUrl ? dataUrl : url;
  if (storedUrl.length > 5_500_000) {
    return validationError("Fotoğraf çok büyük. Lütfen daha küçük bir fotoğraf seçin.");
  }

  const count = await prisma.listingImage.count({ where: { listingId: listing.id } });
  if (count >= 30) return validationError("Bir portföy için en fazla 30 fotoğraf eklenebilir.");

  const image = await prisma.listingImage.create({ data: { listingId: listing.id, url: storedUrl, alt, sortOrder: count } });
  await prisma.auditLog.create({
    data: { organizationId: context.organizationId, actorUserId: context.userId, action: "LISTING_IMAGE_ADDED", entityType: "ListingImage", entityId: image.id, metadata: { listingId: listing.id, source: isImageDataUrl ? "upload" : "url" } },
  });
  return NextResponse.json({ image }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { assertCan(context, "listings", "delete"); } catch { return forbidden(); }
  const { id } = await params;
  const listing = await authorizedListing(id, context);
  if (listing === false) return forbidden("Bu portföyün fotoğraflarını düzenleme yetkiniz yok.");
  if (!listing) return notFound("Portföy bulunamadı.");

  const imageId = new URL(request.url).searchParams.get("imageId");
  if (!imageId) return validationError("imageId zorunludur.");
  const image = await prisma.listingImage.findFirst({ where: { id: imageId, listingId: listing.id } });
  if (!image) return notFound("Fotoğraf bulunamadı.");
  await prisma.listingImage.delete({ where: { id: image.id } });
  await prisma.listingImage.updateMany({ where: { listingId: listing.id, sortOrder: { gt: image.sortOrder } }, data: { sortOrder: { decrement: 1 } } });
  return NextResponse.json({ ok: true });
}
