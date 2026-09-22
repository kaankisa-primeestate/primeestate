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
