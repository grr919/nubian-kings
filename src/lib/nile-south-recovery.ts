/** Password rules shared by password recovery and its regression tests. */
export function recoveryPasswordError(password: string, confirmation: string): string | undefined {
  if (password.length < 12) return "Choose a password containing at least 12 characters.";
  if (password !== confirmation) return "The new passwords do not match.";
  return undefined;
}

/** Email links must return to this app, never an arbitrary destination. */
export function recoveryRedirectUrl(origin: string): string {
  return new URL("/account/recover", origin).toString();
}
