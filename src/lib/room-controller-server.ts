import { createHash } from "node:crypto";
import { adminSupabase } from "@/lib/supabase-server";

export const CONTROL_HEADER = "x-nk-controller";

export function controllerHash(request: Request): string | undefined {
  const value = request.headers.get(CONTROL_HEADER);
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return;
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Only call after the existing room route has checked the Supabase user ID
 * is still the human occupant of this room. The RPC is callable solely with
 * the server's service-role key. It atomically arbitrates controller leases.
 */
export async function controlRoom(
  request: Request,
  roomCode: string,
  userId: string,
  action: "ensure" | "renew" | "takeover" | "check"
): Promise<boolean> {
  const hash = controllerHash(request);
  if (!hash) return false;
  const { data, error } = await adminSupabase().rpc("nk_seat_control_lease", {
    p_room_code: roomCode,
    p_user_id: userId,
    p_token_hash: hash,
    p_action: action,
  });
  if (error) throw new Error("Controller lease service is unavailable.");
  return data === true;
}

export function controlRequired() {
  return Response.json(
    { error: "This game is being controlled from another device. Select Take control here to play from this browser.", code: "VIEW_ONLY" },
    { status: 409, headers: { "Cache-Control": "no-store" } }
  );
}
