import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, officeListingScope } from "@/lib/authz";
import { buildShowingConfirmationMessage, showingNextAction } from "@/core/prime-showing";

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
  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  if (!customerId || !listingId || !dateTime || Number.isNaN(dateTime.getTime())) return validationError("Müşteri, portföy ve geçerli gösterim tarihi zorunludur.");
  if (dateTime.getTime() <= Date.now()) return validationError("Gösterim tarihi gelecekte olmalıdır.");

  const [customer, listing] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) },
      select: { id: true, name: true, phone: true },
    }),
    prisma.listing.findFirst({
      where: { id: listingId, ...officeListingScope(context), status: { in: ["AKTIF", "REZERVE"] } },
      select: { id: true, code: true, title: true, price: true, currency: true, property: { select: { city: true, district: true, neighborhood: true } } },
    }),
  ]);

  if (!customer) return notFound("Müşteri bulunamadı veya erişim yetkiniz yok.");
  if (!listing) return notFound("Portföy bulunamadı veya erişim yetkiniz yok.");

  const reminderAt = new Date(Math.max(Date.now(), dateTime.getTime() - 24 * 60 * 60 * 1000));
  const next = showingNextAction(reminderAt);
  const confirmationMessage = buildShowingConfirmationMessage({ customerName: customer.name, listingTitle: listing.title, dateTime });
  const whatsappUrl = customer.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, "").replace(/^0/, "90")}?text=${encodeURIComponent(confirmationMessage)}`
    : null;
  const result = await prisma.$transaction(async (tx) => {
    const showing = await tx.showing.create({
      data: { customerId, listingId, dateTime, attendees, note },
      include: { listing: { select: { id: true, code: true, title: true, price: true, currency: true, property: { select: { city: true, district: true, neighborhood: true } } } } },
    });

    await tx.activity.create({
      data: {
        customerId, listingId, ownerUserId: context.userId, type: "GOSTERIM", occurredAt: new Date(),
        summary: `Prime gösterimi planladı: ${listing.code} — ${dateTime.toLocaleString("tr-TR")}.`,
        outcome: null,
        metadata: { source: "PRIME_BRAIN", workflow: "SHOWING_AUTOMATION", showingId: showing.id, confirmationPrepared: Boolean(whatsappUrl) },
      },
    });

    const task = await tx.task.create({
      data: {
        customerId, ownerUserId: context.userId, title: `Prime: ${customer.name} gösterim teyidi · ${listing.code}`,
        dueAt: reminderAt, priority: "YUKSEK", source: "PRIME_BRAIN_SHOWING",
      },
    });

    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: { nextAction: next.label, nextActionAt: next.nextActionAt },
      select: { id: true, name: true, nextAction: true, nextActionAt: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId, actorUserId: context.userId,
        action: "PRIME_SHOWING_PLANNED", entityType: "Showing", entityId: showing.id,
        metadata: { customerId, listingId, dateTime: dateTime.toISOString(), taskId: task.id, whatsappPrepared: Boolean(whatsappUrl) },
      },
    });

    return { showing, task, customer: updatedCustomer };
  });

  return NextResponse.json({
    ...result,
    confirmation: { whatsappUrl, message: confirmationMessage, reminderAt },
  }, { status: 201 });
}
