import { test } from "node:test";
import { readCustomerOpsArray } from "../src/lib/customer-ops-payload";

const assert = {
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) throw new Error(message ?? `${String(actual)} !== ${String(expected)}`);
  },
  throws(fn: () => unknown, expectedMessage: string) {
    try {
      fn();
    } catch (error) {
      if (error instanceof Error && error.message === expectedMessage) return;
      throw new Error(`Unexpected error: ${String(error)}`);
    }
    throw new Error("Expected function to throw.");
  },
};

test("customer workflow payload accepts a real empty array", () => {
  const result = readCustomerOpsArray({ activities: [] }, "activities", "Aktivite yanıtı beklenen biçimde değil.");
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 0);
});

test("customer workflow payload rejects missing or malformed collection data", () => {
  const message = "Aktivite yanıtı beklenen biçimde değil.";
  assert.throws(() => readCustomerOpsArray({}, "activities", message), message);
  assert.throws(() => readCustomerOpsArray({ activities: null }, "activities", message), message);
  assert.throws(() => readCustomerOpsArray({ activities: {} }, "activities", message), message);
});
