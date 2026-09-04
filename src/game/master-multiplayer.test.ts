import{describe,expect,it}from"vitest";
import{autoArrangeDraft,beginMultiplayerConstruction,confirmDraft,masterMultiplayerHeirs,prepareMultiplayerMaster,publicMasterState,startMultiplayerMaster}from"./master-multiplayer";
import type{MultiplayerRoomSettings,MultiplayerSeat}from"./multiplayer";
const seats:MultiplayerSeat[]=[
 {id:"seat-1",userId:"human-1",displayName:"One",controller:"human",factionId:"nubian-christians",seatOrder:0},
 {id:"seat-2",userId:"human-2",displayName:"Two",controller:"human",factionId:"egyptian-christians",seatOrder:1},
 {id:"seat-3",displayName:"Computer",controller:"npc",factionId:"ethiopian-christians",seatOrder:2},
];
const settings:MultiplayerRoomSettings={totalSeats:3,npcCount:1,nileFloods:false,openingPlayer:"human",victoryMode:"standard"};
describe("Master multiplayer setup",()=>{
 it("gives each human private heir choices and a legal twenty-card construction",()=>{
  const prepared=prepareMultiplayerMaster(seats,settings),one=masterMultiplayerHeirs(prepared,"human-1"),two=masterMultiplayerHeirs(prepared,"human-2");
  expect(one.length).toBeGreaterThan(0);expect(two.length).toBeGreaterThan(0);
  const draft=beginMultiplayerConstruction(prepared,{"human-1":one[0].id,"human-2":two[0].id});
  expect(draft.cards["human-1"]).toHaveLength(20);expect(draft.cards["human-2"]).toHaveLength(20);
  autoArrangeDraft(draft,"human-1");autoArrangeDraft(draft,"human-2");confirmDraft(draft,"human-1");confirmDraft(draft,"human-2");
  const game=startMultiplayerMaster(draft);
  expect(game.players.filter(p=>p.controller==="human").every(p=>p.army.flatMap(x=>x.cards).length===20)).toBe(true);
  expect(game.players.filter(p=>p.controller==="human").every(p=>p.army.every(x=>x.cards.every(c=>c.face==="down")))).toBe(true);
 });
 it("hides every face-down pile card from the public state",()=>{
  const prepared=prepareMultiplayerMaster(seats,settings),draft=beginMultiplayerConstruction(prepared,{"human-1":masterMultiplayerHeirs(prepared,"human-1")[0].id,"human-2":masterMultiplayerHeirs(prepared,"human-2")[0].id});
  for(const id of["human-1","human-2"]){autoArrangeDraft(draft,id);confirmDraft(draft,id)}
  const state=publicMasterState(startMultiplayerMaster(draft));
  const hidden=state.players.flatMap(p=>p.army.flatMap(x=>x.cards));
  expect(hidden.every(c=>!("name"in c)&&!("definitionId"in c)&&!("strength"in c))).toBe(true);
 });
});
