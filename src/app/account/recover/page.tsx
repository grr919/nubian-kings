"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";
import { recoveryPasswordError, recoveryRedirectUrl } from "@/lib/nile-south-recovery";

type RecoveryState = "checking" | "request" | "ready" | "complete";

export default function RecoverPlayerAccount() {
  const [sharedHost, setSharedHost] = useState(false);
  const [step, setStep] = useState<RecoveryState>("checking");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const client = browserSupabase();

  useEffect(() => {
    setSharedHost(window.location.hostname === "auth.nilesouth.app");
    if (!client) { setNotice("Account service is not configured."); setStep("request"); return; }
    let active = true;
    let recoveryDetected = false;
    // The implicit Supabase email link may include type=recovery in the fragment.
    // A genuine authenticated session is still required to update the password.
    const linkIsRecovery = () => new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const listener = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryDetected = true;
        if (active) { setStep("ready"); setNotice(""); }
      }
    });
    const check = async () => {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!active) return;
        if (user && !user.is_anonymous && (recoveryDetected || linkIsRecovery())) {
          recoveryDetected = true;
          setStep("ready");
        } else if (!recoveryDetected) setStep("request");
      } catch {
        if (active && !recoveryDetected) setStep("request");
      }
    };
    void check();
    return () => { active = false; listener.data.subscription.unsubscribe(); };
  }, [client]);

  async function requestReset() {
    if (!client || busy || !email.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: recoveryRedirectUrl(window.location.origin)
      });
      if (error) throw error;
      // Do not reveal account existence in the reset-request UI.
      setNotice("If this address has a Nile South account, a password-reset message has been requested. Check your inbox and spam folder.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request a reset message.");
    } finally { setBusy(false); }
  }

  async function savePassword() {
    if (!client || step !== "ready" || busy) return;
    const validationError = recoveryPasswordError(newPassword, confirmPassword);
    if (validationError) { setNotice(validationError); return; }
    setBusy(true);
    setNotice("");
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user || user.is_anonymous) throw Error("Recovery session expired. Request another password-reset email.");
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      // Password recovery updates the existing Supabase user, not their user ID.
      setStep("complete");
      setNotice("Password updated. Your player identity and existing multiplayer seats are preserved.");
      window.history.replaceState(null, "", window.location.pathname);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update your password.");
    } finally { setBusy(false); }
  }

  return <main className="landing levelLanding">
    <section className="panel levelSelectPanel nileSouthAccountPanel" style={{ maxWidth: 680 }}>
      <p className="kicker">NILE SOUTH GAMES</p>
      <h1>Account recovery</h1>
      <p className="subtitle">Reset your password without creating a new player account.</p>
      <p><Link href="/account">Return to player account</Link> · {sharedHost ? <a href="https://nilesouth.app/">Nile South game collection</a> : <Link href="/">Nubian Kings</Link>}</p>
      {step === "checking" && <p role="status">Checking the recovery link…</p>}
      {step === "request" && <>
        <h2>Request a password-reset email</h2>
        <p>Use the email address registered to your Nile South player account. Open the reset link to choose a new password.</p>
        <label htmlFor="recovery-email">Account email</label>
        <input id="recovery-email" type="email" autoComplete="email" value={email}
          onChange={event => setEmail(event.target.value)} />
        <button type="button" disabled={!client || busy || !email.trim()} onClick={() => void requestReset()}>
          {busy ? "Requesting reset…" : "Email password-reset link"}
        </button>
      </>}
      {step === "ready" && <>
        <h2>Set a new password</h2>
        <p>The recovery link has authenticated your existing account. Your account ID and saved games will remain unchanged.</p>
        <label htmlFor="recovery-password">New password (at least 12 characters)</label>
        <input id="recovery-password" type="password" autoComplete="new-password" minLength={12}
          value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        <label htmlFor="recovery-confirm">Confirm new password</label>
        <input id="recovery-confirm" type="password" autoComplete="new-password" minLength={12}
          value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
        <button type="button" disabled={busy || newPassword.length < 12 || newPassword !== confirmPassword}
          onClick={() => void savePassword()}>
          {busy ? "Updating password…" : "Save new password"}
        </button>
      </>}
      {step === "complete" && <p><Link href="/account/games">Open My Games</Link></p>}
      {notice && <p role="status" aria-live="polite" style={{ padding: "0.75rem", border: "1px solid currentColor", borderRadius: "0.5rem", marginTop: "1rem" }}>{notice}</p>}
    </section>
  </main>;
}
