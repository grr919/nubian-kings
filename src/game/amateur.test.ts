import { describe, expect, it } from "vitest";
import {
  chooseNpcAttack,
  heirChoices,
  legalAttackers,
  legalTargets,
  prepareAmateurGame,
  replenishFromDiscard,
  replenishFromUnused,
  resolveAmateurAttack,
  resolveNpcReplenishment,
  skipReplenishment,
  startPreparedAmateurGame,
  type AmateurCard,
  type AmateurPlayer,
  type AmateurState,
} from "./amateur";
import { createRandomState } from "./random";

function card(id: string, values: [number, number, number], face: "up" | "down" = "down", type: AmateurCard["type"] = "person"): AmateurCard {
  return {
    id,
    definitionId: id,
    name: id,
    factionId: id.split("-")[0],
    type,
    strength: values[0],
    zeal: values[1],
    wealth: values[2],
    face,
  };
}

function player(id: string, controller: "human" | "npc", army: AmateurCard[], heirValues: [number, number, number] = [5, 5, 5]): AmateurPlayer {
  return {
    id,
    factionId: id,
    controller,
    army,
    heir: card(`${id}-heir`, heirValues, "up", "leader"),
    unused: [],
    discard: [],
    eliminated: false,
  };
}

function state(players: AmateurPlayer[], victoryMode: "standard" | "long" = "standard"): AmateurState {
  return {
    version: 1,
    mode: "amateur",
    players,
    activePlayerIndex: 0,
    phase: "attack",
    nileFloods: false,
    victoryMode,
    round: 1,
    random: createRandomState("AMATEUR-TEST"),
  };
}

describe("Amateur setup", () => {
  it("reserves every Leader for heir selection and deals ten non-Leaders", () => {
    const prepared = prepareAmateurGame({
      humanFaction: "nubian-christians",
      npcCount: 4,
      nileFloods: false,
      seed: "AMATEUR-SETUP",
    });
    expect(prepared.players).toHaveLength(5);
    expect(prepared.players.every((candidate) => candidate.army.length === 10)).toBe(true);
    expect(prepared.players.flatMap((candidate) => candidate.army).every((candidate) => candidate.face === "down")).toBe(true);
    expect(prepared.players.flatMap((candidate) => candidate.army).every((candidate) => candidate.type !== "leader")).toBe(true);
    const choices = heirChoices(prepared);
    expect(choices.map((candidate) => candidate.name).sort()).toEqual([
      "Adama the Eparch",
      "Gourresi the Eparch",
      "Mari",
      "Merkourios",
      "Moses Giyorgios",
      "The Ngonnen",
    ]);
    const game = startPreparedAmateurGame(prepared, choices[0].id);
    expect(game.players.every((candidate) => candidate.heir.face === "up" && candidate.heir.type === "leader")).toBe(true);
    expect(game.players.flatMap((candidate) => candidate.army).every((candidate) => candidate.type !== "leader")).toBe(true);
  });
});

