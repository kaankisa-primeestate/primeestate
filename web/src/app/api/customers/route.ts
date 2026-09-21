import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope, isManagerRole } from "@/lib/authz";

const MANAGER_ROLES = new Set([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "OFFICE_ADMIN",
]);

function canSeeCustomer(context: Awaited<ReturnType<typeof getUserContext>>, ownerUserId: string) {
  if (!context) return false;
  if (isManagerRole(context.role)) return true;
  return ownerUserId === context.userId;
}

export async function GET(request: Request) {
  const context = await getUserContext();

  if (!context) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const role = searchParams.get("role")?.trim();

  const ownerScope =
    context.role === "AGENT"
      ? { ownerUserId: context.userId }
      : context.role === "TEAM_LEADER" && context.teamId
        ? { owner: { teamId: context.teamId } }
        : {};

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
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  try {
    assertCan(context, "customers", "create");
  } catch {
    return NextResponse.json({ message: "Müşteri oluşturma yetkiniz yok." }, { status: 403 });
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
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ message: "Müşteri adı zorunludur." }, { status: 400 });
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
    return NextResponse.json({ message: "Geçerli bir sorumlu danışman bulunamadı." }, { status: 400 });
  }

  if (!canSeeCustomer(context, requestedOwnerId)) {
    return NextResponse.json({ message: "Bu danışman adına müşteri oluşturma yetkiniz yok." }, { status: 403 });
  }

  const roleValues = Array.isArray(body.roles)
    ? body.roles.filter((value): value is string => typeof value === "string")
    : [];

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
      metadata: { ownerUserId: customer.ownerUserId },
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
