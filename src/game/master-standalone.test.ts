import { describe, expect, it } from "vitest";
import { includeStandaloneMasterCards, validateInitialArmy, type MasterCard } from "./master";
const card = (id: string, type: MasterCard["type"]): MasterCard => ({id, definitionId:id, name:id, factionId:"test", type, strength:1, zeal:1, wealth:1, face:"up"});
describe("Master standalone army cards", () => {
  it("accepts twenty separate people and places without manual assignment", () => {
    const cards = Array.from({length:20},(_,i)=>card(String(i), i === 0 ? "place" : "person"));
    const separate = includeStandaloneMasterCards(cards, []);
    expect(separate).toHaveLength(20);
    expect(validateInitialArmy(separate, cards.map(c=>c.id))).toBe(true);
    expect(validateInitialArmy([{id:"one",cards}], cards.map(c=>c.id))).toBe(true);
  });
  it("rejects an unattached object and an object placed only on a place", () => {
    const cards = [card("p","person"),card("l","place"),card("o","thing")];
    expect(validateInitialArmy(includeStandaloneMasterCards(cards,[]))).toBe(false);
    expect(validateInitialArmy(includeStandaloneMasterCards(cards,[{id:"bad",cards:[cards[1],cards[2]]}]))).toBe(false);
    const ready = includeStandaloneMasterCards(cards,[{id:"held",cards:[cards[0],cards[2]]}]);
    expect(ready).toHaveLength(2);
    expect(validateInitialArmy(ready,cards.map(c=>c.id))).toBe(true);
  });
});
