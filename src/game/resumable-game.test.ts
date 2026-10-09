import { describe, expect, it } from "vitest";
import { canResumeGame } from "./resumable-game";
import { parseGame, serializeGame } from "./save";
import { parseAmateurGame, serializeAmateurGame } from "./amateur-save";
import { parseMasterGame, serializeMasterGame } from "./master-save";
import { createRandomState } from "./random";
import type { BeginnerState } from "./types";
import type { AmateurState } from "./amateur";
import type { MasterState } from "./master";

describe("saved-game continuation", () => {
  it.each(["Beginner", "Amateur", "Master"])("rejects old completed %s saves and retains active saves", level => {
    const common = { players: [], round: 1, nileFloods: false, random: createRandomState("CONTINUE") };
    const state = level === "Beginner" ? { ...common, version: 2, selectorIndex: 0, phase: "select" } : { ...common, version: 1, mode: level.toLowerCase(), activePlayerIndex: 0, phase: "attack", victoryMode: "standard" };
    const restore = (value: typeof state) => level === "Beginner" ? parseGame(serializeGame(value as BeginnerState)) : level === "Amateur" ? parseAmateurGame(serializeAmateurGame(value as AmateurState)) : parseMasterGame(serializeMasterGame(value as MasterState));
    expect(canResumeGame(restore(state))).toBe(true);
    expect(canResumeGame(restore({ ...state, phase: "complete" }))).toBe(false);
    expect(canResumeGame({ ...restore(state)!, winnerId: "winner" })).toBe(false);
  });
  it("rejects missing saves while keeping tie, effect, replenishment, and opening pauses resumable", () => {
    expect(canResumeGame(undefined)).toBe(false);
    for (const phase of ["tie", "effects", "replenish", "attack"]) expect(canResumeGame({ phase })).toBe(true);
  });
});
