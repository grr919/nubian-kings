import cardData from "../data/cards.json";
import { nextCard, playComparison } from "./beginner";
import { chooseNpcStatForCard, factionProfile } from "./npc";
import { createRandomState, randomSource } from "./random";
import { FACTIONS } from "./setup";
import type { BeginnerState, Card, GameEvent, Player, Stat } from "./types";

export type MultiplayerRoomStatus = "waiting" | "active" | "complete" | "abandoned";
export type MultiplayerOpeningPlayer = "random" | "human" | "npc";

export interface MultiplayerRoomSettings {
  totalSeats: number;
  npcCount: number;
  nileFloods: boolean;
  openingPlayer: MultiplayerOpeningPlayer;
}

export interface MultiplayerSeat {
  id: string;
  userId?: string;
  displayName: string;
  controller: "human" | "npc";
  factionId?: string;
  seatOrder: number;
}

export interface MultiplayerReview {
  stat: Stat;
  scores: Array<{ playerId: string; cardId: string; base: number; die: number; total: number }>;
  cardIds: string[];
  sequenceCardIds: string[];
  winnerId?: string;
  events: GameEvent[];
}

export const MULTIPLAYER_FACTIONS = [...FACTIONS];
const STATS: Stat[] = ["strength", "zeal", "wealth"];

function shuffle<T>(items: T[], rng: () => number) {
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function deck(factionId: string, rng: () => number): Card[] {
  const cards = cardData.cards.filter((card) => card.factionId === factionId).flatMap((card) =>
    Array.from({ length: card.deckCopies }, (_, copy) => ({
      id: `${factionId}-${copy}-${crypto.randomUUID()}`,
      name: card.name,
      factionId,
      strength: card.strength,
      zeal: card.zeal,
      wealth: card.wealth,
      face: "down" as const,
      discarded: false,
    })),
  );
  return shuffle(cards, rng).slice(0, 5);
}

export function createMultiplayerBeginnerGame(seats: MultiplayerSeat[], settings: MultiplayerRoomSettings, seed?: string): BeginnerState {
  const random = createRandomState(seed);
  const rng = randomSource(random);
  const players: Player[] = seats.sort((a, b) => a.seatOrder - b.seatOrder).map((seat) => ({
    id: seat.userId ?? seat.id,
    factionId: seat.factionId!,
    controller: seat.controller,
    cards: deck(seat.factionId!, rng),
    cursor: 0,
    eliminated: false,
  }));
  const humanIndexes = players.flatMap((player, index) => player.controller === "human" ? [index] : []);
  const npcIndexes = players.flatMap((player, index) => player.controller === "npc" ? [index] : []);
  const candidates = settings.openingPlayer === "human" ? humanIndexes : settings.openingPlayer === "npc" && npcIndexes.length ? npcIndexes : players.map((_, index) => index);
  const selectorIndex = candidates[Math.floor(rng() * candidates.length)];
  return { version: 2, players, selectorIndex, phase: "select", nileFloods: settings.nileFloods, round: 1, random };
}

export function playMultiplayerComparison(state: BeginnerState, stat: Stat): MultiplayerReview {
  const priorSequence = Object.values(state.tie?.usedCardIds ?? {}).flat();
  const events = playComparison(state, stat);
  const scores = events.filter((event): event is Extract<GameEvent, { type: "score" }> => event.type === "score").map(({ playerId, cardId, base, die, total }) => ({ playerId, cardId, base, die, total }));
  const discarded = events.filter((event): event is Extract<GameEvent, { type: "cards-discarded" }> => event.type === "cards-discarded").flatMap((event) => event.cardIds);
  const winner = events.find((event): event is Extract<GameEvent, { type: "comparison-won" }> => event.type === "comparison-won");
  const sequenceCardIds = [...new Set([...priorSequence, ...scores.map((score) => score.cardId)])];
  return { stat, scores, sequenceCardIds, cardIds: [...new Set([...sequenceCardIds, ...discarded])], winnerId: winner?.playerId, events };
}

export function chooseMultiplayerNpcStat(state: BeginnerState): Stat {
  const player = state.players[state.selectorIndex];
  const excluded = state.tie?.usedCardIds[player.id] ?? [];
  const preview = { ...player, cards: player.cards.map((card) => ({ ...card })) };
  const card = nextCard(preview, new Set(excluded));
  const profile = factionProfile(cardData.cards.filter((candidate) => candidate.factionId === player.factionId));
  return chooseNpcStatForCard(profile, card, randomSource(state.random), STATS);
}

export function publicBeginnerState(state: BeginnerState) {
  return {
    ...state,
    random: { seed: state.random.seed },
    players: state.players.map((player) => ({
      ...player,
      cards: player.cards.map((card) => card.face === "up" || card.discarded ? card : { id: card.id, face: card.face, discarded: card.discarded }),
    })),
  };
}

export function publicReview(review: MultiplayerReview | undefined, state: BeginnerState) {
  if (!review) return undefined;
  const visibleCards = new Map(state.players.flatMap((player) => player.cards).filter((card) => review.cardIds.includes(card.id)).map((card) => [card.id, card]));
  return { ...review, cards: Object.fromEntries(visibleCards) };
}
