import cardData from "@/data/cards.json";

const PORTRAITS: Record<string, string> = {
  "nubian-christians": "/factions/nubian-christians.jpg",
  "egyptian-christians": "/factions/egyptian-christians.jpg",
  "ethiopian-christians": "/factions/ethiopian-christians.jpg",
  "egyptian-muslims": "/factions/egyptian-muslims.jpg",
  "ethiopian-jews": "/factions/ethiopian-jews.jpg",
};

// Face centers in the original card artwork, normalized to a 1000 × 1364 card.
const FACES: Record<string, [number, number, number]> = {
  "NK-ROW-002": [520, 260, 360], "NK-ROW-004": [300, 230, 310],
  "NK-ROW-005": [490, 265, 340], "NK-ROW-006": [560, 260, 340],
  "NK-ROW-007": [465, 245, 340], "NK-ROW-008": [430, 265, 350],
  "NK-ROW-040": [490, 300, 350], "NK-ROW-041": [465, 325, 350],
  "NK-ROW-043": [485, 365, 350], "NK-ROW-045": [530, 280, 360],
  "NK-ROW-074": [480, 325, 360], "NK-ROW-075": [475, 300, 360],
  "NK-ROW-076": [445, 285, 350], "NK-ROW-077": [500, 230, 360],
  "NK-ROW-078": [490, 250, 350], "NK-ROW-079": [585, 245, 340],
  "NK-ROW-112": [565, 245, 340], "NK-ROW-113": [495, 350, 370],
  "NK-ROW-114": [490, 305, 350], "NK-ROW-115": [485, 355, 360],
  "NK-ROW-116": [650, 285, 340], "NK-ROW-117": [475, 370, 350],
  "NK-ROW-148": [480, 300, 350],
};

export default function FactionPortrait({ factionId, leader, compact = false }: {
  factionId: string;
  leader?: { definitionId?: string; name?: string };
  compact?: boolean;
}) {
  const definition = leader?.definitionId
    ? cardData.cards.find((card) => card.id === leader.definitionId && card.type === "leader" && card.factionId === factionId)
    : undefined;
  const face = definition && FACES[definition.id];
  const filename = definition?.assets[0]?.filename;
  return <span className={`factionPortrait faction-${factionId}${compact ? " compactPortrait" : ""}`} aria-hidden="true" title={definition?.name}>
    {face && filename ? <svg viewBox={`${face[0] - face[2] / 2} ${face[1] - face[2] / 2} ${face[2]} ${face[2]}`} className="leaderPortrait" focusable="false">
      <image href={`https://nubian-kings-qtsa6vhio-grr919-6387s-projects.vercel.app/cards/${encodeURIComponent(filename)}`} width="1000" height="1364" preserveAspectRatio="none" />
    </svg> : <img src={PORTRAITS[factionId]} alt="" />}
  </span>;
}
