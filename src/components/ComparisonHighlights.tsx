"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { getCardArtwork } from "@/game/card-artwork";
import type { Stat } from "@/game/types";

export type ComparisonResult = "Winner" | "Defeated" | "Tied" | "Cancelled";
type HighlightCard = { id?: string; definitionId?: string; name?: string; factionId?: string; artFile?: string; mercenary?: boolean; strength?: number; zeal?: number; wealth?: number };
type Score = { base: number; die: number; total: number };
const ReplayContext = createContext(0);

/** Replaying only remounts the visual overlay, never the cards or game state. */
export function ComparisonHighlights({ children }: { children: ReactNode }) {
  const [replay, setReplay] = useState(0);
  return <ReplayContext.Provider value={replay}>
    <div className="comparisonCards">{children}</div>
    <button type="button" className="secondary comparisonReplay" onClick={() => setReplay(value => value + 1)}>Replay stat highlights</button>
  </ReplayContext.Provider>;
}

export function ComparisonStatCard({ card, stat, result, pile = false, children }: {
  card: HighlightCard; stat: Stat; result: ComparisonResult; pile?: boolean; children: ReactNode;
}) {
  const replay = useContext(ReplayContext);
  const immune = card.mercenary && stat === "zeal";
  const value = immune ? "X" : card[stat];
  const artwork = Boolean(getCardArtwork(card));
  const label = result === "Winner" ? "Wins" : result === "Defeated" ? "Loses" : result;
  return <span className={`comparisonStatCard stat-${stat} highlight-${result.toLowerCase()} ${artwork ? "hasArtwork" : "noArtwork"}`}>
    {children}
    <span key={`${card.id}-${stat}-${value}-${result}-${replay}`} className="statHighlight" aria-label={`${card.name ?? "Card"}: ${stat} ${value ?? "unavailable"}. ${pile ? "Pile contribution; formation " + result.toLowerCase() : label}.`}>
      {artwork && <span className="statHighlightRing" aria-hidden="true" />}
      <span className="statHighlightBubble" aria-hidden="true"><span>{stat}</span><b>{value ?? "—"}</b><small>{immune ? "Immune" : pile ? "Contribution" : label}</small></span>
    </span>
  </span>;
}

export function scoreExplanation(cards: HighlightCard[], stat: Stat, score: Score): string {
  const values = cards.map(card => card[stat]);
  if (!cards.length || values.some(value => value === undefined) || (stat === "zeal" && cards.some(card => card.mercenary))) return `${score.base} base${score.die ? ` + ${score.die} Flood` : ""} = ${score.total}`;
  const printed = values.reduce<number>((sum, value) => sum + value!, 0);
  const adjustment = score.base - printed;
  return `${values.join(" + ")}${cards.length > 1 ? " combined" : " printed"}${adjustment ? ` ${adjustment > 0 ? "+" : "−"} ${Math.abs(adjustment)} effects` : ""}${score.die ? ` + ${score.die} Flood` : ""} = ${score.total}`;
}

export function ComparisonScoreDetail({ cards, stat, score, cancelled = false, guarantees, playerId, winnerId, effectDecided = false }: {
  cards: HighlightCard[]; stat: Stat; score: Score; cancelled?: boolean; guarantees?: string[]; playerId?: string; winnerId?: string; effectDecided?: boolean;
}) {
  const uniqueGuarantees = new Set(guarantees);
  const guaranteed = uniqueGuarantees.size === 1;
  return <p className="comparisonScoreDetail">
    <span>{stat}: {scoreExplanation(cards, stat, score)}</span>
    {cancelled ? <strong>Cancelled — scores do not decide this result.</strong>
      : guaranteed ? <strong>{playerId === winnerId ? "Wins by one-time guarantee." : "Opponent wins by one-time guarantee."}</strong>
      : effectDecided ? <strong>A card effect decides this result.</strong>
      : uniqueGuarantees.size > 1 ? <strong>Both guarantees cancel; scores decide.</strong> : null}
  </p>;
}
