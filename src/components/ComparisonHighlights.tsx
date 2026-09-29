"use client";

import type { ReactNode } from "react";
import { getCardArtwork } from "@/game/card-artwork";
import type { Stat } from "@/game/types";

export type ComparisonResult = "Winner" | "Defeated" | "Tied" | "Cancelled";
type HighlightCard = { id?: string; definitionId?: string; name?: string; factionId?: string; artFile?: string; mercenary?: boolean; strength?: number; zeal?: number; wealth?: number };
type Score = { base: number; die: number; total: number };
export function ComparisonHighlights({ children }: { children: ReactNode }) {
  return <div className="comparisonCards">{children}</div>;
}

export function ComparisonStatCard({ card, stat, result, pile = false, children }: {
  card: HighlightCard; stat: Stat; result: ComparisonResult; pile?: boolean; children: ReactNode;
}) {
  const immune = card.mercenary && stat === "zeal";
  const value = immune ? "X" : card[stat];
  const artwork = Boolean(getCardArtwork(card));
  const label = result === "Winner" ? "Wins" : result === "Defeated" ? "Loses" : result;
  return <span className={`comparisonStatCard stat-${stat} highlight-${result.toLowerCase()} ${artwork ? "hasArtwork" : "noArtwork"}`}>
    {children}
    <span key={`${card.id}-${stat}-${value}-${result}`} className="statHighlight" aria-label={`${card.name ?? "Card"}: ${stat} ${value ?? "unavailable"}. ${pile ? "Pile contribution; formation " + result.toLowerCase() : label}.`}>
      <span className="statHighlightBubble" aria-hidden="true"><span>{stat}</span><b>{value ?? "—"}</b><small>{immune ? "Immune" : pile ? "Contribution" : label}</small></span>
    </span>
  </span>;
}

export function ComparisonScoreDetail({ cancelled = false, guarantees, playerId, winnerId, effectDecided = false }: {
  cards: HighlightCard[]; stat: Stat; score: Score; cancelled?: boolean; guarantees?: string[]; playerId?: string; winnerId?: string; effectDecided?: boolean;
}) {
  const uniqueGuarantees = new Set(guarantees);
  const guaranteed = uniqueGuarantees.size === 1;
  if (!cancelled && !guaranteed && !effectDecided && uniqueGuarantees.size < 2) return null;
  return <p className="comparisonScoreDetail">
    {cancelled ? <strong>Cancelled — scores do not decide this result.</strong>
      : guaranteed ? <strong>{playerId === winnerId ? "Wins by one-time guarantee." : "Opponent wins by one-time guarantee."}</strong>
      : effectDecided ? <strong>A card effect decides this result.</strong>
      : uniqueGuarantees.size > 1 ? <strong>Both guarantees cancel; scores decide.</strong> : null}
  </p>;
}
