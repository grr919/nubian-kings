"use client";

import { useState, type ReactNode } from "react";

export default function RoomControlBoundary({
  canControl, onTakeControl, children
}: {
  canControl: boolean;
  onTakeControl: () => Promise<void>;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function takeControl() {
    setBusy(true);
    setError("");
    try { await onTakeControl(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to take control."); }
    finally { setBusy(false); }
  }
  return <>
    {!canControl && <div role="status" className="roomControlBanner">
      <strong>This game is being controlled from another device.</strong>
      <p>You can continue watching here. To make moves in this browser, transfer control here.</p>
      <button disabled={busy} type="button" onClick={() => void takeControl()}>
        {busy ? "Taking control…" : "Take control here"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>}
    <div inert={!canControl}>{children}</div>
  </>;
}
