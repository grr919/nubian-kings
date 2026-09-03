import { describe, expect, it } from "vitest";
import { feedbackEmailText, sanitizeFeedback } from "./feedback";

describe("feedback privacy", () => {
  it("keeps only approved diagnostics and ignores hidden game data", () => {
    const feedback = sanitizeFeedback({
      category: "Gameplay bug",
      description: "The turn did not advance after combat.",
      diagnostics: {
        level: "Amateur", seed: "SAFE-SEED", round: 4, phase: "attack", humanFaction: "Nubian Christians",
        npcCount: 2, nileFloods: true, victoryMode: "long", recentHistory: ["Public event"],
        browser: "Test Browser", viewport: "1024×768", hiddenCards: ["secret-card"], reserveOrder: ["secret-reserve"],
      },
      savedGame: "secret-save",
    });
    const message = feedbackEmailText(feedback);
    expect(message).toContain("SAFE-SEED");
    expect(message).not.toContain("secret-card");
    expect(message).not.toContain("secret-reserve");
    expect(message).not.toContain("secret-save");
  });

  it("supports anonymous reports and validates optional email addresses", () => {
    expect(sanitizeFeedback({ category: "Rules", description: "This rule needs clarification." }).contactEmail).toBeUndefined();
    expect(() => sanitizeFeedback({ category: "Rules", description: "This rule needs clarification.", contactEmail: "invalid" })).toThrow("valid email");
  });
});
