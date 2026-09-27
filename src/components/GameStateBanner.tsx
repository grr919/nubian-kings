import type { ReactNode } from "react";
import EparchCrownMark from "@/components/EparchCrownMark";

export default function GameStateBanner({
  title,
  detail,
  meta,
  thinking = false,
  actions,
}: {
  title: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  thinking?: boolean;
  actions?: ReactNode;
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
      <div className="gameStateBrand">
        <EparchCrownMark className="miniMark" />
        <b>Nubian Kings</b>
        {meta && <small>{meta}</small>}
        {actions && <div className="gameStateActions">{actions}</div>}
      </div>
    </section>
  );
}
