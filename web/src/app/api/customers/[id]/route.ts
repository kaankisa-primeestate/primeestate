import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { assertCan, customerOwnershipScope } from "@/lib/authz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  try {
    assertCan(context, "customers", "read");
  } catch {
    return NextResponse.json({ message: "Müşteri görüntüleme yetkiniz yok." }, { status: 403 });
  }

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: {
      id,
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...customerOwnershipScope(context),
    },
    include: {
      roles: true,
      demands: { orderBy: { updatedAt: "desc" } },
      owner: { select: { id: true, name: true, email: true, teamId: true } },
      activities: { orderBy: { occurredAt: "desc" }, take: 20 },
      tasks: { orderBy: { dueAt: "asc" }, take: 20 },
    },
  });

  if (!customer) {
    return NextResponse.json({ message: "Müşteri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ customer });
}


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  try {
    assertCan(context, "customers", "update");
  } catch {
    return NextResponse.json({ message: "Müşteri düzenleme yetkiniz yok." }, { status: 403 });
  }

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: {
      id,
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...customerOwnershipScope(context),
    },
    select: { id: true, ownerUserId: true },
  });

  if (!customer) {
    return NextResponse.json({ message: "Müşteri bulunamadı." }, { status: 404 });
  }

  let body: {
    name?: unknown; phone?: unknown; email?: unknown; location?: unknown;
    source?: unknown; notes?: unknown; roles?: unknown;
  };
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ message: "Müşteri adı zorunludur." }, { status: 400 });

  const roles = Array.isArray(body.roles)
    ? [...new Set(body.roles.filter((value): value is string => typeof value === "string"))]
    : [];

  const updated = await prisma.$transaction(async (tx) => {
    await tx.customerRole.deleteMany({ where: { customerId: id } });
    return tx.customer.update({
      where: { id },
      data: {
        name,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
        email: typeof body.email === "string" ? body.email.trim() || null : null,
        location: typeof body.location === "string" ? body.location.trim() || null : null,
        source: typeof body.source === "string" ? body.source.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
        roles: { create: roles.map((role) => ({ role: role as never })) },
      },
      include: {
        roles: { select: { role: true } },
        demands: { where: { active: true }, orderBy: { updatedAt: "desc" } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: id,
      metadata: { ownerUserId: customer.ownerUserId },
    },
  });

  return NextResponse.json({ customer: updated });
}
