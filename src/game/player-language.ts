import type { AmateurEvent, AmateurState } from "./amateur";
import type { BeginnerState, GameEvent } from "./types";

const NAMES: Record<string, string> = {
  "nubian-christians": "Nubian Christians",
  "egyptian-christians": "Egyptian Christians",
  "ethiopian-christians": "Ethiopian Christians",
  "egyptian-muslims": "Egyptian Muslims",
  "ethiopian-jews": "Ethiopian Jews",
};

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
  if (event.type === "tie") return "The comparison is tied. Another card must be played.";
  if (event.type === "comparison-won") return `${who} won the comparison.`;
  if (event.type === "player-eliminated") return player?.controller === "human" ? "You were eliminated." : `${who} was eliminated.`;
  if (event.type === "selector-advanced") return player?.controller === "human" ? "You choose the next trait." : `${who} chooses the next trait.`;
  if (event.type === "game-won") return `${who} won the game.`;
  return "";
}
