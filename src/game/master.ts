import data from "../data/cards.json";
import effectText from "../data/card-effects.json";
import mercenaryData from "../data/mercenaries.json";
import { conversionFormationBonus, effectiveMasterStat, immuneToConversion, targetedAttackBonus } from "./master-effect-rules";
import { createRandomState, randomSource } from "./random";
import { FACTIONS } from "./setup";
import type { Face, RandomState, Stat } from "./types";

export type MasterVictoryMode = "standard" | "long";
export type MasterController = "human" | "npc";
export type MasterEffectsMode = "off" | "on";

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
  effectText?: string;
  effectSpent?: boolean;
  revealedRound?: number;
  mercenary?: boolean;
  artFile?: string;
  protectedCardId?: string;
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
  armyLimit?: number;
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
  effectsMode?: MasterEffectsMode;
  random: RandomState;
}

export interface MasterConstruction {
  players: MasterPlayer[];
  activePlayerIndex: number;
  nileFloods: boolean;
  victoryMode: MasterVictoryMode;
  effectsMode?: MasterEffectsMode;
  random: RandomState;
}

export interface MasterState {
  version: 1;
  mode: "master";
  players: MasterPlayer[];
  activePlayerIndex: number;
  phase: "attack" | "effects" | "replenish" | "complete";
  nileFloods: boolean;
  victoryMode: MasterVictoryMode;
  effectsMode?: MasterEffectsMode;
  mercenaryReserve?: MasterCard[];
  pendingEffectComparison?: PendingMasterComparison;
  extraTurns?: Record<string, number>;
  turnBoundaries?: string[];
  irreversibleRollbackIds?: string[];
  round: number;
  random: RandomState;
  pendingReplenishmentPlayerId?: string;
  winnerId?: string;
}

export interface PendingMasterComparison {
  attack: MasterAttack;
  round: number;
  attackerPlayerId: string;
  defenderPlayerId: string;
  attackerCards: MasterCard[];
  defenderCards: MasterCard[];
  scores: [number, number];
  dice: [number, number];
  floodPending?: boolean;
  priorityIndex: number;
  passes: number;
  guarantees: string[];
  cancelled: boolean;
  cancelReason?: "interrupt" | "immunity";
  forcedWinnerId?: string;
  supports?: Array<{ sourceId: string; supporterId: string; controllerId: string; side: "attacker" | "defender"; stat: "strength" | "zeal" }>;
}

export interface PrepareMasterOptions {
  humanFaction: (typeof FACTIONS)[number];
  npcCount?: number;
  nileFloods: boolean;
  victoryMode?: MasterVictoryMode;
  effectsMode?: MasterEffectsMode;
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
  | { type: "cancelled"; reason: "interrupt" | "immunity" }
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
  assets: Array<{ filename: string; copyCount: number }>;
}>;

const effects = effectText as Record<string, { name: string; text: string }>;

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
    .flatMap((card) => card.assets.flatMap((asset) => Array.from({ length: asset.copyCount }, (_, copy): MasterCard => ({
      id: `${card.id}:${asset.filename.match(/^\d+/)?.[0] ?? "image"}:${copy + 1}`,
      definitionId: card.id,
      name: card.name,
      factionId: card.factionId,
      type: card.type,
      strength: card.strength,
      zeal: card.zeal,
      wealth: card.wealth,
      face: "down",
      effectText: effects[asset.filename.match(/^\d+/)?.[0] ?? ""]?.text ?? "",
      artFile: asset.filename,
    }))));
}

