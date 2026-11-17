import { describe, expect, it } from "vitest";
import { ownGameSummaries } from "../app/api/account/games/route";

describe("server-only My Games projection", () => {
  const rooms = [
    { code: "ABC234", level: "master", status: "active", host_user_id: "me", updated_at: "2026-11-17T10:00:00Z" },
    { code: "DEF567", level: "amateur", status: "active", host_user_id: "other", updated_at: "2026-11-17T11:00:00Z" },
    { code: "GHJ789", level: "beginner", status: "abandoned", host_user_id: "me", updated_at: "2026-11-17T12:00:00Z" },
  ];
  const seats = [
    { room_code: "ABC234", display_name: "Player One", faction_id: "nubian-christians" },
    { room_code: "GHJ789", display_name: "Player One", faction_id: "egyptian-muslims" }
  ];

  it("exposes only metadata for the authenticated player's joined rooms", () => {
    const result = ownGameSummaries(rooms, seats, "me");
    expect(result).toEqual([{
      room_code: "ABC234", game_level: "master", room_status: "active",
      player_name: "Player One", faction_id: "nubian-christians",
      is_host: true, updated_at: "2026-11-17T10:00:00Z"
    }]);
    expect(JSON.stringify(result)).not.toContain("DEF567");
  });

  it("returns no games for an empty set of verified participant seats", () => {
    expect(ownGameSummaries(rooms, [], "me")).toEqual([]);
  });

  it("correctly marks a joined player as not the host", () => {
    const joined = ownGameSummaries([rooms[1]], [
      { room_code: "DEF567", display_name: "Guest", faction_id: null }
    ], "me");
    expect(joined).toHaveLength(1);
    expect(joined[0].is_host).toBe(false);
  });
});
