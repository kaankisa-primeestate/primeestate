import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";

const demandTypes = new Set(["SATIN_ALMA", "KIRALAMA"]);
const propertyTypes = new Set(["DAIRE", "VILLA", "ARSA", "IS_YERI", "BINA", "DEVRE_MULK"]);
const priorities = new Set(["YUKSEK", "NORMAL", "DUSUK"]);

async function getScopedCustomer(id: string) {
  const context = await getUserContext();
  if (!context) return { context: null, customer: null };

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) },
    select: { id: true, ownerUserId: true },
  });

  return { context, customer };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { context, customer } = await getScopedCustomer(id);

  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  assertCan(context, "demands", "create");
  if (!customer) return NextResponse.json({ message: "Müşteri bulunamadı." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = typeof body.type === "string" ? body.type : "";
  const propertyType = typeof body.propertyType === "string" ? body.propertyType : "";
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "TRY";

  if (!title) return NextResponse.json({ message: "Talep başlığı zorunludur." }, { status: 400 });
  if (!demandTypes.has(type)) return NextResponse.json({ message: "Geçersiz talep tipi." }, { status: 400 });
  if (!propertyTypes.has(propertyType)) return NextResponse.json({ message: "Geçersiz gayrimenkul tipi." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ message: "Geçersiz para birimi." }, { status: 400 });

  const toNumber = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };

  const budgetMin = toNumber(body.budgetMin);
  const budgetMax = toNumber(body.budgetMax);
  const minSize = toNumber(body.minSize);
  const maxSize = toNumber(body.maxSize);

  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return NextResponse.json({ message: "Minimum bütçe maksimum bütçeden büyük olamaz." }, { status: 400 });
  }
  if (minSize !== null && maxSize !== null && minSize > maxSize) {
    return NextResponse.json({ message: "Minimum m² maksimum m²'den büyük olamaz." }, { status: 400 });
  }

  const urgency = typeof body.urgency === "string" && priorities.has(body.urgency) ? body.urgency : "NORMAL";
  const locations = Array.isArray(body.locations)
    ? body.locations.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
    : [];

  const demand = await prisma.demand.create({
    data: {
      customerId: customer.id,
      title,
      type: type as never,
      propertyType: propertyType as never,
      locations,
      budgetMin,
      budgetMax,
      currency,
      minSize,
      maxSize,
      rooms: typeof body.rooms === "string" ? body.rooms.trim() || null : null,
      urgency: urgency as never,
      preferences: body.preferences && typeof body.preferences === "object" ? body.preferences : undefined,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "DEMAND_CREATED",
      entityType: "Demand",
      entityId: demand.id,
      metadata: { customerId: customer.id },
    },
  });

  return NextResponse.json({ demand }, { status: 201 });
}
