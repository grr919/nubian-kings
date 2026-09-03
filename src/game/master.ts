import data from "../data/cards.json";
import { createRandomState, randomSource } from "./random";
import { FACTIONS } from "./setup";
import type { Face, RandomState, Stat } from "./types";

export type MasterVictoryMode = "standard" | "long";
export type MasterController = "human" | "npc";

export interface MasterCard {
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

export interface MasterPile {
  id: string;
  cards: MasterCard[];
}

export interface MasterPlayer {
  id: string;
  factionId: string;
  controller: MasterController;
  army: MasterPile[];
  heir: MasterCard;
  unused: MasterCard[];
  discard: MasterCard[];
  eliminated: boolean;
}

interface PreparedMasterPlayer {
  id: string;
  factionId: string;
  controller: MasterController;
  leaders: MasterCard[];
  deck: MasterCard[];
}

export interface PreparedMasterGame {
  players: PreparedMasterPlayer[];
  activePlayerIndex: number;
  nileFloods: boolean;
  victoryMode: MasterVictoryMode;
  random: RandomState;
}

export interface MasterConstruction {
  players: MasterPlayer[];
  activePlayerIndex: number;
  nileFloods: boolean;
  victoryMode: MasterVictoryMode;
  random: RandomState;
}

export interface MasterState {
  version: 1;
  mode: "master";
  players: MasterPlayer[];
  activePlayerIndex: number;
  phase: "attack" | "replenish" | "complete";
  nileFloods: boolean;
  victoryMode: MasterVictoryMode;
  round: number;
  random: RandomState;
  pendingReplenishmentPlayerId?: string;
  winnerId?: string;
}

export interface PrepareMasterOptions {
  humanFaction: (typeof FACTIONS)[number];
  npcCount?: number;
  nileFloods: boolean;
  victoryMode?: MasterVictoryMode;
  seed?: string;
  openingPlayer?: "random" | "human" | "npc";
}

export interface MasterAttack {
  attackerUnitId: string;
  targetPlayerId: string;
  targetUnitId: string;
  stat: Stat;
}

export type MasterEvent =
  | { type: "attack"; attackerPlayerId: string; attackerUnitId: string; targetPlayerId: string; targetUnitId: string; stat: Stat }
  | { type: "reveal"; playerId: string; cardIds: string[] }
  | { type: "score"; playerId: string; unitId: string; base: number; die: number; total: number }
  | { type: "tie" }
  | { type: "defeated"; playerId: string; unitId: string; cardIds: string[]; heir: boolean }
  | { type: "replenishment-available"; playerId: string }
  | { type: "replenished"; playerId: string }
  | { type: "replenishment-skipped"; playerId: string }
  | { type: "player-eliminated"; playerId: string }
  | { type: "turn-advanced"; playerId: string }
  | { type: "game-won"; playerId: string };

const canonical = data.cards as Array<{
  id: string;
  name: string;
  factionId: string;
  type: MasterCard["type"];
  strength: number;
  zeal: number;
  wealth: number;
  deckCopies: number;
  availableInPrototype: boolean;
}>;

const personLike = (card: MasterCard) => card.type === "person" || card.type === "leader";
const value = (card: MasterCard) => card.strength + card.zeal + card.wealth;

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
    .flatMap((card) => Array.from({ length: card.deckCopies }, (_, copy): MasterCard => ({
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

export function prepareMasterGame(options: PrepareMasterOptions): PreparedMasterGame {
  const random = createRandomState(options.seed);
  const rng = randomSource(random);
  const npcCount = options.npcCount ?? Math.floor(rng() * 4) + 1;
  if (npcCount < 1 || npcCount > 4) throw new Error("NPC count must be between 1 and 4");
  const npcFactions = shuffle(FACTIONS.filter((candidate) => candidate !== options.humanFaction), rng).slice(0, npcCount);
  const assignments = [options.humanFaction, ...npcFactions];
  const players = assignments.map((factionId, index): PreparedMasterPlayer => {
    const deck = factionDeck(factionId);
    const leaders = deck.filter((card) => card.type === "leader");
    if (!leaders.length) throw new Error(`No Leader heir is available for ${factionId}`);
    return {
      id: index === 0 ? "human" : `npc-${index}`,
      factionId,
      controller: index === 0 ? "human" : "npc",
      leaders,
      deck: deck.filter((card) => card.type !== "leader"),
    };
  });
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

export function masterHeirChoices(prepared: PreparedMasterGame, playerId = "human") {
  const player = prepared.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player.leaders;
}

function chooseNpcHeir(player: PreparedMasterPlayer) {
  return [...player.leaders].sort((a, b) => value(b) - value(a) || a.id.localeCompare(b.id))[0];
}

function dealCanBeArranged(cards: readonly MasterCard[]) {
  const things = cards.filter((card) => card.type === "thing").length;
  const holders = cards.filter(personLike).length;
  return things <= holders;
}

function dealTwenty(deck: MasterCard[], random: () => number) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const shuffled = shuffle([...deck], random);
    const army = shuffled.slice(0, 20);
    if (army.length < 20) throw new Error("Fewer than twenty cards are available after choosing an heir");
    if (dealCanBeArranged(army)) return { army, unused: shuffled.slice(20) };
  }
  throw new Error("Unable to deal a legal twenty-card Master army");
}

export function isLegalInitialPile(cards: readonly MasterCard[]) {
  if (cards.length === 1) return cards[0].type !== "thing";
  if (cards.length === 2) {
    return (cards[0].type === "place" && personLike(cards[1]))
      || (personLike(cards[0]) && cards[1].type === "thing");
  }
  return cards.length === 3
    && cards[0].type === "place"
    && personLike(cards[1])
    && cards[2].type === "thing";
}

export function validateInitialArmy(piles: readonly MasterPile[], expectedCardIds?: readonly string[]) {
  if (!piles.length || piles.some((pile) => !pile.id || !isLegalInitialPile(pile.cards))) return false;
  const ids = piles.flatMap((pile) => pile.cards.map((card) => card.id));
  if (new Set(ids).size !== ids.length) return false;
  if (!expectedCardIds) return true;
  return ids.length === expectedCardIds.length
    && [...ids].sort().every((id, index) => id === [...expectedCardIds].sort()[index]);
}

export function autoArrangeMasterCards(cards: readonly MasterCard[], prefix = "pile") {
  if (!dealCanBeArranged(cards)) throw new Error("These cards cannot form legal Master piles");
  const places = cards.filter((card) => card.type === "place").sort((a, b) => value(b) - value(a));
  const holders = cards.filter(personLike).sort((a, b) => value(b) - value(a));
  const things = cards.filter((card) => card.type === "thing").sort((a, b) => value(b) - value(a));
  const composed: MasterCard[][] = things.map((thing) => [holders.shift()!, thing]);
  const singles: MasterCard[][] = holders.map((holder) => [holder]);
  for (const place of places) {
    const withThing = composed.find((pile) => pile.length === 2 && personLike(pile[0]));
    if (withThing) withThing.unshift(place);
    else {
      const withPerson = singles.find((pile) => pile.length === 1 && personLike(pile[0]));
      if (withPerson) withPerson.unshift(place);
      else singles.push([place]);
    }
  }
  return [...composed, ...singles].map((pileCards, index): MasterPile => ({
    id: `${prefix}-${index + 1}`,
    cards: pileCards,
  }));
}

export function beginMasterConstruction(prepared: PreparedMasterGame, humanHeirId: string): MasterConstruction {
  const rng = randomSource(prepared.random);
  const players = prepared.players.map((source): MasterPlayer => {
    const heir = source.controller === "human"
      ? source.leaders.find((card) => card.id === humanHeirId)
      : chooseNpcHeir(source);
    if (!heir) throw new Error(`A valid Leader heir is required for ${source.id}`);
    const eligibleDeck = [...source.deck, ...source.leaders.filter((card) => card.id !== heir.id)];
    const dealt = dealTwenty(eligibleDeck, rng);
    const setupCards = dealt.army.map((card) => ({ ...card, face: source.controller === "human" ? "up" as const : "down" as const }));
    return {
      id: source.id,
      factionId: source.factionId,
      controller: source.controller,
      army: source.controller === "npc" ? autoArrangeMasterCards(setupCards, `${source.id}-pile`) : [],
      heir: { ...heir, face: "up" },
      unused: dealt.unused.map((card) => ({ ...card, face: "down" })),
      discard: [],
      eliminated: false,
      ...(source.controller === "human" ? { army: [{ id: "human-unassigned", cards: setupCards }] } : {}),
    };
  });
  return { players, activePlayerIndex: prepared.activePlayerIndex, nileFloods: prepared.nileFloods, victoryMode: prepared.victoryMode, random: prepared.random };
}

export function constructionCards(construction: MasterConstruction, playerId = "human") {
  const player = construction.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player.army.flatMap((pile) => pile.cards);
}

export function confirmMasterArmy(construction: MasterConstruction, humanPiles: MasterPile[]): MasterState {
  const player = construction.players.find((candidate) => candidate.controller === "human");
  if (!player) throw new Error("A human player is required");
  const expected = constructionCards(construction, player.id).map((card) => card.id);
  if (!validateInitialArmy(humanPiles, expected)) throw new Error("Every card must be assigned to a legal pile");
  player.army = humanPiles.map((pile) => ({ ...pile, cards: pile.cards.map((card) => ({ ...card, face: "down" })) }));
  return {
    version: 1,
    mode: "master",
    players: construction.players,
    activePlayerIndex: construction.activePlayerIndex,
    phase: "attack",
    nileFloods: construction.nileFloods,
    victoryMode: construction.victoryMode,
    round: 1,
    random: construction.random,
  };
}

export function activeMasterPlayer(state: MasterState) {
  return state.players[state.activePlayerIndex];
}

export function masterArmySize(player: MasterPlayer) {
  return player.army.reduce((sum, pile) => sum + pile.cards.length, 0);
}

export function legalMasterAttackers(state: MasterState, playerId = activeMasterPlayer(state).id) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.eliminated || player.id !== activeMasterPlayer(state).id || state.phase !== "attack") return [];
  return masterArmySize(player) ? player.army.map((pile) => pile.id) : [player.heir.id];
}

export function legalMasterTargets(state: MasterState, targetPlayerId: string) {
  const attacker = activeMasterPlayer(state);
  const target = state.players.find((candidate) => candidate.id === targetPlayerId);
  if (!target || target.eliminated || target.id === attacker.id || state.phase !== "attack") return [];
  return masterArmySize(target) ? target.army.map((pile) => pile.id) : [target.heir.id];
}

interface LocatedUnit { id: string; cards: MasterCard[]; heir: boolean; pile?: MasterPile }

function findUnit(player: MasterPlayer, unitId: string): LocatedUnit | undefined {
  if (player.heir.id === unitId) return { id: unitId, cards: [player.heir], heir: true };
  const pile = player.army.find((candidate) => candidate.id === unitId);
  return pile ? { id: pile.id, cards: pile.cards, heir: false, pile } : undefined;
}

function unitValue(unit: LocatedUnit, stat: Stat) {
  return unit.cards.reduce((sum, card) => sum + card[stat], 0);
}

function roll(state: MasterState) {
  return state.nileFloods ? Math.floor(randomSource(state.random)() * 6) + 1 : 0;
}

function advanceTurn(state: MasterState, events: MasterEvent[]) {
  delete state.pendingReplenishmentPlayerId;
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

function eliminateHeir(state: MasterState, defeated: MasterPlayer, winner: MasterPlayer, events: MasterEvent[]) {
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

export function resolveMasterAttack(state: MasterState, action: MasterAttack): MasterEvent[] {
  if (state.phase !== "attack") throw new Error("An attack cannot be made now");
  const attackerPlayer = activeMasterPlayer(state);
  const defender = state.players.find((player) => player.id === action.targetPlayerId);
  if (!defender) throw new Error("Unknown target player");
  if (!legalMasterAttackers(state).includes(action.attackerUnitId)) throw new Error("Illegal attacker");
  if (!legalMasterTargets(state, defender.id).includes(action.targetUnitId)) throw new Error("Illegal target");
  if (!["strength", "zeal", "wealth"].includes(action.stat)) throw new Error("Illegal statistic");
  const attacker = findUnit(attackerPlayer, action.attackerUnitId)!;
  const target = findUnit(defender, action.targetUnitId)!;
  const events: MasterEvent[] = [{ type: "attack", attackerPlayerId: attackerPlayer.id, attackerUnitId: attacker.id, targetPlayerId: defender.id, targetUnitId: target.id, stat: action.stat }];
  for (const [player, unit] of [[attackerPlayer, attacker], [defender, target]] as const) {
    const revealed = unit.cards.filter((card) => card.face === "down");
    revealed.forEach((card) => { card.face = "up"; });
    if (revealed.length) events.push({ type: "reveal", playerId: player.id, cardIds: revealed.map((card) => card.id) });
  }
  const attackerBase = unitValue(attacker, action.stat);
  const targetBase = unitValue(target, action.stat);
  const attackerDie = roll(state);
  const targetDie = roll(state);
  const attackerTotal = attackerBase + attackerDie;
  const targetTotal = targetBase + targetDie;
  events.push({ type: "score", playerId: attackerPlayer.id, unitId: attacker.id, base: attackerBase, die: attackerDie, total: attackerTotal });
  events.push({ type: "score", playerId: defender.id, unitId: target.id, base: targetBase, die: targetDie, total: targetTotal });
  if (attackerTotal === targetTotal) {
    events.push({ type: "tie" });
    advanceTurn(state, events);
    return events;
  }
  const attackerWon = attackerTotal > targetTotal;
  const winner = attackerWon ? attackerPlayer : defender;
  const loser = attackerWon ? defender : attackerPlayer;
  const losingUnit = attackerWon ? target : attacker;
  events.push({ type: "defeated", playerId: loser.id, unitId: losingUnit.id, cardIds: losingUnit.cards.map((card) => card.id), heir: losingUnit.heir });
  if (losingUnit.heir) {
    if (eliminateHeir(state, loser, winner, events)) return events;
  } else {
    loser.army = loser.army.filter((pile) => pile.id !== losingUnit.id);
    loser.discard.push(...losingUnit.cards.map((card) => ({ ...card, face: "up" as const })));
  }
  if (!winner.eliminated && masterArmySize(winner) < 20 && winner.unused.length) {
    state.phase = "replenish";
    state.pendingReplenishmentPlayerId = winner.id;
    events.push({ type: "replenishment-available", playerId: winner.id });
  } else advanceTurn(state, events);
  return events;
}

function pendingPlayer(state: MasterState) {
  if (state.phase !== "replenish" || !state.pendingReplenishmentPlayerId) throw new Error("No replenishment is pending");
  const player = state.players.find((candidate) => candidate.id === state.pendingReplenishmentPlayerId);
  if (!player) throw new Error("Unknown replenishing player");
  return player;
}

export function replenishMasterArmy(state: MasterState): MasterEvent[] {
  const player = pendingPlayer(state);
  if (masterArmySize(player) >= 20) throw new Error("Army is already full");
  const card = player.unused.shift();
  if (!card) throw new Error("Unused deck is empty");
  card.face = "down";
  player.army.push({ id: `${player.id}-reserve-${state.round}-${card.id}`, cards: [card] });
  const events: MasterEvent[] = [{ type: "replenished", playerId: player.id }];
  advanceTurn(state, events);
  return events;
}

export function skipMasterReplenishment(state: MasterState): MasterEvent[] {
  const player = pendingPlayer(state);
  const events: MasterEvent[] = [{ type: "replenishment-skipped", playerId: player.id }];
  advanceTurn(state, events);
  return events;
}

function unitScore(player: MasterPlayer, unitId: string) {
  const unit = findUnit(player, unitId)!;
  return Math.max(...(["strength", "zeal", "wealth"] as Stat[]).map((stat) => unitValue(unit, stat)));
}

export function chooseMasterNpcAttack(state: MasterState): MasterAttack {
  const player = activeMasterPlayer(state);
  if (player.controller !== "npc") throw new Error("The active player is not an NPC");
  const rng = randomSource(state.random);
  const opponents = state.players.filter((candidate) => !candidate.eliminated && candidate.id !== player.id);
  const exposed = opponents.filter((candidate) => masterArmySize(candidate) === 0);
  const targetPlayer = (exposed.length ? exposed : opponents)[Math.floor(rng() * (exposed.length || opponents.length))];
  const attackerIds = legalMasterAttackers(state);
  const attackerId = rng() < 0.8
    ? [...attackerIds].sort((a, b) => unitScore(player, b) - unitScore(player, a))[0]
    : attackerIds[Math.floor(rng() * attackerIds.length)];
  const attacker = findUnit(player, attackerId)!;
  const stats: Stat[] = ["strength", "zeal", "wealth"];
  const stat = [...stats].sort((a, b) => unitValue(attacker, b) - unitValue(attacker, a))[0];
  const targetIds = legalMasterTargets(state, targetPlayer.id);
  const visible = targetIds.filter((id) => findUnit(targetPlayer, id)!.cards.every((card) => card.face === "up"));
  const targetId = visible.length && rng() < 0.75
    ? [...visible].sort((a, b) => unitValue(findUnit(targetPlayer, a)!, stat) - unitValue(findUnit(targetPlayer, b)!, stat))[0]
    : targetIds[Math.floor(rng() * targetIds.length)];
  return { attackerUnitId: attackerId, targetPlayerId: targetPlayer.id, targetUnitId: targetId, stat };
}

export function resolveMasterNpcReplenishment(state: MasterState) {
  const player = pendingPlayer(state);
  if (player.controller !== "npc") throw new Error("The pending player is not an NPC");
  return replenishMasterArmy(state);
}
