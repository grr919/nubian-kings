import type { ReactNode } from "react";
import FactionPortrait from "@/components/FactionPortrait";
import EparchCrownMark from "@/components/EparchCrownMark";

export default function GameStateBanner({
  title,
  detail,
  meta,
  thinking = false,
  actions,
  players = [],
  viewerId,
}: {
  title: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  thinking?: boolean;
  actions?: ReactNode;
  players?: { id: string; factionId: string; eliminated?: boolean; heir?: { definitionId?: string; name?: string } }[];
  viewerId?: string;
}) {
  return (
    <section className="statusBar gameStateBanner">
      <div className="gameStateCopy">
        <span className={`turnDot ${thinking ? "thinking" : ""}`} />
        <div>
          <b>{title}</b>
          {detail && <small>{detail}</small>}
        </div>
      </div>
      {players.length > 0 && <div className="gameStateRulers" role="list" aria-label="Sides still in play">
        {players.filter(player => !player.eliminated).map(player => {
          const civilization = player.factionId.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
          const label = `${player.id === viewerId ? "You · " : ""}${civilization}${player.heir?.name ? ` · ${player.heir.name}` : ""}`;
          return <span key={player.id} role="listitem" aria-label={label} title={label} className={`gameStateRuler ${player.id === viewerId ? "yourRuler" : ""}`}>
            <FactionPortrait factionId={player.factionId} leader={player.heir} compact />
          </span>;
        })}
      </div>}
      <div className="gameStateBrand">
        <EparchCrownMark className="miniMark" />
        <b>Nubian Kings</b>
        {meta && <small>{meta}</small>}
        {actions && <div className="gameStateActions">{actions}</div>}
      </div>
    </section>
  );
}
