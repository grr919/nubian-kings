"use client";

type PresenceSeat = {
  userId?: string;
  displayName: string;
  controller: "human" | "npc";
  isYou: boolean;
  replaceable?: boolean;
};

export default function MultiplayerPresenceControls({ isHost, seats, busy, onAct }: {
  isHost: boolean;
  seats: PresenceSeat[];
  busy: boolean;
  onAct: (body: object) => void;
}) {
  const disconnected = isHost ? seats.filter((seat) => seat.replaceable) : [];
  return <aside className="presenceControls">
    {disconnected.map((seat) => <button key={seat.userId} disabled={busy} onClick={() => {
      if (window.confirm(`Permanently transfer ${seat.displayName}'s seat to the computer?`)) onAct({ action: "replace-player", userId: seat.userId });
    }}>Replace {seat.displayName}</button>)}
    <button className="secondary" disabled={busy} onClick={() => {
      if (window.confirm("Permanently transfer your seat to the computer and leave this room?")) onAct({ action: "transfer-self" });
    }}>Transfer Seat &amp; Leave</button>
  </aside>;
}
