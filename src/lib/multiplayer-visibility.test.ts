import { describe, expect, it } from "vitest";
import { shouldPollMultiplayerRoom } from "./multiplayer-visibility";

describe("multiplayer background tab behavior", () => {
  it("stops polling when the tab is hidden so control leases can expire", () => {
    expect(shouldPollMultiplayerRoom("hidden")).toBe(false);
  });
  it("continues polling when the tab is visible", () => {
    expect(shouldPollMultiplayerRoom("visible")).toBe(true);
  });
});
