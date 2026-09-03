import { adminSupabase, multiplayerConfigured, requestUser } from "@/lib/supabase-server";
import { chooseMultiplayerNpcStat, createMultiplayerBeginnerGame, MULTIPLAYER_FACTIONS, playMultiplayerComparison, publicBeginnerState, publicReview, type MultiplayerReview, type MultiplayerRoomSettings, type MultiplayerSeat } from "@/game/multiplayer";
import type { BeginnerState, Stat } from "@/game/types";

type RoomRow = {
  code: string;
  host_user_id: string;
  status: "waiting" | "active" | "complete" | "abandoned";
  settings: MultiplayerRoomSettings;
  game_state?: BeginnerState;
  review?: MultiplayerReview;
  review_acks: string[];
  revision: number;
};

type PlayerRow = {
  id: string;
  room_code: string;
  user_id: string | null;
  display_name: string;
  controller: "human" | "npc";
  faction_id: string | null;
  seat_order: number;
};

async function loadRoom(code: string) {
  const supabase = adminSupabase();
  const [{ data: room }, { data: players }] = await Promise.all([
    supabase.from("nk_multiplayer_rooms").select("*").eq("code", code).maybeSingle(),
    supabase.from("nk_multiplayer_players").select("*").eq("room_code", code).order("seat_order"),
  ]);
  return { supabase, room: room as RoomRow | null, players: (players ?? []) as PlayerRow[] };
}

function responseRoom(room: RoomRow, players: PlayerRow[], userId: string) {
  const state = room.game_state;
  return {
    code: room.code,
    status: room.status,
    isHost: room.host_user_id === userId,
    settings: room.settings,
    revision: room.revision,
    acknowledged: room.review_acks?.includes(userId) ?? false,
    seats: players.map((player) => ({
      id: player.id,
      userId: player.user_id ?? undefined,
      displayName: player.display_name,
      controller: player.controller,
      factionId: player.faction_id ?? undefined,
      seatOrder: player.seat_order,
      isYou: player.user_id === userId,
    })),
    state: state ? publicBeginnerState(state) : undefined,
    review: state ? publicReview(room.review, state) : undefined,
  };
}

