import { describe, expect, it } from "vitest";
import { activateMasterArmyEffect, activateMasterClockBackward, activateMasterClockForward, activateMasterRandomDiscard, activateMasterSupport, applyMasterNileFlood, availableMasterGuarantees, availableMasterSupporters, beginMasterEffectComparison, chooseMasterNpcArmyEffect, chooseMasterNpcEffect, createMasterMercenaryReserve, eligibleMasterEliminationTargets, eliminateWithMasterEffect, finishMasterEffectComparison, interruptMasterComparison, passMasterEffectOpportunity, recordMasterTurnBoundary, spendMasterGuarantee, type MasterCard, type MasterPlayer, type MasterState } from "./master";
import { createRandomState, randomSource } from "./random";

function card(id: string, number: number, strength: number, zeal = strength, face: MasterCard["face"] = "up"): MasterCard {
  return { id, definitionId: id, name: id, artFile: `${number} card.jpg`, factionId: "nubian-christians", type: id.startsWith("heir-") ? "leader" : "person", strength, zeal, wealth: 0, face };
}
function game(attacker: MasterCard, defender: MasterCard, support: MasterCard[] = []): MasterState {
  const players: MasterPlayer[] = [attacker, defender].map((item, index) => ({ id: index ? "defender" : "attacker", factionId: "nubian-christians", controller: "human", army: [{ id: index ? "d" : "a", cards: [item] }, ...(!index ? support.map((c) => ({ id: c.id, cards: [c] })) : [])], heir: card(`heir-${index}`, 0, 4), unused: [], discard: [], eliminated: false }));
  return { version: 1, mode: "master", players, activePlayerIndex: 0, phase: "attack", nileFloods: false, victoryMode: "standard", effectsMode: "on", round: 1, random: createRandomState("EFFECTS") };
}
const attack = { attackerUnitId: "a", targetPlayerId: "defender", targetUnitId: "d", stat: "strength" as const };

