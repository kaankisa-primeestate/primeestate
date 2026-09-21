import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { customerReadScope, hasCapability } from "@/lib/authorization";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  if (!hasCapability(context, "finance:write")) return NextResponse.json({ message: "Taksit düzenleme yetkiniz yok." }, { status: 403 });
  const { id } = await params;
  let body: { status?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 }); }
  if (body.status !== "BEKLIYOR" && body.status !== "ODENDI" && body.status !== "IPTAL") return NextResponse.json({ message: "Geçersiz taksit durumu." }, { status: 400 });
  const existing = await prisma.paymentInstallment.findFirst({
    where: { id, plan: { sale: { customer: customerReadScope(context) } } },
  });
  if (!existing) return NextResponse.json({ message: "Taksit bulunamadı veya yetkiniz yok." }, { status: 404 });
  const updated = await prisma.paymentInstallment.update({
    where: { id },
    data: { status: body.status, ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}) },
  });
  await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PAYMENT_INSTALLMENT_UPDATED", entityType: "PaymentInstallment", entityId: id, metadata: { status: updated.status } } });
  return NextResponse.json({ installment: updated });
}
