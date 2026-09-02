import type{Stat}from"./types";
export type StatProfile=Record<Stat,number>;
const stats:Stat[]=["strength","zeal","wealth"];
export function chooseNpcStat(profile:StatProfile,visibleCard:StatProfile|undefined,random=Math.random,available:readonly Stat[]=stats):Stat{if(!available.length)throw new Error("At least one statistic must be available");const weights=visibleCard?Object.fromEntries(stats.map(s=>[s,Math.max(1,visibleCard[s]**2)]))as StatProfile:profile;const total=available.reduce((n,s)=>n+Math.max(0,weights[s]),0);if(total<=0)return available[Math.floor(random()*available.length)];let roll=random()*total;for(const s of available){roll-=Math.max(0,weights[s]);if(roll<0)return s}return available[available.length-1]}
export function factionProfile(cards:Array<StatProfile>):StatProfile{const n=Math.max(1,cards.length);return{strength:cards.reduce((s,c)=>s+c.strength,0)/n,zeal:cards.reduce((s,c)=>s+c.zeal,0)/n,wealth:cards.reduce((s,c)=>s+c.wealth,0)/n}}
