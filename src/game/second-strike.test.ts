import { acknowledgeSecondStrikeExplanation, secondStrikeExplanationReady, type SecondStrike } from "./second-strike";
import { describe, expect, it } from "vitest";
import { createRandomState } from "./random";
import { decideAmateurSecondStrike, resolveAmateurAttack, legalTargets, amateurNpcWantsSecondStrike, skipReplenishment, type AmateurState } from "./amateur";
import { decideMasterSecondStrike, resolveMasterAttack, legalMasterTargets, masterNpcWantsSecondStrike, skipMasterReplenishment, beginMasterEffectComparison, finishMasterEffectComparison, passMasterEffectOpportunity, interruptMasterComparison, eliminateWithMasterEffect, activateMasterArmyEffect, type MasterState } from "./master";
import { parseAmateurGame, serializeAmateurGame } from "./amateur-save";
import { parseMasterGame, serializeMasterGame } from "./master-save";
import { publicAmateurState } from "./amateur-multiplayer";
import { publicMasterState } from "./master-multiplayer";

// One shared scenario, adapted to single cards or complete formations.
function fixture(mode: "amateur" | "master", effects = false) {
  const card = (id: string, strength: number, wealth = strength, face: "up" | "down" = "up") => ({ id, definitionId: id, name: id, factionId: "nubian-christians", type: "person" as const, strength, zeal: 2, wealth, face });
  const units = (cards: ReturnType<typeof card>[]) => mode === "master" ? cards.map(c => ({ id: c.id, cards: [c] })) : cards;
  const player = (id: string, cards: ReturnType<typeof card>[], heirStrength: number) => ({ id, factionId: id === "a" ? "nubian-christians" : "egyptian-muslims", controller: "human" as const, army: units(cards), heir: { ...card(`${id}-heir`, heirStrength), type: "leader" as const }, unused: [], discard: [], eliminated: false });
  const state = { version: 1, mode, players: [player("a", [card("a-one", 6, 1), card("a-two", 1, 9)], 8), player("b", [card("b-last", 2)], 5)], activePlayerIndex: 0, phase: "attack", round: 1, random: createRandomState("second-strike"), nileFloods: false, victoryMode: "standard", effectsMode: effects ? "on" : "off" };
  // Shared assertions below use only the state fields common to both engines.
  const game = state as unknown as Omit<AmateurState, "mode" | "players"> & { mode: string; players: Array<{id:string;factionId:string;controller:"human"|"npc";army:any[];heir:any;unused:any[];discard:any[];eliminated:boolean}>; effectsMode?:string };
  const attack = (unit = "a-one", target = "b-last", stat: "strength" | "wealth" | "zeal" = "strength", targetPlayer = "b") => mode === "master" ? resolveMasterAttack(game as unknown as MasterState, { attackerUnitId: unit, targetPlayerId: targetPlayer, targetUnitId: target, stat }) : resolveAmateurAttack(game as unknown as AmateurState, { attackerId: unit, targetPlayerId: targetPlayer, targetId: target, stat });
  const decide = (accept: boolean, id = game.secondStrike!.playerId) => mode === "master" ? decideMasterSecondStrike(game as unknown as MasterState, id, accept) : decideAmateurSecondStrike(game as unknown as AmateurState, id, accept);
  const targets = (id: string, stat: "strength" | "zeal" = "strength") => mode === "master" ? legalMasterTargets(game as unknown as MasterState, id, stat) : legalTargets(game as unknown as AmateurState, id, stat).map(c => c.id);
  const npcWants = () => mode === "master" ? masterNpcWantsSecondStrike(game as unknown as MasterState) : amateurNpcWantsSecondStrike(game as unknown as AmateurState);
  return { game, attack, decide, targets, npcWants, card, units, player };
}

