"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

type Player = { id: string; email?: string; is_anonymous?: boolean; email_confirmed_at?: string | null };
export default function AccountPage() {
  const [user, setUser] = useState<Player | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const client = browserSupabase();

  async function refresh() {
    if (!client) return;
    const { data } = await client.auth.getUser();
    setUser(data.user);
    if (data.user && !data.user.is_anonymous && data.user.email_confirmed_at) {
      const session = (await client.auth.getSession()).data.session;
      if (session) {
        const res = await fetch("/api/account/profile", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        if (res.ok) {
          const { profile } = await res.json();
          if (profile) { setUsername(profile.username); setDisplayName(profile.display_name); }
        }
      }
    }
  }

  useEffect(() => {
    void refresh();
    const subscription = client?.auth.onAuthStateChange(() => { queueMicrotask(() => { void refresh(); }); });
    return () => subscription?.data.subscription.unsubscribe();
  }, []);

  async function run(work: () => Promise<{ error: { message: string } | null }>, success: string) {
    setBusy(true); setMessage("");
    try {
      const result = await work();
      setMessage(result.error?.message || success);
      await refresh();
    } catch { setMessage("The account service could not be reached."); }
    finally { setBusy(false); }
  }

  async function saveProfile() {
    if (!client) return;
    setBusy(true); setMessage("");
    try {
      const session = (await client.auth.getSession()).data.session;
      if (!session) throw Error("Session expired.");
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ username, displayName })
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error ?? "Save failed.");
      setMessage("Profile saved.");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Profile could not be saved."); }
    finally { setBusy(false); }
  }

  const permanent = Boolean(user && !user.is_anonymous && user.email_confirmed_at);
  return <main className="landing levelLanding"><section className="panel levelSelectPanel" style={{ maxWidth: 600 }}>
    <p className="kicker">NILE SOUTH GAMES</p>
    <h1>Player account</h1>
    <p className="subtitle">Use your identity in Nubian Kings now, and other Nile South games as they are integrated.</p>
    <p><Link href="/">Return to Nubian Kings</Link></p>
    {!client ? <p>Accounts are not configured.</p> : <>
      {user?.is_anonymous && <><h2>Keep your guest identity</h2>
        <p>Verify an email address to convert your guest account without losing its player ID or current multiplayer seats.</p>
        <label htmlFor="player-email">Email</label>
        <input id="player-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        <button disabled={busy || !email} onClick={() => void run(() => client.auth.updateUser({ email: email.trim() }), "Check your email for the verification link. Open it in this browser.")}>Verify email</button>
        <p>Do not sign out before completing verification. Email identity linking must be enabled in Supabase.</p>
      </>}
      {!user && <><h2>Sign in</h2>
        <p>Sign in to an existing permanent account. To preserve guest games, upgrade the guest first instead.</p>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
        <button disabled={busy || !email || !password} onClick={() => void run(() => client.auth.signInWithPassword({ email: email.trim(), password }), "Signed in.")}>Sign in</button>
      </>}
      {user && !permanent && !user.is_anonymous && <p>Verify your email before completing your profile.</p>}
      {permanent && <><h2>Player profile</h2><p>Signed in as {user?.email}</p>
        <label htmlFor="player-name">Username (3–24 characters)</label>
        <input id="player-name" maxLength={24} value={username} onChange={event => setUsername(event.target.value)} />
        <label htmlFor="display-name">Display name</label>
        <input id="display-name" maxLength={40} value={displayName} onChange={event => setDisplayName(event.target.value)} />
        <button disabled={busy} onClick={() => void saveProfile()}>Save profile</button>
        <h2>Account password</h2>
        <p>Set a password of at least 12 characters to sign in on other devices.</p>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" minLength={12} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} />
        <button disabled={busy || password.length < 12} onClick={() => void run(() => client.auth.updateUser({ password }), "Password saved.")}>Set password</button>
      </>}
      {user && <p><button disabled={busy} onClick={() => void run(() => client.auth.signOut(), "Signed out.")}>Sign out</button></p>}
    </>}
    {message && <p role="status">{message}</p>}
  </section></main>;
}
