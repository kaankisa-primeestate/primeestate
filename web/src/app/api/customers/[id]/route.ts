import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try {
    if (!can(context.role, "customers", "read")) return forbidden();
  } catch {
    return forbidden("Müşteri görüntüleme yetkiniz yok.");
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
      showings: {
        orderBy: { dateTime: "asc" },
        take: 20,
        include: {
          listing: {
            select: {
              id: true,
              code: true,
              title: true,
              price: true,
              currency: true,
              property: { select: { city: true, district: true, neighborhood: true } },
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return notFound("Müşteri bulunamadı.");
  }

  return NextResponse.json({ customer });
}


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try {
    if (!can(context.role, "customers", "update")) return forbidden();
  } catch {
    return forbidden("Müşteri düzenleme yetkiniz yok.");
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
    return notFound("Müşteri bulunamadı.");
  }

  let body: {
    name?: unknown; phone?: unknown; email?: unknown; location?: unknown;
    source?: unknown; notes?: unknown; roles?: unknown;
  };
  try { body = await request.json(); }
  catch { return validationError("Geçersiz JSON."); }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return validationError("Müşteri adı zorunludur.");

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
