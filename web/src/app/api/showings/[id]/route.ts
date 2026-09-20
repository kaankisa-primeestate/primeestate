import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const showing = await prisma.showing.findFirst({
    where: { id, customer: { organizationId: context.organizationId, officeId: context.officeId, ...(context.role === "SUPER_ADMIN" || context.role === "ORG_ADMIN" || context.role === "OFFICE_ADMIN" ? {} : context.role === "TEAM_LEADER" && context.teamId ? { owner: { teamId: context.teamId } } : { ownerUserId: context.userId }) } },
    select: { id: true },
  });
  if (!showing) return NextResponse.json({ message: "Gösterim bulunamadı veya yetkiniz yok." }, { status: 404 });
  let body: { status?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const status = typeof body.status === "string" ? body.status : "";
  if (!["PLANLANDI", "GERCEKLESTI", "IPTAL"].includes(status)) return NextResponse.json({ message: "Geçersiz gösterim durumu." }, { status: 400 });
  const updated = await prisma.showing.update({ where: { id }, data: { status: status as never } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SHOWING_UPDATED", entityType: "Showing", entityId: id, metadata: { status } } });
  return NextResponse.json({ showing: updated });
}