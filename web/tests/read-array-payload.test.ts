import { test } from "node:test";
import { readArrayPayload } from "../src/lib/read-array-payload";

const assert = {
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) throw new Error(message ?? String(actual) + " !== " + String(expected));
  },
  throws(fn: () => unknown, expectedMessage: string) {
    try {
      fn();
    } catch (error) {
      if (error instanceof Error && error.message === expectedMessage) return;
      throw new Error("Unexpected error: " + String(error));
    }
    throw new Error("Expected function to throw.");
  },
};

test("API collection payload accepts an empty array", () => {
  const result = readArrayPayload({ tasks: [] }, "tasks", "Görev yanıtı beklenen biçimde değil.");
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 0);
});

test("API collection payload rejects missing or malformed collections", () => {
  const message = "Görev yanıtı beklenen biçimde değil.";
  assert.throws(() => readArrayPayload({}, "tasks", message), message);
  assert.throws(() => readArrayPayload({ tasks: null }, "tasks", message), message);
  assert.throws(() => readArrayPayload({ tasks: {} }, "tasks", message), message);
});
