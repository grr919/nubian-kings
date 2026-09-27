import type { AmateurEvent, AmateurState } from "./amateur";
import type { BeginnerState, GameEvent, Stat } from "./types";

const NAMES: Record<string, string> = {
  "nubian-christians": "Nubian Christians",
  "egyptian-christians": "Egyptian Christians",
  "ethiopian-christians": "Ethiopian Christians",
  "egyptian-muslims": "Egyptian Muslims",
  "ethiopian-jews": "Ethiopian Jews",
};

interface OutcomePlayer {
  id: string;
  factionId: string;
  controller: "human" | "npc";
}

export function possessive(name: string) {
  return `${name}${name.endsWith("s") ? "'" : "'s"}`;
}

export function battleTitle(stat: Stat) {
  return `${stat[0].toUpperCase()}${stat.slice(1)} Comparison`;
}

export function comparisonActionText(
  stat: Stat,
  actor: string,
  targetForces: string,
  actorUsesPluralVerb = actor === "You",
  wealthPossessive = actor === "You" ? "your" : "their",
) {
  const attack = actorUsesPluralVerb ? "attack" : "attacks";
  const attempt = actorUsesPluralVerb ? "attempt" : "attempts";
  if (stat === "strength") return `${actor} ${attack} ${targetForces}.`;
  if (stat === "zeal") return `${actor} ${attempt} to convert some of ${targetForces}.`;
  return `${actor} ${attempt} to influence some of ${targetForces} with ${wealthPossessive} wealth.`;
}

/** Master uses a different action for each statistic, while the game engine calls all three attacks. */
export function masterActionLanguage(stat: Stat) {
  if (stat === "zeal") return { noun: "conversion attempt", verb: "attempt to convert", actor: "Converting pile", target: "Conversion target", title: "Zeal Comparison" };
  if (stat === "wealth") return { noun: "attempt to influence with wealth", verb: "attempt to influence", actor: "Influencing pile", target: "Influence target", title: "Wealth Comparison" };
  return { noun: "attack", verb: "attack", actor: "Attacking pile", target: "Defending pile", title: "Strength Comparison" };
}

export function masterRoundOutcomeText(players: OutcomePlayer[], winnerId: string | undefined, participantIds: string[], stat: Stat, tied = false) {
  return tied ? `The ${masterActionLanguage(stat).noun} ends without a victor.` : roundOutcomeText(players, winnerId, participantIds, stat);
}

export function masterMultiplayerOutcomeText(stat: Stat, winnerId: string | undefined, participantIds: string[], viewerId: string, winnerName?: string, tied = false) {
  return tied ? `The ${masterActionLanguage(stat).noun} ends without a victor.` : multiplayerRoundOutcomeText(stat, winnerId, participantIds, viewerId, winnerName);
}

function victoryText(stat: Stat, subject: "human" | "npc", winnerName?: string) {
  const owner = subject === "human" ? "Your" : possessive(winnerName!);
  if (stat === "strength") return `${owner} strength brings ${subject === "human" ? "you" : "them"} victory in battle.`;
  if (stat === "zeal") return `${owner} zeal converts some of the ${subject === "human" ? "enemy" : "opposing"} forces.`;
  return `${owner} wealth wins enemy support.`;
}

export function roundOutcomeText(players: OutcomePlayer[], winnerId: string | undefined, participantIds: string[], stat: Stat, tied = false) {
  if (tied) return `The ${stat} comparison ends without a victor.`;
  const winner = players.find((player) => player.id === winnerId);
  if (!winner) return `The ${stat} comparison has ended.`;
  if (winner.controller === "human") return victoryText(stat, "human");
  const human = players.find((player) => player.controller === "human");
  const winnerName = NAMES[winner.factionId];
  if (human && participantIds.includes(human.id)) {
    const owner = possessive(winnerName);
    if (stat === "strength") return `${owner} strength defeats your forces in battle.`;
    if (stat === "zeal") return `${owner} zeal converts some of your forces.`;
    return `${owner} wealth wins support among your forces.`;
  }
  return victoryText(stat, "npc", winnerName);
}

export function multiplayerRoundOutcomeText(stat: Stat, winnerId: string | undefined, participantIds: string[], viewerId: string, winnerName?: string, tied = false) {
  if (tied) return `The ${stat} comparison ends without a victor.`;
  if (!winnerId || !winnerName) return `The ${stat} comparison has ended.`;
  if (winnerId === viewerId) return victoryText(stat, "human");
  const owner = possessive(winnerName);
  if (participantIds.includes(viewerId)) {
    if (stat === "strength") return `${owner} strength defeats your forces in battle.`;
    if (stat === "zeal") return `${owner} zeal converts some of your forces.`;
    return `${owner} wealth wins support among your forces.`;
  }
  return victoryText(stat, "npc", winnerName);
}

export function amateurEventText(event: AmateurEvent, state: AmateurState) {
  const player = "playerId" in event ? state.players.find((item) => item.id === event.playerId) : undefined;
  const human = player?.controller === "human";
  const who = player ? (human ? "You" : NAMES[player.factionId]) : "A player";
  const faction = player ? NAMES[player.factionId] : undefined;
  const whose = player ? (human ? "Your" : `${faction}${faction?.endsWith("s") ? "'" : "'s"}`) : "A player's";
  if (event.type === "tie") return "The attack ended in a tie. Neither card was defeated.";
  if (event.type === "defeated") return `${whose} ${event.heir ? "heir" : "card"} was defeated.`;
  if (event.type === "replenishment-available") return `${who} may replenish the army.`;
  if (event.type === "replenished") return event.source === "discard" ? `${who} restored a discarded card.` : `${who} drew a hidden card from the unused deck.`;
  if (event.type === "replenishment-skipped") return `${who} declined replenishment.`;
  if (event.type === "player-eliminated") return `${whose} heir was eliminated.`;
  if (event.type === "turn-advanced") return human ? "You begin the next turn." : `${who} begins the next turn.`;
  if (event.type === "game-won") return `${who} won the game.`;
  return "";
}

export function beginnerEventText(event: GameEvent, state: BeginnerState) {
  const player = "playerId" in event ? state.players.find((item) => item.id === event.playerId) : undefined;
  const who = player ? (player.controller === "human" ? "You" : NAMES[player.factionId]) : "A player";
  if (event.type === "stat-selected") return comparisonActionText(event.stat, who, player?.controller === "human" ? "the opposing forces" : "your forces", true, player?.controller === "human" ? "your" : "their");
  if (event.type === "card-revealed") return `${who} revealed ${player?.cards.find((card) => card.id === event.cardId)?.name ?? "a card"}.`;
  if (event.type === "score") return `${who} scored ${event.total}${event.die ? ` (${event.base} + ${event.die})` : ""}.`;
  if (event.type === "die-rolled") return `${who} rolled ${event.value}.`;
  if (event.type === "cards-discarded") return `${who} discarded ${event.cardIds.length === 1 ? "a card" : `${event.cardIds.length} cards`}.`;
  if (event.type === "tie") return `The battle of ${state.selectedStat} is tied. Another card must be played.`;
  if (event.type === "comparison-won") return `${who} prevailed in the battle of ${state.selectedStat}.`;
  if (event.type === "player-eliminated") return player?.controller === "human" ? "You were eliminated." : `${who} was eliminated.`;
  if (event.type === "selector-advanced") return player?.controller === "human" ? "You choose the next trait." : `${who} chooses the next trait.`;
  if (event.type === "game-won") return `${who} won the game.`;
  return "";
}
