import type { MasterCard, MasterPile, MasterPlayer, MasterState } from "./master";
import type { Stat } from "./types";

/** Effect identity follows the printed image, not the card's shared catalog name. */
export function printedNumber(card: MasterCard): number {
  return Number(card.artFile?.match(/^\d+/)?.[0] ?? 0);
}

export function revealedCards(player: MasterPlayer): MasterCard[] {
  return [player.heir, ...player.army.flatMap((pile) => pile.cards)].filter((card) => card.face === "up");
}

export function cardReligion(card: MasterCard): "christian" | "muslim" | "jewish" | "other" {
  if (card.factionId === "egyptian-muslims") return "muslim";
  if (card.factionId === "ethiopian-jews") return "jewish";
  if (card.factionId === "mercenary") return card.name.startsWith("Frankish") ? "christian" : "other";
  return "christian";
}

function located(player: MasterPlayer, card: MasterCard): MasterPile | undefined {
  return player.army.find((pile) => pile.cards.some((part) => part.id === card.id));
}

function samePilePlace(player: MasterPlayer, card: MasterCard, names: readonly string[]): boolean {
  return located(player, card)?.cards.some((part) => part.face === "up" && part.type === "place" && names.includes(part.name.toLowerCase())) ?? false;
}

function has(player: MasterPlayer, names: readonly string[]): boolean {
  return revealedCards(player).some((card) => names.includes(card.name.toLowerCase()));
}

const farmer = ["a farmer", "farmer"];
const merchant = ["merchant", "jewish merchant"];
const caravan = ["camel caravan"];
const irrigated = ["saqiya", "flood plain", "orchard", "palm groves", "palm grove", "vineyard", "farmland", "unirrigated plot"];
const holy = ["church", "cathedral", "monastery", "shrine"];
const marketplaces = ["merchant", "jewish merchant", "camel caravan"];

