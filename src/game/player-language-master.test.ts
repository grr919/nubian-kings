import { describe, expect, it } from "vitest";
import { masterActionLanguage, masterMultiplayerOutcomeText, masterRoundOutcomeText } from "./player-language";

describe("Master comparison wording", () => {
  it("uses battle, conversion, and support terms for the corresponding statistic", () => {
    expect(masterActionLanguage("strength").noun).toBe("attack");
    expect(masterActionLanguage("zeal").verb).toBe("try to convert");
    expect(masterActionLanguage("wealth").verb).toBe("seek support from");
    expect(masterActionLanguage("zeal").title).toContain("Conversion");
    expect(masterActionLanguage("wealth").title).toContain("Support");
  });

  it("describes tied Master comparisons without calling them battles", () => {
    expect(masterRoundOutcomeText([], undefined, [], "zeal", true)).toBe("The conversion attempt ends without a victor.");
    expect(masterMultiplayerOutcomeText("wealth", undefined, [], "viewer", undefined, true)).toBe("The bid for support ends without a victor.");
  });
});
