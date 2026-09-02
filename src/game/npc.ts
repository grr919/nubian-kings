import type { Card, Stat } from "./types";

export type StatProfile = Record<Stat, number>;
type FactionCard = StatProfile & { deckCopies?: number; availableInPrototype?: boolean };

const STATS: readonly Stat[] = ["strength", "zeal", "wealth"];
const VISIBLE_STRONGEST_WEIGHT = 0.8;

function weightedChoice(weights: Readonly<Record<Stat, number>>, random: () => number, available: readonly Stat[]) {
  const total = available.reduce((sum, stat) => sum + Math.max(0, weights[stat]), 0);
  if (total <= 0) return available[Math.floor(random() * available.length)];

  let roll = random() * total;
  for (const stat of available) {
    roll -= Math.max(0, weights[stat]);
    if (roll < 0) return stat;
  }
  return available[available.length - 1];
}

export function chooseNpcStat(
  profile: StatProfile,
  visibleCard: StatProfile | undefined,
  random: () => number,
  available: readonly Stat[] = STATS,
): Stat {
  if (!available.length) throw new Error("At least one statistic must be available");
  if (!visibleCard) return weightedChoice(profile, random, available);

  const bestValue = Math.max(...available.map((stat) => visibleCard[stat]));
  const best = available.filter((stat) => visibleCard[stat] === bestValue);
  if (best.length === available.length) return best[Math.floor(random() * best.length)];

  const alternatives = available.filter((stat) => !best.includes(stat));
  const bestShare = VISIBLE_STRONGEST_WEIGHT / best.length;
  const alternativeShare = (1 - VISIBLE_STRONGEST_WEIGHT) / alternatives.length;
  const weights = Object.fromEntries(STATS.map((stat) => [
    stat,
    best.includes(stat) ? bestShare : alternatives.includes(stat) ? alternativeShare : 0,
  ])) as StatProfile;
  return weightedChoice(weights, random, available);
}

/** Statistics enter the decision only after the game marks the card face up. */
export function chooseNpcStatForCard(
  profile: StatProfile,
  upcomingCard: Card | undefined,
  random: () => number,
  available: readonly Stat[] = STATS,
) {
  const publicCard = upcomingCard?.face === "up" ? upcomingCard : undefined;
  return chooseNpcStat(profile, publicCard, random, available);
}

export function factionProfile(cards: readonly FactionCard[]): StatProfile {
  const included = cards.map((card) => ({
    card,
    copies: card.availableInPrototype === false ? 0 : Math.max(0, card.deckCopies ?? 1),
  })).filter(({ copies }) => copies > 0);
  const totalCopies = included.reduce((sum, { copies }) => sum + copies, 0);
  if (!totalCopies) return { strength: 0, zeal: 0, wealth: 0 };

  return Object.fromEntries(STATS.map((stat) => [
    stat,
    included.reduce((sum, { card, copies }) => sum + card[stat] * copies, 0) / totalCopies,
  ])) as StatProfile;
}
