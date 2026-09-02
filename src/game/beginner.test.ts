import{describe,expect,it}from"vitest";import{advanceSelector,eliminateEmptyPlayers,nextCard,score}from"./beginner";import{createRandomState}from"./random";import type{BeginnerState,Card,Player}from"./types";
const card=(id:string,discarded=false):Card=>({id,name:id,factionId:"f",strength:1,zeal:2,wealth:3,face:"down",discarded});
const player=(id:string,cards:Card[]):Player=>({id,factionId:id,controller:"npc",cards,cursor:0,eliminated:false});
it("cycles surviving cards and skips discards",()=>{const p=player("a",[card("1"),card("2",true),card("3")]);expect(nextCard(p)?.id).toBe("1");expect(nextCard(p)?.id).toBe("3");expect(nextCard(p)?.id).toBe("1")});
it("uses the approved statistic",()=>expect(score(card("1"),"wealth",4)).toBe(7));
it("eliminates only players with no surviving cards",()=>{const s={players:[player("a",[card("1",true)]),player("b",[card("2")])],selectorIndex:0,phase:"select",nileFloods:false,round:1,version:2,random:createRandomState("TEST")}as BeginnerState;eliminateEmptyPlayers(s);expect(s.winnerId).toBe("b")});
it("passes selection clockwise over eliminated players",()=>{const s={players:[player("a",[card("1")]),player("b",[card("2")]),player("c",[card("3")])],selectorIndex:0,phase:"select",nileFloods:false,round:1,version:2,random:createRandomState("TEST")}as BeginnerState;s.players[1].eliminated=true;advanceSelector(s);expect(s.selectorIndex).toBe(2)});