describe("paused Master comparisons", () => {
  it.each(["strength", "zeal", "wealth"] as const)("limits Moses Giyorgios’s defense guarantee in %s conflicts", (stat) => {
    const state = game({ ...card("a1", 0, 5), wealth: 5 }, { ...card("d1", 0, 1), wealth: 1 });
    const moses = card("moses", 4, 4);
    state.players[1].army.push({ id: "moses-support", cards: [moses] });
    beginMasterEffectComparison(state, { ...attack, stat });
    passMasterEffectOpportunity(state, "attacker");
    expect(availableMasterGuarantees(state, "defender").map(c => c.id)).toEqual(stat === "strength" ? ["moses"] : []);
    if (stat !== "strength") {
      expect(() => spendMasterGuarantee(state, "defender", "moses")).toThrow("unavailable");
      expect(moses.effectSpent).not.toBe(true);
      state.players[1].controller = "npc";
      expect(chooseMasterNpcEffect(state)).not.toEqual({ kind: "guarantee", cardId: "moses" });
    }
  });

  it("reveals both formations, accepts a previously revealed optional guarantee after a tie, and spends it", () => {
    const source = card("queen", 166, 1);
    const state = game(card("a1", 0, 3, 3, "down"), card("d1", 0, 3, 3, "down"), [source]);
    const pending = beginMasterEffectComparison(state, attack);
    expect(state.phase).toBe("effects");
    expect(state.players[0].army[0].cards[0].face).toBe("up");
    expect(pending.scores).toEqual([3, 3]);
    expect(availableMasterGuarantees(state, "attacker").map((c) => c.id)).toEqual(["queen"]);
    spendMasterGuarantee(state, "attacker", "queen");
    expect(source.effectSpent).toBe(true);
    passMasterEffectOpportunity(state, "defender");
    passMasterEffectOpportunity(state, "attacker");
    finishMasterEffectComparison(state);
    expect(state.players[1].discard.map((c) => c.id)).toEqual(["d1"]);
  });

  it("does not allow a guarantee first revealed by this comparison to affect it", () => {
    const source = card("queen", 166, 1, 1, "down");
    const state = game(source, card("d1", 0, 3));
    beginMasterEffectComparison(state, attack);
    expect(availableMasterGuarantees(state, "attacker")).toEqual([]);
  });

  it("lets a defender counter an opposing guarantee and restores the original result", () => {
    const state = game(card("a1", 0, 2), card("d1", 0, 3), [card("queen", 166, 1)]);
    state.players[1].army.push({ id: "support", cards: [card("defense", 2, 1)] });
    beginMasterEffectComparison(state, attack);
    spendMasterGuarantee(state, "attacker", "queen");
    expect(availableMasterGuarantees(state, "defender").map((source) => source.id)).toContain("defense");
    spendMasterGuarantee(state, "defender", "defense");
    passMasterEffectOpportunity(state, "attacker");
    passMasterEffectOpportunity(state, "defender");
    finishMasterEffectComparison(state);
    expect(state.players[0].discard.map((source) => source.id)).toEqual(["a1"]);
  });

  it("shows the initial result before Flood dice and only then opens guarantees", () => {
    const state = game(card("a1", 0, 2), card("d1", 0, 4), [card("queen", 166, 1)]);
    state.nileFloods = true;
    const pending = beginMasterEffectComparison(state, attack);
    expect(pending.scores).toEqual([2, 4]);
    expect(pending.dice).toEqual([0, 0]);
    expect(availableMasterGuarantees(state, "attacker")).toEqual([]);
    expect(() => spendMasterGuarantee(state, "attacker", "queen")).toThrow();
    applyMasterNileFlood(state, "attacker");
    expect(pending.dice.every((die) => die >= 1 && die <= 6)).toBe(true);
    expect(pending.floodPending).toBe(false);
  });

  it("lets a computer spend its eligible guarantee when losing", () => {
    const state = game(card("a1", 0, 3), card("d1", 0, 2));
    state.players[1].controller = "npc";
    state.players[1].army.push({ id: "support", cards: [card("defense", 2, 1)] });
    beginMasterEffectComparison(state, attack);
    passMasterEffectOpportunity(state, "attacker");
    expect(chooseMasterNpcEffect(state)).toEqual({ kind: "guarantee", cardId: "defense" });
  });

  it("gives conversion immunity priority after a hidden defender is revealed", () => {
    const attacker = card("a1", 0, 5, 9);
    const defender = card("d1", 173, 1, 1, "down");
    defender.effectText = "Immune to conversion.";
    const state = game(attacker, defender);
    expect(beginMasterEffectComparison(state, { ...attack, stat: "zeal" }).cancelled).toBe(true);
    const events = finishMasterEffectComparison(state);
    expect(events).toContainEqual({ type: "cancelled", reason: "immunity" });
    expect(state.players[1].army).toHaveLength(1);
    expect(state.round).toBe(2);
  });

  it("excludes an already revealed conversion-immune target", () => {
    const defender = card("d1", 173, 1);
    defender.effectText = "Immune to conversion.";
    const state = game(card("a1", 0, 2), defender);
    expect(() => beginMasterEffectComparison(state, { ...attack, stat: "zeal" })).toThrow(/Illegal comparison/);
    expect(state.phase).toBe("attack");
  });

  it("lets a newly revealed interrupt cancel an attempt without discarding either side", () => {
    const source = card("bishop", 16, 9, 9, "down"), state = game(source, card("d1", 0, 1));
    beginMasterEffectComparison(state, { ...attack, stat: "zeal" });
    const events = interruptMasterComparison(state, "attacker", source.id);
    expect(events).toContainEqual({ type: "cancelled", reason: "interrupt" });
    expect(state.players[0].army).toHaveLength(1);
    expect(state.players[1].army).toHaveLength(1);
    expect(state.phase).toBe("attack");
    expect(source.effectSpent).toBe(false);
  });

  it("recruits into a legal attacking pile during a comparison without counting Strength twice", () => {
    const place = card("a1", 0, 3), recruiter = card("recruiter", 10, 1), merc = card("merc", 190, 4);
    place.type = "place";
    merc.mercenary = true;
    const state = game(place, card("d1", 0, 2), [recruiter]);
    state.mercenaryReserve = [merc];
    expect(beginMasterEffectComparison(state, attack).scores[0]).toBe(3);
    expect(activateMasterArmyEffect(state, "attacker", recruiter.id, "a")).toBe("deployed");
    expect(state.pendingEffectComparison!.scores[0]).toBe(7);
    expect(state.pendingEffectComparison!.attackerCards.map((item) => item.id)).toEqual(["a1", "merc"]);
  });

  it("lets a timed elimination remove a revealed comparison participant and awards the other side the win", () => {
    const source = card("post", 183, 1), state = game(card("a1", 0, 2), card("d1", 0, 8), [source]);
    beginMasterEffectComparison(state, attack);
    expect(eligibleMasterEliminationTargets(state, "attacker", source.id).map((item) => item.card.id)).toContain("d1");
    eliminateWithMasterEffect(state, "attacker", source.id, "defender", "d1");
    expect(source.effectSpent).toBe(true);
    passMasterEffectOpportunity(state, "defender");
    passMasterEffectOpportunity(state, "attacker");
    finishMasterEffectComparison(state);
    expect(state.players[1].discard.map((item) => item.id)).toEqual(["d1"]);
    expect(state.players[0].discard).toHaveLength(0);
  });

  it("never offers a protected heir while that player's army remains", () => {
    const source = card("post", 183, 1), state = game(card("a1", 0, 2), card("d1", 0, 8), [source]);
    beginMasterEffectComparison(state, attack);
    expect(eligibleMasterEliminationTargets(state, "attacker", source.id).map((item) => item.card.id)).not.toContain("heir-1");
  });

  it("adds a deployed person's effective Strength once and does not put the supporter at risk", () => {
    const source = card("infantry", 14, 1), supporter = card("supporter", 0, 7);
    const state = game(card("a1", 0, 2), card("d1", 0, 3), [source, supporter]);
    beginMasterEffectComparison(state, attack);
    expect(availableMasterSupporters(state, "attacker", source.id).map((item) => item.id)).toEqual(["heir-0", "supporter"]);
    activateMasterSupport(state, "attacker", source.id, supporter.id, "defender");
    expect(state.pendingEffectComparison!.scores).toEqual([2, 10]);
    expect(source.effectSpent).toBe(true);
    expect(state.players[0].army.flatMap((pile) => pile.cards).map((item) => item.id)).toContain("supporter");
  });
});

