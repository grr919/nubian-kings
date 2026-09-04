export const MULTIPLAYER_ROOM_RETENTION_DAYS = 7;

export function multiplayerCleanupCutoff(now = new Date()) {
  return new Date(now.getTime() - MULTIPLAYER_ROOM_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function authorizedCronRequest(authorization: string | null, secret = process.env.CRON_SECRET) {
  return Boolean(secret && authorization === `Bearer ${secret}`);
}
