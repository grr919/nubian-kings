import { createClient } from "@supabase/supabase-js";
import { requestUser } from "@/lib/supabase-server";
import { isPermanentVerifiedUser, validateNileSouthProfile } from "@/lib/nile-south-profile";

const headers = { "Cache-Control": "private, no-store" };

function profileSupabase(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function requireAccount(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return { error: Response.json({ error: "Account service is not configured." }, { status: 503, headers }) };
  const user = await requestUser(request);
  if (!user) return { error: Response.json({ error: "Please sign in." }, { status: 401, headers }) };
  if (!isPermanentVerifiedUser(user)) return { error: Response.json({ error: "Please verify your email and link a permanent identity first." }, { status: 403, headers }) };
  return { user };
}

export async function GET(request: Request) {
  const result = await requireAccount(request);
  if ("error" in result) return result.error;
  const { data, error } = await profileSupabase(request)!.from("nsg_player_profiles")
    .select("username,display_name,created_at").eq("user_id", result.user.id).maybeSingle();
  if (error) return Response.json({ error: "Player profile is unavailable. Check the database migration." }, { status: 503, headers });
  return Response.json({ profile: data }, { headers });
}

export async function PUT(request: Request) {
  const result = await requireAccount(request);
  if ("error" in result) return result.error;
  const fields = validateNileSouthProfile(await request.json().catch(() => null));
  if ("error" in fields) return Response.json(fields, { status: 400, headers });
  const { data, error } = await profileSupabase(request)!.from("nsg_player_profiles")
    .upsert({ user_id: result.user.id, username: fields.username, display_name: fields.displayName, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("username,display_name,created_at").single();
  if (error?.code === "23505") return Response.json({ error: "That username is already taken." }, { status: 409, headers });
  if (error) return Response.json({ error: "Could not save the player profile." }, { status: 503, headers });
  return Response.json({ profile: data }, { headers });
}
