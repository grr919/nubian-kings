import { describe, expect, it } from "vitest";
import { resumeNubianRoom, type NubianGameSummary } from "./nile-south-games";
const game: NubianGameSummary = { room_code: "ABC234", game_level: "beginner", room_status: "active", player_name: "Test", faction_id: null, is_host: true, updated_at: new Date(0).toISOString() };
describe("cross-device My Games resume links", () => {
  it.each([
    ["beginner", "nubian-kings:multiplayer-room:v1", "/beginner/multiplayer?room=ABC234"],
    ["amateur", "nubian-kings:amateur-multiplayer-room:v1", "/amateur/multiplayer?room=ABC234"],
    ["master", "nubian-kings:master-multiplayer-room:v1", "/master/multiplayer?room=ABC234"]
  ])("routes %s to its existing multiplayer screen", (level, storageKey, href) => {
    expect(resumeNubianRoom({ ...game, game_level: level })).toEqual({ storageKey, href, code: "ABC234" });
  });
  it("rejects unknown levels and invalid codes", () => {
    expect(resumeNubianRoom({ ...game, game_level: "other" })).toBeUndefined();
    expect(resumeNubianRoom({ ...game, room_code: "../..." })).toBeUndefined();
  });
});
