import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound, internalError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  try { if (!can(context.role, "installments", "update")) return forbidden(); } catch { return forbidden(); }
  const { id } = await params;
  let body: { status?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return validationError("Geçersiz JSON."); }
  if (body.status !== "BEKLIYOR" && body.status !== "ODENDI" && body.status !== "IPTAL") return validationError("Geçersiz taksit durumu.");
  try {
    const existing = await prisma.paymentInstallment.findFirst({
      where: { id, plan: { sale: { customer: { organizationId: context.organizationId, officeId: context.officeId, ...customerOwnershipScope(context) } } } },
      select: { id: true, status: true, payment: { select: { id: true } } },
    });
    if (!existing) return notFound("Taksit bulunamadı veya yetkiniz yok.");

    // A paid installment must always have its Payment/Ledger record created
    // through the atomic /pay workflow. Direct PATCH to ODENDI would bypass
    // payment creation and corrupt the financial workflow.
    if (body.status === "ODENDI") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Ödenmiş taksit durumu doğrudan değiştirilemez. Tahsilat için taksit ödeme işlemini kullanın." } },
        { status: 409 },
      );
    }

    if (existing.status === "ODENDI" || existing.payment) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Tahsilatı oluşmuş taksit doğrudan değiştirilemez." } },
        { status: 409 },
      );
    }

    const updated = await prisma.paymentInstallment.update({
      where: { id },
      data: { status: body.status, ...(body.note !== undefined ? { note: typeof body.note === "string" ? body.note.trim() || null : null } : {}) },
    });
    await prisma.auditLog.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: "PAYMENT_INSTALLMENT_UPDATED", entityType: "PaymentInstallment", entityId: id, metadata: { status: updated.status } } });
    return NextResponse.json({ installment: updated });
  } catch {
    return internalError();
  }
}
