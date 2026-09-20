import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

function canAccessOwner(
  context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>,
  ownerUserId: string,
) {
  if (["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"].includes(context.role)) return true;
  if (context.role === "TEAM_LEADER") return true;
  return ownerUserId === context.userId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: {
      id,
      organizationId: context.organizationId,
      officeId: context.officeId,
    },
    include: {
      roles: true,
      demands: { orderBy: { updatedAt: "desc" } },
      owner: { select: { id: true, name: true, email: true, teamId: true } },
      activities: { orderBy: { occurredAt: "desc" }, take: 20 },
      tasks: { orderBy: { dueAt: "asc" }, take: 20 },
    },
  });

  if (!customer || !canAccessOwner(context, customer.ownerUserId)) {
    return NextResponse.json({ message: "Müşteri bulunamadı." }, { status: 404 });
  }

  if (context.role === "TEAM_LEADER" && customer.owner.teamId !== context.teamId) {
    return NextResponse.json({ message: "Müşteri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ customer });
}