for (const mode of ["amateur", "master"] as const) describe(`${mode} second strike`, () => {
  it("offers before replenishment and preserves the normal turn and reward on decline", () => {
    const {game,attack,decide} = fixture(mode);
    attack();
    expect(game.phase).toBe("second-strike");
    expect(game.secondStrike).toMatchObject({playerId:"a",targetPlayerId:"b",accepted:false});
    expect(game.pendingReplenishmentPlayerId).toBeUndefined();
    expect(() => attack("a-two","b-heir","wealth")).toThrow();
    decide(false);
    expect(game.secondStrike).toBeUndefined();
    expect(game.phase).toBe("attack"); // Winner has no reserve or defeated cards.
    expect(game.activePlayerIndex).toBe(1);
    expect(game.round).toBe(2);
  });
  it("keeps the original replenishment choice pending after declining", () => {
    const {game,attack,decide,card}=fixture(mode);game.players[0].unused.push(card("reserve",1));attack();decide(false);
    expect(game.phase).toBe("replenish");expect(game.pendingReplenishmentPlayerId).toBe("a");expect(game.round).toBe(1);
    if(mode==="master")skipMasterReplenishment(game as unknown as MasterState);else skipReplenishment(game as unknown as AmateurState);
    expect(game.activePlayerIndex).toBe(1);expect(game.round).toBe(2);
  });
  it("applies fresh Nile Flood rolls to the risk, including losses and ties", () => {
    const outcomes=new Set<string>();
    for(let seed=1;seed<=60;seed++) {
      const {game,attack,decide}=fixture(mode);attack();game.nileFloods=true;game.random={seed:"FLOOD",state:seed,calls:0};decide(true);
      const events=attack("a-one","b-heir");
      for(const e of events)if(e.type==="score")expect(e.die).toBeGreaterThanOrEqual(1);
      if(events.some(e=>e.type==="tie")){outcomes.add("tie");expect(game.players.every(p=>!p.eliminated)).toBe(true);}
      else {outcomes.add(game.winnerId!);expect(game.phase).toBe("complete");expect(game.players.find(p=>p.id!==game.winnerId)!.eliminated).toBe(true);}
      expect(game.secondStrike).toBeUndefined();
    }
    expect(outcomes).toEqual(new Set(["a","b","tie"]));
  });
  it("can use a different unit and statistic and win immediately", () => {
    const {game,attack,decide} = fixture(mode);attack();decide(true);
    attack("a-two","b-heir","wealth");
    expect(game.phase).toBe("complete");expect(game.winnerId).toBe("a");
    expect(game.players[1].eliminated).toBe(true);expect(game.secondStrike).toBeUndefined();
  });
  it("eliminates the entire challenger despite surviving army cards and heir", () => {
    const {game,attack,decide} = fixture(mode);attack();decide(true);
    attack("a-two","b-heir","strength");
    expect(game.players[0].army.length).toBeGreaterThan(0);
    expect(game.players[0].heir.id).toBe("a-heir");
    expect(game.players[0].eliminated).toBe(true);
    expect(game.winnerId).toBe("b");expect(game.phase).toBe("complete");expect(game.secondStrike).toBeUndefined();
  });
  it("resolves equal second-strike scores according to the level", () => {
    const {game,attack,decide} = fixture(mode);attack();game.players[1].heir.strength=6;decide(true);
    const events=attack("a-one","b-heir");
    if(mode === "amateur") {
      expect(events.some(e=>e.type==="tie-break")).toBe(true);
      expect(game.winnerId).toBe("a");expect(game.players[1].eliminated).toBe(true);
    } else {
      expect(events.some(e=>e.type==="tie")).toBe(true);
      expect(game.players.every(p=>!p.eliminated)).toBe(true);expect(game.activePlayerIndex).toBe(1);
    }
    expect(game.secondStrike).toBeUndefined();
  });
  it("offers to a successful defender and restores turn order afterwards", () => {
    const {game,attack,decide,units,card} = fixture(mode);
    game.players[0].army=units([card("a-last",1)]);game.players[1].army=units([card("b-win",9)]);
    attack("a-last","b-win");expect(game.secondStrike?.playerId).toBe("b");decide(true);
    expect(game.activePlayerIndex).toBe(1);attack("b-win","a-heir","strength","a");expect(game.winnerId).toBe("b");
  });
  it("prevents another player from accepting and restricts the follow-up to the exposed heir", () => {
    const {game,attack,decide,targets,player,card} = fixture(mode);
    game.players.push(player("c",[card("c-card",1)],3));attack();
    expect(()=>decide(true,"b")).toThrow("Only the victorious");decide(true);
    expect(targets("b")).toEqual(["b-heir"]);expect(targets("c")).toEqual([]);
    expect(()=>attack("a-one","c-card","strength","c")).toThrow("Illegal target");
  });
  it("respects long-game elimination and restores the original turn after a defensive strike", () => {
    const {game,attack,decide,units,card,player} = fixture(mode);
    game.victoryMode="long";game.players.push(player("c",[card("c-card",1)],3));
    game.players[0].army=units([card("a-last",1)]);game.players[1].army=units([card("b-win",9)]);
    attack("a-last","b-win");decide(true);attack("b-win","a-heir","strength","a");
    expect(game.players[0].eliminated).toBe(true);expect(game.phase).toBe("attack");expect(game.activePlayerIndex).toBe(1);expect(game.round).toBe(2);
  });
  it("keeps same-religion conversion unavailable during the strike", () => {
    const {game,attack,decide,targets}=fixture(mode);game.players[1].factionId="ethiopian-christians";
    attack();decide(true);expect(targets("b","zeal")).toEqual([]);
  });
  it("does not offer when another army unit remains or an heir was already exposed", () => {
    const {game,attack,units,card}=fixture(mode);game.players[1].army=units([card("b-last",2),card("b-other",2)]);
    attack();expect(game.secondStrike).toBeUndefined();
    game.activePlayerIndex=0;game.phase="attack";game.players[1].army=[];attack("a-two","b-heir","wealth");expect(game.secondStrike).toBeUndefined();expect(game.phase).toBe("complete");
  });
  it("persists the offer and accepted risk without revealing hidden units to multiplayer opponents", () => {
    const {game,attack,decide,units,card}=fixture(mode);game.players[0].army.push(...units([card("hidden-secret",99,99,"down")]));attack();
    const restored=mode==="master"?parseMasterGame(serializeMasterGame(game as unknown as MasterState)):parseAmateurGame(serializeAmateurGame(game as unknown as AmateurState));
    expect(restored?.secondStrike).toEqual(game.secondStrike);decide(true);
    const pub=mode==="master"?publicMasterState(game as unknown as MasterState):publicAmateurState(game as unknown as AmateurState);
    expect(JSON.stringify(pub)).not.toContain('"name":"hidden-secret"');expect(pub.secondStrike?.accepted).toBe(true);
  });
  it("does not let NPCs use hidden strength to decide whether to risk a strike", () => {
    const {game,attack,npcWants,units,card}=fixture(mode);game.players[0].army=units([card("a-one",6,1),card("hidden",99,99,"down")]);
    game.players[1].heir.strength=7;game.players[1].heir.zeal=3;game.players[1].heir.wealth=2;attack();expect(npcWants()).toBe(false);
    game.players[1].heir.strength=3;expect(npcWants()).toBe(true);
    game.nileFloods=true;expect(npcWants()).toBe(false);
  });
});

