import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";

import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { calculateMatch } from "@/core/matching-engine";
import { can, customerOwnershipScope, officeListingScope } from "@/lib/authz";

async function getScopedDemand(id: string, context: NonNullable<Awaited<ReturnType<typeof getUserContext>>>) {
  const demand = await prisma.demand.findFirst({
    where: {
      id,
      active: true,
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerOwnershipScope(context),
      },
    },
    include: {
      customer: { select: { id: true, name: true, ownerUserId: true } },
    },
  });
  return demand;
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "matching", "create")) return forbidden();

  let body: { demandId?: unknown; limit?: unknown };
  try { body = await request.json(); }
  catch { return validationError("Geçersiz JSON."); }

  const demandId = typeof body.demandId === "string" ? body.demandId : "";
  if (!demandId) return NextResponse.json({ message: "demandId zorunludur." }, { status: 400 });

  const demand = await getScopedDemand(demandId, context);
  if (!demand) return NextResponse.json({ message: "Talep bulunamadı veya erişim yetkiniz yok." }, { status: 404 });

  const requestedLimit = Number(body.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 50;

  const listings = await prisma.listing.findMany({
    where: {
      ...officeListingScope(context),
      status: "AKTIF",
      ...(demand.type === "SATIN_ALMA" ? { purpose: "SATILIK" } : { purpose: "KIRALIK" }),
    },
    include: {
      property: {
        select: {
          id: true, propertyType: true, city: true, district: true, neighborhood: true,
          sizeM2: true, rooms: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const results = listings
    .map((listing) => calculateMatch(demand, listing))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  await prisma.$transaction([
    ...results.map((result) =>
      prisma.match.upsert({
        where: { demandId_propertyId: { demandId, propertyId: result.propertyId } },
        create: {
          demandId,
          propertyId: result.propertyId,
          listingId: result.listingId,
          score: result.score,
          breakdown: result.breakdown,
          reasons: result.reasons,
          mismatches: result.mismatches,
        },
        update: {
          listingId: result.listingId,
          score: result.score,
          breakdown: result.breakdown,
          reasons: result.reasons,
          mismatches: result.mismatches,
        },
      }),
    ),
    prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "MATCHING_RUN",
        entityType: "Demand",
        entityId: demand.id,
        metadata: { resultCount: results.length },
      },
    }),
  ]);

  const hydrated = await prisma.match.findMany({
    where: { demandId, propertyId: { in: results.map((result) => result.propertyId) } },
    include: {
      property: {
        select: {
          id: true, propertyType: true, title: true, city: true, district: true,
          neighborhood: true, sizeM2: true, rooms: true,
        },
      },
      listing: {
        select: { id: true, code: true, title: true, purpose: true, status: true, price: true, currency: true, tags: true, highlights: true },
      },
    },
    orderBy: { score: "desc" },
  });

  return NextResponse.json({
    demand: { id: demand.id, title: demand.title, type: demand.type, propertyType: demand.propertyType, customer: demand.customer },
    matches: hydrated,
    weights: { category: 20, location: 25, budget: 20, size: 10, features: 15, preferences: 5, availability: 5 },
  });
}
