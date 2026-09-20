import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);
const OFFER_STATUSES = new Set(["TASLAK", "SUNULDU", "KARSILIKLI_TEKLIF", "KABUL", "REDDEDILDI"]);

function customerScope(context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  if (MANAGER_ROLES.has(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) return { owner: { teamId: context.teamId } };
  return { ownerUserId: context.userId };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const { id } = await params;
  const offer = await prisma.offer.findFirst({
    where: {
      id,
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerScope(context),
      },
    },
    select: { id: true },
  });
  if (!offer) return NextResponse.json({ message: "Teklif bulunamadı veya yetkiniz yok." }, { status: 404 });

  let body: { status?: unknown; nextAction?: unknown; amount?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 });
  }

  const status = typeof body.status === "string" && OFFER_STATUSES.has(body.status) ? body.status : undefined;
  const amount = body.amount === undefined ? undefined : Number(body.amount);

  if (body.status !== undefined && !status) return NextResponse.json({ message: "Geçersiz teklif durumu." }, { status: 400 });
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) return NextResponse.json({ message: "Geçerli bir teklif tutarı girilmelidir." }, { status: 400 });
  if (!status && body.nextAction === undefined && amount === undefined) return NextResponse.json({ message: "Güncellenecek alan bulunamadı." }, { status: 400 });

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      ...(status ? { status: status as never } : {}),
      ...(body.nextAction !== undefined ? { nextAction: typeof body.nextAction === "string" ? body.nextAction.trim() || null : null } : {}),
      ...(amount !== undefined ? { amount } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, ownerUserId: true } },
      listing: { select: { id: true, code: true, title: true, price: true, currency: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "OFFER_UPDATED",
      entityType: "Offer",
      entityId: id,
      metadata: {
        ...(status ? { status } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(body.nextAction !== undefined ? { nextAction: updated.nextAction } : {}),
      },
    },
  });

  return NextResponse.json({ offer: updated });
}
