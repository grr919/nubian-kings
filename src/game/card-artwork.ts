import cardData from "../data/cards.json";
import localArtwork from "../data/local-card-artwork.json";

const localFiles = new Set(localArtwork);
const legacyBase = "https://nubian-kings-qtsa6vhio-grr919-6387s-projects.vercel.app";

export function cardArtworkUrl(filename?: string, local = false): string | undefined {
  if (!filename) return undefined;
  return `${local || localFiles.has(filename) ? "" : legacyBase}/cards/${encodeURIComponent(filename)}`;
}

/** Match by definition first; older Beginner saves need both faction and name. */
export function getCardArtwork(card: { id?: string; definitionId?: string; name?: string; factionId?: string; artFile?: string; mercenary?: boolean }): string | undefined {
  const definitionId = card.definitionId ?? card.id?.split(":")[0];
  const definition = cardData.cards.find((item) => item.id === definitionId)
    ?? cardData.cards.find((item) => item.factionId === card.factionId && item.name === card.name);
  return cardArtworkUrl(card.artFile ?? definition?.assets[0]?.filename, card.mercenary);
}
