export const DISCONNECTED_PLAYER_GRACE_MS = 2 * 60 * 1000;

export function disconnectedPlayerMayBeReplaced(lastSeenAt: string | null | undefined, now = new Date()) {
  if (!lastSeenAt) return false;
  const lastSeen = Date.parse(lastSeenAt);
  return Number.isFinite(lastSeen) && now.getTime() - lastSeen >= DISCONNECTED_PLAYER_GRACE_MS;
}

export function disconnectedPlayerCutoff(now = new Date()) {
  return new Date(now.getTime() - DISCONNECTED_PLAYER_GRACE_MS).toISOString();
}
