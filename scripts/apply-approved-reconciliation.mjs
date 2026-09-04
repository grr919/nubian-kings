import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cardsPath = path.resolve(root, "src/data/cards.json");
const data = JSON.parse(fs.readFileSync(cardsPath, "utf8"));

// Approved 2026-09-04 selective reconciliation:
// - matched Christian cards: JPEG statistics are authoritative
// - Ethiopian Jewish cards: JPEG statistics remain authoritative
// - Egyptian Muslim cards: spreadsheet statistics remain authoritative
// - John of Phanijoit: preserve the lower-stat JPEG (51 Blue.jpg, 2/7/3) and remove the higher-stat duplicate (50 Blue.jpg, 5/9/3)
const christianJpegOverrides = {
  "NK-ROW-002": { strength: 5, zeal: 2, wealth: 5 },
  "NK-ROW-004": { strength: 3, zeal: 6, wealth: 6 },
  "NK-ROW-005": { strength: 4, zeal: 7, wealth: 8 },
  "NK-ROW-006": { strength: 4, zeal: 9, wealth: 9 },
  "NK-ROW-007": { strength: 3, zeal: 4, wealth: 5 },
  "NK-ROW-008": { strength: 2, zeal: 2, wealth: 4 },
  "NK-ROW-023": { strength: 7, zeal: 3, wealth: 5 },
  "NK-ROW-024": { strength: 5, zeal: 2, wealth: 7 },
  "NK-ROW-025": { strength: 5, zeal: 2, wealth: 5 },
  "NK-ROW-026": { strength: 7, zeal: 4, wealth: 9 },

  "NK-ROW-040": { strength: 3, zeal: 7, wealth: 9 },
  "NK-ROW-041": { strength: 2, zeal: 7, wealth: 3 },
  "NK-ROW-043": { strength: 2, zeal: 7, wealth: 3 },
  "NK-ROW-044": { strength: 4, zeal: 9, wealth: 3 },
  "NK-ROW-045": { strength: 3, zeal: 7, wealth: 7 },
  "NK-ROW-051": { strength: 1, zeal: 4, wealth: 3 },
  "NK-ROW-053": { strength: 1, zeal: 6, wealth: 1 },
  "NK-ROW-054": { strength: 1, zeal: 7, wealth: 1 },
  "NK-ROW-071": { strength: 2, zeal: 3, wealth: 1 },
  "NK-ROW-072": { strength: 0, zeal: 0, wealth: 1 },
  "NK-ROW-073": { strength: 0, zeal: 0, wealth: 2 },

  "NK-ROW-074": { strength: 4, zeal: 5, wealth: 8 },
  "NK-ROW-080": { strength: 6, zeal: 2, wealth: 2 },
  "NK-ROW-081": { strength: 5, zeal: 3, wealth: 3 },
  "NK-ROW-082": { strength: 5, zeal: 3, wealth: 2 },
  "NK-ROW-083": { strength: 4, zeal: 1, wealth: 2 },
  "NK-ROW-084": { strength: 4, zeal: 1, wealth: 2 },
  "NK-ROW-092": { strength: 2, zeal: 1, wealth: 5 },
  "NK-ROW-099": { strength: 5, zeal: 1, wealth: 3 },
  "NK-ROW-100": { strength: 3, zeal: 5, wealth: 3 },
  "NK-ROW-108": { strength: 3, zeal: 5, wealth: 7 },
  "NK-ROW-109": { strength: 5, zeal: 3, wealth: 9 },
  "NK-ROW-110": { strength: 7, zeal: 5, wealth: 9 },
  "NK-ROW-111": { strength: 5, zeal: 5, wealth: 5 }
};

let changedStats = 0;
let christianJpegAuthority = 0;
let removedHigherPhanijoitAsset = false;

for (const card of data.cards) {
  const override = christianJpegOverrides[card.id];
  if (override) {
    Object.assign(card, override);
    changedStats++;
  }

  if (card.id === "NK-ROW-041" && Array.isArray(card.assets)) {
    const before = card.assets.length;
    card.assets = card.assets.filter((asset) => asset.filename !== "50 Blue.jpg");
    removedHigherPhanijoitAsset = card.assets.length < before;
  }

  const matchedChristian = card.religion === "Ch" && Array.isArray(card.assets) && card.assets.length > 0;
  if (matchedChristian) {
    card.source = { ...card.source, statisticsAuthority: "JPEG" };
    christianJpegAuthority++;
  }
}

data.statisticsAuthority = "JPEG for matched Christian cards including lower-stat John of Phanijoit; JPEG for Ethiopian Jewish cards; spreadsheet for Egyptian Muslim cards";
data.reconciliation = {
  approved: "2026-09-04",
  christianJpegStatOverrides: Object.keys(christianJpegOverrides).length,
  resolvedChristianException: "NK-ROW-041 John of Phanijoit — higher-stat 50 Blue.jpg removed; lower-stat 51 Blue.jpg (2/7/3) preserved"
};

fs.writeFileSync(cardsPath, JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify({ changedStats, christianJpegAuthority, removedHigherPhanijoitAsset, johnOfPhanijoit: { strength: 2, zeal: 7, wealth: 3, preservedAsset: "51 Blue.jpg" } }, null, 2));
