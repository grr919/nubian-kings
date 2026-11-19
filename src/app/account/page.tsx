"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { endLocalPilotSession, pilotAccessToken } from "@/lib/nile-south-pilot";
import { browserSupabase } from "@/lib/supabase-browser";
import type { SupabaseClient } from "@supabase/supabase-js";

type Player = { id: string; email?: string; is_anonymous?: boolean; email_confirmed_at?: string | null };
type Mode = "create" | "login" | "guest";
export default function AccountPage() {
  const [user, setUser] = useState<Player | null>(null);
  const [pilot, setPilot] = useState(false);
  const [publicAccess, setPublicAccess] = useState(false);
  const [accountHost, setAccountHost] = useState<"shared" | "kings" | null>(null);
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
      let token: string | null;
      if (window.location.hostname === "kings.nilesouth.app") {
        const response = await fetch("/oauth/callback", {
          method: "POST", headers: { "x-nile-south-session": "1" }, cache: "no-store",
        }).catch(() => null);
        const shared = response?.status === 200 ? await response.json().catch(() => null) : null;
        setPublicAccess(shared?.publicAccess === true);
        token = typeof shared?.accessToken === "string" ? shared.accessToken : null;
      } else {
        token = await pilotAccessToken();
      }
      setPilot(Boolean(token));
      const { data } = await client.auth.getUser(token ?? undefined);
      setUser(data.user);
      if (data.user && !data.user.is_anonymous && data.user.email_confirmed_at) {
        if (token) {
          const response = await fetch("/api/account/profile", { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
          if (!response.ok) { setMessage("Could not load your player profile."); return; }
          const { profile } = await response.json();
          if (profile) { setUsername(profile.username); setDisplayName(profile.display_name); }
          return;
        }
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
    const hostname = window.location.hostname;
    if (hostname === "auth.nilesouth.app") {
      setAccountHost("shared");
      document.title = "Nile South Games | Player account";
      if (new URLSearchParams(window.location.search).get("mode") === "create") setMode("create");
    } else if (hostname === "kings.nilesouth.app") {
      setAccountHost("kings");
    }
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
    {accountHost === "shared" ? (
      // The collection’s logo identifies the same account service used by every game.
      // eslint-disable-next-line @next/next/no-img-element
      <a href="https://nilesouth.app/" aria-label="Nile South Games home"><img src="https://nilesouth.app/highland-logo.jpg" alt="Nile South Games" width="168" height="112" style={{ display: "block", margin: "0 auto 1rem", maxWidth: "100%", height: "auto" }} /></a>
    ) : <p className="kicker">NILE SOUTH GAMES</p>}
    <h1>Player account</h1>
    <p className="subtitle">{accountHost === "shared" ? "Manage the account you use across Nile South Games." : "Use your Nile South player account to sign in and resume games."}</p>
    <p>{accountHost === "shared" ? <a href="https://nilesouth.app/">Nile South game collection</a> : <Link href="/">Return to Nubian Kings</Link>} · <Link href="/account/games">My Games — Resume on another device</Link></p>
    {accountHost === "kings" && !loading && !pilot && !user?.is_anonymous && <p style={{ margin: "1.25rem 0" }}>
      <a href="/oauth/callback?start=1" style={{ display: "inline-block", padding: "0.85rem 1.25rem", borderRadius: "0.5rem", background: "#24584c", color: "#fffaf0", fontSize: "1.125rem", fontWeight: 700, textDecoration: "none" }}>{publicAccess ? "Sign in" : "Use shared Nile South sign-in"}</a>
      {!publicAccess && <small style={{ display: "block", marginTop: "0.5rem" }}>Shared sign-in is currently available to the pilot account.</small>}
    </p>}
    {!client ? <p role="alert">Account preview is not configured. Please check its Vercel Supabase environment variables.</p>
      : loading ? <p>Checking your player session…</p> : <>
      {user?.is_anonymous && <section aria-label="Upgrade guest account"><h2>Upgrade your guest account</h2>
        <p>Your current guest player ID will be kept, including any multiplayer seats tied to it. Add your email and verify it before setting a password.</p>
        <label htmlFor="guest-email">Email address</label>
        <input id="guest-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
        <button disabled={busy || !email.trim()} onClick={() => void run(() => client.auth.updateUser({ email: email.trim() }, { emailRedirectTo: window.location.origin + "/account" }), "Check your email for the verification link; return here in the same browser.")}>Send guest upgrade verification</button>
        <p>Do not sign out, clear browser data, or switch devices before verification. If the email already belongs to an account, this does not merge their multiplayer seats.</p>
      </section>}
      {!user && publicAccess && <p><a href="https://auth.nilesouth.app/account?mode=create">Create account</a> · <a href="https://auth.nilesouth.app/account/recover">Forgot your password?</a></p>}
      {!user && !publicAccess && <>
        <nav aria-label="Account options">
          {accountHost === "kings" ? <a href="https://auth.nilesouth.app/account?mode=create">Create account</a> : <button type="button" disabled={busy} aria-pressed={mode === "create"} onClick={() => { setMode("create"); setMessage("Create account selected. Enter an email address and a password of at least 12 characters below."); }}>Create account</button>}{" "}
          <button type="button" disabled={busy} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setMessage("Sign in selected. Enter your existing email and password below."); }}>{accountHost === "shared" ? "Manage your account" : "Sign in to Nubian Kings"}</button>{" "}
          <button type="button" disabled={busy} aria-pressed={mode === "guest"} onClick={() => { setMode("guest"); setMessage("Guest mode selected. Start a guest session below."); }}>Continue as guest</button>
        </nav>
        {mode === "guest" && <section><h2>Play without an account</h2><p>You can register later without changing this new guest's ID.</p>
          <button disabled={busy} onClick={() => void run(() => client.auth.signInAnonymously(), "Guest session created. You can now upgrade your guest account.")}>Start guest session</button>
        </section>}
        {(mode === "create" || mode === "login") && <section><h2>{mode === "create" ? "Create Nile South account" : accountHost === "shared" ? "Sign in to manage your account" : "Sign in to Nubian Kings"}</h2>
          {mode === "create" && <p>Enter a valid email and a password of at least 12 characters. Already playing as a guest on another domain? Upgrade on that original domain to preserve the existing seat.</p>}
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} minLength={mode === "create" ? 12 : undefined} value={password} onChange={event => setPassword(event.target.value)} />
          {mode === "create" && <p aria-live="polite">{password.length === 0 ? "Password required: minimum 12 characters." : password.length < 12 ? `Password needs ${12 - password.length} more character(s).` : "Password length requirement met."}</p>}
          {mode === "login" && <p><Link href="https://auth.nilesouth.app/account/recover">Forgot your password?</Link></p>}
          {mode === "create" ? <button type="button" disabled={busy} onClick={() => void createAccount()}>{busy ? "Submitting registration…" : "Create account and verify email"}</button> :
            <button disabled={busy || !email.trim() || !password} onClick={() => void run(() => client.auth.signInWithPassword({ email: email.trim(), password }), "Signed in.")}>Sign in</button>}
        </section>}
      </>}
      {user && !permanent && !user.is_anonymous && <p>Verify your email address to finish creating your permanent account. Check the inbox for {user.email}.</p>}
      {permanent && pilot && <><h2>Your player profile</h2><p>Signed in as {user?.email}</p><p>{displayName}{username ? " · " + username : ""}</p>{publicAccess && <p><a href="https://auth.nilesouth.app/account">Manage your Nile South account</a></p>}</>}
      {permanent && !pilot && <><h2>Your player profile</h2><p>Signed in as {user?.email}</p>
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
      {user && !user.is_anonymous && <p><button disabled={busy} onClick={() => void run(async () => { if (pilot) await endLocalPilotSession(); return client.auth.signOut(); }, "Signed out.")}>Sign out</button></p>}
    </>}
    {message && <p role="status" aria-live="polite" style={{ padding: "0.75rem", border: "1px solid currentColor", borderRadius: "0.5rem", marginTop: "1rem" }}>{message}</p>}
  </section></main>;
}
