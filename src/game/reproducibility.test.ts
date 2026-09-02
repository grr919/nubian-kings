import { describe, expect, it } from "vitest";
import { playComparison } from "./beginner";
import { chooseNpcStat } from "./npc";
import { randomSource } from "./random";
import { createBeginnerGame } from "./setup";
import type { GameEvent } from "./types";

function playSeed(seed: string) {
  const state = createBeginnerGame({ humanFaction: "nubian-christians", npcCount: 4, nileFloods: true, seed });
  const events: GameEvent[] = [];
  for (let guard = 0; state.phase !== "complete" && guard < 250; guard++) {
    const stat = chooseNpcStat({ strength: 5, zeal: 4, wealth: 3 }, undefined, randomSource(state.random));
    events.push(...playComparison(state, stat));
  }
  if (state.phase !== "complete") throw new Error(`Seed ${seed} did not complete`);
  return { state, events };
}

describe("seeded complete games", () => {
  it("replays an entire game identically", () => expect(playSeed("FULL-GAME-REPLAY")).toEqual(playSeed("FULL-GAME-REPLAY")));

  it("completes a broad deterministic seed sample", () => {
    for (let index = 0; index < 500; index++) expect(playSeed(`GAME-${index}`).state.winnerId).toBeTruthy();
  });
});
