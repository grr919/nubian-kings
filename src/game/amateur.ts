import data from "../data/cards.json";
import { createRandomState, randomSource } from "./random";
import { FACTIONS } from "./setup";
import type { Face, RandomState, Stat } from "./types";

export type AmateurVictoryMode = "standard" | "long";
export type AmateurController = "human" | "npc";

export interface AmateurCard {
  id: string;
  definitionId: string;
  name: string;
  factionId: string;
  type: "leader" | "person" | "place" | "thing";
  strength: number;
  zeal: number;
  wealth: number;
  face: Face;
}

export interface AmateurPlayer {
  id: string;
  factionId: string;
  controller: AmateurController;
  army: AmateurCard[];
  heir: AmateurCard;
  unused: AmateurCard[];
  discard: AmateurCard[];
  eliminated: boolean;
}

interface PreparedPlayer extends Omit<AmateurPlayer, "heir"> {
  heir?: AmateurCard;
}

export interface PreparedAmateurGame {
  players: PreparedPlayer[];
  activePlayerIndex: number;
  nileFloods: boolean;
  victoryMode: AmateurVictoryMode;
  random: RandomState;
}

export interface AmateurState {
  version: 1;
  mode: "amateur";
  players: AmateurPlayer[];
  activePlayerIndex: number;
  phase: "attack" | "replenish" | "complete";
  nileFloods: boolean;
  victoryMode: AmateurVictoryMode;
  round: number;
  random: RandomState;
  pendingReplenishmentPlayerId?: string;
  winnerId?: string;
}

export interface PrepareAmateurOptions {
  humanFaction: (typeof FACTIONS)[number];
  npcCount?: number;
  nileFloods: boolean;
  victoryMode?: AmateurVictoryMode;
  seed?: string;
  openingPlayer?: "random" | "human" | "npc";
}

export interface AmateurAttack {
  attackerId: string;
  targetPlayerId: string;
  targetId: string;
  stat: Stat;
}

export type AmateurEvent =
  | { type: "attack"; attackerPlayerId: string; attackerId: string; targetPlayerId: string; targetId: string; stat: Stat }
  | { type: "reveal"; playerId: string; cardId: string }
  | { type: "score"; playerId: string; cardId: string; base: number; die: number; total: number }
  | { type: "tie" }
  | { type: "defeated"; playerId: string; cardId: string; heir: boolean }
  | { type: "replenishment-available"; playerId: string }
  | { type: "replenished"; playerId: string; cardId?: string; source: "discard" | "unused" }
  | { type: "replenishment-skipped"; playerId: string }
  | { type: "player-eliminated"; playerId: string }
  | { type: "turn-advanced"; playerId: string }
  | { type: "game-won"; playerId: string };

const canonical = data.cards as Array<{
  id: string;
  name: string;
  factionId: string;
  type: AmateurCard["type"];
  strength: number;
  zeal: number;
  wealth: number;
  deckCopies: number;
  availableInPrototype: boolean;
}>;

function shuffle<T>(items: T[], random: () => number) {
  for (let index = items.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [items[index], items[swap]] = [items[swap], items[index]];
  }
  return items;
}

function factionDeck(factionId: string) {
  return canonical
    .filter((card) => card.factionId === factionId && card.availableInPrototype)
    .flatMap((card) => Array.from({ length: card.deckCopies }, (_, copy): AmateurCard => ({
      id: `${card.id}:${copy + 1}`,
      definitionId: card.id,
      name: card.name,
      factionId: card.factionId,
      type: card.type,
      strength: card.strength,
      zeal: card.zeal,
      wealth: card.wealth,
      face: "down",
    })));
}

function dealFaction(factionId: string, random: () => number) {
  const deck = factionDeck(factionId);
  const leaders = shuffle(deck.filter((card) => card.type === "leader"), random);
  const nonLeaders = shuffle(deck.filter((card) => card.type !== "leader"), random);
  if (!leaders.length) throw new Error(`No Leader heir is available for ${factionId}`);
  if (nonLeaders.length < 10) throw new Error(`Fewer than ten non-Leaders are available for ${factionId}`);
  const army = nonLeaders.slice(0, 10);
  const unused = shuffle([...nonLeaders.slice(10), ...leaders], random);
  return { army, unused };
}

