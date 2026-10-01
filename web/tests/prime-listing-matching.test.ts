import { test } from "node:test";
import { strict as assert } from "node:assert";

const { calculateMatch } = await import("../src/core/matching-engine");

test("Prime listing matching scores a compatible active sale listing against a demand", () => {
  const result = calculateMatch(
    {
      propertyType: "DAIRE",
      type: "SATIN_ALMA",
      locations: ["Kadıköy"],
      budgetMin: null,
      budgetMax: 10_000_000,
      currency: "TRY",
      minSize: null,
      maxSize: null,
      rooms: "3+1",
      preferences: { mustHave: ["otopark"] },
    },
    {
      id: "listing-1", propertyId: "property-1", purpose: "SATILIK", status: "AKTIF",
      price: 8_000_000, currency: "TRY", tags: ["otopark"], highlights: [],
      property: { propertyType: "DAIRE", city: "İstanbul", district: "Kadıköy", neighborhood: "Bostancı", sizeM2: 120, rooms: "3+1" },
    },
  );
  assert.ok(result.score >= 80);
  assert.equal(result.listingId, "listing-1");
});

test("Prime listing matching applies preferred and must-not-have demand preferences", () => {
  const baseListing = {
    id: "listing-preference-base",
    propertyId: "property-preference-base",
    purpose: "SATILIK" as const,
    status: "AKTIF" as const,
    price: 8_000_000,
    currency: "TRY",
    tags: ["otopark", "site"],
    highlights: [],
    property: {
      propertyType: "DAIRE" as const,
      city: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Bostancı",
      sizeM2: 120,
      rooms: "3+1",
    },
  };

  const baseDemand = {
    propertyType: "DAIRE" as const,
    type: "SATIN_ALMA" as const,
    locations: ["Kadıköy"],
    budgetMin: null,
    budgetMax: 10_000_000,
    currency: "TRY",
    minSize: null,
    maxSize: null,
    rooms: "3+1",
    preferences: { mustHave: ["otopark"] },
  };

  const preferred = calculateMatch(
    { ...baseDemand, preferences: { mustHave: ["otopark"], preferred: ["site"] } },
    baseListing,
  );
  const withoutPreferred = calculateMatch(baseDemand, baseListing);

  assert.equal(
    preferred.breakdown.preferences,
    5,
    "A matched preferred feature must contribute the full preference weight.",
  );
  assert.equal(
    preferred.score,
    withoutPreferred.score + 3,
    "A preferred feature should improve the rounded match score above the neutral preference baseline.",
  );

  const forbiddenListing = {
    ...baseListing,
    id: "listing-preference-forbidden",
    propertyId: "property-preference-forbidden",
    tags: ["otopark", "site", "bodrum"],
  };
  const forbidden = calculateMatch(
    {
      ...baseDemand,
      preferences: {
        mustHave: ["otopark"],
        preferred: ["site"],
        mustNotHave: ["bodrum"],
      },
    },
    forbiddenListing,
  );

  assert.equal(forbidden.breakdown.penalty, 15);
  assert.equal(forbidden.score, preferred.score - 15);
  assert.ok(
    forbidden.reasons.some((reason) => reason.title === "İstenmeyen özellik bulundu"),
    "A must-not-have match must be visible in match reasons.",
  );
  assert.ok(
    forbidden.mismatches.includes("Must-not-have"),
    "A must-not-have match must be visible in mismatches.",
  );
});
