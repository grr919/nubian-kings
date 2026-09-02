import { expect, it } from "vitest";
import { playComparison } from "./beginner";
import { chooseNpcStat } from "./npc";
import { createRandomState, randomSource } from "./random";
import { parseGame, serializeGame } from "./save";
import { createBeginnerGame } from "./setup";
import type { BeginnerState } from "./types";

it("round-trips versioned game state and random position", () => {
  const state = { version: 2, players: [], selectorIndex: 0, phase: "select", nileFloods: false, round: 1, random: createRandomState("SAVE-TEST") } as BeginnerState;
  expect(parseGame(serializeGame(state))).toEqual(state);
});

it("migrates a version 1 game to deterministic version 2 state", () => {
  const saved = '{"version":1,"players":[],"selectorIndex":0,"phase":"select","nileFloods":false,"round":1}';
  const first = parseGame(saved);
  const second = parseGame(saved);
  expect(first?.version).toBe(2);
  expect(first?.random).toEqual(second?.random);
  expect(first?.random.seed).toMatch(/^NK-LEGACY-/);
});

it("continues the exact random sequence after saving and restoring", () => {
  const uninterrupted = createBeginnerGame({ humanFaction: "nubian-christians", npcCount: 2, nileFloods: true, seed: "RESUME-EXACTLY", firstPlayerIndex: 0 });
  const restored = parseGame(serializeGame(uninterrupted))!;
  const uninterruptedEvents = playComparison(uninterrupted, "strength");
  const restoredEvents = playComparison(restored, "strength");
  expect(restoredEvents).toEqual(uninterruptedEvents);
  expect(restored).toEqual(uninterrupted);
});

it("saves an NPC choice together with the advanced random position", () => {
  const state = createBeginnerGame({ humanFaction: "nubian-christians", npcCount: 1, nileFloods: false, seed: "NPC-PENDING", firstPlayerIndex: 1 });
  const callsBefore = state.random.calls;
  state.pendingNpcChoice = { playerId: "npc-1", stat: chooseNpcStat({ strength: 5, zeal: 3, wealth: 2 }, undefined, randomSource(state.random)) };
  const restored = parseGame(serializeGame(state))!;
  expect(restored.pendingNpcChoice).toEqual(state.pendingNpcChoice);
  expect(restored.random.calls).toBe(callsBefore + 1);
  expect(randomSource(restored.random)()).toBe(randomSource(state.random)());
});

it("rejects corrupt and incompatible saves", () => {
  expect(parseGame("bad")).toBeUndefined();
  expect(parseGame('{"version":3,"players":[],"selectorIndex":0}')).toBeUndefined();
});
