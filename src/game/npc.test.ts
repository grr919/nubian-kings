import { describe, expect, it } from "vitest";
import { chooseNpcStat, chooseNpcStatForCard, factionProfile } from "./npc";
import type { Card, Stat } from "./types";

const profile = { strength: 6, zeal: 3, wealth: 1 };
const card = (face: "up" | "down", stats: Record<Stat, number>): Card => ({
  id: "private-card", name: "Private card", factionId: "test-faction", face, discarded: false, ...stats,
});

describe("faction tendencies", () => {
  it("weights statistics by copies in the playable deck", () => {
    expect(factionProfile([
      { strength: 9, zeal: 0, wealth: 0, deckCopies: 2 },
      { strength: 0, zeal: 6, wealth: 3, deckCopies: 1 },
      { strength: 99, zeal: 99, wealth: 99, deckCopies: 0, availableInPrototype: false },
    ])).toEqual({ strength: 6, zeal: 2, wealth: 1 });
  });
  it("returns a neutral profile for an empty playable deck", () => expect(factionProfile([])).toEqual({ strength: 0, zeal: 0, wealth: 0 }));
});

describe("hidden-card fairness", () => {
  it("uses public faction tendencies for a face-down upcoming card", () => {
    expect(chooseNpcStatForCard(profile, card("down", { strength: 0, zeal: 0, wealth: 99 }), () => 0)).toBe("strength");
  });
  it("is unaffected by every statistic on a hidden card", () => {
    const low = card("down", { strength: 0, zeal: 0, wealth: 0 });
    const privateValues = card("down", { strength: 999, zeal: 0, wealth: 9999 });
    const rolls = [0, 0.2, 0.59, 0.6, 0.89, 0.99];
    expect(rolls.map((roll) => chooseNpcStatForCard(profile, low, () => roll)))
      .toEqual(rolls.map((roll) => chooseNpcStatForCard(profile, privateValues, () => roll)));
  });
  it("does not inspect a hidden card during a tie decision", () => {
    const first = chooseNpcStatForCard(profile, card("down", { strength: 0, zeal: 100, wealth: 0 }), () => 0.5);
    const second = chooseNpcStatForCard(profile, card("down", { strength: 100, zeal: 0, wealth: 0 }), () => 0.5);
    expect(first).toBe(second);
  });
});

describe("revealed-card decisions", () => {
  it("usually chooses the strongest publicly visible statistic", () => {
    const visible = card("up", { strength: 1, zeal: 9, wealth: 2 });
    const decisions = Array.from({ length: 100 }, (_, index) => chooseNpcStatForCard(profile, visible, () => (index + 0.5) / 100));
    expect(decisions.filter((stat) => stat === "zeal")).toHaveLength(80);
  });
  it("retains a small chance of choosing another statistic", () => {
    expect(chooseNpcStatForCard(profile, card("up", { strength: 1, zeal: 9, wealth: 2 }), () => 0.95)).not.toBe("zeal");
  });
  it("resolves equal-best visible statistics randomly", () => {
    const visible = card("up", { strength: 8, zeal: 8, wealth: 1 });
    expect(chooseNpcStatForCard(profile, visible, () => 0.1)).toBe("strength");
    expect(chooseNpcStatForCard(profile, visible, () => 0.7)).toBe("zeal");
  });
  it("chooses only from statistics allowed by the caller", () => {
    expect(chooseNpcStat(profile, undefined, () => 0, ["zeal", "wealth"])).toBe("zeal");
  });
});
