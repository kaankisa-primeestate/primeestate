import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "showings", "update")) return forbidden();
  const { id } = await params;
  const showing = await prisma.showing.findFirst({
    where: { id, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
    select: { id: true },
  });
  if (!showing) return notFound("Gösterim bulunamadı veya yetkiniz yok.");
  let body: { status?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  const status = typeof body.status === "string" ? body.status : "";
  if (!["PLANLANDI", "GERCEKLESTI", "IPTAL"].includes(status)) return validationError("Geçersiz gösterim durumu.");
  const updated = await prisma.showing.update({ where: { id }, data: { status: status as never } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SHOWING_UPDATED", entityType: "Showing", entityId: id, metadata: { status } } });
  return NextResponse.json({ showing: updated });
}