import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";

const demandTypes = new Set(["SATIN_ALMA", "KIRALAMA"]);
const propertyTypes = new Set(["DAIRE", "VILLA", "ARSA", "IS_YERI", "BINA", "DEVRE_MULK"]);
const priorities = new Set(["YUKSEK", "NORMAL", "DUSUK"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; demandId: string }> },
) {
  const { id, demandId } = await params;
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "demands", "update")) return forbidden();

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) },
    select: { id: true },
  });
  if (!customer) return notFound("Müşteri bulunamadı.");

  const existing = await prisma.demand.findFirst({
    where: { id: demandId, customerId: customer.id },
    select: { id: true },
  });
  if (!existing) return notFound("Talep bulunamadı.");

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = typeof body.type === "string" ? body.type : "";
  const propertyType = typeof body.propertyType === "string" ? body.propertyType : "";
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "TRY";
  if (!title) return validationError("Talep başlığı zorunludur.");
  if (!demandTypes.has(type)) return validationError("Geçersiz talep tipi.");
  if (!propertyTypes.has(propertyType)) return validationError("Geçersiz gayrimenkul tipi.");
  if (!/^[A-Z]{3}$/.test(currency)) return validationError("Geçersiz para birimi.");

  const toNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };
  const budgetMin = toNumber(body.budgetMin);
  const budgetMax = toNumber(body.budgetMax);
  const minSize = toNumber(body.minSize);
  const maxSize = toNumber(body.maxSize);
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) return validationError("Minimum bütçe maksimum bütçeden büyük olamaz.");
  if (minSize !== null && maxSize !== null && minSize > maxSize) return validationError("Minimum m² maksimum m²'den büyük olamaz.");

  const urgency = typeof body.urgency === "string" && priorities.has(body.urgency) ? body.urgency : "NORMAL";
  const locations = Array.isArray(body.locations)
    ? body.locations.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
    : [];

  const demand = await prisma.demand.update({
    where: { id: existing.id },
    data: {
      title, type: type as never, propertyType: propertyType as never, locations,
      budgetMin, budgetMax, currency, minSize, maxSize,
      rooms: typeof body.rooms === "string" ? body.rooms.trim() || null : null,
      urgency: urgency as never,
      preferences: body.preferences && typeof body.preferences === "object" ? body.preferences : {},
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "DEMAND_UPDATED",
      entityType: "Demand",
      entityId: demand.id,
      metadata: { customerId: customer.id },
    },
  });

  return NextResponse.json({ demand });
}
