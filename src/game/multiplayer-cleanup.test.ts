import { describe, expect, it } from "vitest";
import { authorizedCronRequest, multiplayerCleanupCutoff } from "./multiplayer-cleanup";

describe("multiplayer room cleanup", () => {
  it("calculates an exact seven-day retention cutoff", () => {
    expect(multiplayerCleanupCutoff(new Date("2026-09-04T05:00:00.000Z"))).toBe("2026-08-28T05:00:00.000Z");
  });

  it("accepts only the configured bearer secret", () => {
    expect(authorizedCronRequest("Bearer correct", "correct")).toBe(true);
    expect(authorizedCronRequest("Bearer wrong", "correct")).toBe(false);
    expect(authorizedCronRequest(null, "correct")).toBe(false);
    expect(authorizedCronRequest("Bearer correct", "")).toBe(false);
  });
});