describe("one-time army effects", () => {
  it("allows a computer to recruit before declaring its attack", () => {
    const state = game(card("recruiter", 10, 1), card("d1", 0, 1));
    state.players[0].controller = "npc";
    state.mercenaryReserve = createMasterMercenaryReserve();
    expect(chooseMasterNpcArmyEffect(state)).toEqual({ kind: "army", cardId: "recruiter" });
  });
  it("leaves recruitment available when the shared reserve is empty, then deploys a random face-up mercenary", () => {
    const source = card("recruiter", 10, 1), state = game(source, card("d1", 0, 1));
    state.mercenaryReserve = [];
    expect(activateMasterArmyEffect(state, "attacker", source.id)).toBe("reserve-empty");
    expect(source.effectSpent).toBeUndefined();
    state.mercenaryReserve = createMasterMercenaryReserve();
    expect(activateMasterArmyEffect(state, "attacker", source.id)).toBe("deployed");
    expect(state.mercenaryReserve).toHaveLength(31);
    expect(state.players[0].army.flatMap((pile) => pile.cards).find((card) => card.mercenary)?.face).toBe("up");
    expect(() => activateMasterArmyEffect(state, "attacker", source.id)).toThrow(/unavailable/);
  });

  it("permanently raises army cap and draws only up to the new cap", () => {
    const source = card("flood", 75, 1), state = game(source, card("d1", 0, 1));
    state.players[0].armyLimit = 1;
    state.players[0].unused = [card("unused-1", 0, 1, 1, "down"), card("unused-2", 0, 1, 1, "down")];
    expect(activateMasterArmyEffect(state, "attacker", source.id)).toBe("drawn");
    expect(state.players[0].armyLimit).toBe(2);
    expect(state.players[0].army.flatMap((pile) => pile.cards)).toHaveLength(2);
    expect(state.players[0].unused).toHaveLength(1);
    expect(source.effectSpent).toBe(true);
  });

  it("spends a recovery effect with no legal card in the discard pile", () => {
    const source = card("recovery", 8, 1), state = game(source, card("d1", 0, 1));
    expect(activateMasterArmyEffect(state, "attacker", source.id)).toBe("no-result");
    expect(source.effectSpent).toBe(true);
  });

  it("recovers a place into a legal pile in Place–Person order", () => {
    const source = card("recovery", 8, 1), place = card("restored", 0, 2), state = game(source, card("d1", 0, 1));
    place.type = "place";
    state.players[0].discard.push(place);
    expect(activateMasterArmyEffect(state, "attacker", source.id, "a")).toBe("recovered");
    expect(state.players[0].army[0].cards.map((item) => item.id)).toEqual(["restored", "recovery"]);
  });

  it("randomly discards only a face-down army card and leaves the heir alone", () => {
    const source = card("raider", 92, 1), state = game(source, card("hidden", 0, 1, 1, "down"));
    state.players[1].army.push({ id: "visible", cards: [card("visible", 0, 1)] });
    expect(activateMasterRandomDiscard(state, "attacker", source.id, "defender")?.id).toBe("hidden");
    expect(state.players[1].discard.map((item) => item.id)).toEqual(["hidden"]);
    expect(state.players[1].army.flatMap((pile) => pile.cards).map((item) => item.id)).toEqual(["visible"]);
    expect(state.players[1].heir.id).toBe("heir-1");
  });
});

