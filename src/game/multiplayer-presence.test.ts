import { describe, expect, it } from "vitest";
import { disconnectedPlayerCutoff, disconnectedPlayerMayBeReplaced } from "./multiplayer-presence";

describe("multiplayer presence", () => {
  const now = new Date("2026-09-04T12:02:00.000Z");
  it("allows replacement only after the full two-minute grace period", () => {
    expect(disconnectedPlayerMayBeReplaced("2026-09-04T12:00:00.000Z", now)).toBe(true);
    expect(disconnectedPlayerMayBeReplaced("2026-09-04T12:00:00.001Z", now)).toBe(false);
    expect(disconnectedPlayerMayBeReplaced(undefined, now)).toBe(false);
  });
  it("calculates the host replacement cutoff", () => {
    expect(disconnectedPlayerCutoff(now)).toBe("2026-09-04T12:00:00.000Z");
  });
});
