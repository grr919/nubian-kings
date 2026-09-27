import { describe, expect, it } from "vitest";
import { comparisonActionText, declaredActionText, factionActor, factionForces, masterActionLanguage, masterMultiplayerOutcomeText, masterRoundOutcomeText } from "./player-language";

describe("Master comparison wording", () => {
  it("uses attack, conversion, and influence terms for the corresponding statistic", () => {
    expect(masterActionLanguage("strength").noun).toBe("attack");
    expect(masterActionLanguage("zeal").verb).toBe("attempt to convert");
    expect(masterActionLanguage("wealth").verb).toBe("attempt to influence");
    expect(declaredActionText("strength")).toBe("Attack declared.");
    expect(declaredActionText("zeal")).toBe("Conversion attempt declared.");
    expect(declaredActionText("wealth")).toBe("Attempt to influence with wealth declared.");
  });

  it("uses the approved action sentence for each statistic", () => {
    expect(comparisonActionText("strength", "Saladin", "your forces")).toBe("Saladin attacks your forces.");
    expect(comparisonActionText("zeal", "Saladin", "your forces")).toBe("Saladin attempts to convert some of your forces.");
    expect(comparisonActionText("wealth", "Saladin", "your forces")).toBe("Saladin attempts to influence some of your forces with their wealth.");
    expect(comparisonActionText("wealth", "You", "Saladin's forces")).toBe("You attempt to influence some of Saladin's forces with your wealth.");
    expect(comparisonActionText("strength", "You", factionForces("Ethiopian Christians"))).toBe("You attack the Ethiopian Christian forces.");
    expect(comparisonActionText("zeal", factionActor("Ethiopian Christians"), "your forces", true)).toBe("The Ethiopian Christian forces attempt to convert some of your forces.");
  });

  it("describes tied Master conflicts without using comparison language", () => {
    expect(masterRoundOutcomeText([], undefined, [], "strength", true)).toBe("This battle ends without a victory.");
    expect(masterRoundOutcomeText([], undefined, [], "zeal", true)).toBe("This conversion attempt ends without a victory.");
    expect(masterMultiplayerOutcomeText("wealth", undefined, [], "viewer", undefined, true)).toBe("This attempt to influence the opposing forces ends without a victory.");
  });
});
