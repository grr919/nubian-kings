import { adminSupabase, multiplayerConfigured, requestUser } from "@/lib/supabase-server";

const headers = { "Cache-Control": "private, no-store" };

type Seat = {
  room_code: string;
  display_name: string;
  faction_id: string | null;
};

type Room = {
  code: string;
  level: string;
  status: string;
  host_user_id: string;
  updated_at: string;
};

export function ownGameSummaries(
  rooms: Room[],
  seats: Seat[],
  userId: string
) {
  const permitted = new Map(seats.map(seat => [seat.room_code, seat]));
  return rooms
    .filter(room => permitted.has(room.code) && ["waiting", "active", "complete"].includes(room.status))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 100)
    .map(room => {
      const seat = permitted.get(room.code)!;
      return {
        room_code: room.code,
        game_level: room.level,
        room_status: room.status,
        player_name: seat.display_name,
        faction_id: seat.faction_id,
        is_host: room.host_user_id === userId,
        updated_at: room.updated_at,
      };
    });
}

export async function GET(request: Request) {
  if (!multiplayerConfigured()) return Response.json({ error: "Account service is unavailable." }, { status: 503, headers });
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Sign in to view your games." }, { status: 401, headers });
  if (user.is_anonymous || !user.email_confirmed_at)
    return Response.json({ error: "A verified permanent account is required." }, { status: 403, headers });

  try {
    const db = adminSupabase();
    // Never accept a user ID from a query string; room membership comes from
    // the verified bearer token and only current human seats qualify.
    const { data: seats, error: seatsError } = await db.from("nk_multiplayer_players")
      .select("room_code,display_name,faction_id")
      .eq("user_id", user.id)
      .eq("controller", "human");
    if (seatsError) throw seatsError;
    if (!seats?.length) return Response.json({ games: [] }, { headers });
    const codes = [...new Set(seats.map(seat => seat.room_code))];
    const { data: rooms, error: roomsError } = await db.from("nk_multiplayer_rooms")
      .select("code,level,status,host_user_id,updated_at")
      .in("code", codes)
      .in("status", ["waiting", "active", "complete"])
      .order("updated_at", { ascending: false })
      .limit(100);
    if (roomsError) throw roomsError;
    return Response.json({ games: ownGameSummaries(rooms ?? [], seats, user.id) }, { headers });
  } catch {
    return Response.json({ error: "Your games could not be loaded." }, { status: 503, headers });
  }
}
