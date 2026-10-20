import { describe, it, expect } from "vitest";
import { publicNubianRoom, PUBLIC_ROOM_HOST_TTL_MS, type PublicRoomRow, type PublicPlayerRow } from "./public-rooms";
const now=Date.parse("2026-10-20T03:00:00Z");
function fixture(){
 const room:PublicRoomRow={code:"ABC234",host_user_id:"secret-host",level:"master",status:"waiting",settings:{isPublic:true,totalSeats:4,npcCount:1,nileFloods:true,openingPlayer:"random",victoryMode:"long",effectsMode:"on"}};
 const players:PublicPlayerRow[]=[{room_code:room.code,user_id:room.host_user_id,display_name:"Host",controller:"human",last_seen_at:new Date(now).toISOString()}];
 return {room,players};
}
describe("public Nubian Kings room listings",()=>{
 it("discloses settings and openings without private state or identifiers",()=>{
  const {room,players}=fixture();Object.assign(room,{game_state:{hidden:"secret-card"},review:{secret:"private"}});Object.assign(room.settings,{rematchVotes:{"secret-host":true}});
  const result=publicNubianRoom(room,players,now)!;
  expect(result).toMatchObject({gameId:"nubian-kings",humanPlayers:1,humanCapacity:3,openSeats:2,computerPlayers:1});
  expect(result.settings).toContainEqual({key:"effects",label:"Special effects",value:"On"});
  const output=JSON.stringify(result);for(const secret of ["secret-host","secret-card","private","rematchVotes","game_state","user_id"])expect(output).not.toContain(secret);
 });
 it("keeps private and legacy rooms unlisted",()=>{const {room,players}=fixture();delete room.settings.isPublic;expect(publicNubianRoom(room,players,now)).toBeNull();room.settings.isPublic=false;expect(publicNubianRoom(room,players,now)).toBeNull();});
 it("excludes every nonwaiting room",()=>{const {room,players}=fixture();for(const status of ["active","complete","abandoned"]){room.status=status;expect(publicNubianRoom(room,players,now)).toBeNull();}});
 it("excludes full rooms and reappears when a seat opens",()=>{const {room,players}=fixture();players.push({...players[0],user_id:"p2"},{...players[0],user_id:"p3"});expect(publicNubianRoom(room,players,now)).toBeNull();players.pop();expect(publicNubianRoom(room,players,now)?.openSeats).toBe(1);});
 it("requires a current human host and recovers after heartbeat",()=>{const {room,players}=fixture();players[0].last_seen_at=new Date(now-PUBLIC_ROOM_HOST_TTL_MS).toISOString();expect(publicNubianRoom(room,players,now)).toBeNull();players[0].last_seen_at=new Date(now).toISOString();expect(publicNubianRoom(room,players,now)).not.toBeNull();players[0].controller="npc";expect(publicNubianRoom(room,players,now)).toBeNull();});
 it("links all three levels to the proper room-code entry",()=>{const {room,players}=fixture();for(const level of ["beginner","amateur","master"]){room.level=level;expect(publicNubianRoom(room,players,now)?.joinUrl).toBe("https://nubian-kings.vercel.app/"+level+"/multiplayer?room=ABC234");}});
 it("ignores seats from another room and rejects invalid settings",()=>{const {room,players}=fixture();players.push({...players[0],room_code:"ZZZ999"});expect(publicNubianRoom(room,players,now)?.humanPlayers).toBe(1);room.settings.npcCount=4;expect(publicNubianRoom(room,players,now)).toBeNull();});
});
