export function civilizationReligion(factionId: string): string {
  if (factionId.endsWith("-christians")) return "christian";
  if (factionId.endsWith("-muslims")) return "muslim";
  if (factionId.endsWith("-jews")) return "jewish";
  return factionId;
}

export function canConvertCivilization(attackerFaction: string, targetFaction: string): boolean {
  return civilizationReligion(attackerFaction) !== civilizationReligion(targetFaction);
}
