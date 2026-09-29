export type RematchVotes = Record<string, boolean>;

type Settings = { rematchVotes?: RematchVotes };
type Participant = { user_id: string | null; controller: "human" | "npc" };

/** Votes belong to the completed game and are saved with its revision. */
export function castRematchVote<T extends Settings>(
  room: { status: string; revision: number; settings: T },
  players: Participant[],
  userId: string,
  request: { accept?: unknown; revision?: unknown },
): { settings: T; ready: boolean } | { error: string; status: number } {
  if (room.status !== "complete") return { error: "The current game must be complete before a rematch.", status: 409 };
  if (request.revision !== room.revision) return { error: "The room changed. Review the latest rematch choices and try again.", status: 409 };
  if (typeof request.accept !== "boolean") return { error: "Choose Yes or No for the rematch.", status: 400 };
  const humans = players.filter((player) => player.controller === "human");
  if (!humans.some((player) => player.user_id === userId)) return { error: "Only a current human participant can answer.", status: 403 };
  const votes = Object.fromEntries(humans.flatMap((player) => player.user_id && typeof room.settings.rematchVotes?.[player.user_id] === "boolean" ? [[player.user_id, room.settings.rematchVotes[player.user_id]]] : []));
  votes[userId] = request.accept;
  const ready = humans.length > 0 && humans.every((player) => player.user_id && votes[player.user_id] === true);
  const settings: T = { ...room.settings, rematchVotes: votes };
  if (ready) delete settings.rematchVotes;
  return { settings, ready };
}
