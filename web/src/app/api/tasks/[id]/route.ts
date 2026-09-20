import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, owner: { organizationId: context.organizationId, officeId: context.officeId, ...(MANAGER_ROLES.has(context.role) ? {} : { id: context.userId }) } },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ message: "Görev bulunamadı veya yetkiniz yok." }, { status: 404 });
  let body: { status?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const status = typeof body.status === "string" ? body.status : "";
  if (!["BEKLIYOR", "TAMAMLANDI", "GECIKTI"].includes(status)) return NextResponse.json({ message: "Geçersiz görev durumu." }, { status: 400 });
  const updated = await prisma.task.update({ where: { id }, data: { status: status as never, completedAt: status === "TAMAMLANDI" ? new Date() : null } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "TASK_UPDATED", entityType: "Task", entityId: id, metadata: { status } } });
  return NextResponse.json({ task: updated });
}