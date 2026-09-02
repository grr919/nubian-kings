import data from "../data/cards.json";
import { createRandomState, randomSource } from "./random";
import type { RandomSource } from "./beginner";
import type { BeginnerState, Card, Player } from "./types";

export const FACTIONS = ["nubian-christians", "egyptian-christians", "ethiopian-christians", "egyptian-muslims", "ethiopian-jews"] as const;
type FactionId = (typeof FACTIONS)[number];

export interface SetupOptions {
  humanFaction: FactionId;
  npcCount?: number;
  nileFloods: boolean;
  seed?: string;
  firstPlayerIndex?: number;
  openingPlayer?: "random" | "human" | "npc";
}

function shuffle<T>(items: T[], rng: RandomSource) {
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function deck(factionId: string, rng: RandomSource): Card[] {
  const cards = data.cards.filter((card) => card.factionId === factionId).flatMap((card) => Array.from({ length: card.deckCopies }, (_, copy) => ({
    id: `${card.id}:${copy + 1}`,
    name: card.name,
    factionId: card.factionId,
    strength: card.strength,
    zeal: card.zeal,
    wealth: card.wealth,
    face: "down" as const,
    discarded: false,
  })));
  return shuffle(cards, rng);
}

export function createBeginnerGame(options: SetupOptions): BeginnerState {
  const random = createRandomState(options.seed);
  const rng = randomSource(random);
  const count = options.npcCount ?? (Math.floor(rng() * 4) + 1);
  if (count < 1 || count > 4) throw new Error("NPC count must be between 1 and 4");
  const remaining = shuffle(FACTIONS.filter((faction) => faction !== options.humanFaction), rng).slice(0, count);
  const assignments = [options.humanFaction, ...remaining];
  const players: Player[] = assignments.map((factionId, index) => ({
    id: index === 0 ? "human" : `npc-${index}`,
    factionId,
    controller: index === 0 ? "human" : "npc",
    cards: deck(factionId, rng).slice(0, 5),
    cursor: 0,
    eliminated: false,
  }));
  const openingPlayer = options.openingPlayer ?? "random";
  const selectorIndex = options.firstPlayerIndex ?? (openingPlayer === "human" ? 0 : openingPlayer === "npc" ? Math.floor(rng() * (players.length - 1)) + 1 : Math.floor(rng() * players.length));
  if (selectorIndex < 0 || selectorIndex >= players.length) throw new Error("Invalid first player");
  return { version: 2, players, selectorIndex, phase: "select", nileFloods: options.nileFloods, round: 1, random };
}
