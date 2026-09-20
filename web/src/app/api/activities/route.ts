import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

const MANAGER_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "OFFICE_ADMIN"]);

function customerScope(context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  if (MANAGER_ROLES.has(context.role)) return {};
  if (context.role === "TEAM_LEADER" && context.teamId) {
    return { owner: { teamId: context.teamId } };
  }
  return { ownerUserId: context.userId };
}

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim();
  const limitValue = Number(searchParams.get("limit") ?? "50");
  const take = Number.isFinite(limitValue) ? Math.min(Math.max(Math.floor(limitValue), 1), 100) : 50;

  const activities = await prisma.activity.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerScope(context),
      },
    },
    include: {
      customer: { select: { id: true, name: true, ownerUserId: true } },
      listing: {
        select: {
          id: true,
          code: true,
          title: true,
          purpose: true,
          price: true,
          currency: true,
        },
      },
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { occurredAt: "desc" },
    take,
  });

  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  let body: {
    customerId?: unknown;
    listingId?: unknown;
    type?: unknown;
    occurredAt?: unknown;
    summary?: unknown;
    outcome?: unknown;
    metadata?: unknown;
    ownerUserId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Geçersiz JSON." }, { status: 400 });
  }

  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const listingId = typeof body.listingId === "string" && body.listingId.trim() ? body.listingId.trim() : null;

  const validTypes = new Set(["ARAMA", "WHATSAPP", "EMAIL", "NOT", "GOSTERIM", "TEKLIF"]);
  if (!customerId || !summary || !validTypes.has(type)) {
    return NextResponse.json({ message: "Müşteri, aktivite tipi ve özet zorunludur." }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...customerScope(context),
    },
    select: { id: true, ownerUserId: true },
  });

  if (!customer) {
    return NextResponse.json({ message: "Bu müşteri için aktivite oluşturma yetkiniz yok." }, { status: 403 });
  }

  if (listingId) {
    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        organizationId: context.organizationId,
        officeId: context.officeId,
      },
      select: { id: true },
    });
    if (!listing) {
      return NextResponse.json({ message: "Geçerli bir ofis portföyü bulunamadı." }, { status: 400 });
    }
  }

  let ownerUserId = context.userId;
  if (MANAGER_ROLES.has(context.role) && typeof body.ownerUserId === "string" && body.ownerUserId.trim()) {
    const owner = await prisma.user.findFirst({
      where: {
        id: body.ownerUserId.trim(),
        organizationId: context.organizationId,
        officeId: context.officeId,
        active: true,
      },
      select: { id: true },
    });
    if (!owner) return NextResponse.json({ message: "Geçerli bir sorumlu danışman bulunamadı." }, { status: 400 });
    ownerUserId = owner.id;
  } else if (!MANAGER_ROLES.has(context.role) && ownerUserId !== customer.ownerUserId) {
    return NextResponse.json({ message: "Bu müşterinin aktivitesi yalnızca sorumlu danışman tarafından oluşturulabilir." }, { status: 403 });
  }

  const parsedOccurredAt =
    typeof body.occurredAt === "string" && body.occurredAt.trim()
      ? new Date(body.occurredAt)
      : new Date();

  if (Number.isNaN(parsedOccurredAt.getTime())) {
    return NextResponse.json({ message: "Geçersiz aktivite tarihi." }, { status: 400 });
  }

  const activity = await prisma.$transaction(async (tx) => {
    const created = await tx.activity.create({
      data: {
        customerId,
        listingId,
        ownerUserId,
        type: type as never,
        occurredAt: parsedOccurredAt,
        summary,
        outcome: typeof body.outcome === "string" ? body.outcome.trim() || null : null,
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata as never : undefined,
      },
      include: {
        customer: { select: { id: true, name: true, ownerUserId: true } },
        listing: { select: { id: true, code: true, title: true, purpose: true, price: true, currency: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.customer.update({
      where: { id: customerId },
      data: { lastContactAt: parsedOccurredAt },
    });

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "ACTIVITY_CREATED",
        entityType: "Activity",
        entityId: created.id,
        metadata: { customerId, listingId, ownerUserId, type },
      },
    });

    return created;
  });

  return NextResponse.json({ activity }, { status: 201 });
}
