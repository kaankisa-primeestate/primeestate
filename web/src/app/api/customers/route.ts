import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, canAssignCustomerOwner, customerOwnershipScope, isManagerRole } from "@/lib/authz";

export async function GET(request: Request) {
  const context = await getUserContext();

  if (!context) {
    return authenticationRequired();
  }

  try {
    if (!can(context.role, "customers", "read")) return forbidden();
  } catch {
    return forbidden("Müşteri görüntüleme yetkiniz yok.");
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const role = searchParams.get("role")?.trim();

  const ownerScope = customerOwnershipScope(context);

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...ownerScope,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { location: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role ? { roles: { some: { role: role as never } } } : {}),
    },
    include: {
      roles: { select: { role: true } },
      demands: {
        where: { active: true },
        orderBy: { updatedAt: "desc" },
      },
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const context = await getUserContext();

  if (!context) {
    return authenticationRequired();
  }

  try {
    if (!can(context.role, "customers", "create")) return forbidden();
  } catch {
    return forbidden("Müşteri oluşturma yetkiniz yok.");
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    location?: unknown;
    source?: unknown;
    notes?: unknown;
    roles?: unknown;
    ownerUserId?: unknown;
    demand?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return validationError("Geçersiz JSON.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return validationError("Müşteri adı zorunludur.");
  }

  const requestedOwnerId =
    typeof body.ownerUserId === "string" && body.ownerUserId.trim()
      ? body.ownerUserId.trim()
      : context.userId;

  const owner = await prisma.user.findFirst({
    where: {
      id: requestedOwnerId,
      organizationId: context.organizationId,
      officeId: context.officeId,
      active: true,
    },
    select: { id: true, teamId: true },
  });

  if (!owner) {
    return validationError("Geçerli bir sorumlu danışman bulunamadı.");
  }

  if (!isManagerRole(context.role) && requestedOwnerId !== context.userId && !canAssignCustomerOwner(context, owner.teamId)) {
    return forbidden("Bu danışman adına müşteri oluşturma yetkiniz yok.");
  }

  const roleValues = Array.isArray(body.roles)
    ? body.roles.filter((value): value is string => typeof value === "string")
    : [];

  const rawDemand = body.demand && typeof body.demand === "object" && !Array.isArray(body.demand)
    ? body.demand as Record<string, unknown>
    : null;
  const demandTitle = typeof rawDemand?.title === "string" ? rawDemand.title.trim() : "";
  const demandType = typeof rawDemand?.type === "string" ? rawDemand.type : "SATIN_ALMA";
  const demandPropertyType = typeof rawDemand?.propertyType === "string" ? rawDemand.propertyType : "DAIRE";
  const demandCurrency = typeof rawDemand?.currency === "string" ? rawDemand.currency.trim().toUpperCase() : "TRY";
  const toNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/\./g, "").replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };
  const demandBudgetMin = toNumber(rawDemand?.budgetMin);
  const demandBudgetMax = toNumber(rawDemand?.budgetMax);
  const demandMinSize = toNumber(rawDemand?.minSize);
  const demandMaxSize = toNumber(rawDemand?.maxSize);
  const demandLocations = Array.isArray(rawDemand?.locations)
    ? rawDemand.locations.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
    : [];
  const demandUrgency = typeof rawDemand?.urgency === "string" && ["YUKSEK", "NORMAL", "DUSUK"].includes(rawDemand.urgency)
    ? rawDemand.urgency
    : "NORMAL";
  const demandPreferences = rawDemand?.preferences && typeof rawDemand.preferences === "object" && !Array.isArray(rawDemand.preferences)
    ? rawDemand.preferences
    : undefined;
  if (demandTitle) {
    if (!["SATIN_ALMA", "KIRALAMA"].includes(demandType) || !["DAIRE", "VILLA", "ARSA", "IS_YERI", "BINA", "DEVRE_MULK"].includes(demandPropertyType)) {
      return validationError("İlk talep için geçerli talep ve gayrimenkul tipi seçin.");
    }
    if (!/^[A-Z]{3}$/.test(demandCurrency)) return validationError("İlk talep için geçerli para birimi seçin.");
    if (demandBudgetMin !== null && demandBudgetMax !== null && demandBudgetMin > demandBudgetMax) return validationError("Minimum bütçe maksimum bütçeden büyük olamaz.");
    if (demandMinSize !== null && demandMaxSize !== null && demandMinSize > demandMaxSize) return validationError("Minimum m² maksimum m²'den büyük olamaz.");
  }

  const customer = await prisma.customer.create({
    data: {
      organizationId: context.organizationId,
      officeId: context.officeId,
      ownerUserId: owner.id,
      name,
      phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
      email: typeof body.email === "string" ? body.email.trim() || null : null,
      location: typeof body.location === "string" ? body.location.trim() || null : null,
      source: typeof body.source === "string" ? body.source.trim() || null : null,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      roles: {
        create: [...new Set(roleValues)].map((value) => ({ role: value as never })),
      },
      ...(demandTitle ? {
        demands: {
          create: {
            title: demandTitle,
            type: demandType as never,
            propertyType: demandPropertyType as never,
            locations: demandLocations,
            budgetMin: demandBudgetMin,
            budgetMax: demandBudgetMax,
            currency: demandCurrency,
            minSize: demandMinSize,
            maxSize: demandMaxSize,
            rooms: typeof rawDemand?.rooms === "string" ? rawDemand.rooms.trim() || null : null,
            urgency: demandUrgency as never,
            preferences: demandPreferences,
            notes: typeof rawDemand?.notes === "string" ? rawDemand.notes.trim() || null : null,
          },
        },
      } : {}),
    },
    include: {
      roles: { select: { role: true } },
      demands: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { ownerUserId: customer.ownerUserId, initialDemandCreated: Boolean(demandTitle) },
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
