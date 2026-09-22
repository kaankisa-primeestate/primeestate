import { prisma } from "@/lib/prisma";
import { customerOwnershipScope, type AuthorizationContext } from "@/lib/authz";
import { calculateMatch, type MatchingListing } from "@/core/matching-engine";

type PrimeListing =
  id: string;
  propertyId: string;
  purpose: "SATILIK" | "KIRALIK";
  status: "AKTIF" | "REZERVE" | "PASIF" | "SATILDI" | "KIRALANDI";
  price: unknown;
  currency: string;
  tags: unknown;
  highlights: unknown;
  property: {
    propertyType: Parameters<typeof calculateMatch>[0]["propertyType"];
    city: string;
    district: string;
    neighborhood: string;
    sizeM2: unknown;
    rooms: string | null;
  };
};

export type PrimeListingOpportunity = {
  customerId: string;
  customerName: string;
  ownerUserId: string;
  demandId: string;
  score: number;
  reasons: ReturnType<typeof calculateMatch>["reasons"];
  mismatches: string[];
};

export async function findPrimeListingOpportunities(listing: PrimeListing, context: AuthorizationContext, limit = 50) {
  if (listing.status !== "AKTIF") return [];

  const demands = await prisma.demand.findMany({
    where: {
      active: true,
      customer: {
        organizationId: context.organizationId,
        officeId: context.officeId,
        ...customerOwnershipScope(context),
      },
      type: listing.purpose === "SATILIK" ? "SATIN_ALMA" : "KIRALAMA",
    },
    include: {
      customer: { select: { id: true, name: true, ownerUserId: true } },
    },
  });

  const matches = demands
    .map((demand) => ({ demand, result: calculateMatch(demand, listing) }))
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, Math.max(1, Math.min(100, limit)));

  if (!matches.length) return [];

  await prisma.$transaction(
    matches.map(({ demand, result }) =>
      prisma.match.upsert({
        where: { demandId_propertyId: { demandId: demand.id, propertyId: listing.propertyId } },
        create: {
          demandId: demand.id,
          propertyId: listing.propertyId,
          listingId: listing.id,
          score: result.score,
          breakdown: result.breakdown,
          reasons: result.reasons,
          mismatches: result.mismatches,
        },
        update: {
          listingId: listing.id,
          score: result.score,
          breakdown: result.breakdown,
          reasons: result.reasons,
          mismatches: result.mismatches,
        },
      }),
    ),
  );

  return matches.slice(0, 10).map(({ demand, result }) => ({
    customerId: demand.customer.id,
    customerName: demand.customer.name,
    ownerUserId: demand.customer.ownerUserId,
    demandId: demand.id,
    score: result.score,
    reasons: result.reasons,
    mismatches: result.mismatches,
  }));
}
