import { test } from "node:test";

const assert = {
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) throw new Error(message ?? `${String(actual)} !== ${String(expected)}`);
  },
  deepEqual(actual: unknown, expected: unknown, message?: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message ?? `${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
    }
  },
};

const { applyOutcomeLearning, learnFromShowing } = await import("../src/core/prime-learning");

test("new positive outcome removes the same feature from negative learning", () => {
  const result = applyOutcomeLearning(
    { positive: [], negative: ["balkon"], history: [] },
    "activity-positive",
    "Balkon beğendi.",
  );

  assert.deepEqual(result.learning.positive, ["balkon"]);
  assert.deepEqual(result.learning.negative, []);
  assert.equal(result.learning.history[0]?.direction, "positive");
});

test("new negative outcome removes the same feature from positive learning", () => {
  const result = applyOutcomeLearning(
    { positive: ["balkon"], negative: [], history: [] },
    "activity-negative",
    "Balkon istemiyor, beğenmedi.",
  );

  assert.deepEqual(result.learning.positive, []);
  assert.deepEqual(result.learning.negative, ["balkon"]);
  assert.equal(result.learning.history[0]?.direction, "negative");
});

test("mixed positive and negative feedback is recorded as neutral, not forced positive", () => {
  const result = learnFromShowing("Balkon istemiyor ama otopark istiyor.", "");

  assert.equal(result.direction, "neutral");
  assert.deepEqual(result.learned, ["otopark", "balkon"]);
});

test("mixed outcome does not change existing preference signals", () => {
  const result = applyOutcomeLearning(
    { positive: ["otopark"], negative: ["balkon"], history: [] },
    "activity-mixed",
    "Balkon istemiyor ama otopark istiyor.",
  );

  assert.deepEqual(result.learning.positive, ["otopark"]);
  assert.deepEqual(result.learning.negative, ["balkon"]);
  assert.equal(result.learning.history[0]?.direction, "neutral");
});

test("equivalent property-feature forms cannot leave contradictory learned signals", () => {
  const negative = applyOutcomeLearning(
    { positive: ["otoparklı"], negative: [], history: [] },
    "activity-negative",
    "Otopark istemiyor, beğenmedi.",
  );

  assert.deepEqual(negative.learning.positive, []);
  assert.deepEqual(negative.learning.negative, ["otopark"]);

  const positive = applyOutcomeLearning(
    { positive: [], negative: ["balkon"], history: [] },
    "activity-positive",
    "Balkonlu daireyi beğendi.",
  );

  assert.deepEqual(positive.learning.positive, ["balkon"]);
  assert.deepEqual(positive.learning.negative, []);
});
