"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pilotAccessToken } from "@/lib/nile-south-pilot";
import { browserSupabase } from "@/lib/supabase-browser";
import { resumeNubianRoom, type NubianGameSummary } from "@/lib/nile-south-games";

export default function MyGames() {
  const [games, setGames] = useState<NubianGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [permanent, setPermanent] = useState(false);

  async function refresh() {
    const client = browserSupabase() as SupabaseClient<any> | undefined;
    if (!client) { setError("Supabase account configuration is unavailable."); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const pilotToken = await pilotAccessToken();
      const { data: { user }, error: authError } = await client.auth.getUser(pilotToken ?? undefined);
      if (authError) throw authError;
      setSignedIn(Boolean(user));
      const verified = Boolean(user && !user.is_anonymous && user.email_confirmed_at);
      setPermanent(verified);
      if (!verified) { setGames([]); return; }
      const token = pilotToken ?? (await client.auth.getSession()).data.session?.access_token;
      if (!token) throw Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/account/games", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(body.error ?? "Could not retrieve your games.");
      setGames((body.games ?? []) as NubianGameSummary[]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your games."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void refresh();
    const listener = browserSupabase()?.auth.onAuthStateChange(() => { queueMicrotask(() => { void refresh(); }); });
    return () => listener?.data.subscription.unsubscribe();
  }, []);

  function resume(game: NubianGameSummary) {
    const target = resumeNubianRoom(game);
    if (!target) { setError("This room cannot be opened."); return; }
    // Existing multiplayer clients resume from their established per-level room key.
    // Do not join a second seat or alter the game; the server still validates the account UUID.
    localStorage.setItem(target.storageKey, target.code);
    window.location.assign(target.href);
  }

  return <main className="landing levelLanding"><section className="panel levelSelectPanel" style={{ maxWidth: 750 }}>
    <p className="kicker">NILE SOUTH GAMES</p>
    <h1>My Games</h1>
    <p>Multiplayer games associated with your permanent Nile South account, across devices.</p>
    <p><Link href="/account">Player account</Link> · <Link href="/">Nubian Kings</Link></p>
    {loading ? <p>Loading your games…</p> : !signedIn || !permanent ?
      <p>Sign in to your verified Nile South account to see your games. <Link href="/account">Go to account</Link></p>
      : <><p><button type="button" onClick={() => void refresh()}>Refresh list</button></p>
        {games.length === 0 && !error ? <p>No multiplayer games belong to this account yet. Existing guest rooms created under a different account cannot be claimed automatically.</p> : null}
        {games.length > 0 ? <div style={{ display: "grid", gap: "1rem" }}>{games.map(game => <article key={game.room_code} className="panel" style={{ padding: "1rem", border: "1px solid currentColor" }}>
          <h2 style={{ marginTop: 0 }}>{game.game_level.charAt(0).toUpperCase() + game.game_level.slice(1)} · {game.room_code}</h2>
          <p>{game.player_name}{game.is_host ? " · Host" : ""}{game.faction_id ? " · " + game.faction_id.replaceAll("-", " ") : ""}</p>
          <p>Status: {game.room_status} · Updated: {new Date(game.updated_at).toLocaleString()}</p>
          <button type="button" onClick={() => resume(game)}>{game.room_status === "complete" ? "View completed game" : "Resume game"}</button>
        </article>)}</div> : null}
      </>}
    {error ? <p role="alert">{error}</p> : null}
    <p style={{ fontSize: "0.9rem" }}>Only rooms belonging to your current account are shown. This does not transfer another guest's seats. Solo browser saves are not yet synchronized.</p>
  </section></main>;
}
