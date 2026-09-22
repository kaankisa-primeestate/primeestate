import { test } from "node:test";

const assert = {
  equal<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) throw new Error(message ?? `${String(actual)} !== ${String(expected)}`);
  },
};

const { buildShowingConfirmationMessage, showingNextAction } = await import("../src/core/prime-showing");

test("Prime builds a Turkish showing confirmation message", () => {
  const date = new Date("2026-09-24T14:30:00+03:00");
  const message = buildShowingConfirmationMessage({ customerName: "Ayşe Hanım", listingTitle: "Kadıköy 3+1 Daire", dateTime: date });
  if (!message.includes("Ayşe Hanım")) throw new Error("customer name missing");
  if (!message.includes("Kadıköy 3+1 Daire")) throw new Error("listing title missing");
  if (!message.includes("gösterimimizi")) throw new Error("showing wording missing");
});

test("Prime schedules showing confirmation for the reminder time", () => {
  const reminder = new Date("2026-09-23T14:30:00+03:00");
  const result = showingNextAction(reminder);
  assert.equal(result.label, "Gösterim teyidini al");
  assert.equal(result.nextActionAt.getTime(), reminder.getTime());
});
