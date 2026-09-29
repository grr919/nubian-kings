import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMultiplayerBeginnerGame } from "./multiplayer";

const db = vi.hoisted(() => ({ room: {} as any, players: [] as any[], userId: "host", conflict: false }));
vi.mock("@/lib/supabase-server", () => ({
  multiplayerConfigured: () => true,
  requestUser: async () => ({ id: db.userId }),
  adminSupabase: () => ({ from: (table: string) => {
    let changes: any;
    const filters: Record<string, unknown> = {};
    const result = () => {
      if (table === "nk_multiplayer_players") return { data: structuredClone(db.players), error: null };
      if (changes) {
        if (db.conflict || Object.entries(filters).some(([key, value]) => db.room[key] !== value)) return { data: null, error: null };
        db.room = { ...db.room, ...structuredClone(changes) };
      }
      return { data: structuredClone(db.room), error: null };
    };
    const query: any = { select: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; }, order: () => query,
      update: (value: unknown) => { changes = value; return query; }, maybeSingle: async () => result(),
      then: (resolve: (r: unknown) => void) => Promise.resolve(result()).then(resolve) };
    return query;
  } }),
}));

import { PATCH } from "../app/api/multiplayer/rooms/[code]/route";
const context = { params: Promise.resolve({ code: "TEST22" }) };
const vote = async (body: object) => {
  const response = await PATCH(new Request("http://localhost/api/multiplayer/rooms/TEST22", { method: "PATCH", body: JSON.stringify(body) }), context);
  if (!response) throw Error("Missing response");
  return response;
};

beforeEach(() => {
  db.userId = "host"; db.conflict = false;
  db.players = ["host", "guest"].map((id, index) => ({ id, user_id: id, controller: "human", display_name: id, faction_id: index ? "egyptian-christians" : "nubian-christians", seat_order: index }));
  const settings = { totalSeats: 2, npcCount: 0, nileFloods: true, openingPlayer: "human" as const };
  const state = createMultiplayerBeginnerGame(db.players.map(p => ({ id:p.id, userId:p.user_id, displayName:p.display_name, controller:p.controller, factionId:p.faction_id, seatOrder:p.seat_order })), settings, "FINISHED");
  state.phase = "complete"; state.winnerId = "host";
  db.room = { code:"TEST22", host_user_id:"host", level:"beginner", status:"complete", settings, game_state:state, review_acks:[], revision:10 };
});

describe("Beginner rematch endpoint", () => {
  it("records host consent without restarting and honors guest refusal", async () => {
    const finished = structuredClone(db.room.game_state);
    expect((await vote({ action:"rematch", accept:true, revision:10 })).status).toBe(200);
    expect(db.room.status).toBe("complete"); expect(db.room.game_state).toEqual(finished);
    db.userId = "guest";
    expect((await vote({ action:"rematch", accept:false, revision:11 })).status).toBe(200);
    expect(db.room.status).toBe("complete"); expect(db.room.game_state).toEqual(finished);
    expect(db.room.settings.rematchVotes).toEqual({ host:true, guest:false });
    expect((await vote({ action:"rematch", accept:true, revision:12 })).status).toBe(200);
    expect(db.room.status).toBe("active"); expect(db.room.game_state.random.seed).not.toBe("FINISHED");
    expect(db.room.settings.rematchVotes).toBeUndefined(); expect(db.room.settings.nileFloods).toBe(true);
  });
  it("rejects old clients and stale or unauthorized requests without changing the game", async () => {
    const before = structuredClone(db.room);
    expect((await vote({ action:"rematch" })).status).toBe(409);
    expect((await vote({ action:"rematch", accept:true, revision:9 })).status).toBe(409);
    db.userId = "outsider";
    expect((await vote({ action:"rematch", accept:true, revision:10 })).status).toBe(403);
    expect(db.room).toEqual(before);
  });
  it("uses the database revision check to prevent conflicting restarts", async () => {
    db.room.settings.rematchVotes = { guest:true };
    const before = structuredClone(db.room); db.conflict = true;
    expect((await vote({ action:"rematch", accept:true, revision:10 })).status).toBe(409);
    expect(db.room).toEqual(before);
  });
});
