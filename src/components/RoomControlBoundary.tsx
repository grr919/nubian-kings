"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

export default function RoomControlBoundary({
  canControl, reason, onTakeControl, children
}: {
  canControl: boolean;
  reason?: "reload" | "unavailable" | "other-device";
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
      <strong>{reason === "reload" ? "This game tab needs to reload." : reason === "unavailable" ? "Controller service is temporarily unavailable." : "This game is being controlled from another tab or device."}</strong>
      <p>{reason === "reload" ? "The game has been updated. Reload this tab to initialize its controller session." : reason === "unavailable" ? "Your seat has not been taken by another device. Try reloading when the connection is restored." : "Another open browser session may still have control, even on this device. You can watch here or transfer control to this tab."}</p>
      {reason === "reload" || reason === "unavailable"
        ? <button type="button" onClick={() => window.location.reload()}>Reload game</button>
        : <button disabled={busy} type="button" onClick={() => void takeControl()}>
            {busy ? "Taking control…" : "Take control here"}
          </button>}
      <Link href="/account/games">My Games</Link>
      <Link href="/">Return to game selection</Link>
      {error && <p role="alert">{error}</p>}
    </div>}
    <div inert={!canControl}>{children}</div>
  </>;
}
