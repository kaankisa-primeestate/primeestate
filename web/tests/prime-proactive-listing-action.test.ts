import { describe, expect, it } from "vitest";
import { deriveNextAction } from "@/core/prime-next-action";

describe("Prime proactive listing action", () => {
  it("records a portfolio-sharing follow-up as a next action", () => {
    expect(deriveNextAction("Portföyü beğendi, gösterim için uygun.", "WHATSAPP")).toMatchObject({
      action: "showing",
      dueInHours: 12,
      relationshipDelta: 8,
    });
  });

  it("keeps a no-response outcome in reconnect flow", () => {
    expect(deriveNextAction("Ulaşamadım, sonra tekrar ara.", "ARAMA")).toMatchObject({
      action: "reconnect",
      dueInHours: 24,
      relationshipDelta: 0,
    });
  });
});
