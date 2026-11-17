import { adminSupabase, multiplayerConfigured, requestUser } from "@/lib/supabase-server";
import { controlRoom } from "@/lib/room-controller-server";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!multiplayerConfigured()) return Response.json({ error: "Multiplayer service is not configured." }, { status: 503, headers: noStore });
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Sign in to your player session." }, { status: 401, headers: noStore });
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[A-Z2-9]{6}$/.test(code) || body.action !== "takeover")
    return Response.json({ error: "Choose a valid room and action." }, { status: 400, headers: noStore });

  // Never accept a client-supplied user ID, and do not allow former or NPC seats.
  const { data: participant, error } = await adminSupabase().from("nk_multiplayer_players")
    .select("id").eq("room_code", code).eq("user_id", user.id).eq("controller", "human").maybeSingle();
  if (error) return Response.json({ error: "Unable to check the room seat." }, { status: 503, headers: noStore });
  if (!participant) return Response.json({ error: "You do not control a human seat in this game." }, { status: 403, headers: noStore });
  try {
    const canControl = await controlRoom(request, code, user.id, "takeover");
    if (!canControl) return Response.json({ error: "Could not claim control; refresh and try again." }, { status: 409, headers: noStore });
    return Response.json({ canControl: true }, { headers: noStore });
  } catch {
    return Response.json({ error: "Controller service is temporarily unavailable." }, { status: 503, headers: noStore });
  }
}
