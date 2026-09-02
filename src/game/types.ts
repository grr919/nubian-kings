export type Stat="strength"|"zeal"|"wealth";
export type Face="down"|"up";
export interface Card{readonly id:string;readonly name:string;readonly factionId:string;readonly strength:number;readonly zeal:number;readonly wealth:number;face:Face;discarded:boolean}
export interface Player{readonly id:string;readonly factionId:string;readonly controller:"human"|"npc";cards:Card[];cursor:number;eliminated:boolean}
export interface TieState{participantIds:string[];usedCardIds:Record<string,string[]>}
export interface RandomState{seed:string;state:number;calls:number}
export interface BeginnerState{version:2;players:Player[];selectorIndex:number;phase:"select"|"tie"|"complete";selectedStat?:Stat;winnerId?:string;nileFloods:boolean;round:number;random:RandomState;tie?:TieState;pendingNpcChoice?:{playerId:string;stat:Stat}}
export type GameEvent=|{type:"stat-selected";playerId:string;stat:Stat}|{type:"card-revealed";playerId:string;cardId:string;wasFaceDown:boolean}|{type:"die-rolled";playerId:string;value:number;reason:"nile-floods"|"exhausted-tie"}|{type:"score";playerId:string;cardId:string;base:number;die:number;total:number}|{type:"cards-discarded";playerId:string;cardIds:string[]}|{type:"tie";playerIds:string[]}|{type:"comparison-won";playerId:string}|{type:"player-eliminated";playerId:string}|{type:"selector-advanced";playerId:string}|{type:"game-won";playerId:string};
