import { expect, it } from "vitest";
import { createBeginnerGame } from "./setup";

it("creates unique factions and five hidden cards per participant", () => {
  const state = createBeginnerGame({ humanFaction: "nubian-christians", npcCount: 4, nileFloods: false, seed: "SETUP-ONE" });
  expect(state.players).toHaveLength(5);
  expect(new Set(state.players.map((player) => player.factionId)).size).toBe(5);
  expect(state.players.every((player) => player.cards.length === 5 && player.cards.every((card) => card.face === "down"))).toBe(true);
});

it("can give the human player the opening initiative", () => {
  const state = createBeginnerGame({ humanFaction: "nubian-christians", npcCount: 3, nileFloods: false, seed: "HUMAN-FIRST", openingPlayer: "human" });
  expect(state.selectorIndex).toBe(0);
  expect(state.players[state.selectorIndex].controller).toBe("human");
});

it("can give a computer opponent the opening initiative", () => {
  const state = createBeginnerGame({ humanFaction: "nubian-christians", npcCount: 3, nileFloods: false, seed: "NPC-FIRST", openingPlayer: "npc" });
  expect(state.selectorIndex).toBeGreaterThan(0);
  expect(state.players[state.selectorIndex].controller).toBe("npc");
});

it("uses the seed for random opponent count and opening initiative", () => {
  const make = () => createBeginnerGame({ humanFaction: "egyptian-christians", nileFloods: true, seed: "COMPLETE-RANDOM-SETUP" });
  expect(make()).toEqual(make());
});

it("supports a deterministic tester override", () => {
  const make = () => createBeginnerGame({ humanFaction: "egyptian-christians", npcCount: 2, nileFloods: true, seed: "TESTER-OVERRIDE", firstPlayerIndex: 1 });
  expect(make()).toEqual(make());
  expect(make().selectorIndex).toBe(1);
});

it("rejects invalid NPC counts", () => expect(() => createBeginnerGame({ humanFaction: "ethiopian-jews", npcCount: 0, nileFloods: false, seed: "INVALID" })).toThrow());
