import { expect, it } from "vitest";
import { availableMasterGuarantees, availableMasterSupporters, beginMasterEffectComparison, chooseMasterNpcArmyEffect, chooseMasterNpcEffect, eligibleMasterEliminationTargets, passMasterEffectOpportunity, type MasterCard, type MasterPlayer, type MasterState } from "./master";
import { conversionFormationBonus, effectiveMasterStat, immuneToConversion } from "./master-effect-rules";
import { createRandomState } from "./random";

const card = (id: string, number: number, face: "up" | "down" = "up"): MasterCard => ({ id, definitionId: id, name: "Nubian Priest", artFile: `${number} Red.jpg`, type: "person", factionId: "nubian-christians", strength: 2, zeal: 3, wealth: 4, face });
it("never selects an unrevealed source effect across all printed card numbers and statistics", () => {
  for (let number = 1; number <= 196; number++) {
    for (const stat of ["strength", "zeal", "wealth"] as const) {
      const source = card("hidden-source", number, "down");
      const players: MasterPlayer[] = [0, 1].map(index => ({ id: `p${index}`, factionId: index ? "nubian-christians" : "egyptian-muslims", controller: "npc", heir: { ...card(`heir${index}`, 0), type: "leader" }, army: [{ id: `pile${index}`, cards: [card(`unit${index}`, 0)] }, { id: `source${index}`, cards: [{ ...source, id: `hidden${index}` }] }], unused: [], discard: [], eliminated: false }));
      const state: MasterState = { version: 1, mode: "master", players, activePlayerIndex: 0, phase: "attack", nileFloods: false, effectsMode: "on", victoryMode: "standard", round: 2, random: createRandomState("HIDDEN-AUDIT") };
      expect(chooseMasterNpcArmyEffect(state), `army effect ${number}`).toBeUndefined();
      const withHidden = players.map(player => [effectiveMasterStat(state, player, player.army[0].cards[0], stat), conversionFormationBonus(player, player.army[0].cards, "attack"), immuneToConversion(state, player, player.army[0].cards[0])]);
      players.forEach(player => player.army.pop());
      expect(players.map(player => [effectiveMasterStat(state, player, player.army[0].cards[0], stat), conversionFormationBonus(player, player.army[0].cards, "attack"), immuneToConversion(state, player, player.army[0].cards[0])])).toEqual(withHidden);
      players.forEach((player, index) => player.army.push({ id: `source${index}`, cards: [{ ...source, id: `hidden${index}` }] }));
      beginMasterEffectComparison(state, { attackerUnitId: "pile0", targetPlayerId: "p1", targetUnitId: "pile1", stat });
      for (const player of players) {
        expect(chooseMasterNpcEffect(state), `comparison effect ${number} ${stat}`).toEqual({ kind: "pass" });
        expect(availableMasterGuarantees(state, player.id)).toEqual([]);
        expect(availableMasterSupporters(state, player.id, player.army[1].cards[0].id)).toEqual([]);
        expect(eligibleMasterEliminationTargets(state, player.id, player.army[1].cards[0].id)).toEqual([]);
        passMasterEffectOpportunity(state, player.id);
      }
    }
  }
});
