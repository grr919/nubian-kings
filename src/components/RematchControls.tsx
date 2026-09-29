import type { RematchVotes } from "@/game/rematch-consent";

export default function RematchControls({ room, busy, onAct }: {
  room: { revision: number; settings: { rematchVotes?: RematchVotes }; seats: Array<{ userId?: string; displayName: string; controller: "human" | "npc"; isYou: boolean }> };
  busy: boolean;
  onAct: (body: object) => void;
}) {
  const humans = room.seats.filter((seat) => seat.controller === "human");
  const votes = room.settings.rematchVotes ?? {};
  const you = humans.find((seat) => seat.isYou);
  const choice = you?.userId ? votes[you.userId] : undefined;
  return <div className="rematchConsent">
    <p>Play another game? A rematch starts only when every player chooses Yes.</p>
    <ul aria-label="Rematch responses" aria-live="polite">{humans.map((seat) => <li key={seat.userId}>{seat.isYou ? "You" : seat.displayName}: {seat.userId && votes[seat.userId] === true ? "Yes" : seat.userId && votes[seat.userId] === false ? "No" : "Not answered"}</li>)}</ul>
    <div className="rematchChoices">
      <button disabled={busy || choice === true} onClick={() => onAct({ action: "rematch", accept: true, revision: room.revision })}>Yes, play again</button>
      <button className="secondary" disabled={busy || choice === false} onClick={() => onAct({ action: "rematch", accept: false, revision: room.revision })}>No, stay here</button>
    </div>
  </div>;
}