export function createMasterMercenaryReserve(): MasterCard[] {
  return mercenaryData.cards.flatMap((card, kind) => Array.from({ length: card.copies }, (_, copy): MasterCard => ({
    id: `mercenary-${kind + 1}-${copy + 1}`,
    definitionId: `mercenary-${kind + 1}`,
    name: card.name,
    factionId: "mercenary",
    type: "person",
    strength: card.strength,
    zeal: 0,
    wealth: card.wealth,
    face: "up",
    mercenary: true,
    effectText: "Immune to conversion.",
    artFile: card.image.split("/").at(-1),
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
    effectsMode: options.effectsMode ?? "off",
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
  return !cards.some((card) => card.type === "thing") || cards.some(personLike);
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
  if (!cards.length) return false;
  let placeCount = 0;
  let personCount = 0;
  let stage = 0;
  for (const card of cards) {
    if (card.type === "place") {
      if (stage !== 0 || ++placeCount > 1) return false;
    } else if (personLike(card)) {
      stage = 1;
      personCount++;
    } else if (card.type === "thing") {
      if (!personCount) return false;
      stage = 2;
    } else return false;
  }
  return personCount <= 1 || placeCount === 1;
}

export function legalMasterPileAddition(cards: readonly MasterCard[], card: MasterCard): MasterCard[] | undefined {
  const order = (item: MasterCard) => item.type === "place" ? 0 : item.type === "thing" ? 2 : 1;
  const combined = [...cards, card].sort((left, right) => order(left) - order(right));
  return isLegalInitialPile(combined) ? combined : undefined;
}

/** Keep separate cards as single-card units; objects still require a person. */
export function includeStandaloneMasterCards(cards: readonly MasterCard[], piles: readonly MasterPile[]): MasterPile[] {
  const assigned = new Set(piles.flatMap(pile => pile.cards.map(card => card.id)));
  return [...piles.map(pile => ({ ...pile, cards: [...pile.cards] })),
    ...cards.filter(card => !assigned.has(card.id)).map(card => ({ id: `standalone-${card.id}`, cards: [card] }))];
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
  const composed: MasterCard[][] = holders.map((holder) => [holder]);
  things.forEach((thing, index) => composed[index % composed.length].push(thing));
  for (const place of places) {
    const withoutPlace = composed.find((pile) => personLike(pile[0]));
    if (withoutPlace) withoutPlace.unshift(place);
    else composed.push([place]);
  }
  return composed.map((pileCards, index): MasterPile => ({
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
    const eligibleDeck = [...source.deck, ...source.leaders.filter((card) => card.id !== heir.id).map((card) => ({ ...card, type: "person" as const }))];
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
      armyLimit: 20,
      ...(source.controller === "human" ? { army: [{ id: "human-unassigned", cards: setupCards }] } : {}),
    };
  });
  return { players, activePlayerIndex: prepared.activePlayerIndex, nileFloods: prepared.nileFloods, victoryMode: prepared.victoryMode, effectsMode: prepared.effectsMode, random: prepared.random };
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
  humanPiles = includeStandaloneMasterCards(constructionCards(construction, player.id), humanPiles);
  if (!validateInitialArmy(humanPiles, expected)) throw new Error("Every card must be assigned to a legal pile");
  player.army = humanPiles.map((pile) => ({ ...pile, cards: pile.cards.map((card) => ({ ...card, face: "down" })) }));
  const state: MasterState = {
    version: 1,
    mode: "master",
    players: construction.players,
    activePlayerIndex: construction.activePlayerIndex,
    phase: "attack",
    nileFloods: construction.nileFloods,
    victoryMode: construction.victoryMode,
    effectsMode: construction.effectsMode ?? "off",
    mercenaryReserve: construction.effectsMode === "on" ? createMasterMercenaryReserve() : undefined,
    round: 1,
    random: construction.random,
  };
  if (state.effectsMode === "on") recordMasterTurnBoundary(state);
  return state;
}

export function recordMasterTurnBoundary(state: MasterState): void {
  const snapshot = { ...state, turnBoundaries: undefined };
  state.turnBoundaries = [...(state.turnBoundaries ?? []), JSON.stringify(snapshot)].slice(-2);
}

/** Moving forward queues another full turn for that effect's controller. */
export function activateMasterClockForward(state: MasterState, playerId: string, sourceCardId: string): void {
  if (state.effectsMode !== "on" || !["attack", "effects"].includes(state.phase)) throw new Error("The game clock cannot advance now");
  if (state.pendingEffectComparison?.floodPending) throw new Error("Roll the Nile Flood first");
  const player = state.players.find((candidate) => candidate.id === playerId);
  const card = player && [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((candidate) => candidate.id === sourceCardId);
  if (!card || card.face !== "up" || card.effectSpent || ![3, 85, 129].includes(Number(card.artFile?.match(/^\d+/)?.[0] ?? 0))) throw new Error("That clock effect is unavailable");
  if (state.phase === "attack" && activeMasterPlayer(state).id !== playerId) throw new Error("It is another player's turn");
  if (state.phase === "effects" && state.players[state.pendingEffectComparison!.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  card.effectSpent = true;
  state.extraTurns = { ...state.extraTurns, [playerId]: (state.extraTurns?.[playerId] ?? 0) + 1 };
  if (state.pendingEffectComparison) state.pendingEffectComparison.passes = 0;
}

/** Restores the beginning of the preceding turn, retaining today's random stream. */
export function activateMasterClockBackward(state: MasterState, playerId: string, sourceCardId: string): void {
  if (state.effectsMode !== "on" || !["attack", "effects"].includes(state.phase)) throw new Error("The game clock cannot retreat now");
  if (state.pendingEffectComparison?.floodPending) throw new Error("Roll the Nile Flood first");
  const player = state.players.find((candidate) => candidate.id === playerId);
  const card = player && [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((candidate) => candidate.id === sourceCardId);
  if (!card || card.face !== "up" || card.effectSpent || ![1, 51, 52, 89, 132].includes(Number(card.artFile?.match(/^\d+/)?.[0] ?? 0))) throw new Error("That clock effect is unavailable");
  if (state.phase === "attack" && activeMasterPlayer(state).id !== playerId) throw new Error("It is another player's turn");
  if (state.phase === "effects" && state.players[state.pendingEffectComparison!.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  const boundaries = state.turnBoundaries;
  if (!boundaries || boundaries.length < 2) throw new Error("There is no earlier turn to restore");
  const random = state.random;
  const irreversibleRollbackIds = [...new Set([...(state.irreversibleRollbackIds ?? []), sourceCardId])];
  const restored = JSON.parse(boundaries[boundaries.length - 2]) as MasterState;
  const previousBoundaries = boundaries.slice(0, -1);
  for (const key of Object.keys(state) as Array<keyof MasterState>) delete (state as unknown as Record<string, unknown>)[key];
  Object.assign(state, restored);
  state.random = random;
  state.turnBoundaries = previousBoundaries;
  state.irreversibleRollbackIds = irreversibleRollbackIds;
  for (const recipient of state.players) for (const restoredCard of [recipient.heir, ...recipient.army.flatMap((pile) => pile.cards), ...recipient.unused, ...recipient.discard]) {
    if (irreversibleRollbackIds.includes(restoredCard.id)) restoredCard.effectSpent = true;
  }
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

export function legalMasterTargets(state: MasterState, targetPlayerId: string, stat?: Stat) {
  const attacker = activeMasterPlayer(state);
  const target = state.players.find((candidate) => candidate.id === targetPlayerId);
  if (!target || target.eliminated || target.id === attacker.id || state.phase !== "attack") return [];
  const candidateIds = masterArmySize(target) ? target.army.map((pile) => pile.id) : [target.heir.id];
  return state.effectsMode === "on" && stat === "zeal" ? candidateIds.filter((id) => !findUnit(target, id)!.cards.some((card) => immuneToConversion(state, target, card))) : candidateIds;
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

/** Begins the Effects On comparison without eliminating either formation. */
export function beginMasterEffectComparison(state: MasterState, action: MasterAttack): PendingMasterComparison {
  if (state.effectsMode !== "on" || state.phase !== "attack") throw new Error("Effects comparison is unavailable");
  const attackerPlayer = activeMasterPlayer(state);
  const defender = state.players.find((player) => player.id === action.targetPlayerId);
  if (!defender || !legalMasterAttackers(state).includes(action.attackerUnitId) || !legalMasterTargets(state, defender.id, action.stat).includes(action.targetUnitId)) throw new Error("Illegal comparison");
  if (!["strength", "zeal", "wealth"].includes(action.stat)) throw new Error("Illegal statistic");
  const attacker = findUnit(attackerPlayer, action.attackerUnitId)!;
  const target = findUnit(defender, action.targetUnitId)!;
  for (const card of [...attacker.cards, ...target.cards]) if (card.face === "down") {
    card.face = "up";
    card.revealedRound = state.round;
  }
  const scores: [number, number] = [
    attacker.cards.reduce((sum, card) => sum + effectiveMasterStat(state, attackerPlayer, card, action.stat), 0) + (action.stat === "zeal" ? conversionFormationBonus(attackerPlayer, attacker.cards, "attack") : targetedAttackBonus(attacker.cards, target.cards, action.stat)),
    target.cards.reduce((sum, card) => sum + effectiveMasterStat(state, defender, card, action.stat, "defense"), 0) + (action.stat === "zeal" ? conversionFormationBonus(defender, target.cards, "defense") : 0),
  ];
  const dice: [number, number] = [0, 0];
  const comparison: PendingMasterComparison = {
    attack: action,
    round: state.round,
    attackerPlayerId: attackerPlayer.id,
    defenderPlayerId: defender.id,
    attackerCards: attacker.cards.map((card) => ({ ...card })),
    defenderCards: target.cards.map((card) => ({ ...card })),
    scores,
    dice,
    floodPending: state.nileFloods,
    priorityIndex: state.activePlayerIndex,
    passes: 0,
    guarantees: [],
    cancelled: false,
  };
  state.pendingEffectComparison = comparison;
  state.phase = "effects";
  if (action.stat === "zeal" && target.cards.some((card) => immuneToConversion(state, defender, card))) {
    comparison.cancelled = true;
    comparison.cancelReason = "immunity";
    comparison.passes = state.players.filter((player) => !player.eliminated).length;
  }
  return comparison;
}

export function applyMasterNileFlood(state: MasterState, playerId: string): void {
  const pending = state.pendingEffectComparison;
  if (!pending || state.phase !== "effects" || !pending.floodPending || state.players[pending.priorityIndex].id !== playerId) throw new Error("The Nile Flood roll is unavailable");
  pending.dice = [roll(state), roll(state)];
  pending.floodPending = false;
}

function guaranteeApplies(source: MasterCard, player: MasterPlayer, comparison: PendingMasterComparison): boolean {
  if (source.face !== "up" || source.effectSpent || source.revealedRound === comparison.round) return false;
  const n = Number(source.artFile?.match(/^\d+/)?.[0] ?? 0);
  const attacker = comparison.attackerCards;
  const defender = comparison.defenderCards;
  const active = player.id === comparison.attackerPlayerId;
  const attack = comparison.attack.stat !== "zeal";
  const current = active ? attacker : defender;
  const opposing = active ? defender : attacker;
  const targetsAnother = current.some((card) => card.id !== source.id);
  const opposingPerson = opposing.some((card) => card.type === "person" || card.type === "leader");
  const againstMuslim = opposing.some((card) => card.factionId === "egyptian-muslims");
  const againstEthiopian = opposing.some((card) => card.factionId.startsWith("ethiopian-"));
  const againstNubian = opposing.some((card) => card.factionId === "nubian-christians");
  const againstChristian = opposing.some((card) => card.factionId.endsWith("christians"));
  const opposingInPlace = opposing.some((card) => card.type === "place");
  if (attack) {
    if (active) {
      if ([49, 57].includes(n)) return targetsAnother && (againstNubian || againstEthiopian);
      if ([7, 88].includes(n)) return opposingPerson && againstMuslim && !opposingInPlace;
      if (n === 86) return opposingPerson && againstEthiopian;
      if (n === 130) return opposingPerson && againstChristian;
      if ([133, 134].includes(n)) return opposingPerson && opposing.some((card) => card.factionId !== "egyptian-muslims");
      if (n === 166) return opposingPerson;
    } else {
      if ([2, 4].includes(n)) return targetsAnother;
      if (n === 6) return againstMuslim && current.some((card) => card.factionId.endsWith("christians"));
    }
  } else if (active) {
    if (n === 5) return targetsAnother;
    if ([87, 140].includes(n)) return true;
  } else if (n === 135) return current.some((card) => card.factionId === "egyptian-muslims") && targetsAnother;
  return false;
}

export function availableMasterGuarantees(state: MasterState, playerId: string): MasterCard[] {
  const comparison = state.pendingEffectComparison;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!comparison || !player || state.phase !== "effects" || comparison.floodPending) return [];
  const [attack, defense] = comparison.scores.map((score, index) => score + comparison.dice[index]);
  const attackGuarantee = comparison.guarantees.includes(comparison.attackerPlayerId);
  const defenseGuarantee = comparison.guarantees.includes(comparison.defenderPlayerId);
  const forcedWinner = attackGuarantee === defenseGuarantee ? undefined : attackGuarantee ? comparison.attackerPlayerId : comparison.defenderPlayerId;
  const succeeding = forcedWinner ? player.id === forcedWinner : player.id === comparison.attackerPlayerId ? attack > defense : defense > attack;
  if (succeeding) return [];
  return [player.heir, ...player.army.flatMap((pile) => pile.cards)].filter((card) => guaranteeApplies(card, player, comparison));
}

export function spendMasterGuarantee(state: MasterState, playerId: string, cardId: string): void {
  const pending = state.pendingEffectComparison;
  if (!pending || state.phase !== "effects" || pending.floodPending || state.players[pending.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  const source = availableMasterGuarantees(state, playerId).find((card) => card.id === cardId);
  if (!source) throw new Error("That guarantee is unavailable");
  source.effectSpent = true;
  pending.guarantees.push(playerId);
  pending.passes = 0;
  do { pending.priorityIndex = (pending.priorityIndex + 1) % state.players.length; } while (state.players[pending.priorityIndex].eliminated);
}

export function availableMasterSupporters(state: MasterState, playerId: string, sourceCardId: string): MasterCard[] {
  const pending = state.pendingEffectComparison;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!pending || !player || state.phase !== "effects" || pending.floodPending) return [];
  const source = [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((card) => card.id === sourceCardId);
  const number = Number(source?.artFile?.match(/^\d+/)?.[0] ?? 0);
  if (!source || source.face !== "up" || source.effectSpent || ![14, 105, 156].includes(number)) return [];
  if ([14, 105].includes(number) && pending.attack.stat !== "strength" || number === 156 && pending.attack.stat !== "zeal") return [];
  const participants = new Set([...pending.attackerCards, ...pending.defenderCards].map((card) => card.id));
  return [player.heir, ...player.army.flatMap((pile) => pile.cards)].filter((card) => card.face === "up" && (card.type === "person" || card.type === "leader") && card.id !== source.id && !participants.has(card.id));
}

export function activateMasterSupport(state: MasterState, playerId: string, sourceCardId: string, supporterId: string, side: "attacker" | "defender"): void {
  const pending = state.pendingEffectComparison;
  if (!pending || state.phase !== "effects" || state.players[pending.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  const player = state.players.find((candidate) => candidate.id === playerId)!;
  const source = [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((card) => card.id === sourceCardId)!;
  const supporter = availableMasterSupporters(state, playerId, sourceCardId).find((card) => card.id === supporterId);
  if (!supporter || ([14, 105].includes(Number(source.artFile?.match(/^\d+/)?.[0] ?? 0)) && side !== "defender")) throw new Error("That support is unavailable");
  source.effectSpent = true;
  pending.supports = [...(pending.supports ?? []), { sourceId: source.id, supporterId: supporter.id, controllerId: playerId, side, stat: pending.attack.stat as "strength" | "zeal" }];
  refreshPendingMasterScores(state);
  pending.passes = 0;
  do { pending.priorityIndex = (pending.priorityIndex + 1) % state.players.length; } while (state.players[pending.priorityIndex].eliminated);
}

export function designateMasterPriestProtection(state: MasterState, playerId: string, sourceCardId: string, targetCardId: string): void {
  if (state.effectsMode !== "on" || !["attack", "effects"].includes(state.phase)) throw new Error("Protection cannot be designated now");
  if (state.pendingEffectComparison?.floodPending) throw new Error("Roll the Nile Flood first");
  const player = state.players.find((candidate) => candidate.id === playerId);
  const deployed = player && [player.heir, ...player.army.flatMap((pile) => pile.cards)];
  const source = deployed?.find((card) => card.id === sourceCardId);
  if (!source || source.face !== "up" || source.effectSpent || Number(source.artFile?.match(/^\d+/)?.[0] ?? 0) !== 176 || !deployed?.some((card) => card.id === targetCardId)) throw new Error("That designation is unavailable");
  if (state.phase === "attack" && activeMasterPlayer(state).id !== playerId) throw new Error("It is another player's turn");
  if (state.phase === "effects" && state.players[state.pendingEffectComparison!.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  source.protectedCardId = targetCardId;
  source.effectSpent = true;
  if (state.pendingEffectComparison) {
    state.pendingEffectComparison.passes = 0;
    do { state.pendingEffectComparison.priorityIndex = (state.pendingEffectComparison.priorityIndex + 1) % state.players.length; } while (state.players[state.pendingEffectComparison.priorityIndex].eliminated);
  }
}

function refreshPendingMasterScores(state: MasterState): void {
  const pending = state.pendingEffectComparison;
  if (!pending) return;
  const attacker = state.players.find((player) => player.id === pending.attackerPlayerId)!;
  const defender = state.players.find((player) => player.id === pending.defenderPlayerId)!;
  const attackingUnit = findUnit(attacker, pending.attack.attackerUnitId);
  const defendingUnit = findUnit(defender, pending.attack.targetUnitId);
  if (!attackingUnit || !defendingUnit) return;
  pending.scores = [
    attackingUnit.cards.reduce((sum, part) => sum + effectiveMasterStat(state, attacker, part, pending.attack.stat), 0) + (pending.attack.stat === "zeal" ? conversionFormationBonus(attacker, attackingUnit.cards, "attack") : targetedAttackBonus(attackingUnit.cards, defendingUnit.cards, pending.attack.stat)),
    defendingUnit.cards.reduce((sum, part) => sum + effectiveMasterStat(state, defender, part, pending.attack.stat, "defense"), 0) + (pending.attack.stat === "zeal" ? conversionFormationBonus(defender, defendingUnit.cards, "defense") : 0),
  ];
  for (const support of pending.supports ?? []) {
    const controller = state.players.find((player) => player.id === support.controllerId)!;
    const deployed = [controller.heir, ...controller.army.flatMap((pile) => pile.cards)];
    const source = deployed.find((card) => card.id === support.sourceId);
    const supporter = deployed.find((card) => card.id === support.supporterId);
    if (source?.face === "up" && supporter?.face === "up") pending.scores[support.side === "attacker" ? 0 : 1] += effectiveMasterStat(state, controller, supporter, support.stat, support.side === "attacker" ? "attack" : "defense");
  }
}

/** An interrupt cancels a pending attempt; it refreshes at the next turn boundary. */
export function interruptMasterComparison(state: MasterState, playerId: string, cardId: string): MasterEvent[] {
  const pending = state.pendingEffectComparison;
  if (!pending || state.phase !== "effects" || pending.floodPending || state.players[pending.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  const player = state.players.find((candidate) => candidate.id === playerId)!;
  const source = [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((card) => card.id === cardId);
  const number = Number(source?.artFile?.match(/^\d+/)?.[0] ?? 0);
  if (!source || source.face !== "up" || source.effectSpent || !(pending.attack.stat === "zeal" ? [16, 82, 112].includes(number) : number === 109)) throw new Error("That interrupt is unavailable");
  source.effectSpent = true;
  pending.cancelled = true;
  pending.cancelReason = "interrupt";
  pending.passes = state.players.filter((candidate) => !candidate.eliminated).length;
  return finishMasterEffectComparison(state);
}

export function passMasterEffectOpportunity(state: MasterState, playerId: string): boolean {
  const pending = state.pendingEffectComparison;
  if (!pending || state.phase !== "effects" || pending.floodPending || state.players[pending.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  pending.passes++;
  do { pending.priorityIndex = (pending.priorityIndex + 1) % state.players.length; } while (state.players[pending.priorityIndex].eliminated);
  return pending.passes >= state.players.filter((player) => !player.eliminated).length;
}

export type MasterNpcEffectAction =
  | { kind: "flood" }
  | { kind: "pass" }
  | { kind: "guarantee"; cardId: string }
  | { kind: "interrupt"; cardId: string }
  | { kind: "eliminate"; cardId: string; targetPlayerId: string; targetCardId: string }
  | { kind: "support"; cardId: string; supporterId: string; side: "attacker" | "defender" };

export function chooseMasterNpcEffect(state: MasterState): MasterNpcEffectAction {
  const pending = state.pendingEffectComparison;
  if (state.phase !== "effects" || !pending) throw new Error("No effect choice is pending");
  const player = state.players[pending.priorityIndex];
  if (player.controller !== "npc") throw new Error("A human has the next effect choice");
  if (pending.floodPending) return { kind: "flood" };
  const winning = pending.forcedWinnerId ?? (pending.scores[0] + pending.dice[0] > pending.scores[1] + pending.dice[1] ? pending.attackerPlayerId : pending.scores[0] + pending.dice[0] < pending.scores[1] + pending.dice[1] ? pending.defenderPlayerId : undefined);
  if (winning === player.id) return { kind: "pass" };
  const guarantee = availableMasterGuarantees(state, player.id)[0];
  if (guarantee) return { kind: "guarantee", cardId: guarantee.id };
  const deployed = [player.heir, ...player.army.flatMap((pile) => pile.cards)];
  for (const source of deployed) {
    const target = eligibleMasterEliminationTargets(state, player.id, source.id).find((item) => item.playerId !== player.id && (pending.attackerCards.some((card) => card.id === item.card.id) || pending.defenderCards.some((card) => card.id === item.card.id)));
    if (target) return { kind: "eliminate", cardId: source.id, targetPlayerId: target.playerId, targetCardId: target.card.id };
  }
  const ownSide = player.id === pending.attackerPlayerId ? "attacker" : "defender";
  for (const source of deployed) {
    const supporter = availableMasterSupporters(state, player.id, source.id).sort((a, b) => b[pending.attack.stat] - a[pending.attack.stat])[0];
    if (supporter && (Number(source.artFile?.match(/^\d+/)?.[0] ?? 0) === 156 || ownSide === "defender")) return { kind: "support", cardId: source.id, supporterId: supporter.id, side: ownSide };
  }
  const interrupt = deployed.find((source) => source.face === "up" && !source.effectSpent && (pending.attack.stat === "zeal" ? [16, 82, 112] : [109]).includes(Number(source.artFile?.match(/^\d+/)?.[0] ?? 0)));
  return interrupt ? { kind: "interrupt", cardId: interrupt.id } : { kind: "pass" };
}

/** Resolves the paused comparison after every eligible player has passed. */
export function finishMasterEffectComparison(state: MasterState): MasterEvent[] {
  const pending = state.pendingEffectComparison;
  if (state.phase !== "effects" || !pending || (pending.floodPending && !pending.cancelled) || pending.passes < state.players.filter((player) => !player.eliminated).length) throw new Error("Effect decisions are still pending");
  const attackPlayer = state.players.find((player) => player.id === pending.attackerPlayerId)!;
  const defender = state.players.find((player) => player.id === pending.defenderPlayerId)!;
  const attacker = findUnit(attackPlayer, pending.attack.attackerUnitId);
  const target = findUnit(defender, pending.attack.targetUnitId);
  const events: MasterEvent[] = [
    { type: "attack", attackerPlayerId: attackPlayer.id, attackerUnitId: pending.attack.attackerUnitId, targetPlayerId: defender.id, targetUnitId: pending.attack.targetUnitId, stat: pending.attack.stat },
    { type: "score", playerId: attackPlayer.id, unitId: pending.attack.attackerUnitId, base: pending.scores[0], die: pending.dice[0], total: pending.scores[0] + pending.dice[0] },
    { type: "score", playerId: defender.id, unitId: pending.attack.targetUnitId, base: pending.scores[1], die: pending.dice[1], total: pending.scores[1] + pending.dice[1] },
  ];
  delete state.pendingEffectComparison;
  state.phase = "attack";
  if (pending.forcedWinnerId) {
    const winner = state.players.find((player) => player.id === pending.forcedWinnerId)!;
    const loser = winner.id === defender.id ? attackPlayer : defender;
    if (loser.heir.id === (winner.id === defender.id ? pending.attack.attackerUnitId : pending.attack.targetUnitId)) {
      if (eliminateHeir(state, loser, winner, events)) return events;
    }
    normalizeMasterPiles(state);
    if (!winner.eliminated && masterArmySize(winner) < (winner.armyLimit ?? 20) && winner.unused.length) {
      state.phase = "replenish";
      state.pendingReplenishmentPlayerId = winner.id;
      events.push({ type: "replenishment-available", playerId: winner.id });
    } else advanceTurn(state, events);
    return events;
  }
  if (!attacker || !target) throw new Error("A comparison unit disappeared without an elimination result");
  if (pending.cancelled || (pending.attack.stat === "zeal" && target.cards.some((card) => immuneToConversion(state, defender, card)))) {
    events.push({ type: "cancelled", reason: pending.cancelReason ?? "immunity" });
    normalizeMasterPiles(state);
    advanceTurn(state, events);
    return events;
  }
  const [attackTotal, defenseTotal] = pending.scores.map((score, index) => score + pending.dice[index]);
  const attackerGuarantee = pending.guarantees.includes(attackPlayer.id);
  const defenderGuarantee = pending.guarantees.includes(defender.id);
  const forcedWinner = attackerGuarantee === defenderGuarantee ? undefined : attackerGuarantee ? attackPlayer.id : defender.id;
  if (!forcedWinner && attackTotal === defenseTotal) {
    events.push({ type: "tie" });
    normalizeMasterPiles(state);
    advanceTurn(state, events);
    return events;
  }
  const attackerWon = forcedWinner ? forcedWinner === attackPlayer.id : attackTotal > defenseTotal;
  const winner = attackerWon ? attackPlayer : defender;
  const loser = attackerWon ? defender : attackPlayer;
  const losingUnit = attackerWon ? target : attacker;
  events.push({ type: "defeated", playerId: loser.id, unitId: losingUnit.id, cardIds: losingUnit.cards.map((card) => card.id), heir: losingUnit.heir });
  if (losingUnit.heir) {
    if (eliminateHeir(state, loser, winner, events)) return events;
  } else {
    loser.army = loser.army.filter((pile) => pile.id !== losingUnit.id);
    for (const card of losingUnit.cards) if (!card.mercenary) loser.discard.push({ ...card, face: "up" });
  }
  normalizeMasterPiles(state);
  if (!winner.eliminated && masterArmySize(winner) < (winner.armyLimit ?? 20) && winner.unused.length) {
    state.phase = "replenish";
    state.pendingReplenishmentPlayerId = winner.id;
    events.push({ type: "replenishment-available", playerId: winner.id });
  } else advanceTurn(state, events);
  return events;
}

const eliminationTargets: Record<number, (target: MasterCard) => boolean> = {
  66: (target) => target.factionId === "egyptian-muslims",
  68: (target) => Boolean(target.mercenary),
  136: (target) => target.factionId === "ethiopian-jews",
  144: (target) => target.factionId === "nubian-christians",
  168: (target) => Boolean(target.mercenary),
  174: (target) => target.factionId === "ethiopian-christians",
  183: () => true,
};

export function eligibleMasterEliminationTargets(state: MasterState, playerId: string, sourceCardId: string): Array<{ playerId: string; card: MasterCard }> {
  if (state.effectsMode !== "on" || !["attack", "effects"].includes(state.phase)) return [];
  if (state.pendingEffectComparison?.floodPending) return [];
  const player = state.players.find((candidate) => candidate.id === playerId);
  const source = player && [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((card) => card.id === sourceCardId);
  const number = Number(source?.artFile?.match(/^\d+/)?.[0] ?? 0);
  if (!source || source.face !== "up" || source.effectSpent || !eliminationTargets[number]) return [];
  if (number === 174 ? state.phase !== "attack" || activeMasterPlayer(state).id !== playerId || source.revealedRound === state.round : state.phase !== "effects") return [];
  return state.players.filter((targetPlayer) => !targetPlayer.eliminated).flatMap((targetPlayer) => [targetPlayer.heir, ...targetPlayer.army.flatMap((pile) => pile.cards)]
    .filter((target) => target.id !== source.id && (target.type !== "leader" || (targetPlayer.id !== playerId && masterArmySize(targetPlayer) === 0)) && eliminationTargets[number](target))
    .map((card) => ({ playerId: targetPlayer.id, card })));
}

export function eliminateWithMasterEffect(state: MasterState, playerId: string, sourceCardId: string, targetPlayerId: string, targetCardId: string): MasterCard {
  if (state.phase === "effects" && state.players[state.pendingEffectComparison!.priorityIndex].id !== playerId) throw new Error("It is another player's effect opportunity");
  const eligible = eligibleMasterEliminationTargets(state, playerId, sourceCardId);
  if (!eligible.some((item) => item.playerId === targetPlayerId && item.card.id === targetCardId)) throw new Error("That elimination target is unavailable");
  const sourcePlayer = state.players.find((player) => player.id === playerId)!;
  const source = [sourcePlayer.heir, ...sourcePlayer.army.flatMap((pile) => pile.cards)].find((card) => card.id === sourceCardId)!;
  const targetPlayer = state.players.find((player) => player.id === targetPlayerId)!;
  const target = eligible.find((item) => item.playerId === targetPlayerId && item.card.id === targetCardId)!.card;
  source.effectSpent = true;
  if (target.id === targetPlayer.heir.id) {
    targetPlayer.eliminated = true;
    const surviving = state.players.filter((player) => !player.eliminated);
    if (state.victoryMode === "standard" || surviving.length === 1) {
      state.winnerId = state.victoryMode === "standard" ? playerId : surviving[0]?.id;
      state.phase = "complete";
      delete state.pendingEffectComparison;
    }
  } else {
    const pile = targetPlayer.army.find((candidate) => candidate.cards.some((part) => part.id === target.id))!;
    pile.cards = pile.cards.filter((part) => part.id !== target.id);
    if (!state.pendingEffectComparison) separateIllegalMasterPile(targetPlayer, pile);
    else if (!pile.cards.length) targetPlayer.army = targetPlayer.army.filter((item) => item.id !== pile.id);
  }
  if (!target.mercenary) targetPlayer.discard.push({ ...target, face: "up" });
  const pending = state.pendingEffectComparison;
  if (pending) {
    const attackPlayer = state.players.find((player) => player.id === pending.attackerPlayerId)!;
    const defending = state.players.find((player) => player.id === pending.defenderPlayerId)!;
    const attacker = findUnit(attackPlayer, pending.attack.attackerUnitId);
    const defender = findUnit(defending, pending.attack.targetUnitId);
    if (target.id === attackPlayer.heir.id && targetPlayer.id === attackPlayer.id) pending.forcedWinnerId = defending.id;
    else if (target.id === defending.heir.id && targetPlayer.id === defending.id) pending.forcedWinnerId = attackPlayer.id;
    else if (!attacker || !attacker.cards.length) pending.forcedWinnerId = defending.id;
    else if (!defender || !defender.cards.length) pending.forcedWinnerId = attackPlayer.id;
    else refreshPendingMasterScores(state);
    pending.passes = 0;
    do { pending.priorityIndex = (pending.priorityIndex + 1) % state.players.length; } while (state.players[pending.priorityIndex].eliminated);
  }
  return target;
}

export type MasterArmyEffectResult = "deployed" | "recovered" | "drawn" | "no-result" | "reserve-empty";

/** One-time army actions, activated on the controller's turn before the main comparison. */
export function activateMasterArmyEffect(state: MasterState, playerId: string, sourceCardId: string, destinationPileId?: string): MasterArmyEffectResult {
  if (state.effectsMode !== "on" || !["attack", "effects"].includes(state.phase)) throw new Error("This effect is unavailable now");
  if (state.pendingEffectComparison?.floodPending) throw new Error("Roll the Nile Flood first");
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || (state.phase === "attack" && activeMasterPlayer(state).id !== playerId) || (state.phase === "effects" && state.players[state.pendingEffectComparison!.priorityIndex].id !== playerId)) throw new Error("It is another player's effect opportunity");
  const source = [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((card) => card.id === sourceCardId);
  const number = Number(source?.artFile?.match(/^\d+/)?.[0] ?? 0);
  const recruitment = [10, 12, 141].includes(number);
  if (!source || source.face !== "up" || source.effectSpent || (state.phase === "effects" ? !recruitment : source.revealedRound !== undefined && source.revealedRound >= state.round)) throw new Error("The effect is unavailable");
  if (![8, 10, 12, 75, 84, 110, 138, 141].includes(number)) throw new Error("This card has no army action");
  const destination = destinationPileId ? player.army.find((pile) => pile.id === destinationPileId) : undefined;
  if (destinationPileId && !destination) throw new Error("Unknown destination pile");
  if (recruitment && !(state.mercenaryReserve?.length)) return "reserve-empty";
  const overLimit = masterArmySize(player) >= (player.armyLimit ?? 20);
  source.effectSpent = true;
  if ([75, 138].includes(number)) {
    player.armyLimit = (player.armyLimit ?? 20) + 1;
    for (let count = 0; count < 2 && masterArmySize(player) < player.armyLimit && player.unused.length; count++) {
      const drawn = player.unused.shift()!;
      drawn.face = "up";
      player.army.push({ id: `${player.id}-effect-${state.round}-${drawn.id}`, cards: [drawn] });
    }
    return "drawn";
  }
  if (overLimit) return "no-result";
  const pool = recruitment ? state.mercenaryReserve! : player.discard;
  if (!pool.length) return "no-result";
  const legalChoices = pool.filter((card) => !destination ? card.type !== "thing" : Boolean(legalMasterPileAddition(destination.cards, card)));
  if (!legalChoices.length) return "no-result";
  const chosen = legalChoices[Math.floor(randomSource(state.random)() * legalChoices.length)];
  pool.splice(pool.indexOf(chosen), 1);
  chosen.face = "up";
  if (destination) destination.cards = legalMasterPileAddition(destination.cards, chosen)!;
  else player.army.push({ id: `${player.id}-effect-${state.round}-${chosen.id}`, cards: [chosen] });
  const pending = state.pendingEffectComparison;
  if (pending) {
    if (destination?.id === pending.attack.attackerUnitId && player.id === pending.attackerPlayerId) pending.attackerCards.push({ ...chosen });
    if (destination?.id === pending.attack.targetUnitId && player.id === pending.defenderPlayerId) pending.defenderCards.push({ ...chosen });
    refreshPendingMasterScores(state);
    pending.passes = 0;
    do { pending.priorityIndex = (pending.priorityIndex + 1) % state.players.length; } while (state.players[pending.priorityIndex].eliminated);
  }
  return chosen.mercenary ? "deployed" : "recovered";
}

function separateIllegalMasterPile(player: MasterPlayer, pile: MasterPile): void {
  if (!pile.cards.length) { player.army = player.army.filter((item) => item.id !== pile.id); return; }
  if (pile.cards.length === 1) return;
  if (isLegalInitialPile(pile.cards)) return;
  player.army = player.army.filter((item) => item.id !== pile.id);
  for (const card of pile.cards) player.army.push({ id: `${pile.id}-separated-${card.id}`, cards: [card] });
}

function normalizeMasterPiles(state: MasterState): void {
  for (const player of state.players) for (const pile of [...player.army]) separateIllegalMasterPile(player, pile);
}

/** Random discard selects only unrevealed army cards, never the heir or reserve. */
export function activateMasterRandomDiscard(state: MasterState, playerId: string, sourceCardId: string, targetPlayerId: string): MasterCard | undefined {
  if (state.effectsMode !== "on" || state.phase !== "attack" || activeMasterPlayer(state).id !== playerId) throw new Error("This effect is available on its controller's turn");
  const player = activeMasterPlayer(state);
  const source = [player.heir, ...player.army.flatMap((pile) => pile.cards)].find((card) => card.id === sourceCardId);
  if (!source || source.face !== "up" || source.effectSpent || source.revealedRound === state.round || ![92, 103].includes(Number(source.artFile?.match(/^\d+/)?.[0] ?? 0))) throw new Error("That random discard is unavailable");
  const target = state.players.find((candidate) => candidate.id === targetPlayerId && candidate.id !== playerId && !candidate.eliminated);
  if (!target) throw new Error("Unknown opponent");
  source.effectSpent = true;
  const eligible = target.army.flatMap((pile) => pile.cards.filter((card) => card.face === "down").map((card) => ({ pile, card })));
  if (!eligible.length) return undefined;
  const { pile, card } = eligible[Math.floor(randomSource(state.random)() * eligible.length)];
  pile.cards = pile.cards.filter((candidate) => candidate.id !== card.id);
  target.discard.push({ ...card, face: "up" });
  separateIllegalMasterPile(target, pile);
  return card;
}

export type MasterNpcArmyAction =
  | { kind: "army"; cardId: string }
  | { kind: "clock-forward"; cardId: string }
  | { kind: "random-discard"; cardId: string; targetPlayerId: string }
  | { kind: "eliminate"; cardId: string; targetPlayerId: string; targetCardId: string }
  | { kind: "priest"; cardId: string; targetCardId: string };

export function chooseMasterNpcArmyEffect(state: MasterState): MasterNpcArmyAction | undefined {
  if (state.effectsMode !== "on" || state.phase !== "attack" || activeMasterPlayer(state).controller !== "npc") return;
  const player = activeMasterPlayer(state);
  const deployed = [player.heir, ...player.army.flatMap((pile) => pile.cards)];
  for (const source of deployed) {
    if (source.face !== "up" || source.effectSpent || source.revealedRound === state.round) continue;
    const number = Number(source.artFile?.match(/^\d+/)?.[0] ?? 0);
    if ([75, 138].includes(number)) return { kind: "army", cardId: source.id };
    if ([10, 12, 141].includes(number) && state.mercenaryReserve?.length && masterArmySize(player) < (player.armyLimit ?? 20)) return { kind: "army", cardId: source.id };
    if ([8, 84, 110].includes(number) && player.discard.some((card) => card.type !== "thing") && masterArmySize(player) < (player.armyLimit ?? 20)) return { kind: "army", cardId: source.id };
    if ([92, 103].includes(number)) {
      const opponent = state.players.find((candidate) => candidate.id !== player.id && !candidate.eliminated && candidate.army.some((pile) => pile.cards.some((card) => card.face === "down")));
      if (opponent) return { kind: "random-discard", cardId: source.id, targetPlayerId: opponent.id };
    }
    if (number === 174) {
      const target = eligibleMasterEliminationTargets(state, player.id, source.id).find((item) => item.playerId !== player.id);
      if (target) return { kind: "eliminate", cardId: source.id, targetPlayerId: target.playerId, targetCardId: target.card.id };
    }
    if (number === 176) {
      const target = [...deployed].filter((card) => card.id !== source.id).sort((a, b) => b.zeal - a.zeal)[0];
      if (target) return { kind: "priest", cardId: source.id, targetCardId: target.id };
    }
    if ([3, 85, 129].includes(number)) return { kind: "clock-forward", cardId: source.id };
  }
}

function roll(state: MasterState) {
  return state.nileFloods ? Math.floor(randomSource(state.random)() * 6) + 1 : 0;
}

function refreshMasterInterrupts(state: MasterState): void {
  if (state.effectsMode !== "on") return;
  for (const player of state.players) for (const card of [player.heir, ...player.army.flatMap((pile) => pile.cards)]) {
    if ([16, 82, 109, 112].includes(Number(card.artFile?.match(/^\d+/)?.[0] ?? 0))) card.effectSpent = false;
  }
}

function advanceTurn(state: MasterState, events: MasterEvent[]) {
  delete state.pendingReplenishmentPlayerId;
  const active = activeMasterPlayer(state);
  if (state.effectsMode === "on" && !active.eliminated && (state.extraTurns?.[active.id] ?? 0) > 0) {
    state.extraTurns![active.id]--;
    state.round++;
    state.phase = "attack";
    refreshMasterInterrupts(state);
    recordMasterTurnBoundary(state);
    events.push({ type: "turn-advanced", playerId: active.id });
    return;
  }
  for (let offset = 1; offset <= state.players.length; offset++) {
    const index = (state.activePlayerIndex + offset) % state.players.length;
    if (!state.players[index].eliminated) {
      state.activePlayerIndex = index;
      state.round++;
      state.phase = "attack";
      refreshMasterInterrupts(state);
      if (state.effectsMode === "on") recordMasterTurnBoundary(state);
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
  if (!winner.eliminated && masterArmySize(winner) < (winner.armyLimit ?? 20) && winner.unused.length) {
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
  if (masterArmySize(player) >= (player.armyLimit ?? 20)) throw new Error("Army is already full");
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
  const stat = [...stats].sort((a, b) => unitValue(attacker, b) - unitValue(attacker, a)).find((candidate) => legalMasterTargets(state, targetPlayer.id, candidate).length) ?? "strength";
  const targetIds = legalMasterTargets(state, targetPlayer.id, stat);
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
