import type { User } from "@supabase/supabase-js";
import { adminSupabase } from "@/lib/supabase-server";
import { isPermanentVerifiedUser } from "@/lib/nile-south-profile";

export async function multiplayerDisplayName(user: User, requested: unknown): Promise<{ displayName: string } | { error: string; status: number }> {
  if (isPermanentVerifiedUser(user)) {
    const { data, error } = await adminSupabase().from("nsg_player_profiles")
      .select("display_name").eq("user_id", user.id).maybeSingle();
    if (error) return { error: "Your player profile could not be loaded.", status: 503 };
    const displayName = typeof data?.display_name === "string" ? data.display_name.trim() : "";
    if (!displayName) return { error: "Complete your Nile South player profile before entering multiplayer.", status: 409 };
    return { displayName };
  }
  if (user.is_anonymous === false) return { error: "Verify your account email before entering multiplayer.", status: 403 };
  const displayName = typeof requested === "string" ? requested.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  if (!displayName) return { error: "Enter your guest name.", status: 400 };
  return { displayName };
}
