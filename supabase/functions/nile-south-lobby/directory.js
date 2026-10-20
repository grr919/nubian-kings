'use strict';
// Common discovery contract. Adapters inspect authoritative room state; no second registry.
const HOST_TTL_MS=120000;
function publicListing(adapter,row,now=Date.now()){
 const r=row.state;
 if(!r||r.isPublic!==true||r.phase!=='lobby')return null;
 const seats=(r.seats||[]).filter(s=>!s.left),host=seats.find(s=>s.id===r.host);
 const capacity=Number(r.count);
 if(!host||!Number.isFinite(host.lastSeen)||now-host.lastSeen>=HOST_TTL_MS||host.lastSeen>now+30000||!Number.isInteger(capacity)||capacity<2||seats.length>=capacity)return null;
 return {schemaVersion:1,id:adapter.id+':'+row.code,gameId:adapter.id,gameTitle:adapter.title,code:row.code,hostName:String(host.name||'Host').slice(0,32),humanPlayers:seats.length,humanCapacity:capacity,openSeats:capacity-seats.length,computerPlayers:adapter.totalCommanders-capacity,settings:adapter.settings(r),joinUrl:adapter.joinUrl+'?room='+encodeURIComponent(row.code)};
}
const ADWA={id:'adwa',title:'Adwa',table:'adwa_rooms',totalCommanders:7,joinUrl:'https://adwa-game.vercel.app/multiplayer.html',settings:r=>[
 {key:'roles',label:'Hidden roles',value:r.options?.traitors===0?'No traitor + one spy':r.options?.traitors===1?'Guaranteed traitor + one spy':'80% traitor / 20% no traitor + one spy'},
 {key:'readiness',label:'Initially ready',value:String(r.options?.start??50)+'%'},
 {key:'roundHours',label:'Hours per round',value:String(r.options?.hours??6)}
]};
export {HOST_TTL_MS,publicListing,ADWA};