/** Bonuses intrinsic to a revealed card; recalculated when its pile or supporting cards change. */
export function intrinsicWealthBonus(player: MasterPlayer, card: MasterCard): number {
  if (card.face !== "up") return 0;
  const n = printedNumber(card);
  const inside = (names: readonly string[]) => samePilePlace(player, card, names);
  const owns = (names: readonly string[]) => has(player, names);
  switch (n) {
    case 1: return inside(["ibrim", "faras", "meinarti", "dongola"]) ? 1 : 0;
    case 3: return inside(["ibrim", "faras", "meinarti", "dongola"]) ? 2 : 0;
    case 17: case 18: case 19: case 59: case 60: case 61: case 97: case 98: case 99: return inside(holy) ? 1 : 0;
    case 16: case 58: case 96: return inside(holy) ? 2 : 0;
    case 20: case 63: case 100: return inside(["monastery", "shrine"]) ? 2 : 0;
    case 21: return inside(irrigated) ? 2 : 0;
    case 22: return inside(["ibrim", "faras", "meinarti", "dongola", "castle", "fort", "nile trading post", "grain warehouse"]) ? 3 : 0;
    case 23: return inside(["oasis", "orchard", "palm groves", "vineyard", "farmland", "gold mine", "emerald mine"]) ? 2 : 0;
    case 24: return owns([...merchant, ...caravan, "nile trading post"]) ? 2 : 0;
    case 33: case 122: case 188: return owns([...farmer, ...caravan]) ? 1 : 0;
    case 34: case 36: case 76: case 120: case 123: return owns(farmer) ? 1 : 0;
    case 35: return owns(irrigated.filter((name) => name !== "saqiya")) ? 1 : 0;
    case 38: case 73: return owns(["flood plain", "saqiya"]) ? 1 : 0;
    case 39: case 78: case 187: return owns(["farmland"]) ? 3 : 0;
    case 41: case 68: case 69: case 183: return revealedCards(player).filter((item) => item.type === "place" && item.id !== card.id).length >= 2 ? 2 : 0;
    case 42: case 79: case 124: case 155: return owns(marketplaces) ? 1 : 0;
    case 45: return owns(["ibrim", "faras", "meinarti", "dongola", "cathedral", "castle"]) ? 2 : 0;
    case 46: case 74: case 118: return owns(irrigated) ? 2 : 0;
    case 49: return inside(["cathedral"]) ? 3 : 0;
    case 54: return inside(["cathedral", "church"]) ? 2 : 0;
    case 55: return inside(["nile trading post"]) ? 1 : 0;
    case 62: case 101: return inside(holy) ? 2 : 0;
    case 64: return inside(["nile trading post", "oasis", "grain warehouse"]) ? 3 : 0;
    case 65: return inside(["oasis", "orchard", "farmland", "marble quarry", "nile trading post"]) ? 2 : 0;
    case 66: return inside(["saqiya", "flood plain", "orchard", "farmland", "unirrigated plot"]) ? 2 : 0;
    case 67: case 151: return inside(["farmland", "oasis"]) ? 2 : 0;
    case 75: return owns(farmer) ? 1 : 0;
    case 77: return owns(["orchard", "palm groves", "farmland", "unirrigated plot"]) ? 1 : 0;
    case 89: return inside(["axum", "lalibela", "gondar"]) ? 3 : 0;
    case 107: return inside(["axum", "lalibela", "gondar", "castle", "nile trading post", "oasis", "grain warehouse"]) ? 3 : 0;
    case 108: return inside(["flood plain", "orchard", "palm groves", "vineyard", "farmland", "unirrigated plot"]) ? 2 : 0;
    case 109: return owns(["the negusa negast"]) ? 3 : 0;
    case 110: return inside(["axum", "lalibela", "gondar"]) ? 2 : 0;
    case 121: return owns(["flood plain"]) ? 1 : 0;
    case 125: return located(player, card)?.cards.some((part) => part.face === "up" && ["the negusa negast", "dawit", "gebre meskel", "yekuno amlak", "kedus harbe", "amda tseyon"].includes(part.name.toLowerCase())) ? 3 : 0;
    case 131: return inside(["alexandria", "al-kahira", "al-uqsor"]) ? 3 : 0;
    case 136: case 138: case 139: case 147: case 148: return inside(["mosque", "shrine"]) ? 2 : 0;
    case 137: return inside(["alexandria", "al-kahira", "al-uqsor"]) ? 2 : 0;
    case 145: return inside(["orchard", "palm groves", "farmland", "ore deposit", "nile trading post"]) ? 2 : 0;
    case 149: return inside(["oasis", "farmland", "marble quarry", "gold mine"]) ? 2 : 0;
    case 150: return inside(["alexandria", "al-kahira", "al-uqsor", "castle", "fort"]) ? 3 : 0;
    case 158: return owns(["cathedral", "church"]) ? 2 : 0;
    case 159: return owns(marketplaces) ? 2 : 0;
    case 167: case 168: case 169: return owns(["a tabot"]) ? 2 : 0;
    case 171: return located(player, card)?.cards.some((part) => part.type === "place" && part.face === "up") ? 1 : 0;
    case 172: return revealedCards(player).filter((item) => item.type === "place").length >= 2 ? 2 : 0;
    case 173: case 174: case 175: return 2 * revealedCards(player).filter((item) => item.name.toLowerCase() === "shalot bet").length;
    case 178: return inside(["vineyard", "farmland", "palm groves"]) ? 2 : 0;
    case 185: return owns(["castle", "shalot bet"]) ? 2 : 0;
    default: return 0;
  }
}

