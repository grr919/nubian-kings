export function validateNileSouthProfile(input: unknown):
  | { username: string; displayName: string }
  | { error: string } {
  if (typeof input !== "object" || input === null) return { error: "Provide a username and display name." };
  const value = input as Record<string, unknown>;
  const username = typeof value.username === "string" ? value.username.trim().toLowerCase() : "";
  const displayName = typeof value.displayName === "string" ? value.displayName.trim().replace(/\s+/g, " ") : "";
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(username)) return { error: "Use 3–24 lowercase letters, digits, or underscores, beginning with a letter." };
  if (!displayName || displayName.length > 40) return { error: "Use a display name of 1–40 characters." };
  return { username, displayName };
}

export function isPermanentVerifiedUser(user: { is_anonymous?: boolean; email?: string; email_confirmed_at?: string | null; identities?: unknown[] }): boolean {
  return user.is_anonymous === false && Boolean(user.email && user.email_confirmed_at && user.identities?.length);
}
