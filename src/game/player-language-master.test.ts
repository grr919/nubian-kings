import { describe, expect, it } from "vitest";
import { comparisonActionText, masterActionLanguage, masterMultiplayerOutcomeText, masterRoundOutcomeText } from "./player-language";

describe("Master comparison wording", () => {
  it("uses attack, conversion, and influence terms for the corresponding statistic", () => {
    expect(masterActionLanguage("strength").noun).toBe("attack");
    expect(masterActionLanguage("zeal").verb).toBe("attempt to convert");
    expect(masterActionLanguage("wealth").verb).toBe("attempt to influence");
    expect(masterActionLanguage("zeal").title).toBe("Zeal Comparison");
    expect(masterActionLanguage("wealth").title).toBe("Wealth Comparison");
  });

  it("uses the approved action sentence for each statistic", () => {
    expect(comparisonActionText("strength", "Saladin", "your forces")).toBe("Saladin attacks your forces.");
    expect(comparisonActionText("zeal", "Saladin", "your forces")).toBe("Saladin attempts to convert some of your forces.");
    expect(comparisonActionText("wealth", "Saladin", "your forces")).toBe("Saladin attempts to influence some of your forces with their wealth.");
    expect(comparisonActionText("wealth", "You", "Saladin's forces")).toBe("You attempt to influence some of Saladin's forces with your wealth.");
  });

  it("describes tied Master comparisons without calling them battles", () => {
    expect(masterRoundOutcomeText([], undefined, [], "zeal", true)).toBe("The conversion attempt ends without a victor.");
    expect(masterMultiplayerOutcomeText("wealth", undefined, [], "viewer", undefined, true)).toBe("The attempt to influence with wealth ends without a victor.");
  });
});
