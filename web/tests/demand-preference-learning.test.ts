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

const { extractDemandPreferenceChanges } = await import("../src/core/demand-preference-learning");

test("Prime extracts budget, room and mandatory feature changes from a contact outcome", () => {
  const result = extractDemandPreferenceChanges(
    "Bütçeyi 8 milyona çıkardı, 3+1 istiyor, otopark şart."
  );

  assert.equal(result.budgetMax, 8_000_000);
  assert.equal(result.rooms, "3+1");
  assert.deepEqual(result.mustHave, ["otopark"]);
});

test("Prime extracts explicitly unwanted features without removing existing preferences", () => {
  const result = extractDemandPreferenceChanges(
    "Bütçe 7 milyon, 2+1 istiyor, havuz istemiyor."
  );

  assert.equal(result.budgetMax, 7_000_000);
  assert.equal(result.rooms, "2+1");
  assert.deepEqual(result.mustNotHave, ["havuz"]);
});

test("Prime ignores ambiguous contact notes instead of changing demand", () => {
  const result = extractDemandPreferenceChanges("Müşteriyle görüşüldü, geri dönüş bekleniyor.");
  assert.equal(result.budgetMax, undefined);
  assert.equal(result.rooms, null);
  assert.deepEqual(result.mustHave, undefined);
  assert.deepEqual(result.mustNotHave, undefined);
});
