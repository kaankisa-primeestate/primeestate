import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, internalError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, isManagerRole } from "@/lib/authz";

export async function GET() {
  const context = await getUserContext();
  if (!context) return authenticationRequired();

  try {
    if (
      !can(context.role, "sales", "read") ||
      !can(context.role, "payments", "read") ||
      !can(context.role, "paymentPlans", "read")
    ) {
      return forbidden();
    }
  } catch {
    return forbidden();
  }

  const customerScope = {
    organizationId: context.organizationId,
    officeId: context.officeId,
    ...customerOwnershipScope(context),
  };
  const paymentScope = {
    status: "ODENDI" as const,
    sale: { customer: customerScope },
  };
  const saleScope = {
    customer: customerScope,
  };

  try {
    const currentMonthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() + 1, 1));
    const manager = isManagerRole(context.role);

    const [
      openSales,
      paidByCurrencyRows,
      pendingInstallments,
      overdueInstallments,
      paymentCount,
      paymentPlanCount,
      ledgerByAccountRows,
      consultantFees,
    ] = await Promise.all([
      prisma.sale.count({
        where: { status: "ACIK", customer: customerScope },
      }),
      prisma.payment.groupBy({
        by: ["currency"],
        where: paymentScope,
        _sum: { amount: true },
      }),
      prisma.paymentInstallment.count({
        where: { status: "BEKLIYOR", plan: { sale: saleScope } },
      }),
      prisma.paymentInstallment.count({
        where: {
          status: "BEKLIYOR",
          dueAt: { lt: new Date() },
          plan: { sale: saleScope },
        },
      }),
      prisma.payment.count({
        where: { sale: { customer: customerScope } },
      }),
      prisma.paymentPlan.count({
        where: { sale: { customer: customerScope } },
      }),
      prisma.ledgerEntry.groupBy({
        by: ["account", "currency"],
        where: { payment: paymentScope },
        _sum: { amount: true },
      }),
      manager
        ? prisma.consultantFee.findMany({
            where: {
              organizationId: context.organizationId,
              officeId: context.officeId,
              period: { gte: currentMonthStart, lt: nextMonthStart },
            },
            select: { amount: true, currency: true, status: true, dueAt: true },
          })
        : Promise.resolve([]),
    ]);

    const paidByCurrency = Object.fromEntries(
      paidByCurrencyRows.map((row) => [row.currency, row._sum.amount?.toString() ?? "0"]),
    );
    const officeCollectedByCurrency = Object.fromEntries(
      ledgerByAccountRows
        .filter((row) => row.account === "OFFICE")
        .map((row) => [row.currency, row._sum.amount?.toString() ?? "0"]),
    );
    const consultantCollectedByCurrency = Object.fromEntries(
      ledgerByAccountRows
        .filter((row) => row.account === "CONSULTANT")
        .map((row) => [row.currency, row._sum.amount?.toString() ?? "0"]),
    );

    const consultantFeeSummary = manager
      ? consultantFees.reduce<{ count: number; paid: number; pending: number; overdue: number; totals: Record<string, number>; paidTotals: Record<string, number> }>((acc, fee) => {
          acc.count += 1;
          acc.totals[fee.currency] = (acc.totals[fee.currency] ?? 0) + Number(fee.amount);
          if (fee.status === "ODENDI") {
            acc.paid += 1;
            acc.paidTotals[fee.currency] = (acc.paidTotals[fee.currency] ?? 0) + Number(fee.amount);
          } else if (fee.status === "BEKLIYOR") {
            acc.pending += 1;
            if (fee.dueAt < new Date()) acc.overdue += 1;
          }
          return acc;
        }, { count: 0, paid: 0, pending: 0, overdue: 0, totals: {}, paidTotals: {} })
      : null;

    return NextResponse.json({
      openSales,
      paidByCurrency,
      officeCollectedByCurrency,
      consultantCollectedByCurrency,
      pendingInstallments,
      overdueInstallments,
      paymentCount,
      paymentPlanCount,
      consultantFeeSummary,
    });
  } catch {
    return internalError();
  }
}
