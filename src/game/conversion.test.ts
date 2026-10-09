import { describe, expect, it } from "vitest";
import { canConvertCivilization } from "./conversion";
import { legalTargets, resolveAmateurAttack, chooseNpcAttack, type AmateurState } from "./amateur";
import { legalMasterTargets, resolveMasterAttack, beginMasterEffectComparison, chooseMasterNpcAttack, type MasterState } from "./master";
import { createRandomState } from "./random";
const factions = ["nubian-christians", "egyptian-christians", "ethiopian-christians", "egyptian-muslims", "ethiopian-jews"];
function fixture(level: "amateur" | "master", attackerFaction: string, targetFaction: string, effectsMode: "on" | "off" = "off") {
  const players = [attackerFaction, targetFaction].map((factionId, index) => {
    const card = { id: `card${index}`, definitionId: `card${index}`, name: "Person", factionId, type: "person" as const, face: "up" as const, strength: 2, zeal: 50, wealth: 3 };
    return { id: `p${index}`, factionId, controller: "npc" as const, army: level === "amateur" ? [card] : [{ id: `pile${index}`, cards: [card] }], heir: { ...card, id: `heir${index}`, type: "leader" as const }, unused: [], discard: [], eliminated: false };
  });
  return { version: 1, mode: level, players, activePlayerIndex: 0, phase: "attack", nileFloods: false, victoryMode: "standard", round: 1, effectsMode, random: createRandomState("CONVERSION") };
}
describe("religious conversion targeting", () => {
  it("permits Zeal only between different religions across all five civilizations", () => {
    for (const a of factions) for (const b of factions) {
      const expected = a.endsWith("-christians") && b.endsWith("-christians") ? false : a !== b;
      expect(canConvertCivilization(a, b)).toBe(expected);
      const amateur = fixture("amateur", a, b) as AmateurState;
      expect(legalTargets(amateur, "p1", "zeal").length > 0).toBe(expected);
      for (const effects of ["on", "off"] as const) expect(legalMasterTargets(fixture("master", a, b, effects) as MasterState, "p1", "zeal").length > 0).toBe(expected);
    }
  });
  it("rejects same-religion conversions in all engines and NPC choices while keeping Strength and Wealth legal", () => {
    const amateur = fixture("amateur", factions[0], factions[1]) as AmateurState;
    expect(() => resolveAmateurAttack(amateur, { attackerId: "card0", targetPlayerId: "p1", targetId: "card1", stat: "zeal" })).toThrow("Illegal target");
    expect(chooseNpcAttack(amateur).stat).not.toBe("zeal");
    for (const stat of ["strength", "wealth"] as const) expect(legalTargets(amateur, "p1", stat)).toHaveLength(1);
    for (const effectsMode of ["on", "off"] as const) {
      const master = fixture("master", factions[0], factions[2], effectsMode) as MasterState;
      const action = { attackerUnitId: "pile0", targetPlayerId: "p1", targetUnitId: "pile1", stat: "zeal" as const };
      expect(() => effectsMode === "on" ? beginMasterEffectComparison(master, action) : resolveMasterAttack(master, action)).toThrow();
      expect(chooseMasterNpcAttack(master).stat).not.toBe("zeal");
      for (const stat of ["strength", "wealth"] as const) expect(legalMasterTargets(master, "p1", stat)).toHaveLength(1);
    }
  });
});