describe("clock effects", () => {
  it("grants the same player a complete next turn", () => {
    const source = card("advance", 3, 2), state = game(source, card("d1", 0, 2));
    recordMasterTurnBoundary(state);
    activateMasterClockForward(state, "attacker", source.id);
    beginMasterEffectComparison(state, attack);
    passMasterEffectOpportunity(state, "attacker");
    passMasterEffectOpportunity(state, "defender");
    finishMasterEffectComparison(state);
    expect(state.players[state.activePlayerIndex].id).toBe("attacker");
    expect(state.round).toBe(2);
    expect(source.effectSpent).toBe(true);
  });

  it("rewinds the prior boundary, restores hidden cards and spent actions, and keeps random progress", () => {
    const retreat = card("retreat", 1, 2), hidden = card("hidden", 0, 2, 2, "down");
    const state = game(hidden, retreat);
    recordMasterTurnBoundary(state);
    state.activePlayerIndex = 1;
    state.round = 2;
    recordMasterTurnBoundary(state);
    state.players[0].army[0].cards[0].face = "up";
    state.players[0].army[0].cards[0].effectSpent = true;
    randomSource(state.random)();
    const calls = state.random.calls;
    activateMasterClockBackward(state, "defender", retreat.id);
    expect(state.round).toBe(1);
    expect(state.players[0].army[0].cards[0].face).toBe("down");
    expect(state.players[0].army[0].cards[0].effectSpent).toBeUndefined();
    expect(state.players[1].army[0].cards[0].effectSpent).toBe(true);
    expect(state.random.calls).toBe(calls);
  });
});
