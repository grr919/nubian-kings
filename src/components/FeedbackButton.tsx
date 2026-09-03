"use client";

import { useState, type FormEvent } from "react";
import { FEEDBACK_CATEGORIES, type FeedbackCategory, type FeedbackDiagnostics } from "@/game/feedback";

export default function FeedbackButton({ diagnostics }: { diagnostics: FeedbackDiagnostics }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("Gameplay bug");
  const [description, setDescription] = useState("");
  const [expected, setExpected] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  function close() {
    if (status === "sending") return;
    setOpen(false); setStatus("idle"); setMessage("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("sending"); setMessage("");
    const approvedDiagnostics = includeDiagnostics ? {
      ...diagnostics,
      browser: navigator.userAgent,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
    } : undefined;
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description, expected, contactEmail, diagnostics: approvedDiagnostics, website }),
      });
      const result = await response.json() as { error?: string; reference?: string };
      if (!response.ok) throw new Error(result.error || "The report could not be sent.");
      setStatus("sent"); setMessage(result.reference ? `Thank you. Report ${result.reference} was sent.` : "Thank you. Your report was sent.");
      setDescription(""); setExpected("");
    } catch (error) {
      setStatus("error"); setMessage(error instanceof Error ? error.message : "The report could not be sent.");
    }
  }

  return <>
    <button className="iconButton" onClick={() => setOpen(true)}>Feedback</button>
    {open && <div className="modalShade" role="presentation" onMouseDown={close}><section className="modal feedbackModal" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modalClose" aria-label="Close feedback form" onClick={close}>×</button>
      <p className="kicker">PLAYTEST FEEDBACK</p><h2 id="feedback-title">Report an issue</h2>
      {status === "sent" ? <div className="feedbackSuccess" aria-live="polite"><p>{message}</p><button onClick={close}>Close</button></div> : <form onSubmit={submit}>
        <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)}>{FEEDBACK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>What happened?</span><textarea required minLength={10} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label><span>What did you expect? <small>Optional</small></span><textarea maxLength={2000} value={expected} onChange={(event) => setExpected(event.target.value)} /></label>
        <label><span>Contact email <small>Optional</small></span><input type="email" maxLength={254} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
        <label className="feedbackConsent"><input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} /><span><b>Include game diagnostics</b><small>Sends the level, seed, round, settings, faction, screen information, and recent public history. Hidden cards and saved-game contents are never included.</small></span></label>
        <label className="feedbackTrap" aria-hidden="true"><span>Website</span><input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
        {message && <p className="feedbackError" role="alert">{message}</p>}
        <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send Feedback"}</button>
      </form>}
    </section></div>}
  </>;
}
