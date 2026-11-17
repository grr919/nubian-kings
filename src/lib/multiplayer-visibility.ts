/**
 * Room owners renew leases only while their page is visible. A background tab
 * must not indefinitely prevent another browser from reclaiming a seat.
 */
export function shouldPollMultiplayerRoom(visibilityState: string): boolean {
  return visibilityState !== "hidden";
}
