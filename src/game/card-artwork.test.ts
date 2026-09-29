import { describe, expect, it } from "vitest";
import { getCardArtwork } from "./card-artwork";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import localArtwork from "../data/local-card-artwork.json";

describe("card artwork identity", () => {
  it("distinguishes Ore Deposits across factions in existing Beginner games", () => {
    expect(getCardArtwork({ name: "Ore Deposit", factionId: "egyptian-christians" })).toBe("/cards/70%20Blue.jpg");
    expect(getCardArtwork({ name: "Ore Deposit", factionId: "nubian-christians" })).toContain("/cards/44%20Red.jpg");
    expect(getCardArtwork({ name: "Ore Deposit", factionId: "ethiopian-jews" })).toContain("/cards/184%203x%20White.jpg");
    expect(getCardArtwork({ name: "Ore Deposit" })).toBeUndefined();
  });
  it("uses the same restored image in solo, Amateur, Master, and card inspection", () => {
    expect(getCardArtwork({ id: "NK-ROW-059:0" })).toBe("/cards/70%20Blue.jpg");
    expect(getCardArtwork({ definitionId: "NK-ROW-059" })).toBe("/cards/70%20Blue.jpg");
    expect(getCardArtwork({ definitionId: "NK-ROW-059", artFile: "70 Blue.jpg" })).toBe("/cards/70%20Blue.jpg");
  });
  it("ships every image listed as local", () => {
    expect(localArtwork.length).toBeGreaterThan(0);
    expect(localArtwork.filter((file) => !existsSync(resolve("public/cards", file)))).toEqual([]);
  });
});
