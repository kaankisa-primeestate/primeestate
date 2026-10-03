import { NextResponse } from "next/server";
import { authenticationRequired, conflict, forbidden, validationError } from "@/lib/api-response";
import { getUserContext } from "@/lib/auth-context";
import { isManagerRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function monthStart(value: string) {
  const date = new Date(value + "T00:00:00.000Z");
  if (!value || Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function dueDateFor(period: Date, day: number) {
  const lastDay = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(1, day), lastDay);
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth(), safeDay, 9));
}

export async function GET() {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!isManagerRole(context.role)) return forbidden("Aidat yönetimi yalnızca ofis yönetimine açıktır.");

  const [fees, consultants] = await Promise.all([
    prisma.consultantFee.findMany({
      where: { organizationId: context.organizationId, officeId: context.officeId },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: { consultant: { select: { id: true, name: true, active: true } } },
    }),
    prisma.user.findMany({
      where: { organizationId: context.organizationId, officeId: context.officeId, role: "AGENT", active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        consultantCommissionPlan: {
          select: { rentAmount: true, rentCurrency: true, rentStartDate: true, rentDueDay: true, active: true, termsNote: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    fees: fees.map((fee) => ({ ...fee, amount: fee.amount.toString() })),
    consultants: consultants.map((consultant) => ({
      ...consultant,
      consultantCommissionPlan: consultant.consultantCommissionPlan
        ? {
            ...consultant.consultantCommissionPlan,
            rentAmount: consultant.consultantCommissionPlan.rentAmount?.toString() ?? null,
            rentStartDate: consultant.consultantCommissionPlan.rentStartDate?.toISOString() ?? null,
          }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!isManagerRole(context.role)) return forbidden("Aidat yönetimi yalnızca ofis yönetimine açıktır.");

  const body = await request.json().catch(() => null);
  const period = monthStart(typeof body?.period === "string" ? body.period : "");
  if (!period) return validationError("Geçerli bir aidat dönemi seçin.");

  const monthEnd = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));
  const consultants = await prisma.user.findMany({
    where: {
      organizationId: context.organizationId,
      officeId: context.officeId,
      role: "AGENT",
      active: true,
      consultantCommissionPlan: {
        active: true,
        rentAmount: { not: null },
        OR: [{ rentStartDate: null }, { rentStartDate: { lt: monthEnd } }],
      },
    },
    select: {
      id: true,
      consultantCommissionPlan: { select: { rentAmount: true, rentCurrency: true, rentStartDate: true, rentDueDay: true } },
    },
  });

  if (!consultants.length) return conflict("Aidat tutarı tanımlı aktif danışman bulunamadı.");

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const consultant of consultants) {
      const plan = consultant.consultantCommissionPlan;
      if (!plan?.rentAmount || (plan.rentStartDate && plan.rentStartDate >= monthEnd)) continue;

      const existing = await tx.consultantFee.findUnique({
        where: { consultantUserId_period: { consultantUserId: consultant.id, period } },
      });
      if (existing) {
        results.push(existing);
        continue;
      }

      results.push(await tx.consultantFee.create({
        data: {
          organizationId: context.organizationId,
          officeId: context.officeId,
          consultantUserId: consultant.id,
          period,
          amount: plan.rentAmount,
          currency: plan.rentCurrency,
          dueAt: dueDateFor(period, plan.rentDueDay ?? 1),
        },
      }));
    }

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "CONSULTANT_FEES_GENERATED",
        entityType: "ConsultantFee",
        metadata: { officeId: context.officeId, period: period.toISOString(), count: results.length },
      },
    });
    return results;
  });

  return NextResponse.json({
    fees: created.map((fee) => ({ ...fee, amount: fee.amount.toString() })),
    message: `${created.length} danışman için dönem aidatları hazırlandı.`,
  });
}

export async function PATCH(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!isManagerRole(context.role)) return forbidden("Aidat yönetimi yalnızca ofis yönetimine açıktır.");

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status;
  if (!id || !["BEKLIYOR", "ODENDI", "IPTAL"].includes(status)) {
    return validationError("Aidat ve durum bilgisi geçerli olmalıdır.");
  }

  const existing = await prisma.consultantFee.findFirst({
    where: { id, organizationId: context.organizationId, officeId: context.officeId },
  });
  if (!existing) return NextResponse.json({ message: "Aidat kaydı bulunamadı." }, { status: 404 });

  const fee = await prisma.$transaction(async (tx) => {
    const updated = await tx.consultantFee.update({
      where: { id },
      data: { status, paidAt: status === "ODENDI" ? new Date() : null },
      include: { consultant: { select: { id: true, name: true } } },
    });
    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "CONSULTANT_FEE_STATUS_UPDATED",
        entityType: "ConsultantFee",
        entityId: id,
        metadata: { officeId: context.officeId, status },
      },
    });
    return updated;
  });

  return NextResponse.json({
    fee: { ...fee, amount: fee.amount.toString() },
    message: "Aidat durumu güncellendi.",
  });
}
