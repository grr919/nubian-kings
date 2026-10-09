/** A declared winner or completed phase ends the saved-game continuation. */
export function canResumeGame(state: { phase: string; winnerId?: string } | undefined): boolean {
  return Boolean(state && state.phase !== "complete" && !state.winnerId);
}
