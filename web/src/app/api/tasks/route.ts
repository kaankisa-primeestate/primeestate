import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, isManagerRole } from "@/lib/authz";


export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "tasks", "read")) return forbidden();
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  const status = searchParams.get("status")?.trim();
  const tasks = await prisma.task.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      ...(status ? { status: status as never } : {}),
      OR: [
        { customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } },
        { customerId: null, owner: { organizationId: context.organizationId, officeId: context.officeId, ...(isManagerRole(context.role) ? {} : { id: context.userId }) } },
      ],
    },
    include: { customer: { select: { id: true, name: true, ownerUserId: true } }, owner: { select: { id: true, name: true, email: true } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 100,
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "tasks", "create")) return forbidden();
  let body: { customerId?: unknown; title?: unknown; dueAt?: unknown; priority?: unknown; source?: unknown; ownerUserId?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const customerId = typeof body.customerId === "string" && body.customerId.trim() ? body.customerId.trim() : null;
  const dueAt = typeof body.dueAt === "string" ? new Date(body.dueAt) : null;
  const validPriorities = new Set(["YUKSEK", "NORMAL", "DUSUK"]);
  const priority = typeof body.priority === "string" && validPriorities.has(body.priority) ? body.priority : "NORMAL";
  if (!title || !dueAt || Number.isNaN(dueAt.getTime())) return validationError("Görev başlığı ve geçerli tarih zorunludur.");

  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) }, select: { id: true, ownerUserId: true } });
    if (!customer) return NextResponse.json({ message: "Bu müşteri için görev oluşturma yetkiniz yok." }, { status: 403 });
  }

  let ownerUserId = context.userId;
  if (isManagerRole(context.role) && typeof body.ownerUserId === "string" && body.ownerUserId.trim()) {
    const owner = await prisma.user.findFirst({ where: { id: body.ownerUserId.trim(), organizationId: context.organizationId, officeId: context.officeId, active: true }, select: { id: true } });
    if (!owner) return validationError("Geçerli bir sorumlu danışman bulunamadı.");
    ownerUserId = owner.id;
  }

  const task = await prisma.task.create({ data: { customerId, ownerUserId, title, dueAt, priority: priority as never, source: typeof body.source === "string" ? body.source.trim() || null : null } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "TASK_CREATED", entityType: "Task", entityId: task.id, metadata: { customerId, ownerUserId } } });
  return NextResponse.json({ task }, { status: 201 });
}