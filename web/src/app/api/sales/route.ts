import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
function customerScope(context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  if (MANAGER_ROLES.has(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) return { owner: { teamId: context.teamId } };
  return { ownerUserId: context.userId };
}

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  const sales = await prisma.sale.findMany({
    where: { ...(customerId ? { customerId } : {}), customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerScope(context) } },
    include: { customer: { select: { id: true, name: true, ownerUserId: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true } }, offer: { select: { id: true, status: true, offeredAt: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return NextResponse.json({ sales });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  let body: { offerId?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const offerId = typeof body.offerId === "string" ? body.offerId.trim() : "";
  if (!offerId) return NextResponse.json({ message: "Kabul edilmiş teklif zorunludur." }, { status: 400 });
  const offer = await prisma.offer.findFirst({ where: { id: offerId, status: "KABUL", customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerScope(context) } }, include: { sale: { select: { id: true } } } });
  if (!offer) return NextResponse.json({ message: "Teklif bulunamadı, kabul edilmemiş veya yetkiniz yok." }, { status: 400 });
  if (offer.sale) return NextResponse.json({ message: "Bu teklif zaten satış kaydına dönüştürülmüş." }, { status: 409 });
  const sale = await prisma.sale.create({ data: { customerId: offer.customerId, listingId: offer.listingId, offerId: offer.id, amount: offer.amount, currency: offer.currency, note: typeof body.note === "string" ? body.note.trim() || null : null }, include: { customer: { select: { id: true, name: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true } }, offer: { select: { id: true, status: true } } } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SALE_CREATED", entityType: "Sale", entityId: sale.id, metadata: { offerId: offer.id, customerId: offer.customerId, listingId: offer.listingId, amount: offer.amount.toString(), currency: offer.currency } } });
  return NextResponse.json({ sale }, { status: 201 });
}