/** Applies intrinsic and aura bonuses to one card in the current formation. */
export function effectiveMasterStat(state: MasterState, player: MasterPlayer, card: MasterCard, stat: Stat, role: "attack" | "defense" = "attack"): number {
  if (state.effectsMode !== "on" || card.face !== "up") return card[stat];
  let bonus = stat === "wealth" ? intrinsicWealthBonus(player, card) : 0;
  if (stat === "wealth" && printedNumber(card) === 154 && state.players.some((candidate) => candidate.factionId === "egyptian-christians")) bonus += 2;
  if (role === "defense" && stat === "strength" && printedNumber(card) === 132 && samePilePlace(player, card, ["alexandria", "al-kahira", "al-uqsor"])) bonus += 2;
  for (const source of revealedCards(player)) {
    switch (printedNumber(source)) {
      case 10: case 11: if (stat === "wealth" && player.factionId === "nubian-christians" && card.type === "place") bonus++; break;
      case 27: if (role === "defense" && stat === "strength" && player.factionId === "nubian-christians") bonus++; break;
      case 28: if (stat === "wealth" && ["nubian bishop", "nubian priest", "nubian deacon", "nubian monk"].includes(card.name.toLowerCase()) && located(player, card)?.id === located(player, source)?.id) bonus++; break;
      case 29: case 163: if (stat === "wealth" && marketplaces.includes(card.name.toLowerCase())) bonus++; break;
      case 30: if (stat === "wealth" && ["mari", "moses giyorgios", "merkourios"].includes(card.name.toLowerCase()) && located(player, card)?.id === located(player, source)?.id) bonus += 2; break;
      case 126: if (stat === "wealth" && ["flood plain", "orchard", "palm groves", "vineyard", "farmland", "unirrigated plot"].includes(card.name.toLowerCase())) bonus++; break;
      case 127: if (stat === "wealth" && ["cathedral", "church", "monastery", "shrine"].includes(card.name.toLowerCase())) bonus++; break;
      case 164: if (stat === "wealth" && ["one of the hamil", "one of the hafiz", "an imam", "a qadi", "the ulema", "a muezzin"].includes(card.name.toLowerCase())) bonus++; break;
      case 165: if (role === "defense" && stat === "strength" && card.type === "place" && player.factionId === "egyptian-muslims") bonus++; break;
      case 170: if (stat === "wealth" && card.name.toLowerCase() === "ore deposit") bonus += 2; break;
      case 182: if (stat === "wealth" && ["kahen", "haymanot scholar", "beta israel priest"].includes(card.name.toLowerCase()) && located(player, card)?.id === located(player, source)?.id) bonus++; break;
    }
  }
  if (role === "defense" && stat === "strength" && card.type === "place" && located(player, card)?.cards.some((part) => part.face === "up" && (part.type === "person" || part.type === "leader"))) {
    const n = printedNumber(card);
    if ([25, 114, 161].includes(n)) bonus += 2;
    if ([31, 160].includes(n)) bonus++;
  }
  return card[stat] + bonus;
}

/** Printed bonuses for an attacking participant against the currently revealed target. */
export function targetedAttackBonus(attackerCards: readonly MasterCard[], defenderCards: readonly MasterCard[], stat: Stat): number {
  if (stat !== "strength") return 0;
  return attackerCards.filter((card) => card.face === "up").reduce((sum, source) => {
    const n = printedNumber(source);
    if (n === 90 && defenderCards.some((target) => target.factionId === "egyptian-muslims")) return sum + 2;
    if (n === 102 && defenderCards.some((target) => target.factionId.startsWith("ethiopian-"))) return sum + 2;
    if ([103, 104, 105, 106].includes(n) && defenderCards.some((target) => cardReligion(target) !== cardReligion(source))) return sum + (n === 104 ? 3 : 2);
    if (n === 129 && defenderCards.some((target) => ["ibrim", "faras", "meinarti", "dongola", "axum", "lalibela", "gondar"].includes(target.name.toLowerCase()))) return sum + 3;
    return sum;
  }, 0);
}

/** Global conversion bonuses apply once per source to a comparison, not once per pile card. */
export function conversionFormationBonus(player: MasterPlayer, cards: readonly MasterCard[], role: "attack" | "defense"): number {
  const religions = new Set(cards.map(cardReligion));
  return revealedCards(player).reduce((sum, source) => {
    switch (printedNumber(source)) {
      case 26: case 71: case 128: return sum + (role === "defense" && religions.has("christian") ? 1 : 0);
      case 50: case 53: case 84: return sum + (role === "defense" && religions.has("christian") ? 2 : 0);
      case 8: case 9: case 48: case 83: case 112: case 113: return sum + (role === "attack" && religions.has("christian") ? 2 : 0);
      case 111: return sum + (role === "attack" && religions.has("christian") ? 1 : 0);
      case 40: case 82: case 116: return sum + (role === "attack" ? 1 : 0);
      case 152: return sum + (role === "attack" && religions.has("muslim") ? 1 : 0);
      case 153: return sum + (role === "attack" && religions.has("muslim") ? 2 : 0);
      case 179: return sum + (role === "attack" && religions.has("jewish") ? 3 : 0);
      case 181: return sum + (role === "attack" && religions.has("jewish") ? 2 : 0);
      default: return sum;
    }
  }, 0);
}

export function immuneToConversion(state: MasterState, player: MasterPlayer, card: MasterCard): boolean {
  if (state.effectsMode !== "on" || card.face !== "up") return false;
  if (card.mercenary || /\bimmune to conversion\b/i.test(card.effectText ?? "")) return true;
  if (revealedCards(player).some((source) => printedNumber(source) === 176 && source.protectedCardId === card.id)) return true;
  return cardReligion(card) === "jewish" && revealedCards(player).some((source) => printedNumber(source) === 180);
}