export function prepareAmateurGame(options: PrepareAmateurOptions): PreparedAmateurGame {
  const random = createRandomState(options.seed);
  const rng = randomSource(random);
  const npcCount = options.npcCount ?? Math.floor(rng() * 4) + 1;
  if (npcCount < 1 || npcCount > 4) throw new Error("NPC count must be between 1 and 4");
  const npcFactions = shuffle(FACTIONS.filter((faction) => faction !== options.humanFaction), rng).slice(0, npcCount);
  const assignments = [options.humanFaction, ...npcFactions];
  const players: PreparedPlayer[] = assignments.map((factionId, index) => ({
    id: index === 0 ? "human" : `npc-${index}`,
    factionId,
    controller: index === 0 ? "human" : "npc",
    ...dealFaction(factionId, rng),
    discard: [],
    eliminated: false,
  }));
  const opening = options.openingPlayer ?? "random";
  const activePlayerIndex = opening === "human"
    ? 0
    : opening === "npc"
      ? Math.floor(rng() * (players.length - 1)) + 1
      : Math.floor(rng() * players.length);
  return {
    players,
    activePlayerIndex,
    nileFloods: options.nileFloods,
    victoryMode: options.victoryMode ?? "standard",
    random,
  };
}

export function heirChoices(prepared: PreparedAmateurGame, playerId = "human") {
  const player = prepared.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player.unused.filter((card) => card.type === "leader");
}

function chooseNpcHeir(player: PreparedPlayer) {
  const choices = player.unused.filter((card) => card.type === "leader");
  return [...choices].sort((a, b) =>
    (b.strength + b.zeal + b.wealth) - (a.strength + a.zeal + a.wealth)
  )[0];
}

export function startPreparedAmateurGame(prepared: PreparedAmateurGame, humanHeirId: string): AmateurState {
  const players = prepared.players.map((source): AmateurPlayer => {
    const selected = source.controller === "human"
      ? source.unused.find((card) => card.id === humanHeirId && card.type === "leader")
      : chooseNpcHeir(source);
    if (!selected) throw new Error(`A valid Leader heir is required for ${source.id}`);
    return {
      ...source,
      heir: { ...selected, face: "up" },
      unused: source.unused.filter((card) => card.id !== selected.id),
    };
  });
  return {
    version: 1,
    mode: "amateur",
    players,
    activePlayerIndex: prepared.activePlayerIndex,
    phase: "attack",
    nileFloods: prepared.nileFloods,
    victoryMode: prepared.victoryMode,
    round: 1,
    random: prepared.random,
  };
}

export function activePlayer(state: AmateurState) {
  return state.players[state.activePlayerIndex];
}

export function legalAttackers(state: AmateurState, playerId = activePlayer(state).id) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.eliminated || player.id !== activePlayer(state).id || state.phase !== "attack") return [];
  return [...player.army, player.heir];
}

export function legalTargets(state: AmateurState, targetPlayerId: string) {
  const attacker = activePlayer(state);
  const target = state.players.find((candidate) => candidate.id === targetPlayerId);
  if (!target || target.eliminated || target.id === attacker.id || state.phase !== "attack") return [];
  return target.army.length ? target.army : [target.heir];
}

function findOwnedCard(player: AmateurPlayer, cardId: string) {
  if (player.heir.id === cardId) return { card: player.heir, heir: true };
  const card = player.army.find((candidate) => candidate.id === cardId);
  return card ? { card, heir: false } : undefined;
}

function roll(state: AmateurState) {
  return state.nileFloods ? Math.floor(randomSource(state.random)() * 6) + 1 : 0;
}

function advanceTurn(state: AmateurState, events: AmateurEvent[]) {
  for (let offset = 1; offset <= state.players.length; offset++) {
    const index = (state.activePlayerIndex + offset) % state.players.length;
    if (!state.players[index].eliminated) {
      state.activePlayerIndex = index;
      state.round++;
      state.phase = "attack";
      events.push({ type: "turn-advanced", playerId: state.players[index].id });
      return;
    }
  }
}

