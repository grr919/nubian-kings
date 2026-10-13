import { expect, it } from "vitest";
import { conflictStatisticPrompt, openingWarText } from "./player-language";

it("calls only the opening move the first conflict", () => {
  expect(conflictStatisticPrompt(1)).toBe("Which statistic will resolve the first conflict?");
  expect(conflictStatisticPrompt(2)).toBe("Which statistic will resolve the next conflict?");
});

it("names every participating civilization in the war announcement", () => {
  const players = ["nubian-christians", "egyptian-christians", "ethiopian-jews"].map(factionId => ({ factionId }));
  expect(openingWarText(players)).toBe("Open war has broken out between the Nubian Christians, Egyptian Christians, and Ethiopian Jews.");
  expect(openingWarText(players.slice(0, 2))).toBe("Open war has broken out between the Nubian Christians and Egyptian Christians.");
});
