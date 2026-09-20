import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
function customerScope(context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  if (MANAGER_ROLES.has(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) return { owner: { teamId: context.teamId } };
  return { ownerUserId: context.userId };
}
const STATUSES = new Set(["ACIK", "TAMAMLANDI", "IPTAL"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.sale.findFirst({ where: { id, customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerScope(context) } }, select: { id: true } });
  if (!existing) return NextResponse.json({ message: "Satış bulunamadı veya yetkiniz yok." }, { status: 404 });
  let body: { status?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  const status = typeof body.status === "string" && STATUSES.has(body.status) ? body.status : undefined;
  if (body.status !== undefined && !status) return NextResponse.json({ message: "Geçersiz satış durumu." }, { status: 400 });
  if (!status && body.note === undefined) return NextResponse.json({ message: "Güncellenecek alan bulunamadı." }, { status: 400 });
  const updated = await prisma.sale.update({ where: { id }, data: { ...(status ? { status: status as never, closedAt: status === "TAMAMLANDI" ? new Date() : null } : {}), ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}) }, include: { customer: { select: { id: true, name: true } }, listing: { select: { id: true, code: true, title: true, price: true, currency: true } }, offer: { select: { id: true, status: true } } } });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "SALE_UPDATED", entityType: "Sale", entityId: id, metadata: { ...(status ? { status } : {}), ...(body.note !== undefined ? { note: updated.note } : {}) } } });
  return NextResponse.json({ sale: updated });
}
