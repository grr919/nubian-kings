const PORTRAITS: Record<string, string> = {
  "nubian-christians": "/factions/nubian-christians.jpg",
  "egyptian-christians": "/factions/egyptian-christians.jpg",
  "ethiopian-christians": "/factions/ethiopian-christians.jpg",
  "egyptian-muslims": "/factions/egyptian-muslims.jpg",
  "ethiopian-jews": "/factions/ethiopian-jews.jpg",
};

export default function FactionPortrait({ factionId }: { factionId: string }) {
  return <span className="factionPortrait" aria-hidden="true"><img src={PORTRAITS[factionId]} alt="" /></span>;
}
