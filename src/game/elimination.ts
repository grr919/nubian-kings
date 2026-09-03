interface EliminatedGameState {
  phase: string;
  players: Array<{ controller: "human" | "npc"; eliminated: boolean }>;
}

export function humanMayEndEliminatedGame(state: EliminatedGameState | undefined) {
  if (!state || state.phase === "complete") return false;
  return state.players.some((player) => player.controller === "human" && player.eliminated);
}
