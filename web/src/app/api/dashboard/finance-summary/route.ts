import { NextResponse } from "next/server";
import { authenticationRequired, forbidden } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope } from "@/lib/authz";

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

  const [openSales, paidByCurrencyRows, pendingInstallments, overdueInstallments, paymentCount, paymentPlanCount] =
    await Promise.all([
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
    ]);

  const paidByCurrency = Object.fromEntries(
    paidByCurrencyRows.map((row) => [row.currency, row._sum.amount?.toString() ?? "0"]),
  );

  return NextResponse.json({
    openSales,
    paidByCurrency,
    pendingInstallments,
    overdueInstallments,
    paymentCount,
    paymentPlanCount,
  });
}