async function authenticatedRoom(request: Request, rawCode: string) {
  if (!multiplayerConfigured()) return { error: Response.json({ error: "Multiplayer has not been configured yet." }, { status: 503 }) };
  const user = await requestUser(request);
  if (!user) return { error: Response.json({ error: "Your guest session could not be verified. Refresh and try again." }, { status: 401 }) };
  const code = rawCode.toUpperCase();
  const loaded = await loadRoom(code);
  if (!loaded.room) return { error: Response.json({ error: "That multiplayer game no longer exists." }, { status: 404 }) };
  if (!loaded.players.some((player) => player.user_id === user.id)) return { error: Response.json({ error: "You are not a participant in this game." }, { status: 403 }) };
  return { ...loaded, room: loaded.room, user };
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await authenticatedRoom(request, code);
  if ("error" in result) return result.error;
  return Response.json(responseRoom(result.room, result.players, result.user.id));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await authenticatedRoom(request, code);
  if ("error" in result) return result.error;
  const { room, players, supabase, user } = result;
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action === "choose-faction") {
    if (room.status !== "waiting") return Response.json({ error: "Factions cannot be changed after the game begins." }, { status: 409 });
    if (!MULTIPLAYER_FACTIONS.includes(body.factionId)) return Response.json({ error: "Choose an available faction." }, { status: 400 });
    const taken = players.some((player) => player.faction_id === body.factionId && player.user_id !== user.id);
    if (taken) return Response.json({ error: "Another player just selected that faction." }, { status: 409 });
    const { error } = await supabase.from("nk_multiplayer_players").update({ faction_id: body.factionId }).eq("room_code", room.code).eq("user_id", user.id);
    if (error) return Response.json({ error: "Your faction could not be selected." }, { status: 409 });
  } else if (action === "start") {
    if (room.host_user_id !== user.id) return Response.json({ error: "Only the host can start the game." }, { status: 403 });
    if (room.status !== "waiting") return Response.json({ error: "The game has already started." }, { status: 409 });
    const humanSeats = players.filter((player) => player.controller === "human");
    const expectedHumans = room.settings.totalSeats - room.settings.npcCount;
    if (humanSeats.length !== expectedHumans) return Response.json({ error: `Waiting for ${expectedHumans - humanSeats.length} more player${expectedHumans - humanSeats.length === 1 ? "" : "s"}.` }, { status: 409 });
    if (humanSeats.some((player) => !player.faction_id)) return Response.json({ error: "Every player must select a faction." }, { status: 409 });
    const available = MULTIPLAYER_FACTIONS.filter((factionId) => !players.some((player) => player.faction_id === factionId));
    const npcSeats = players.filter((player) => player.controller === "npc");
    for (let index = available.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [available[index], available[swap]] = [available[swap], available[index]];
    }
    const assigned = players.map((player) => player.controller === "npc" ? { ...player, faction_id: available[npcSeats.indexOf(player)] } : player);
    for (const player of assigned.filter((seat) => seat.controller === "npc")) {
      const { error } = await supabase.from("nk_multiplayer_players").update({ faction_id: player.faction_id }).eq("id", player.id);
      if (error) return Response.json({ error: "Computer factions could not be assigned." }, { status: 500 });
    }
    const seats: MultiplayerSeat[] = assigned.map((player) => ({ id: player.id, userId: player.user_id ?? undefined, displayName: player.display_name, controller: player.controller, factionId: player.faction_id!, seatOrder: player.seat_order }));
    const state = createMultiplayerBeginnerGame(seats, room.settings);
    const { data, error } = await supabase.from("nk_multiplayer_rooms").update({ status: "active", game_state: state, review: null, review_acks: [], revision: room.revision + 1, updated_at: new Date().toISOString() }).eq("code", room.code).eq("revision", room.revision).select().maybeSingle();
    if (error || !data) return Response.json({ error: "The lobby changed while the game was starting. Try again." }, { status: 409 });
  } else if (action === "choose" || action === "npc-turn") {
    if (room.status !== "active" || !room.game_state) return Response.json({ error: "The game is not ready for a turn." }, { status: 409 });
    if (room.review) return Response.json({ error: "Players are still reviewing the previous round." }, { status: 409 });
    const state = structuredClone(room.game_state);
    const selector = state.players[state.selectorIndex];
    let stat: Stat;
    if (selector.controller === "npc") {
      if (action !== "npc-turn") return Response.json({ error: "The computer is choosing the trait." }, { status: 409 });
      stat = chooseMultiplayerNpcStat(state);
    } else {
      if (selector.id !== user.id) return Response.json({ error: "It is another player’s turn." }, { status: 403 });
      if (action !== "choose" || !(["strength", "zeal", "wealth"] as unknown[]).includes(body.stat)) return Response.json({ error: "Choose strength, zeal, or wealth." }, { status: 400 });
      stat = body.stat as Stat;
    }
    const review = playMultiplayerComparison(state, stat);
    const status = state.phase === "complete" ? "complete" : "active";
    const { data, error } = await supabase.from("nk_multiplayer_rooms").update({ status, game_state: state, review, review_acks: [], revision: room.revision + 1, updated_at: new Date().toISOString() }).eq("code", room.code).eq("revision", room.revision).select().maybeSingle();
    if (error || !data) return Response.json({ error: "Another action reached the game first. The board will refresh." }, { status: 409 });
  } else if (action === "acknowledge") {
    if (!room.review) return Response.json({ error: "There is no result awaiting confirmation." }, { status: 409 });
    const acknowledgements = [...new Set([...(room.review_acks ?? []), user.id])];
    const humanIds = players.filter((player) => player.controller === "human").map((player) => player.user_id!);
    const allReady = humanIds.every((id) => acknowledgements.includes(id));
    const { data, error } = await supabase.from("nk_multiplayer_rooms").update({ review: allReady ? null : room.review, review_acks: allReady ? [] : acknowledgements, revision: room.revision + 1, updated_at: new Date().toISOString() }).eq("code", room.code).eq("revision", room.revision).select().maybeSingle();
    if (error || !data) return Response.json({ error: "The result changed while you were responding. The board will refresh." }, { status: 409 });
  } else {
    return Response.json({ error: "Unknown multiplayer action." }, { status: 400 });
  }

  const refreshed = await loadRoom(room.code);
  return Response.json(responseRoom(refreshed.room!, refreshed.players, user.id));
}