describe("Amateur attacks", () => {
  it("allows the heir to attack only after every army card is gone", () => {
    const human = player("human", "human", [card("human-a", [4, 4, 4])]);
    const game = state([human, player("npc", "npc", [card("npc-a", [3, 3, 3])])]);
    expect(legalAttackers(game).map((candidate) => candidate.id)).toEqual(["human-a"]);
    expect(() => resolveAmateurAttack(game, {
      attackerId: human.heir.id,
      targetPlayerId: "npc",
      targetId: "npc-a",
      stat: "strength",
    })).toThrow("Illegal attacker");
    human.army = [];
    expect(legalAttackers(game).map((candidate) => candidate.id)).toEqual([human.heir.id]);
  });

  it("allows every army position to be targeted and protects an heir behind an army", () => {
    const game = state([
      player("human", "human", [card("human-a", [4, 2, 1])]),
      player("npc", "npc", [card("npc-a", [1, 1, 1]), card("npc-b", [2, 2, 2])]),
    ]);
    expect(legalTargets(game, "npc").map((candidate) => candidate.id)).toEqual(["npc-a", "npc-b"]);
    expect(legalTargets(game, "npc")).not.toContainEqual(game.players[1].heir);
  });

  it("reveals both cards, discards the loser, and offers the winner replenishment", () => {
    const human = player("human", "human", [card("human-a", [6, 1, 1])]);
    human.unused.push(card("human-u", [1, 1, 1]));
    const npc = player("npc", "npc", [card("npc-a", [2, 8, 8])]);
    const game = state([human, npc]);
    const events = resolveAmateurAttack(game, {
      attackerId: "human-a",
      targetPlayerId: "npc",
      targetId: "npc-a",
      stat: "strength",
    });
    expect(human.army[0].face).toBe("up");
    expect(npc.army).toHaveLength(0);
    expect(npc.discard.map((candidate) => candidate.id)).toEqual(["npc-a"]);
    expect(game.phase).toBe("replenish");
    expect(game.pendingReplenishmentPlayerId).toBe("human");
    expect(events.some((event) => event.type === "replenishment-available")).toBe(true);
  });

  it("treats a successful defender as the victorious player for replenishment", () => {
    const human = player("human", "human", [card("human-a", [1, 1, 1])]);
    const npc = player("npc", "npc", [card("npc-a", [8, 1, 1])]);
    npc.discard.push(card("npc-old", [2, 2, 2], "up"));
    const game = state([human, npc]);
    resolveAmateurAttack(game, {
      attackerId: "human-a",
      targetPlayerId: "npc",
      targetId: "npc-a",
      stat: "strength",
    });
    expect(human.discard.map((candidate) => candidate.id)).toEqual(["human-a"]);
    expect(game.phase).toBe("replenish");
    expect(game.pendingReplenishmentPlayerId).toBe("npc");
  });

  it("leaves tied cards face up, defeats neither, and advances the turn", () => {
    const game = state([
      player("human", "human", [card("human-a", [4, 1, 1])]),
      player("npc", "npc", [card("npc-a", [4, 2, 2])]),
    ]);
    const events = resolveAmateurAttack(game, {
      attackerId: "human-a",
      targetPlayerId: "npc",
      targetId: "npc-a",
      stat: "strength",
    });
    expect(game.players[0].army[0].face).toBe("up");
    expect(game.players[1].army[0].face).toBe("up");
    expect(game.players.every((candidate) => candidate.discard.length === 0)).toBe(true);
    expect(game.activePlayerIndex).toBe(1);
    expect(events.some((event) => event.type === "tie")).toBe(true);
  });

  it("immediately loses when an attacking heir is defeated in a standard game", () => {
    const human = player("human", "human", [], [1, 1, 1]);
    const npc = player("npc", "npc", [card("npc-a", [9, 9, 9], "up")]);
    const game = state([human, npc]);
    resolveAmateurAttack(game, {
      attackerId: human.heir.id,
      targetPlayerId: "npc",
      targetId: "npc-a",
      stat: "strength",
    });
    expect(human.eliminated).toBe(true);
    expect(game.phase).toBe("complete");
    expect(game.winnerId).toBe("npc");
  });

  it("permits an exposed heir to be targeted", () => {
    const human = player("human", "human", [card("human-a", [9, 1, 1])]);
    const npc = player("npc", "npc", [], [1, 1, 1]);
    const game = state([human, npc]);
    expect(legalTargets(game, "npc").map((candidate) => candidate.id)).toEqual([npc.heir.id]);
    resolveAmateurAttack(game, {
      attackerId: "human-a",
      targetPlayerId: "npc",
      targetId: npc.heir.id,
      stat: "strength",
    });
    expect(game.winnerId).toBe("human");
  });
});

describe("Amateur replenishment", () => {
  it("restores an openly chosen discard card face down", () => {
    const human = player("human", "human", []);
    human.discard.push(card("human-discard", [3, 3, 3], "up"));
    const game = state([human, player("npc", "npc", [])]);
    game.phase = "replenish";
    game.pendingReplenishmentPlayerId = "human";
    replenishFromDiscard(game, "human-discard");
    expect(human.army.map((candidate) => candidate.id)).toEqual(["human-discard"]);
    expect(human.army[0].face).toBe("down");
    expect(game.activePlayerIndex).toBe(1);
  });

  it("draws the top unused card without exposing its identity in the event", () => {
    const human = player("human", "human", []);
    human.unused.push(card("human-secret", [8, 8, 8]));
    const game = state([human, player("npc", "npc", [])]);
    game.phase = "replenish";
    game.pendingReplenishmentPlayerId = "human";
    const events = replenishFromUnused(game);
    expect(human.army.map((candidate) => candidate.id)).toEqual(["human-secret"]);
    expect(events[0]).toEqual({ type: "replenished", playerId: "human", source: "unused" });
  });

  it("allows replenishment to be skipped and lets an NPC choose a public discard", () => {
    const npc = player("npc", "npc", []);
    npc.discard.push(card("npc-low", [1, 1, 1], "up"), card("npc-high", [7, 7, 7], "up"));
    const game = state([player("human", "human", []), npc]);
    game.activePlayerIndex = 1;
    game.phase = "replenish";
    game.pendingReplenishmentPlayerId = "npc";
    resolveNpcReplenishment(game);
    expect(npc.army.map((candidate) => candidate.id)).toEqual(["npc-high"]);

    game.phase = "replenish";
    game.pendingReplenishmentPlayerId = "human";
    const events = skipReplenishment(game);
    expect(events[0].type).toBe("replenishment-skipped");
  });
});

describe("complete Amateur games", () => {
  for (const victoryMode of ["standard", "long"] as const) {
    it(`completes a seeded ${victoryMode} game against four automated factions`, () => {
      const prepared = prepareAmateurGame({
        humanFaction: "nubian-christians",
        npcCount: 4,
        nileFloods: true,
        victoryMode,
        seed: `COMPLETE-${victoryMode}`,
      });
      const game = startPreparedAmateurGame(prepared, heirChoices(prepared)[0].id);
      for (const participant of game.players) participant.controller = "npc";
      let actions = 0;
      while (game.phase !== "complete" && actions < 5000) {
        if (game.phase === "replenish") resolveNpcReplenishment(game);
        else resolveAmateurAttack(game, chooseNpcAttack(game));
        actions++;
      }
      expect(game.phase).toBe("complete");
      expect(game.winnerId).toBeTruthy();
      expect(actions).toBeLessThan(5000);
    });
  }
});
