export default function ReadingCardGuide({ effects = false }: { effects?: boolean }) {
  return (<aside className="rulesCardPanel" aria-labelledby="sample-card-title">
        <h3 id="sample-card-title">Reading a card</h3>
        <figure>
          <div className="rulesSampleCard">
            <img src="/cards/1%20Red.jpg" alt="The Ngonnen sample card: Strength 5, Zeal 2, Wealth 5." width={825} height={1125} />
            <svg className="rulesCardAnnotations" viewBox="-260 0 1085 1125" aria-hidden="true">
              <defs><marker id="rules-card-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
              <g className="rulesStatBanner rulesStrength">
                <path className="rulesStatArrow" d="M -28 66 L 38 66" />
                <rect x="-250" y="32" width="222" height="68" rx="8" />
                <text x="-139" y="66">Strength</text>
              </g>
              <g className="rulesStatBanner rulesZeal">
                <path className="rulesStatArrow" d="M 200 206 L 180 206 L 150 147" />
                <rect x="200" y="172" width="222" height="68" rx="8" />
                <text x="311" y="206">Zeal</text>
              </g>
              <g className="rulesStatBanner rulesWealth">
                <path className="rulesStatArrow" d="M 681 206 L 724 160" />
                <rect x="562" y="206" width="222" height="68" rx="8" />
                <text x="673" y="240">Wealth</text>
              </g>
              {effects && <rect className="rulesEffectsOutline" x="50" y="590" width="725" height="270" rx="10" />}
            </svg>
          </div>
          {effects && <p className="rulesEffectsNote">Special effects and bonuses in the colored box activate only when <strong>Effects On</strong> is selected.</p>}
          <figcaption>Strength is above the slash; Zeal is below it. Wealth is in the upper-right corner.</figcaption>
        </figure>
      </aside>);
}
