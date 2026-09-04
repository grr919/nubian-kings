import { adminSupabase, multiplayerConfigured, requestUser } from "@/lib/supabase-server";
import type { MultiplayerOpeningPlayer, MultiplayerRoomSettings } from "@/game/multiplayer";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function roomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, length) : "";
}

export async function POST(request: Request) {
  if (!multiplayerConfigured()) return Response.json({ error: "Multiplayer has not been configured yet." }, { status: 503 });
  const user = await requestUser(request);
  if (!user) return Response.json({ error: "Your guest session could not be verified. Refresh and try again." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const displayName = text(body.displayName, 24);
  const totalSeats = Number(body.totalSeats);
  const npcCount = Number(body.npcCount);
  const openingPlayer = (["random", "human", "npc"].includes(body.openingPlayer) ? body.openingPlayer : "random") as MultiplayerOpeningPlayer;
  if (!displayName) return Response.json({ error: "Enter your name." }, { status: 400 });
  if (!Number.isInteger(totalSeats) || totalSeats < 2 || totalSeats > 5) return Response.json({ error: "Choose between two and five total players." }, { status: 400 });
  if (!Number.isInteger(npcCount) || npcCount < 0 || npcCount > totalSeats - 2) return Response.json({ error: "A multiplayer game must leave room for at least two people." }, { status: 400 });
  if (openingPlayer === "npc" && npcCount === 0) return Response.json({ error: "A computer cannot open a game without computer opponents." }, { status: 400 });
  const level = body.level === "master" ? "master" : body.level === "amateur" ? "amateur" : "beginner";
  const settings: MultiplayerRoomSettings = { totalSeats, npcCount, nileFloods: Boolean(body.nileFloods), openingPlayer, ...(level !== "beginner" ? { victoryMode: body.victoryMode === "long" ? "long" : "standard" } : {}) };
  const supabase = adminSupabase();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = roomCode();
    const { error: roomError } = await supabase.from("nk_multiplayer_rooms").insert({ code, host_user_id: user.id, level, settings });
    if (roomError) {
      if (roomError.code === "23505") continue;
      return Response.json({ error: "The room could not be created." }, { status: 500 });
    }
    const seats = [
      { room_code: code, user_id: user.id, display_name: displayName, controller: "human", seat_order: 0 },
      ...Array.from({ length: npcCount }, (_, index) => ({ room_code: code, user_id: null, display_name: `Computer ${index + 1}`, controller: "npc", seat_order: totalSeats - npcCount + index })),
    ];
    const { error: playerError } = await supabase.from("nk_multiplayer_players").insert(seats);
    if (playerError) {
      await supabase.from("nk_multiplayer_rooms").delete().eq("code", code);
      return Response.json({ error: "The room seats could not be created." }, { status: 500 });
    }
    return Response.json({ code }, { status: 201 });
  }
  return Response.json({ error: "A room code could not be generated. Try again." }, { status: 500 });
}
