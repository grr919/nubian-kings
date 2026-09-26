import { describe, expect, it } from "vitest";
import { createRandomState } from "./random";
import { conversionFormationBonus, effectiveMasterStat, immuneToConversion, intrinsicWealthBonus, targetedAttackBonus } from "./master-effect-rules";
import { designateMasterPriestProtection } from "./master";
import type { MasterCard, MasterPlayer, MasterState } from "./master";

function card(number: number, name: string, type: MasterCard["type"] = "person", face: MasterCard["face"] = "up"): MasterCard {
  return { id: String(number), definitionId: String(number), artFile: `${number} card.jpg`, name, factionId: "nubian-christians", type, strength: 2, zeal: 3, wealth: 4, face };
}
function setup(cards: MasterCard[][], mode: "on" | "off" = "on") {
  const player: MasterPlayer = { id: "p", factionId: "nubian-christians", controller: "human", heir: card(1, "The Ngonnen", "leader"), army: cards.map((items, index) => ({ id: String(index), cards: items })), unused: [], discard: [], eliminated: false };
  const state: MasterState = { version: 1, mode: "master", players: [player], activePlayerIndex: 0, phase: "attack", nileFloods: false, victoryMode: "standard", effectsMode: mode, round: 1, random: createRandomState("BONUSES") };
  return { player, state };
}

describe("Master card bonuses", () => {
  it("requires a revealed place inside the same pile and recalculates on movement", () => {
    const farmer = card(21, "A Farmer"), land = card(36, "Flood Plain", "place");
    const { player, state } = setup([[land, farmer]]);
    expect(effectiveMasterStat(state, player, farmer, "wealth")).toBe(6);
    player.army[0].cards = [farmer];
    player.army.push({ id: "separate", cards: [land] });
    expect(effectiveMasterStat(state, player, farmer, "wealth")).toBe(4);
    land.face = "down";
    expect(intrinsicWealthBonus(player, land)).toBe(0);
  });

  it("counts only revealed deployed cards for anywhere-under-control conditions", () => {
    const mine = card(24, "Emerald Mine", "place"), caravan = card(23, "Camel Caravan", "person", "down");
    const { player, state } = setup([[mine], [caravan]]);
    expect(effectiveMasterStat(state, player, mine, "wealth")).toBe(4);
    caravan.face = "up";
    expect(effectiveMasterStat(state, player, mine, "wealth")).toBe(6);
    state.effectsMode = "off";
    expect(effectiveMasterStat(state, player, mine, "wealth")).toBe(4);
  });

  it("stacks independent auras while their sources remain revealed", () => {
    const caravan = card(23, "Camel Caravan"), town = card(29, "Meinarti", "place"), post = card(10, "The Telones");
    const { player, state } = setup([[caravan], [town], [post]]);
    expect(effectiveMasterStat(state, player, caravan, "wealth")).toBe(5);
    expect(effectiveMasterStat(state, player, town, "wealth")).toBe(5);
    post.face = "down";
    expect(effectiveMasterStat(state, player, town, "wealth")).toBe(4);
  });

  it("applies a castle to Strength defense and conversion support once per source", () => {
    const castle = card(25, "Castle", "place"), guard = card(0, "Guard"), gospel = card(48, "a Nubian Gospel", "thing");
    const { player, state } = setup([[castle, guard], [gospel]]);
    expect(effectiveMasterStat(state, player, castle, "strength", "defense")).toBe(4);
    expect(effectiveMasterStat(state, player, castle, "strength", "attack")).toBe(2);
    expect(conversionFormationBonus(player, [guard, card(0, "Other")], "attack")).toBe(2);
    gospel.face = "down";
    expect(conversionFormationBonus(player, [guard], "attack")).toBe(0);
  });

  it("makes printed immune cards and current or future Jewish cards under Sacred Geniza immune", () => {
    const priest = card(173, "Kahen"), geniza = card(180, "The Sacred Geniza", "thing");
    const { player, state } = setup([[priest], [geniza]]);
    expect(immuneToConversion(state, player, priest)).toBe(false);
    priest.effectText = "Immune to conversion.";
    expect(immuneToConversion(state, player, priest)).toBe(true);
    const newcomer = card(999, "Jewish Traveler");
    newcomer.factionId = "ethiopian-jews";
    player.army.push({ id: "new", cards: [newcomer] });
    expect(immuneToConversion(state, player, newcomer)).toBe(true);
    geniza.face = "down";
    expect(immuneToConversion(state, player, newcomer)).toBe(false);
  });

  it("fixes the Priest immunity target until that Priest leaves play", () => {
    const priest = card(176, "Beta Israel Priest"), protectedCard = card(0, "Traveler"), other = card(0, "Other");
    protectedCard.id = "traveler";
    other.id = "other";
    const { player, state } = setup([[priest], [protectedCard], [other]]);
    designateMasterPriestProtection(state, player.id, priest.id, protectedCard.id);
    expect(immuneToConversion(state, player, protectedCard)).toBe(true);
    expect(immuneToConversion(state, player, other)).toBe(false);
    expect(() => designateMasterPriestProtection(state, player.id, priest.id, other.id)).toThrow(/unavailable/);
    player.army = player.army.filter((pile) => !pile.cards.some((item) => item.id === priest.id));
    expect(immuneToConversion(state, player, protectedCard)).toBe(false);
  });

  it("adds attack bonuses only against the named faction or place", () => {
    const sal = card(129, "Saladin", "leader"), axum = card(125, "Axum", "place"), farmland = card(0, "Farmland", "place");
    expect(targetedAttackBonus([sal], [axum], "strength")).toBe(3);
    expect(targetedAttackBonus([sal], [farmland], "strength")).toBe(0);
    expect(targetedAttackBonus([sal], [axum], "zeal")).toBe(0);
  });
});
