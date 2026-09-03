import { adminSupabase, multiplayerConfigured, requestUser } from "@/lib/supabase-server";
import type { MultiplayerRoomSettings } from "@/game/multiplayer";

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, length) : "";
}

export async function POST(request: Request) {
  if (!multiplayerConfigured()) return Response.json({ error: "Multiplayer has not been configured yet." }, { status: 503 });
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Your guest session could not be verified. Refresh and try again." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const code = text(body.code, 6).toUpperCase();
  const displayName = text(body.displayName, 24);
  if (!/^[A-Z2-9]{6}$/.test(code)) return Response.json({ error: "Enter the six-character room code." }, { status: 400 });
  if (!displayName) return Response.json({ error: "Enter your name." }, { status: 400 });
  const supabase = adminSupabase();
  const { data: room } = await supabase.from("nk_multiplayer_rooms").select("code,status,settings").eq("code", code).maybeSingle();
  if (!room) return Response.json({ error: "No game was found with that room code." }, { status: 404 });
  if (room.status !== "waiting") return Response.json({ error: "That game has already started." }, { status: 409 });
  const { data: existing } = await supabase.from("nk_multiplayer_players").select("id").eq("room_code", code).eq("user_id", user.id).maybeSingle();
  if (existing) return Response.json({ code });
  const settings = room.settings as MultiplayerRoomSettings;
  const { data: players } = await supabase.from("nk_multiplayer_players").select("seat_order,controller").eq("room_code", code);
  const humans = (players ?? []).filter((player) => player.controller === "human");
  const humanCapacity = settings.totalSeats - settings.npcCount;
  if (humans.length >= humanCapacity) return Response.json({ error: "That game is full." }, { status: 409 });
  const occupied = new Set((players ?? []).map((player) => player.seat_order));
  const seatOrder = Array.from({ length: humanCapacity }, (_, index) => index).find((index) => !occupied.has(index));
  if (seatOrder === undefined) return Response.json({ error: "That game is full." }, { status: 409 });
  const { error } = await supabase.from("nk_multiplayer_players").insert({ room_code: code, user_id: user.id, display_name: displayName, controller: "human", seat_order: seatOrder });
  if (error) return Response.json({ error: error.code === "23505" ? "That seat was just taken. Try joining again." : "The game could not be joined." }, { status: 409 });
  return Response.json({ code });
}
