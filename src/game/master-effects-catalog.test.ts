import { describe, expect, it } from "vitest";
import cards from "../data/cards.json";
import effects from "../data/card-effects.json";
import mercenaries from "../data/mercenaries.json";
import { createMasterMercenaryReserve, prepareMasterGame } from "./master";

describe("Master effect source data", () => {
  it("binds printed text to each numbered card image, including different variants of one card", () => {
    const numbers = new Set(cards.cards.flatMap((card) => card.assets.map((asset) => asset.filename.match(/^\d+/)?.[0])));
    expect([...numbers].every((number) => Boolean(number && effects[number as keyof typeof effects]))).toBe(true);
    // The formerly unmatched Negusa Negast artwork is now represented in the faction deck.
    expect(numbers.has("103")).toBe(true);
    expect(effects["8"].text).not.toBe(effects["9"].text);
    expect(effects["190"].text).toContain("Immune to conversion");
  });

  it("builds the shared reserve from the seven mercenary images with their exact copy counts", () => {
    const reserve = createMasterMercenaryReserve();
    expect(reserve).toHaveLength(32);
    for (const variant of mercenaries.cards) {
      const copies = reserve.filter((card) => card.name === variant.name);
      expect(copies).toHaveLength(variant.copies);
      expect(copies.every((card) => card.face === "up" && card.type === "person" && card.strength === variant.strength && card.mercenary)).toBe(true);
    }
    expect(new Set(reserve.map((card) => card.id)).size).toBe(reserve.length);
  });

  it("offers Effects On only when selected and keeps Core rules as the default", () => {
    expect(prepareMasterGame({ humanFaction: "nubian-christians", npcCount: 1, nileFloods: false }).effectsMode).toBe("off");
    expect(prepareMasterGame({ humanFaction: "nubian-christians", npcCount: 1, nileFloods: false, effectsMode: "on" }).effectsMode).toBe("on");
  });
});