function finishEffects(state: MasterState) {
  while(state.phase==="effects") {
    if(passMasterEffectOpportunity(state,state.players[state.pendingEffectComparison!.priorityIndex].id))return finishMasterEffectComparison(state);
  }
  return [];
}
describe("Master second strike with special effects",()=>{
  it("offers after effects resolve, then eliminates a losing challenger",()=>{
    const {game,decide}=fixture("master",true);const s=game as unknown as MasterState;
    beginMasterEffectComparison(s,{attackerUnitId:"a-one",targetPlayerId:"b",targetUnitId:"b-last",stat:"strength"});
    expect(s.secondStrike).toBeUndefined();finishEffects(s);expect(s.phase).toBe("second-strike");decide(true);
    beginMasterEffectComparison(s,{attackerUnitId:"a-two",targetPlayerId:"b",targetUnitId:"b-heir",stat:"strength"});
    finishEffects(s);expect(s.players[0].eliminated).toBe(true);expect(s.winnerId).toBe("b");expect(s.secondStrike).toBeUndefined();
  });
  it("uses effect-decided winners rather than the raw scores",()=>{
    const {game,attack,decide}=fixture("master",true);attack();decide(true);const s=game as unknown as MasterState;
    beginMasterEffectComparison(s,{attackerUnitId:"a-two",targetPlayerId:"b",targetUnitId:"b-heir",stat:"strength"});
    s.pendingEffectComparison!.guarantees=["a"];finishEffects(s);expect(s.winnerId).toBe("a");
  });
  it("ends an interrupted strike safely without eliminating either side",()=>{
    const {game,attack,decide}=fixture("master",true);attack();decide(true);const s=game as unknown as MasterState;
    s.players[0].heir.artFile="109 Yellow.jpg";
    beginMasterEffectComparison(s,{attackerUnitId:"a-two",targetPlayerId:"b",targetUnitId:"b-heir",stat:"strength"});
    const events=interruptMasterComparison(s,"a","a-heir");expect(events.some(e=>e.type==="cancelled")).toBe(true);
    expect(s.players.every(p=>!p.eliminated)).toBe(true);expect(s.secondStrike).toBeUndefined();expect(s.phase).toBe("attack");
  });
  it("eliminates the challenger if a card effect removes the attacking formation",()=>{
    const {game,attack,decide}=fixture("master",true);attack();decide(true);const s=game as unknown as MasterState;
    s.players[1].heir.artFile="183 White.jpg";
    beginMasterEffectComparison(s,{attackerUnitId:"a-two",targetPlayerId:"b",targetUnitId:"b-heir",stat:"strength"});
    passMasterEffectOpportunity(s,"a");
    eliminateWithMasterEffect(s,"b","b-heir","a","a-two");finishEffects(s);
    expect(s.players[0].eliminated).toBe(true);expect(s.winnerId).toBe("b");
  });
  it("requires a contest rather than allowing army actions to bypass the accepted risk",()=>{
    const {game,attack,decide}=fixture("master",true);attack();decide(true);
    expect(()=>activateMasterArmyEffect(game as unknown as MasterState,"a","a-one")).toThrow("Declare the second strike");
  });
});


