export default function EliminatedGamePrompt({ onContinue, onEnd }: { onContinue: () => void; onEnd: () => void }) {
  return (
    <div className="eliminationShade">
      <section className="eliminationChoice" role="dialog" aria-modal="true" aria-labelledby="elimination-title">
        <p className="kicker">ELIMINATED</p>
        <h2 id="elimination-title">You have been eliminated</h2>
        <p>Only computer opponents remain. You may continue watching them play or end this game now.</p>
        <div>
          <button className="secondary" onClick={onContinue}>Continue Watching</button>
          <button onClick={onEnd}>End Game</button>
        </div>
      </section>
    </div>
  );
}
