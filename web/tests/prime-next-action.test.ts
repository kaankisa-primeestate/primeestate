import { test } from "node:test";

const assert = {
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) throw new Error(message ?? `${String(actual)} !== ${String(expected)}`);
  },
};

const { deriveNextAction } = await import("../src/core/prime-next-action");
const { applyOutcomeLearning } = await import("../src/core/prime-learning");
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


test("Prime contact outcome learning persists learned positive attributes", () => {
  const result = applyOutcomeLearning(undefined, "activity-1", "Müşteri otoparkı çok beğendi.");
  assert.equal(result.result.direction, "positive");
  assert.equal(result.learning.positive.includes("otopark"), true);
  assert.equal(result.learning.history.length, 1);
  assert.equal(result.learning.history[0].showingId, "activity-1");
});

test("Prime contact outcome learning persists learned negative attributes", () => {
  const result = applyOutcomeLearning(undefined, "activity-2", "Müşteri otopark istemiyor.");
  assert.equal(result.result.direction, "negative");
  assert.equal(result.learning.negative.includes("otopark"), true);
});


test("Prime outcome learning changes the next match score", () => {
  const demandBase = {
    propertyType: "DAIRE",
    type: "SATIN_ALMA",
    locations: ["Kadıköy"],
    budgetMin: 100,
    budgetMax: 200,
    currency: "TRY",
    minSize: 90,
    maxSize: 120,
    rooms: "3+1",
    preferences: { primeLearning: { positive: [], negative: [], history: [] } },
  };
  const listing = {
    id: "listing-learning",
    propertyId: "property-learning",
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

  const before = calculateMatch(demandBase as never, listing as never);
  const learned = applyOutcomeLearning(
    demandBase.preferences.primeLearning,
    "activity-rematch",
    "Müşteri otoparkı istemiyor.",
  );
  const afterDemand = {
    ...demandBase,
    preferences: { ...demandBase.preferences, primeLearning: learned.learning },
  };
  const after = calculateMatch(afterDemand as never, listing as never);

  assert.equal(after.breakdown.learning, -6);
  assert.equal(after.score < before.score, true);
  assert.equal(after.reasons.some((reason) => reason.title === "Prime öğrenilen tercih ile çakışıyor"), true);
});
