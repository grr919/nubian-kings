export const removedCardNames = new Set(["The Hunchback's Son"]);

export const reconciledCardAdditions = [
  { id: "NK-CARD-020", name: "Mountain Hermit", strength: 1, zeal: 5, wealth: 1, religion: "Ch", nation: "N", factionId: "nubian-christians", type: "person", assetId: "NK-ASSET-132", filename: "20 Red.jpg", copyCount: 1 },
  { id: "NK-CARD-034", name: "Orchard", strength: 1, zeal: 0, wealth: 2, religion: "Ch", nation: "N", factionId: "nubian-christians", type: "place", assetId: "NK-ASSET-028", filename: "34 Red.jpg", copyCount: 1 },
  { id: "NK-CARD-036", name: "Flood Plain", strength: 1, zeal: 0, wealth: 2, religion: "Ch", nation: "N", factionId: "nubian-christians", type: "place", assetId: "NK-ASSET-042", filename: "36 Red.jpg", copyCount: 1 },
  { id: "NK-CARD-038", name: "Unirrigated Plot", strength: 1, zeal: 0, wealth: 1, religion: "Ch", nation: "N", factionId: "nubian-christians", type: "place", assetId: "NK-ASSET-022", filename: "38 2x Red.jpg", copyCount: 2 },
  { id: "NK-CARD-040", name: "Shrine", strength: 2, zeal: 3, wealth: 1, religion: "Ch", nation: "N", factionId: "nubian-christians", type: "place", assetId: "NK-ASSET-123", filename: "40 Red.jpg", copyCount: 1 },
  { id: "NK-CARD-044", name: "Ore Deposit", strength: 2, zeal: 0, wealth: 4, religion: "Ch", nation: "N", factionId: "nubian-christians", type: "place", assetId: "NK-ASSET-194", filename: "44 Red.jpg", copyCount: 1 },
  { id: "NK-CARD-101", name: "Ascetic Holy Man", strength: 1, zeal: 4, wealth: 1, religion: "Ch", nation: "Et", factionId: "ethiopian-christians", type: "person", assetId: "NK-ASSET-178", filename: "101 Yellow.jpg", copyCount: 1 },
  { id: "NK-CARD-103", name: "Negusa Negast", strength: 4, zeal: 4, wealth: 6, religion: "Ch", nation: "Et", factionId: "ethiopian-christians", type: "person", assetId: "NK-ASSET-004", filename: "103 Yellow.jpg", copyCount: 1 },
  { id: "NK-CARD-116", name: "Shrine", strength: 2, zeal: 2, wealth: 1, religion: "Ch", nation: "Et", factionId: "ethiopian-christians", type: "place", assetId: "NK-ASSET-059", filename: "116 Yellow.jpg", copyCount: 1 },
  { id: "NK-CARD-121", name: "Unirrigated Plot", strength: 1, zeal: 0, wealth: 1, religion: "Ch", nation: "Et", factionId: "ethiopian-christians", type: "place", assetId: "NK-ASSET-103", filename: "121 Yellow.jpg", copyCount: 1 }
].map((card) => ({
  ...card,
  assets: [{ assetId: card.assetId, filename: card.filename, copyCount: card.copyCount, status: "Reconciled—Added Database Row" }],
  deckCopies: card.copyCount,
  availableInPrototype: true,
  source: { spreadsheetRow: null, statisticsAuthority: "JPEG" }
})).map(({ assetId, filename, copyCount, ...card }) => card);
