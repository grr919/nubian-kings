import { expect, it } from "vitest";
import {
  activateMasterArmyEffect, activateMasterClockForward, activateMasterRandomDiscard, activateMasterSupport, applyMasterNileFlood,
  activeMasterPlayer, autoArrangeMasterCards, beginMasterConstruction, beginMasterEffectComparison,
  chooseMasterNpcArmyEffect, chooseMasterNpcAttack, chooseMasterNpcEffect, confirmMasterArmy,
  constructionCards, designateMasterPriestProtection, eliminateWithMasterEffect, finishMasterEffectComparison,
  interruptMasterComparison, masterHeirChoices, passMasterEffectOpportunity, prepareMasterGame,
  replenishMasterArmy, spendMasterGuarantee,
} from "./master";

it("moves through actual Effects On decks and turns without a stuck comparison", () => {
  for (const seed of ["EFFECT-PLAY-1", "EFFECT-PLAY-2"]) {
    const prepared = prepareMasterGame({ humanFaction: "nubian-christians", npcCount: 2, nileFloods: true, effectsMode: "on", seed });
    const construction = beginMasterConstruction(prepared, masterHeirChoices(prepared)[0].id);
    const game = confirmMasterArmy(construction, autoArrangeMasterCards(constructionCards(construction), "human"));
    for (const player of game.players) player.controller = "npc";
    let comparisons = 0;
    for (let step = 0; step < 1000 && game.phase !== "complete"; step++) {
      if (game.phase === "replenish") { replenishMasterArmy(game); continue; }
      if (game.phase === "attack") {
        const action = chooseMasterNpcArmyEffect(game);
        if (action) {
          const id = activeMasterPlayer(game).id;
          if (action.kind === "army") activateMasterArmyEffect(game, id, action.cardId);
          else if (action.kind === "clock-forward") activateMasterClockForward(game, id, action.cardId);
          else if (action.kind === "random-discard") activateMasterRandomDiscard(game, id, action.cardId, action.targetPlayerId);
          else if (action.kind === "eliminate") eliminateWithMasterEffect(game, id, action.cardId, action.targetPlayerId, action.targetCardId);
          else designateMasterPriestProtection(game, id, action.cardId, action.targetCardId);
          continue;
        }
        const attack = chooseMasterNpcAttack(game);
        const pending = beginMasterEffectComparison(game, attack);
        comparisons++;
        if (pending.cancelled) finishMasterEffectComparison(game);
        continue;
      }
      if (game.phase === "effects") {
        const playerId = game.players[game.pendingEffectComparison!.priorityIndex].id;
        const choice = chooseMasterNpcEffect(game);
        if (choice.kind === "flood") applyMasterNileFlood(game, playerId);
        else if (choice.kind === "pass") {
          if (passMasterEffectOpportunity(game, playerId)) finishMasterEffectComparison(game);
        } else if (choice.kind === "guarantee") spendMasterGuarantee(game, playerId, choice.cardId);
        else if (choice.kind === "interrupt") interruptMasterComparison(game, playerId, choice.cardId);
        else if (choice.kind === "support") activateMasterSupport(game, playerId, choice.cardId, choice.supporterId, choice.side);
        else eliminateWithMasterEffect(game, playerId, choice.cardId, choice.targetPlayerId, choice.targetCardId);
      }
    }
    expect(comparisons).toBeGreaterThan(5);
    expect(game.round).toBeGreaterThan(5);
  }
});
