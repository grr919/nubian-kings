import { describe, expect, it } from "vitest";
import { recoveryPasswordError, recoveryRedirectUrl } from "./nile-south-recovery";

describe("Nile South password recovery", () => {
  it("enforces the 12-character password policy", () => {
    expect(recoveryPasswordError("short", "short")).toMatch(/12 characters/);
    expect(recoveryPasswordError("at-least-twelve", "different-password")).toMatch(/do not match/);
    expect(recoveryPasswordError("at-least-twelve", "at-least-twelve")).toBeUndefined();
  });

  it("uses an on-site recovery URL, not an untrusted next parameter", () => {
    expect(recoveryRedirectUrl("https://pilot.example.com")).toBe("https://pilot.example.com/account/recover");
    expect(recoveryRedirectUrl("https://pilot.example.com/")).toBe("https://pilot.example.com/account/recover");
  });
});
