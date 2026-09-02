import { describe, expect, it } from "vitest";
import { amateurEventText, beginnerEventText } from "../game/player-language";
import type { AmateurEvent, AmateurState } from "../game/amateur";
import type { BeginnerState, GameEvent } from "../game/types";

const amateurState = {
  players: [
    { id: "human", controller: "human", factionId: "nubian-christians" },
    { id: "npc", controller: "npc", factionId: "egyptian-christians" },
  ],
} as AmateurState;

describe("player-facing grammar", () => {
  it("uses second-person Amateur possessives and verbs for the human player", () => {
    const events: AmateurEvent[] = [
      { type: "defeated", playerId: "human", cardId: "card", heir: false },
      { type: "player-eliminated", playerId: "human" },
      { type: "turn-advanced", playerId: "human" },
    ];
    expect(events.map((event) => amateurEventText(event, amateurState))).toEqual([
      "Your card was defeated.",
      "Your heir was eliminated.",
      "You begin the next turn.",
    ]);
  });

  it("retains third-person Amateur grammar for computer factions", () => {
    const events: AmateurEvent[] = [
      { type: "defeated", playerId: "npc", cardId: "card", heir: false },
      { type: "turn-advanced", playerId: "npc" },
    ];
    expect(events.map((event) => amateurEventText(event, amateurState))).toEqual([
      "Egyptian Christians' card was defeated.",
      "Egyptian Christians begins the next turn.",
    ]);
  });

  it("uses 'were' when the Beginner human player is eliminated", () => {
    const state = { players: [{ id: "human", controller: "human", factionId: "nubian-christians" }] } as BeginnerState;
    const event: GameEvent = { type: "player-eliminated", playerId: "human" };
    expect(beginnerEventText(event, state)).toBe("You were eliminated.");
  });
});
