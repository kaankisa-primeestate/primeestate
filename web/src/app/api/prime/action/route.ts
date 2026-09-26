import { NextResponse } from "next/server";
import { authenticationRequired, forbidden, validationError, notFound } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, officeListingScope } from "@/lib/authz";
import { calculateMatch } from "@/core/matching-engine";
import { deriveNextAction, type PrimeActionType } from "@/core/prime-next-action";
import { extractDemandPreferenceChanges } from "@/core/demand-preference-learning";
import { applyOutcomeLearning } from "@/core/prime-learning";

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "customers", "update")) return forbidden();

  let body: { customerId?: unknown; listingId?: unknown; action?: unknown; outcome?: unknown };
  try {
    body = await request.json();
  } catch {
    return validationError("Geçersiz JSON.");
  }

  const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
  const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
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

  const listing = listingId
    ? await prisma.listing.findFirst({
        where: { id: listingId, ...officeListingScope(context) },
        select: { id: true, code: true, title: true, price: true, currency: true },
      })
    : null;

  if (listingId && !listing) return notFound("Portföy bulunamadı veya erişim yetkiniz yok.");

  const nextAction = deriveNextAction(outcome || null, action as PrimeActionType);
  const demandChanges = extractDemandPreferenceChanges(outcome);
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

  const updatedDemands = demands.map((demand) => {
    const currentPreferences =
      demand.preferences && typeof demand.preferences === "object" && !Array.isArray(demand.preferences)
        ? { ...(demand.preferences as Record<string, unknown>) }
        : {};

    const nextPreferences = { ...currentPreferences };
    if (demandChanges.mustHave?.length) {
      nextPreferences.mustHave = [...new Set([
        ...(Array.isArray(nextPreferences.mustHave) ? nextPreferences.mustHave.filter((item): item is string => typeof item === "string") : []),
        ...demandChanges.mustHave,
      ])];
    }
    if (demandChanges.mustNotHave?.length) {
      nextPreferences.mustNotHave = [...new Set([
        ...(Array.isArray(nextPreferences.mustNotHave) ? nextPreferences.mustNotHave.filter((item): item is string => typeof item === "string") : []),
        ...demandChanges.mustNotHave,
      ])];
    }

    const changeHistory = Array.isArray(nextPreferences.primePreferenceChanges)
      ? nextPreferences.primePreferenceChanges.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      : [];

    if (demandChanges.summary.length) {
      nextPreferences.primePreferenceChanges = [
        ...changeHistory,
        {
          at: new Date().toISOString(),
          source: "PRIME_BRAIN",
          summary: demandChanges.summary,
        },
      ].slice(-20);
    }

    return { demand, preferences: nextPreferences };
  });

  const activitySummary =
    listing && action === "WHATSAPP"
      ? `Prime önerisiyle ${listing.code} portföyü WhatsApp üzerinden paylaşıldı.`
      : listing && action === "ARAMA"
        ? `Prime önerisiyle ${listing.code} portföyü hakkında müşteri arandı.`
        : action === "ARAMA"
          ? "Prime önerisiyle telefon görüşmesi kaydedildi."
          : "Prime önerisiyle WhatsApp görüşmesi kaydedildi.";

  const result = await prisma.$transaction(async (tx) => {
    for (const { demand, preferences } of updatedDemands) {
      if (!demandChanges.summary.length) continue;
      await tx.demand.update({
        where: { id: demand.id },
        data: {
          ...(demandChanges.budgetMin !== undefined ? { budgetMin: demandChanges.budgetMin } : {}),
          ...(demandChanges.budgetMax !== undefined ? { budgetMax: demandChanges.budgetMax } : {}),
          ...(demandChanges.rooms ? { rooms: demandChanges.rooms } : {}),
          preferences: JSON.parse(JSON.stringify(preferences)),
        },
      });
    }

    const activity = await tx.activity.create({
      data: {
        customerId,
        listingId: listing?.id ?? null,
        ownerUserId: context.userId,
        type: action as never,
        occurredAt: new Date(),
        summary: activitySummary,
        outcome: outcome || null,
        metadata: {
          source: "PRIME_BRAIN",
          workflow: listing ? "PROACTIVE_LISTING" : "NEXT_BEST_ACTION",
          listingId: listing?.id ?? null,
          nextAction: nextAction.action,
          demandChanges: demandChanges.summary,
        },
      },
    });

    if (outcome) {
      for (const entry of updatedDemands) {
        const currentPreferences =
          entry.preferences && typeof entry.preferences === "object" && !Array.isArray(entry.preferences)
            ? entry.preferences as Record<string, unknown>
            : {};
        const applied = applyOutcomeLearning(
          currentPreferences.primeLearning,
          activity.id,
          outcome,
        );
        entry.preferences = {
          ...currentPreferences,
          primeLearning: applied.learning,
        };

        await tx.demand.update({
          where: { id: entry.demand.id },
          data: {
            preferences: {
              ...currentPreferences,
              primeLearning: applied.learning,
            },
          },
        });
      }
    }

    const matchSets = updatedDemands.map(({ demand, preferences }) => {
    const updatedDemand = {
      ...demand,
      preferences,
      ...(demandChanges.budgetMin !== undefined ? { budgetMin: demandChanges.budgetMin } : {}),
      ...(demandChanges.budgetMax !== undefined ? { budgetMax: demandChanges.budgetMax } : {}),
      ...(demandChanges.rooms ? { rooms: demandChanges.rooms } : {}),
    };

    return {
      demand: updatedDemand,
      results: listings
        .filter((candidate) =>
          updatedDemand.type === "SATIN_ALMA"
            ? candidate.purpose === "SATILIK"
            : candidate.purpose === "KIRALIK",
        )
        .map((candidate) => calculateMatch(updatedDemand, candidate))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50),
    };
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
        action: listing ? "PRIME_PROACTIVE_LISTING_ACTION" : "PRIME_NEXT_BEST_ACTION",
        entityType: "Customer",
        entityId: customerId,
        metadata: {
          activityId: activity.id,
          action,
          listingId: listing?.id ?? null,
          nextAction: nextAction.action,
          nextActionAt,
          rematchedDemands: result.matchSets.length,
          demandChanges: demandChanges.summary,
        },
      },
    });

    return { activity, customer: updatedCustomer, matchSets };
  });

  const topMatches = result.matchSets
    .flatMap((set) => set.results.slice(0, 3).map((match) => ({ demandId: set.demand.id, ...match })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return NextResponse.json({
    ...result,
    listing,
    nextAction,
    rematchedDemands: result.matchSets.length,
    demandChanges: demandChanges.summary,
    topMatches,
  });
}