function eliminateHeir(state: AmateurState, defeated: AmateurPlayer, winner: AmateurPlayer, events: AmateurEvent[]) {
  defeated.eliminated = true;
  events.push({ type: "player-eliminated", playerId: defeated.id });
  if (state.victoryMode === "standard") {
    state.phase = "complete";
    state.winnerId = winner.id;
    events.push({ type: "game-won", playerId: winner.id });
    return true;
  }
  defeated.army = [];
  const remaining = state.players.filter((player) => !player.eliminated);
  if (remaining.length === 1) {
    state.phase = "complete";
    state.winnerId = remaining[0].id;
    events.push({ type: "game-won", playerId: remaining[0].id });
    return true;
  }
  return false;
}

function defeatCard(player: AmateurPlayer, cardId: string) {
  const index = player.army.findIndex((card) => card.id === cardId);
  if (index < 0) return false;
  const [defeated] = player.army.splice(index, 1);
  player.discard.push({ ...defeated, face: "up" });
  return true;
}

export function resolveAmateurAttack(state: AmateurState, action: AmateurAttack): AmateurEvent[] {
  if (state.phase !== "attack") throw new Error("An attack cannot be made now");
  const attackerPlayer = activePlayer(state);
  const defender = state.players.find((player) => player.id === action.targetPlayerId);
  if (!defender) throw new Error("Unknown target player");
  if (!legalAttackers(state).some((card) => card.id === action.attackerId)) throw new Error("Illegal attacker");
  if (!legalTargets(state, defender.id).some((card) => card.id === action.targetId)) throw new Error("Illegal target");
  if (!["strength", "zeal", "wealth"].includes(action.stat)) throw new Error("Illegal statistic");

  const attacker = findOwnedCard(attackerPlayer, action.attackerId)!;
  const target = findOwnedCard(defender, action.targetId)!;
  const events: AmateurEvent[] = [{
    type: "attack",
    attackerPlayerId: attackerPlayer.id,
    attackerId: attacker.card.id,
    targetPlayerId: defender.id,
    targetId: target.card.id,
    stat: action.stat,
  }];
  for (const [player, entry] of [[attackerPlayer, attacker], [defender, target]] as const) {
    if (entry.card.face === "down") {
      entry.card.face = "up";
      events.push({ type: "reveal", playerId: player.id, cardId: entry.card.id });
    }
  }
  const attackerDie = roll(state);
  const targetDie = roll(state);
  const attackerTotal = attacker.card[action.stat] + attackerDie;
  const targetTotal = target.card[action.stat] + targetDie;
  events.push({ type: "score", playerId: attackerPlayer.id, cardId: attacker.card.id, base: attacker.card[action.stat], die: attackerDie, total: attackerTotal });
  events.push({ type: "score", playerId: defender.id, cardId: target.card.id, base: target.card[action.stat], die: targetDie, total: targetTotal });

  if (attackerTotal === targetTotal) {
    events.push({ type: "tie" });
    advanceTurn(state, events);
    return events;
  }

  const attackerWon = attackerTotal > targetTotal;
  const winner = attackerWon ? attackerPlayer : defender;
  const loser = attackerWon ? defender : attackerPlayer;
  const losingEntry = attackerWon ? target : attacker;
  if (losingEntry.heir) {
    events.push({ type: "defeated", playerId: loser.id, cardId: losingEntry.card.id, heir: true });
    if (eliminateHeir(state, loser, winner, events)) return events;
  } else {
    defeatCard(loser, losingEntry.card.id);
    events.push({ type: "defeated", playerId: loser.id, cardId: losingEntry.card.id, heir: false });
  }

  const canReplenish = !winner.eliminated && winner.army.length < 10 && (winner.discard.length > 0 || winner.unused.length > 0);
  if (canReplenish) {
    state.phase = "replenish";
    state.pendingReplenishmentPlayerId = winner.id;
    events.push({ type: "replenishment-available", playerId: winner.id });
  } else {
    advanceTurn(state, events);
  }
  return events;
}

