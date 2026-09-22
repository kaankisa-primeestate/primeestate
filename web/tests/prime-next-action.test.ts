import { test } from "node:test";

const assert = {
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) throw new Error(message ?? `${String(actual)} !== ${String(expected)}`);
  },
};

const { deriveNextAction } = await import("../src/core/prime-next-action");
const { calculateMatch } = await import("../src/core/matching-engine");

test("Prime next action turns showing feedback into a concrete follow-up", () => {
  const result = deriveNextAction("Portföyü beğendi, gösterim için bakalım.", "ARAMA");
  assert.equal(result.action, "showing");
  assert.equal(result.label, "Uygun portföy için gösterim planla");
  assert.equal(result.relationshipDelta, 8);
});

test("Prime next action schedules reconnect when the customer was unreachable", () => {
  const result = deriveNextAction("Müşteri cevap vermedi, sonra tekrar ara.", "WHATSAPP");
  assert.equal(result.action, "reconnect");
  assert.equal(result.dueInHours, 24);
});

test("Prime learning adjustment is counted once in the match score", () => {
  const demand = {
    propertyType: "DAIRE",
    type: "SATIN_ALMA",
    locations: ["Kadıköy"],
    budgetMin: 100,
    budgetMax: 200,
    currency: "TRY",
    minSize: 90,
    maxSize: 120,
    rooms: "3+1",
    preferences: { primeLearning: { positive: ["otopark"], negative: [], history: [] } },
  };
  const listing = {
    id: "listing-1",
    propertyId: "property-1",
    purpose: "SATILIK",
    status: "AKTIF",
    price: 150,
    currency: "TRY",
    tags: ["otopark"],
    highlights: [],
    property: {
      propertyType: "DAIRE",
      city: "İstanbul",
      district: "Kadıköy",
      neighborhood: "Bostancı",
      sizeM2: 100,
      rooms: "3+1",
    },
  };
  const result = calculateMatch(demand as never, listing as never);
  assert.equal(result.breakdown.learning, 4);
  assert.equal(result.score, 100);
});
