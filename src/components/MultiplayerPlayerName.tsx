"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pilotAccessToken } from "@/lib/nile-south-pilot";
import { browserSupabase } from "@/lib/supabase-browser";
import type { SupabaseClient } from "@supabase/supabase-js";

type NameState =
  | { status: "loading"; name: ""; error: "" }
  | { status: "guest"; name: ""; error: "" }
  | { status: "registered"; name: string; error: "" }
  | { status: "missing"; name: ""; error: string };

export function useMultiplayerPlayerName() {
  const [state, setState] = useState<NameState>({ status: "loading", name: "", error: "" });
  useEffect(() => {
    let mounted = true;
    const client = browserSupabase();
    if (!client) {
      setState({ status: "missing", name: "", error: "Account service is not configured." });
      return;
    }
    async function load() {
      if (!client) return;
      try {
        const pilot = await pilotAccessToken();
        const { data: { user }, error } = await client.auth.getUser(pilot ?? undefined);
        if (!mounted) return;
        if (error && error.name !== "AuthSessionMissingError") throw error;
        if (!user || user.is_anonymous) {
          setState({ status: "guest", name: "", error: "" });
          return;
        }
        if (!user.email_confirmed_at) {
          setState({ status: "missing", name: "", error: "Verify your email before joining a multiplayer room." });
          return;
        }
        let profile;
        if (pilot) {
          const response = await fetch("/api/account/profile", {
            headers: { Authorization: "Bearer " + pilot }, cache: "no-store"
          });
          if (!response.ok) throw new Error("Could not load your Nile South profile.");
          ({ profile } = await response.json());
        } else {
          const db = client as SupabaseClient<any>;
          const result = await db.from("nsg_player_profiles")
            .select("display_name").eq("user_id", user.id).maybeSingle();
          if (result.error) throw result.error;
          profile = result.data;
        }
        if (!mounted) return;
        const displayName = typeof profile?.display_name === "string" ? profile.display_name.trim() : "";
        if (!displayName) {
          setState({ status: "missing", name: "", error: "Complete your Nile South player profile before joining a game." });
          return;
        }
        setState({ status: "registered", name: displayName, error: "" });
      } catch (err) {
        if (mounted) setState({ status: "missing", name: "", error: err instanceof Error ? err.message : "Could not load account name." });
      }
    }
    void load();
    const subscription = client.auth.onAuthStateChange(() => { queueMicrotask(() => { if (mounted) void load(); }); });
    return () => { mounted = false; subscription.data.subscription.unsubscribe(); };
  }, []);
  return state;
}

export default function MultiplayerPlayerName({
  player, guestName, onGuestNameChange
}: {
  player: NameState;
  guestName: string;
  onGuestNameChange: (name: string) => void;
}) {
  if (player.status === "loading") return <p aria-live="polite">Checking your player account…</p>;
  if (player.status === "registered") return <div className="multiplayerField">
    <span>Room display name</span>
    <strong className="registeredPlayerName">{player.name}</strong>
    <small>Change this name in <Link href="/account">your player profile</Link>.</small>
  </div>;
  if (player.status === "missing") return <p role="alert" className="formError">{player.error} <Link href="/account">Open player account</Link></p>;
  return <label className="multiplayerField"><span>Guest display name</span>
    <input id="multiplayer-player-name" value={guestName} maxLength={40} autoComplete="nickname" onChange={event => onGuestNameChange(event.target.value)} />
  </label>;
}
