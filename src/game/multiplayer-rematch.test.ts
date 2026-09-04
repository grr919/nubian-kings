import{describe,expect,it}from"vitest";
import{prepareMultiplayerAmateur}from"./amateur-multiplayer";
import{prepareMultiplayerMaster}from"./master-multiplayer";
import{createMultiplayerBeginnerGame,type MultiplayerRoomSettings,type MultiplayerSeat}from"./multiplayer";
const seats:MultiplayerSeat[]=[
 {id:"one",userId:"human-1",displayName:"One",controller:"human",factionId:"nubian-christians",seatOrder:0},
 {id:"two",userId:"human-2",displayName:"Two",controller:"human",factionId:"egyptian-christians",seatOrder:1},
];
const settings:MultiplayerRoomSettings={totalSeats:2,npcCount:0,nileFloods:true,openingPlayer:"human",victoryMode:"long"};
describe("same-room rematch factories",()=>{
 it("preserves Beginner participants and settings while producing a fresh game",()=>{
  const first=createMultiplayerBeginnerGame(seats,settings,"FIRST"),second=createMultiplayerBeginnerGame(seats,settings,"SECOND");
  expect(second.players.map(p=>[p.id,p.factionId])).toEqual(first.players.map(p=>[p.id,p.factionId]));
  expect(second.nileFloods).toBe(true);expect(second.random.seed).not.toBe(first.random.seed);
 });
 it("returns Amateur players to private heir selection with retained factions",()=>{
  const next=prepareMultiplayerAmateur(seats,settings);
  expect(next.players.map(p=>[p.id,p.factionId])).toEqual(seats.map(p=>[p.userId,p.factionId]));
  expect(next.victoryMode).toBe("long");
 });
 it("returns Master players to private heir selection with retained factions",()=>{
  const next=prepareMultiplayerMaster(seats,settings);
  expect(next.players.map(p=>[p.id,p.factionId])).toEqual(seats.map(p=>[p.userId,p.factionId]));
  expect(next.victoryMode).toBe("long");
 });
});
