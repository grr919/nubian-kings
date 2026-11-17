"use client";

const PREFIX = "nk:controller:v1:";

/** Per-tab 256-bit controller token. Kept out of URLs and persisted logins. */
export function roomControlToken(code: string): string {
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error("Invalid multiplayer room code.");
  const key = PREFIX + code;
  let token = sessionStorage.getItem(key);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    token = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem(key, token);
  }
  return token;
}

export function controllerHeaders(path: string): Record<string, string> {
  const match = path.match(/^\/api\/multiplayer\/(?:rooms|amateur|master)\/([A-Z2-9]{6})(?:\/|$)/);
  const code = match?.[1];
  if (code) return { "X-NK-Controller": roomControlToken(code) };
  return {};
}

export function takeoverHeaders(code: string) {
  return { "X-NK-Controller": roomControlToken(code) };
}
