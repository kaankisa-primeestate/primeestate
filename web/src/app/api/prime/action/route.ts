import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, officeListingScope } from "@/lib/authz";
import { calculateMatch } from "@/core/matching-engine";
import { deriveNextAction, type PrimeActionType } from "@/core/prime-next-action";

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "customers", "update")) return forbidden();

  let body: { customerId?: unknown; action?: unknown; outcome?: unknown };
  try {
    body = await request.json();
  } catch {
    return validationError("Geçersiz JSON.");
  }

  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";
  const outcome = typeof body.outcome === "string" ? body.outcome.trim() : "";

  if (!customerId || !["ARAMA", "WHATSAPP"].includes(action)) {
    return validationError("Müşteri ve geçerli Prime aksiyonu zorunludur.");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...customerOwnershipScope(context),
    },
    select: {
      id: true,
      name: true,
      ownerUserId: true,
      relationshipScore: true,
    },
  });

  if (!customer) return notFound("Müşteri bulunamadı veya erişim yetkiniz yok.");

  const nextAction = deriveNextAction(outcome || null, action as PrimeActionType);
  const nextActionAt = new Date(Date.now() + nextAction.dueInHours * 60 * 60 * 1000);
  const nextRelationshipScore = Math.min(100, Math.max(0, customer.relationshipScore + nextAction.relationshipDelta));

  const demands = await prisma.demand.findMany({
    where: {
      customerId,
      active: true,
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerOwnershipScope(context),
      },
    },
  });

  const listings = await prisma.listing.findMany({
    where: {
      ...officeListingScope(context),
      status: "AKTIF",
    },
    include: {
      property: {
        select: {
          id: true,
          propertyType: true,
          city: true,
          district: true,
          neighborhood: true,
          sizeM2: true,
          rooms: true,
        },
      },
    },
  });

  const matchSets = demands.map((demand) => ({
    demand,
    results: listings
      .filter((listing) =>
        demand.type === "SATIN_ALMA"
          ? listing.purpose === "SATILIK"
          : listing.purpose === "KIRALIK",
      )
      .map((listing) => calculateMatch(demand, listing))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50),
  }));

  const activitySummary =
    action === "ARAMA"
      ? "Prime önerisiyle telefon görüşmesi kaydedildi."
      : "Prime önerisiyle WhatsApp görüşmesi kaydedildi.";

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.create({
      data: {
        customerId,
        ownerUserId: context.userId,
        type: action as never,
        occurredAt: new Date(),
        summary: activitySummary,
        outcome: outcome || null,
        metadata: {
          source: "PRIME_BRAIN",
          workflow: "NEXT_BEST_ACTION",
          nextAction: nextAction.action,
        },
      },
    });

    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: {
        relationshipScore: nextRelationshipScore,
        lastContactAt: activity.occurredAt,
        nextAction: nextAction.label,
        nextActionAt,
      },
      select: {
        id: true,
        name: true,
        relationshipScore: true,
        lastContactAt: true,
        nextAction: true,
        nextActionAt: true,
      },
    });

    for (const set of matchSets) {
      for (const match of set.results) {
        await tx.match.upsert({
          where: {
            demandId_propertyId: {
              demandId: set.demand.id,
              propertyId: match.propertyId,
            },
          },
          create: {
            demandId: set.demand.id,
            propertyId: match.propertyId,
            listingId: match.listingId,
            score: match.score,
            breakdown: match.breakdown,
            reasons: match.reasons,
            mismatches: match.mismatches,
          },
          update: {
            listingId: match.listingId,
            score: match.score,
            breakdown: match.breakdown,
            reasons: match.reasons,
            mismatches: match.mismatches,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        action: "PRIME_NEXT_BEST_ACTION",
        entityType: "Customer",
        entityId: customerId,
        metadata: {
          activityId: activity.id,
          action,
          nextAction: nextAction.action,
          nextActionAt,
          rematchedDemands: matchSets.length,
        },
      },
    });

    return { activity, customer: updatedCustomer };
  });

  const topMatches = matchSets
    .flatMap((set) => set.results.slice(0, 3).map((match) => ({ demandId: set.demand.id, ...match })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return NextResponse.json({
    ...result,
    nextAction,
    rematchedDemands: matchSets.length,
    topMatches,
  });
}
