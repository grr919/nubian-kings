import { describe, expect, it } from "vitest";
import data from "./cards.json";

const jpegStatistics: Record<string, [number, number, number]> = {
  "NK-ROW-148": [6, 9, 6],
  "NK-ROW-149": [3, 5, 2],
  "NK-ROW-150": [5, 7, 3],
  "NK-ROW-151": [4, 5, 5],
  "NK-ROW-152": [1, 3, 6],
  "NK-ROW-153": [2, 3, 5],
  "NK-ROW-154": [1, 6, 4],
  "NK-ROW-155": [1, 5, 4],
  "NK-ROW-156": [1, 7, 4],
  "NK-ROW-157": [2, 3, 2],
  "NK-ROW-158": [0, 0, 1],
  "NK-ROW-159": [0, 0, 1],
  "NK-ROW-160": [0, 0, 1],
  "NK-ROW-161": [3, 3, 3],
  "NK-ROW-162": [2, 0, 3],
  "NK-ROW-163": [1, 0, 4],
  "NK-ROW-164": [1, 0, 6],
  "NK-ROW-165": [1, 0, 2],
  "NK-ROW-166": [2, 0, 3],
  "NK-ROW-167": [1, 0, 2],
  "NK-ROW-168": [1, 0, 2],
};

describe("Ethiopian Jewish JPEG reconciliation", () => {
  it("uses the printed JPEG statistics for every available faction card", () => {
    const cards = data.cards.filter((card) => card.factionId === "ethiopian-jews" && card.availableInPrototype);
    expect(cards).toHaveLength(21);
    for (const card of cards) {
      expect([card.strength, card.zeal, card.wealth], card.name).toEqual(jpegStatistics[card.id]);
      expect(card.source.statisticsAuthority, card.name).toBe("JPEG");
    }
  });
});
