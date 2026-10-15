"use client";

export default function SecondStrikePrompt({ isYou, playerName, targetName, victoryMode, busy = false, attackerWinsTies = false, explanationReady = false, acknowledged = false, onContinue, onDecide }: {
  isYou: boolean; playerName: string; targetName: string; victoryMode: "standard" | "long";
  busy?: boolean; attackerWinsTies?: boolean; explanationReady?: boolean; acknowledged?: boolean; onContinue: () => void; onDecide: (accept: boolean) => void;
}) {
  return <section className="chooser secondStrikePrompt" aria-labelledby="second-strike-title">
    <p className="kicker">THE HEIR IS EXPOSED</p>
    <h2 id="second-strike-title">{isYou ? "Do you wish to risk a second strike?" : `${playerName} may risk a second strike.`}</h2>
    <p>{isYou ? "You removed" : `${playerName} removed`} the last army card protecting {targetName}’s heir. {isYou ? "You may" : "They may"} immediately choose any eligible card or formation and statistic to challenge that heir.</p>
    <p className="secondStrikeWarning"><strong>{isYou ? "If you lose, your entire side is eliminated—even if your own heir and other army cards remain." : "Losing the second strike eliminates the challenger’s entire side."}</strong></p>
    <p>{victoryMode === "standard" ? "Winning wins the game." : "Winning eliminates that opponent; the last heir standing wins the game."} {attackerWinsTies ? "Without Nile Floods, a tie favors the attacker and eliminates the defending side." : "A tie or cancelled comparison ends the attempt without eliminating either side."} Declining continues normal play, including replenishment.</p>
    {!explanationReady ? <div className="actions"><button disabled={busy || acknowledged} onClick={onContinue}>What Happens Next?</button>{acknowledged && <p role="status">Waiting for the other players to read the explanation…</p>}</div> : isYou ? <div className="actions"><button disabled={busy} onClick={() => onDecide(true)}>Yes — risk a second strike</button><button className="secondary" disabled={busy} onClick={() => onDecide(false)}>No — continue normally</button></div> : <p aria-live="polite">Waiting for {playerName} to decide…</p>}
  </section>;
}