describe("second-strike explanation pause", () => {
  const offer=():SecondStrike=>({playerId:"npc",targetPlayerId:"a",turnPlayerIndex:0,accepted:false});
  it("waits for every human, including when a computer is choosing",()=>{
    const strike=offer();
    expect(secondStrikeExplanationReady(strike,["a","b"])).toBe(false);
    acknowledgeSecondStrikeExplanation(strike,"a");
    expect(secondStrikeExplanationReady(strike,["a","b"])).toBe(false);
    acknowledgeSecondStrikeExplanation(strike,"b");
    expect(secondStrikeExplanationReady(strike,["a","b"])).toBe(true);
  });
  it("does not let repeated acknowledgements replace a different human's acknowledgement",()=>{
    const strike=offer();acknowledgeSecondStrikeExplanation(strike,"a");acknowledgeSecondStrikeExplanation(strike,"a");
    expect(strike.explanationAcks).toEqual(["a"]);expect(secondStrikeExplanationReady(strike,["a","b"])).toBe(false);
  });
  it("pauses again for each new offer and supports older saved offers",()=>{
    const strike=offer();acknowledgeSecondStrikeExplanation(strike,"solo");
    expect(secondStrikeExplanationReady(strike,["solo"])).toBe(true);
    expect(secondStrikeExplanationReady(offer(),["solo"])).toBe(false);
    expect(secondStrikeExplanationReady(undefined,["solo"])).toBe(false);
  });
  it("stops waiting for a human seat transferred to a computer",()=>{
    const strike=offer();acknowledgeSecondStrikeExplanation(strike,"a");
    expect(secondStrikeExplanationReady(strike,["a","b"])).toBe(false);
    expect(secondStrikeExplanationReady(strike,["a"])).toBe(true);
  });
  it.each(["amateur","master"] as const)("retains %s acknowledgement across save and reload",mode=>{
    const {game,attack}=fixture(mode);attack();acknowledgeSecondStrikeExplanation(game.secondStrike!,"solo");
    const restored=mode==="amateur"?parseAmateurGame(serializeAmateurGame(game as unknown as AmateurState)):parseMasterGame(serializeMasterGame(game as unknown as MasterState));
    expect(secondStrikeExplanationReady(restored?.secondStrike,["solo"])).toBe(true);
  });
});