function pendingPlayer(state: AmateurState) {
  if (state.phase !== "replenish" || !state.pendingReplenishmentPlayerId) throw new Error("No replenishment is pending");
  const player = state.players.find((candidate) => candidate.id === state.pendingReplenishmentPlayerId);
  if (!player) throw new Error("Unknown replenishing player");
  return player;
}

function finishReplenishment(state: AmateurState, events: AmateurEvent[]) {
  delete state.pendingReplenishmentPlayerId;
  advanceTurn(state, events);
}

export function replenishFromDiscard(state: AmateurState, cardId: string): AmateurEvent[] {
  const player = pendingPlayer(state);
  if (player.army.length >= 10) throw new Error("Army is already full");
  const index = player.discard.findIndex((card) => card.id === cardId);
  if (index < 0) throw new Error("Card is not in the discard pile");
  const [card] = player.discard.splice(index, 1);
  card.face = "down";
  player.army.push(card);
  const events: AmateurEvent[] = [{ type: "replenished", playerId: player.id, cardId: card.id, source: "discard" }];
  finishReplenishment(state, events);
  return events;
}

export function replenishFromUnused(state: AmateurState): AmateurEvent[] {
  const player = pendingPlayer(state);
  if (player.army.length >= 10) throw new Error("Army is already full");
  const card = player.unused.shift();
  if (!card) throw new Error("Unused deck is empty");
  card.face = "down";
  player.army.push(card);
  const events: AmateurEvent[] = [{ type: "replenished", playerId: player.id, source: "unused" }];
  finishReplenishment(state, events);
  return events;
}

export function skipReplenishment(state: AmateurState): AmateurEvent[] {
  const player = pendingPlayer(state);
  const events: AmateurEvent[] = [{ type: "replenishment-skipped", playerId: player.id }];
  finishReplenishment(state, events);
  return events;
}

export function chooseNpcAttack(state: AmateurState): AmateurAttack {
  const player = activePlayer(state);
  if (player.controller !== "npc") throw new Error("The active player is not an NPC");
  const rng = randomSource(state.random);
  const opponents = state.players.filter((candidate) => !candidate.eliminated && candidate.id !== player.id);
  const exposedHeirs = opponents.filter((candidate) => candidate.army.length === 0);
  const targetPlayer = exposedHeirs.length
    ? exposedHeirs[Math.floor(rng() * exposedHeirs.length)]
    : opponents[Math.floor(rng() * opponents.length)];
  const attackers = legalAttackers(state);
  const visibleAttackers = attackers.filter((card) => card.face === "up");
  const attacker = visibleAttackers.length && rng() < 0.75
    ? [...visibleAttackers].sort((a, b) => Math.max(b.strength, b.zeal, b.wealth) - Math.max(a.strength, a.zeal, a.wealth))[0]
    : attackers[Math.floor(rng() * attackers.length)];
  const targets = legalTargets(state, targetPlayer.id);
  const visibleTargets = targets.filter((card) => card.face === "up");
  const target = visibleTargets.length && rng() < 0.75
    ? [...visibleTargets].sort((a, b) => (a.strength + a.zeal + a.wealth) - (b.strength + b.zeal + b.wealth))[0]
    : targets[Math.floor(rng() * targets.length)];
  const stats: Stat[] = ["strength", "zeal", "wealth"];
  const stat = attacker.face === "up"
    ? [...stats].sort((a, b) => attacker[b] - attacker[a])[0]
    : stats[Math.floor(rng() * stats.length)];
  return { attackerId: attacker.id, targetPlayerId: targetPlayer.id, targetId: target.id, stat };
}

export function resolveNpcReplenishment(state: AmateurState): AmateurEvent[] {
  const player = pendingPlayer(state);
  if (player.controller !== "npc") throw new Error("The pending player is not an NPC");
  if (player.discard.length) {
    const best = [...player.discard].sort((a, b) =>
      (b.strength + b.zeal + b.wealth) - (a.strength + a.zeal + a.wealth)
    )[0];
    return replenishFromDiscard(state, best.id);
  }
  if (player.unused.length) return replenishFromUnused(state);
  return skipReplenishment(state);
}
