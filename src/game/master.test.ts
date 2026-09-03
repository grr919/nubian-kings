import { describe, expect, it } from "vitest";
import {
  autoArrangeMasterCards,
  beginMasterConstruction,
  chooseMasterNpcAttack,
  confirmMasterArmy,
  constructionCards,
  isLegalInitialPile,
  legalMasterTargets,
  masterArmySize,
  masterHeirChoices,
  prepareMasterGame,
  replenishMasterArmy,
  resolveMasterAttack,
  resolveMasterNpcReplenishment,
  type MasterCard,
  type MasterPile,
  type MasterPlayer,
  type MasterState,
} from "./master";
import { createRandomState } from "./random";

function card(id: string, type: MasterCard["type"], values: [number, number, number] = [1, 1, 1], face: "up" | "down" = "down"): MasterCard {
  return { id, definitionId: id, name: id, factionId: id.split("-")[0], type, strength: values[0], zeal: values[1], wealth: values[2], face };
}

function pile(id: string, cards: MasterCard[]): MasterPile {
  return { id, cards };
}

function player(id: string, controller: "human" | "npc", army: MasterPile[], heirValues: [number, number, number] = [5, 5, 5]): MasterPlayer {
  return { id, factionId: id, controller, army, heir: card(`${id}-heir`, "leader", heirValues, "up"), unused: [], discard: [], eliminated: false };
}

function state(players: MasterPlayer[], victoryMode: "standard" | "long" = "standard"): MasterState {
  return { version: 1, mode: "master", players, activePlayerIndex: 0, phase: "attack", nileFloods: false, victoryMode, round: 1, random: createRandomState("MASTER-TEST") };
}

describe("Master pile rules", () => {
  it("accepts only approved initial pile orderings", () => {
    const place = card("p", "place");
    const person = card("r", "person");
    const leader = card("l", "leader");
    const thing = card("t", "thing");
    expect(isLegalInitialPile([place])).toBe(true);
    expect(isLegalInitialPile([person])).toBe(true);
    expect(isLegalInitialPile([leader])).toBe(true);
    expect(isLegalInitialPile([thing])).toBe(false);
    expect(isLegalInitialPile([place, person])).toBe(true);
    expect(isLegalInitialPile([leader, thing])).toBe(true);
    expect(isLegalInitialPile([place, leader, thing])).toBe(true);
    expect(isLegalInitialPile([place, thing])).toBe(false);
    expect(isLegalInitialPile([person, place])).toBe(false);
  });

  it("auto-arranges every card into legal piles", () => {
    const cards = [
      card("place-1", "place"), card("place-2", "place"),
      card("person-1", "person"), card("leader-1", "leader"),
      card("thing-1", "thing"), card("thing-2", "thing"),
    ];
    const piles = autoArrangeMasterCards(cards);
    expect(piles.every((candidate) => isLegalInitialPile(candidate.cards))).toBe(true);
    expect(piles.flatMap((candidate) => candidate.cards).map((item) => item.id).sort()).toEqual(cards.map((item) => item.id).sort());
  });
});

describe("Master setup", () => {
  it("chooses the heir before dealing and returns unchosen Leaders to the deck", () => {
    const prepared = prepareMasterGame({ humanFaction: "nubian-christians", npcCount: 4, nileFloods: false, seed: "MASTER-SETUP" });
    const choices = masterHeirChoices(prepared);
    expect(choices.map((candidate) => candidate.name).sort()).toEqual([
      "Adama the Eparch", "Gourresi the Eparch", "Mari", "Merkourios", "Moses Giyorgios", "The Ngonnen",
    ]);
    const construction = beginMasterConstruction(prepared, choices[0].id);
    const humanCards = constructionCards(construction);
    expect(humanCards).toHaveLength(20);
    expect(humanCards.every((candidate) => candidate.face === "up")).toBe(true);
    expect([...humanCards, ...construction.players[0].unused].filter((candidate) => candidate.type === "leader")).toHaveLength(choices.length - 1);
    expect(construction.players.filter((candidate) => candidate.controller === "npc").every((candidate) => candidate.army.every((candidatePile) => isLegalInitialPile(candidatePile.cards)))).toBe(true);
    const arranged = autoArrangeMasterCards(humanCards, "human-pile");
    const game = confirmMasterArmy(construction, arranged);
    expect(game.players[0].army.flatMap((candidate) => candidate.cards)).toHaveLength(20);
    expect(game.players[0].army.flatMap((candidate) => candidate.cards).every((candidate) => candidate.face === "down")).toBe(true);
  });
});

describe("Master attacks", () => {
  it("compares summed pile statistics and discards the entire losing pile", () => {
    const human = player("human", "human", [pile("human-pile", [card("human-place", "place", [3, 1, 1]), card("human-person", "person", [4, 1, 1])])]);
    const npc = player("npc", "npc", [pile("npc-pile", [card("npc-person", "person", [2, 8, 8]), card("npc-thing", "thing", [1, 8, 8])])]);
    human.unused.push(card("human-unused", "thing"));
    const game = state([human, npc]);
    const events = resolveMasterAttack(game, { attackerUnitId: "human-pile", targetPlayerId: "npc", targetUnitId: "npc-pile", stat: "strength" });
    expect(npc.army).toHaveLength(0);
    expect(npc.discard.map((candidate) => candidate.id)).toEqual(["npc-person", "npc-thing"]);
    expect(game.phase).toBe("replenish");
    expect(events.find((event) => event.type === "score" && event.playerId === "human")).toMatchObject({ base: 7, total: 7 });
  });

  it("protects an heir until every pile is gone", () => {
    const game = state([player("human", "human", [pile("h", [card("hp", "person")])]), player("npc", "npc", [pile("n", [card("np", "person")])])]);
    expect(legalMasterTargets(game, "npc")).toEqual(["n"]);
    game.players[1].army = [];
    expect(legalMasterTargets(game, "npc")).toEqual([game.players[1].heir.id]);
  });

  it("adds a random reserve card as a legal standalone pile, including a Thing", () => {
    const human = player("human", "human", []);
    human.unused.push(card("hidden-thing", "thing"));
    const game = state([human, player("npc", "npc", [])]);
    game.phase = "replenish";
    game.pendingReplenishmentPlayerId = "human";
    replenishMasterArmy(game);
    expect(masterArmySize(human)).toBe(1);
    expect(human.army[0].cards[0]).toMatchObject({ id: "hidden-thing", type: "thing", face: "down" });
  });
});

describe("complete Master games", () => {
  for (const victoryMode of ["standard", "long"] as const) {
    it(`completes a seeded ${victoryMode} game against four automated factions`, () => {
      const prepared = prepareMasterGame({ humanFaction: "nubian-christians", npcCount: 4, nileFloods: true, victoryMode, seed: `MASTER-${victoryMode}` });
      const construction = beginMasterConstruction(prepared, masterHeirChoices(prepared)[0].id);
      const human = construction.players[0];
      const game = confirmMasterArmy(construction, autoArrangeMasterCards(constructionCards(construction), "human-pile"));
      human.controller = "npc";
      let actions = 0;
      while (game.phase !== "complete" && actions < 10000) {
        if (game.phase === "replenish") resolveMasterNpcReplenishment(game);
        else resolveMasterAttack(game, chooseMasterNpcAttack(game));
        actions++;
      }
      expect(game.phase).toBe("complete");
      expect(game.winnerId).toBeTruthy();
      expect(actions).toBeLessThan(10000);
    });
  }
});
