import { describe, expect, it } from "vitest";
import { isPermanentVerifiedUser, validateNileSouthProfile } from "./nile-south-profile";

describe("Nile South player account validation", () => {
  it("normalizes usernames and display names", () => {
    expect(validateNileSouthProfile({ username: " Nubian_King7 ", displayName: "  Nubian   King " }))
      .toEqual({ username: "nubian_king7", displayName: "Nubian King" });
  });
  it("rejects invalid names", () => {
    expect(validateNileSouthProfile({ username: "1bad", displayName: "Player" })).toHaveProperty("error");
    expect(validateNileSouthProfile({ username: "valid_name", displayName: " " })).toHaveProperty("error");
    expect(validateNileSouthProfile(null)).toHaveProperty("error");
  });
  it("rejects anonymous and unverified accounts", () => {
    expect(isPermanentVerifiedUser({ is_anonymous: true, email: "a@example.org", email_confirmed_at: "today", identities: [{}] })).toBe(false);
    expect(isPermanentVerifiedUser({ is_anonymous: false, email: "a@example.org", identities: [{}] })).toBe(false);
    expect(isPermanentVerifiedUser({ is_anonymous: false, email: "a@example.org", email_confirmed_at: "today", identities: [{}] })).toBe(true);
  });
});
