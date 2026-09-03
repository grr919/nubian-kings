import { describe, expect, it } from "vitest";
import { humanMayEndEliminatedGame } from "./elimination";

describe("eliminated human game choice", () => {
  it("is offered while computer play continues", () => {
    expect(humanMayEndEliminatedGame({
      phase: "attack",
      players: [
        { controller: "human", eliminated: true },
        { controller: "npc", eliminated: false },
        { controller: "npc", eliminated: false },
      ],
    })).toBe(true);
  });

  it("is not offered before elimination or after game completion", () => {
    expect(humanMayEndEliminatedGame({ phase: "attack", players: [{ controller: "human", eliminated: false }] })).toBe(false);
    expect(humanMayEndEliminatedGame({ phase: "complete", players: [{ controller: "human", eliminated: true }] })).toBe(false);
  });
});
