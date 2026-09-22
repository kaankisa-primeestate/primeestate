import { test } from "node:test";

const assert = {
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) throw new Error(message ?? `${String(actual)} !== ${String(expected)}`);
  },
};

const { deriveNextAction } = await import("../src/core/prime-next-action");

test("Prime proactive listing action turns positive portfolio feedback into a showing follow-up", () => {
  const result = deriveNextAction("Portföyü beğendi, gösterim için uygun.", "WHATSAPP");
  assert.equal(result.action, "showing");
  assert.equal(result.dueInHours, 12);
  assert.equal(result.relationshipDelta, 8);
});

test("Prime proactive listing action keeps a no-response outcome in reconnect flow", () => {
  const result = deriveNextAction("Ulaşamadım, sonra tekrar ara.", "ARAMA");
  assert.equal(result.action, "reconnect");
  assert.equal(result.dueInHours, 24);
  assert.equal(result.relationshipDelta, 0);
});
