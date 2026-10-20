import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {ADWA,publicListing} from './directory.js';
import {publicNubianRoom} from './nubian-kings.ts';
const adapters=[ADWA];
const games=[...adapters.map(a=>({id:a.id,title:a.title})),{id:'nubian-kings',title:'Nubian Kings'}];
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{headers,status});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='GET')return json({error:'Use GET.'},405);
 const filter=new URL(req.url).searchParams.get('game');
 if(filter&&!games.some(a=>a.id===filter))return json({error:'Unknown game.'},400);
 try{
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const now=Date.now(),rooms=[];
  for(const adapter of adapters.filter(a=>!filter||a.id===filter)){
   // Page through the authoritative rows; never cap the directory before filtering full/stale rooms.
   for(let offset=0;;offset+=200){
    const {data,error}=await db.from(adapter.table).select('code,state').eq('state->>isPublic','true').eq('state->>phase','lobby').order('code').range(offset,offset+199);
    if(error)throw error;
    for(const row of data||[]){const entry=publicListing(adapter,row,now);if(entry)rooms.push(entry);}
    if(!data||data.length<200)break;
   }
  }
  if(!filter||filter==='nubian-kings'){
   for(let offset=0;;offset+=200){
    const {data,error}=await db.from('nk_multiplayer_rooms').select('code,host_user_id,level,status,settings').eq('status','waiting').eq('settings->>isPublic','true').order('code').range(offset,offset+199);
    if(error)throw error;if(!data?.length)break;
    const {data:players,error:playerError}=await db.from('nk_multiplayer_players').select('room_code,user_id,display_name,controller,last_seen_at').in('room_code',data.map(r=>r.code));
    if(playerError)throw playerError;
    for(const room of data){const listing=publicNubianRoom(room,players||[],now);if(listing)rooms.push(listing);}
    if(data.length<200)break;
   }
  }
  return json({schemaVersion:1,generatedAt:new Date(now).toISOString(),games,rooms});
 }catch(e){console.error(e);return json({error:'Available games could not be loaded. Please refresh.'},503);}
});
