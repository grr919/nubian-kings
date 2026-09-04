import { adminSupabase, multiplayerConfigured } from "@/lib/supabase-server";
import { authorizedCronRequest, multiplayerCleanupCutoff } from "@/game/multiplayer-cleanup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!authorizedCronRequest(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!multiplayerConfigured()) {
    return Response.json({ error: "Multiplayer has not been configured." }, { status: 503 });
  }

  const cutoff = multiplayerCleanupCutoff();
  const { data, error } = await adminSupabase()
    .from("nk_multiplayer_rooms")
    .delete()
    .lt("updated_at", cutoff)
    .select("code");

  if (error) {
    return Response.json({ error: "Expired multiplayer rooms could not be removed." }, { status: 500 });
  }
  return Response.json({ deleted: data?.length ?? 0, cutoff });
}
