import { describe, expect, it } from "vitest";
import { canMoveArmyCard, moveArmyCard } from "./MasterArmyBoard";
import type { MasterCard } from "@/game/master";

const card = (id: string, type: MasterCard["type"]): MasterCard => ({
  id, definitionId: id, name: id, factionId: "test", type,
  strength: 1, zeal: 1, wealth: 1, face: "up",
});

describe("Master army board moves", () => {
  it("combines two loose cards and then adds a third to the same pile", () => {
    const cards = [card("place", "place"), card("person", "person"), card("thing", "thing")];
    const pair = moveArmyCard(cards, [], cards[1], cards[0].id)!;
    expect(pair[0].cards.map((item) => item.id)).toEqual(["place", "person"]);
    const triple = moveArmyCard(cards, pair, cards[2], pair[0].id)!;
    expect(triple[0].cards.map((item) => item.id)).toEqual(["place", "person", "thing"]);
    expect(canMoveArmyCard(cards, [], cards[2], cards[0].id)).toBe(false);
    const standalone = moveArmyCard(cards, [], cards[1]);
    expect(standalone?.[0].cards.map((item) => item.id)).toEqual(["person"]);
    expect(moveArmyCard(cards, standalone!, cards[0], standalone![0].id)?.[0].cards.map((item) => item.id)).toEqual(["place", "person"]);
    const extraCards = [...cards, card("another-person", "person"), card("another-thing", "thing")];
    const four = moveArmyCard(extraCards, triple, extraCards[3], triple[0].id)!;
    const five = moveArmyCard(extraCards, four, extraCards[4], four[0].id)!;
    expect(five[0].cards.map((item) => item.type)).toEqual(["place", "person", "thing", "person", "thing"]);
  });
});

it("moves a priest together with its gospel onto a church", () => {
 const church=card("church","place"), priest=card("priest","person"), gospel=card("gospel","thing");
 const cards=[church,priest,gospel], piles=[{id:"held",cards:[priest,gospel]}];
 expect(canMoveArmyCard(cards,piles,priest,church.id)).toBe(true);
 expect(moveArmyCard(cards,piles,priest,church.id)?.[0].cards.map(c=>c.id)).toEqual(["church","priest","gospel"]);
 expect(canMoveArmyCard(cards,piles,gospel,church.id)).toBe(false);
});
