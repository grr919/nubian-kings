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

function possessive(name: string) {
  return `${name}${name.endsWith("s") ? "'" : "'s"}`;
}

export function battleTitle(stat: Stat) {
  return `A Battle of ${stat[0].toUpperCase()}${stat.slice(1)}`;
}

function victoryText(stat: Stat, subject: "human" | "npc", winnerName?: string) {
  const owner = subject === "human" ? "Your" : possessive(winnerName!);
  if (stat === "strength") return `${owner} strength brings ${subject === "human" ? "you" : "them"} victory in battle.`;
  if (stat === "zeal") return `${owner} zeal converts some of the ${subject === "human" ? "enemy" : "opposing"} forces.`;
  return `${owner} wealth wins enemy support.`;
}

export function roundOutcomeText(players: OutcomePlayer[], winnerId: string | undefined, participantIds: string[], stat: Stat, tied = false) {
  if (tied) return `The battle of ${stat} ends without a victor.`;
  const winner = players.find((player) => player.id === winnerId);
  if (!winner) return `The battle of ${stat} has ended.`;
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
  if (event.type === "stat-selected") return `${who} chose ${event.stat}.`;
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
