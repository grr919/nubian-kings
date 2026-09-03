import { describe, expect, it } from "vitest";
import { parseMasterGame, serializeMasterGame } from "./master-save";
import { createRandomState } from "./random";
import type { MasterState } from "./master";

describe("Master saves", () => {
  it("round-trips a current Master state and rejects other modes", () => {
    const game: MasterState = { version: 1, mode: "master", players: [], activePlayerIndex: 0, phase: "attack", nileFloods: false, victoryMode: "standard", round: 1, random: createRandomState("SAVE") };
    expect(parseMasterGame(serializeMasterGame(game))).toEqual(game);
    expect(parseMasterGame(JSON.stringify({ ...game, mode: "amateur" }))).toBeUndefined();
  });
});
