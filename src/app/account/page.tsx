"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";
import type { SupabaseClient } from "@supabase/supabase-js";

type Player = { id: string; email?: string; is_anonymous?: boolean; email_confirmed_at?: string | null };
type Mode = "create" | "login" | "guest";
export default function AccountPage() {
  const [user, setUser] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const client = browserSupabase();
  const profileDb = client as SupabaseClient<any> | undefined;

  async function refresh() {
    if (!client) { setLoading(false); return; }
    try {
      const { data } = await client.auth.getUser();
      setUser(data.user);
      if (data.user && !data.user.is_anonymous && data.user.email_confirmed_at) {
        const { data: profile, error } = await profileDb!.from("nsg_player_profiles")
          .select("username,display_name")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (error) setMessage("Could not load your profile: " + error.message);
        if (profile) { setUsername(profile.username); setDisplayName(profile.display_name); }
      }
    } finally { setLoading(false); }
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
    if (!client || !user) { setMessage("Sign in again to save your profile."); return; }
    setBusy(true); setMessage("");
    try {
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user || auth.user.is_anonymous || !auth.user.email_confirmed_at) {
        throw new Error("Your verified account session has expired. Please sign in again.");
      }
      const normalized = username.trim().toLowerCase();
      const shownName = displayName.trim().replace(/\s+/g, " ");
      if (!/^[a-z][a-z0-9_]{2,23}$/.test(normalized)) {
        throw new Error("Username must be 3–24 characters, start with a letter, and contain only lowercase letters, digits, or underscores.");
      }
      if (shownName.length < 1 || shownName.length > 40) {
        throw new Error("Display name must be between 1 and 40 characters.");
      }
      const { error } = await profileDb!.from("nsg_player_profiles")
        .upsert({
          user_id: auth.user.id,
          username: normalized,
          display_name: shownName,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw new Error(error.code === "23505" ? "That username is already taken." : "Profile save failed: " + error.message);
      setUsername(normalized);
      setDisplayName(shownName);
      setMessage("Profile saved successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Profile save failed."); }
    finally { setBusy(false); }
  }

  async function createAccount() {
    if (!client) { setMessage("The authentication service is unavailable."); return; }
    const address = email.trim();
    if (!address) { setMessage("Enter your email address before registering."); return; }
    if (password.length < 12) { setMessage("Choose a password with at least 12 characters."); return; }
    await run(
      () => client.auth.signUp({ email: address, password, options: { emailRedirectTo: window.location.origin + "/account" } }),
      "Signup request accepted. Check your email (including spam) for a verification message. If no email arrives, registration email delivery or redirect settings need administrator attention."
    );
  }

  const permanent = Boolean(user && !user.is_anonymous && user.email_confirmed_at);
  return <main className="landing levelLanding"><section className="panel levelSelectPanel nileSouthAccountPanel" style={{ maxWidth: 680 }}>
    <p className="kicker">NILE SOUTH GAMES</p>
    <h1>Player account</h1>
    <p className="subtitle">Keep one player identity as more Nile South games join the account system.</p>
    <p><Link href="/">Return to Nubian Kings</Link> · <Link href="/account/games">My Games — Resume on another device</Link></p>
    {!client ? <p role="alert">Account preview is not configured. Please check its Vercel Supabase environment variables.</p>
      : loading ? <p>Checking your player session…</p> : <>
      {user?.is_anonymous && <section aria-label="Upgrade guest account"><h2>Upgrade your guest account</h2>
        <p>Your current guest player ID will be kept, including any multiplayer seats tied to it. Add your email and verify it before setting a password.</p>
        <label htmlFor="guest-email">Email address</label>
        <input id="guest-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        <button disabled={busy || !email.trim()} onClick={() => void run(() => client.auth.updateUser({ email: email.trim() }, { emailRedirectTo: window.location.origin + "/account" }), "Check your email for the verification link; return here in the same browser.")}>Send guest upgrade verification</button>
        <p>Do not sign out, clear browser data, or switch devices before verification. If the email already belongs to an account, this does not merge their multiplayer seats.</p>
      </section>}
      {!user && <>
        <nav aria-label="Account options">
          <button type="button" disabled={busy} aria-pressed={mode === "create"} onClick={() => { setMode("create"); setMessage("Create account selected. Enter an email address and a password of at least 12 characters below."); }}>Create account</button>{" "}
          <button type="button" disabled={busy} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setMessage("Sign in selected. Enter your existing email and password below."); }}>Sign in</button>{" "}
          <button type="button" disabled={busy} aria-pressed={mode === "guest"} onClick={() => { setMode("guest"); setMessage("Guest mode selected. Start a guest session below."); }}>Continue as guest</button>
        </nav>
        {mode === "guest" && <section><h2>Play without an account</h2><p>You can register later without changing this new guest's ID.</p>
          <button disabled={busy} onClick={() => void run(() => client.auth.signInAnonymously(), "Guest session created. You can now upgrade your guest account.")}>Start guest session</button>
        </section>}
        {(mode === "create" || mode === "login") && <section><h2>{mode === "create" ? "Create Nile South account" : "Sign in"}</h2>
          {mode === "create" && <p>Enter a valid email and a password of at least 12 characters. Already playing as a guest on another domain? Upgrade on that original domain to preserve the existing seat.</p>}
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} minLength={mode === "create" ? 12 : undefined} value={password} onChange={event => setPassword(event.target.value)} />
          {mode === "create" && <p aria-live="polite">{password.length === 0 ? "Password required: minimum 12 characters." : password.length < 12 ? `Password needs ${12 - password.length} more character(s).` : "Password length requirement met."}</p>}
          {mode === "create" ? <button type="button" disabled={busy} onClick={() => void createAccount()}>{busy ? "Submitting registration…" : "Create account and verify email"}</button> :
            <button disabled={busy || !email.trim() || !password} onClick={() => void run(() => client.auth.signInWithPassword({ email: email.trim(), password }), "Signed in.")}>Sign in</button>}
        </section>}
      </>}
      {user && !permanent && !user.is_anonymous && <p>Verify your email address to finish creating your permanent account. Check the inbox for {user.email}.</p>}
      {permanent && <><h2>Your player profile</h2><p>Signed in as {user?.email}</p>
        <label htmlFor="player-name">Unique username (3–24 characters)</label>
        <input id="player-name" maxLength={24} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} />
        <label htmlFor="display-name">Display name</label>
        <input id="display-name" maxLength={40} value={displayName} onChange={event => setDisplayName(event.target.value)} />
        <button disabled={busy} onClick={() => void saveProfile()}>Save profile</button>
        <h2>Password and recovery</h2>
        <p>After verifying your email, set a password of at least 12 characters if you upgraded from a guest account.</p>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" minLength={12} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} />
        <button disabled={busy || password.length < 12} onClick={() => void run(() => client.auth.updateUser({ password }), "Password updated.")}>Set or change password</button>
      </>}
      {user && !user.is_anonymous && <p><button disabled={busy} onClick={() => void run(() => client.auth.signOut(), "Signed out.")}>Sign out</button></p>}
    </>}
    {message && <p role="status" aria-live="polite" style={{ padding: "0.75rem", border: "1px solid currentColor", borderRadius: "0.5rem", marginTop: "1rem" }}>{message}</p>}
  </section></main>;
}
