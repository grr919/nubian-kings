import{describe,expect,it}from"vitest";import{amateurHeirChoices,prepareMultiplayerAmateur,publicAmateurState,startMultiplayerAmateur,resolveMultiplayerAmateur}from"./amateur-multiplayer";import type{MultiplayerSeat}from"./multiplayer";
const seats:MultiplayerSeat[]=[{id:"a",userId:"u1",displayName:"A",controller:"human",factionId:"nubian-christians",seatOrder:0},{id:"b",userId:"u2",displayName:"B",controller:"human",factionId:"egyptian-muslims",seatOrder:1}];
describe("Amateur multiplayer",()=>{it("deals no Leaders into either ten-card army",()=>{const p=prepareMultiplayerAmateur([...seats],{totalSeats:2,npcCount:0,nileFloods:false,openingPlayer:"human",victoryMode:"standard"});expect(p.players.every(x=>x.army.length===10&&x.army.every(c=>c.type!=="leader"))).toBe(true)});it("reveals every selected human heir together",()=>{const p=prepareMultiplayerAmateur([...seats],{totalSeats:2,npcCount:0,nileFloods:false,openingPlayer:"human",victoryMode:"standard"}),choices=Object.fromEntries(p.players.map(x=>[x.id,amateurHeirChoices(p,x.id)[0].id])),s=startMultiplayerAmateur(p,choices);expect(s.players.every(x=>x.heir.type==="leader"&&x.heir.face==="up")).toBe(true)});it("removes hidden army identities and unused-deck contents",()=>{const p=prepareMultiplayerAmateur([...seats],{totalSeats:2,npcCount:0,nileFloods:false,openingPlayer:"human",victoryMode:"standard"}),choices=Object.fromEntries(p.players.map(x=>[x.id,amateurHeirChoices(p,x.id)[0].id])),s=startMultiplayerAmateur(p,choices),visible=publicAmateurState(s);expect("name"in visible.players[0].army[0]).toBe(false);expect("name"in visible.players[0].unused[0]).toBe(false)})});

it("reports the attacker as the multiplayer winner of equal scores without floods",()=>{
 const p=prepareMultiplayerAmateur([...seats],{totalSeats:2,npcCount:0,nileFloods:false,openingPlayer:"human",victoryMode:"standard"});
 const choices=Object.fromEntries(p.players.map(x=>[x.id,amateurHeirChoices(p,x.id)[0].id]));
 const s=startMultiplayerAmateur(p,choices);const a=s.players[s.activePlayerIndex],b=s.players.find(x=>x.id!==a.id)!;
 a.army[0].wealth=9;b.army[0].wealth=9;
 const r=resolveMultiplayerAmateur(s,{attackerId:a.army[0].id,targetPlayerId:b.id,targetId:b.army[0].id,stat:"wealth"});
 expect(r.tie).toBe(false);expect(r.tieBreak).toBe(true);expect(r.winnerId).toBe(a.id);
 expect(b.discard).toHaveLength(1);
});
