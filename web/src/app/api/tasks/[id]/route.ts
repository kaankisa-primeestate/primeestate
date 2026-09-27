import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, isManagerRole } from "@/lib/authz";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "tasks", "update")) return forbidden();
  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, owner: { organizationId: context.organizationId, officeId: context.officeId, ...(isManagerRole(context.role) ? {} : { id: context.userId }) } },
    select: { id: true },
  });
  if (!task) return notFound("Görev bulunamadı veya yetkiniz yok.");
  let body: { status?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  const status = typeof body.status === "string" ? body.status : "";
  if (!["BEKLIYOR", "TAMAMLANDI", "GECIKTI"].includes(status)) return validationError("Geçersiz görev durumu.");
  const updated = await prisma.task.update({ where: { id }, data: { status: status as never, completedAt: status === "TAMAMLANDI" ? new Date() : null } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "TASK_UPDATED", entityType: "Task", entityId: id, metadata: { status } } });
  return NextResponse.json({ task: updated });
}