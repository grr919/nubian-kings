import { randomSource } from "./random";
import type { BeginnerState, Card, GameEvent, Player, Stat, TieState } from "./types";

export type RandomSource = () => number;

export function surviving(player: Player) {
  return player.cards.filter((card) => !card.discarded);
}

export function nextCard(player: Player, excluded = new Set<string>()): Card | undefined {
  if (!surviving(player).length) return;
  for (let offset = 0; offset < player.cards.length; offset++) {
    const index = (player.cursor + offset) % player.cards.length;
    const card = player.cards[index];
    if (!card.discarded && !excluded.has(card.id)) {
      player.cursor = (index + 1) % player.cards.length;
      return card;
    }
  }
}

export function score(card: Card, stat: Stat, die = 0) {
  return card[stat] + die;
}

export function eliminateEmptyPlayers(state: BeginnerState) {
  for (const player of state.players) player.eliminated = surviving(player).length === 0;
  const active = state.players.filter((player) => !player.eliminated);
  if (active.length === 1) {
    state.phase = "complete";
    state.winnerId = active[0].id;
  }
}

export function advanceSelector(state: BeginnerState) {
  for (let offset = 1; offset <= state.players.length; offset++) {
    const index = (state.selectorIndex + offset) % state.players.length;
    if (!state.players[index].eliminated) {
      state.selectorIndex = index;
      return;
    }
  }
}

const die = (rng: RandomSource) => Math.floor(rng() * 6) + 1;

function getPlayer(state: BeginnerState, id: string) {
  const player = state.players.find((item) => item.id === id);
  if (!player) throw new Error(`Unknown player ${id}`);
  return player;
}

function discard(state: BeginnerState, ids: string[], events: GameEvent[]) {
  for (const id of ids) {
    const player = getPlayer(state, id);
    const cardIds = state.tie?.usedCardIds[id] ?? [];
    for (const cardId of cardIds) {
      const card = player.cards.find((item) => item.id === cardId);
      if (card) card.discarded = true;
    }
    if (cardIds.length) events.push({ type: "cards-discarded", playerId: id, cardIds: [...cardIds] });
  }
}

function eliminate(state: BeginnerState, events: GameEvent[]) {
  for (const player of state.players) {
    if (!player.eliminated && !surviving(player).length) {
      player.eliminated = true;
      events.push({ type: "player-eliminated", playerId: player.id });
    }
  }
  const active = state.players.filter((player) => !player.eliminated);
  if (active.length === 1) {
    state.phase = "complete";
    state.winnerId = active[0].id;
    events.push({ type: "game-won", playerId: active[0].id });
    return true;
  }
  return false;
}

function finish(state: BeginnerState, winnerId: string, events: GameEvent[]) {
  const participants = state.tie?.participantIds ?? [];
  discard(state, participants.filter((id) => id !== winnerId), events);
  events.push({ type: "comparison-won", playerId: winnerId });
  state.tie = undefined;
  state.selectedStat = undefined;
  if (eliminate(state, events)) return;
  advanceSelector(state);
  state.round++;
  state.phase = "select";
  events.push({ type: "selector-advanced", playerId: state.players[state.selectorIndex].id });
}

function exhaustedTie(state: BeginnerState, events: GameEvent[], rng: RandomSource) {
  let contenders = [...(state.tie?.participantIds ?? [])];
  for (let guard = 0; guard < 100 && contenders.length > 1; guard++) {
    const rolls = contenders.map((id) => ({ id, value: die(rng) }));
    for (const roll of rolls) events.push({ type: "die-rolled", playerId: roll.id, value: roll.value, reason: "exhausted-tie" });
    const high = Math.max(...rolls.map((roll) => roll.value));
    contenders = rolls.filter((roll) => roll.value === high).map((roll) => roll.id);
  }
  if (contenders.length !== 1) throw new Error("Unable to resolve exhausted tie");
  finish(state, contenders[0], events);
}

const hasAvailable = (player: Player, excluded: Set<string>) => player.cards.some((card) => !card.discarded && !excluded.has(card.id));

export function playComparison(state: BeginnerState, stat: Stat, suppliedRng?: RandomSource): GameEvent[] {
  if (state.phase !== "select" && state.phase !== "tie") throw new Error("Comparison cannot be played now");
  const rng = suppliedRng ?? randomSource(state.random);
  const events: GameEvent[] = [];
  const selector = state.players[state.selectorIndex];
  events.push({ type: "stat-selected", playerId: selector.id, stat });
  state.selectedStat = stat;
  if (!state.tie) {
    const ids = state.players.filter((player) => !player.eliminated).map((player) => player.id);
    state.tie = { participantIds: ids, usedCardIds: Object.fromEntries(ids.map((id) => [id, []])) } as TieState;
  }
  let entries = state.tie.participantIds.map((id) => {
    const player = getPlayer(state, id);
    const used = new Set(state.tie!.usedCardIds[id]);
    return { id, player, card: nextCard(player, used) };
  });
  if (entries.every((entry) => !entry.card)) {
    exhaustedTie(state, events, rng);
    return events;
  }
  const exhausted = entries.filter((entry) => !entry.card).map((entry) => entry.id);
  if (exhausted.length) {
    discard(state, exhausted, events);
    entries = entries.filter((entry) => Boolean(entry.card));
    state.tie.participantIds = entries.map((entry) => entry.id);
    if (entries.length === 1) {
      finish(state, entries[0].id, events);
      return events;
    }
  }
  const results = entries.map(({ id, card }) => {
    const played = card!;
    const wasFaceDown = played.face === "down";
    played.face = "up";
    state.tie!.usedCardIds[id].push(played.id);
    events.push({ type: "card-revealed", playerId: id, cardId: played.id, wasFaceDown });
    const roll = state.nileFloods ? die(rng) : 0;
    if (roll) events.push({ type: "die-rolled", playerId: id, value: roll, reason: "nile-floods" });
    const total = score(played, stat, roll);
    events.push({ type: "score", playerId: id, cardId: played.id, base: played[stat], die: roll, total });
    return { id, total };
  });
  const high = Math.max(...results.map((result) => result.total));
  const leaders = results.filter((result) => result.total === high).map((result) => result.id);
  const lower = state.tie.participantIds.filter((id) => !leaders.includes(id));
  discard(state, lower, events);
  state.tie.participantIds = leaders;
  if (leaders.length === 1) {
    finish(state, leaders[0], events);
    return events;
  }
  state.phase = "tie";
  events.push({ type: "tie", playerIds: [...leaders] });
  if (leaders.every((id) => !hasAvailable(getPlayer(state, id), new Set(state.tie!.usedCardIds[id])))) exhaustedTie(state, events, rng);
  return events;
}
