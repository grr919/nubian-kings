import{expect,it}from"vitest";import{chooseNpcStat,factionProfile}from"./npc";
it("computes public faction tendencies",()=>expect(factionProfile([{strength:6,zeal:2,wealth:1},{strength:4,zeal:4,wealth:3}])).toEqual({strength:5,zeal:3,wealth:2}));
it("uses faction tendencies when the upcoming card is hidden",()=>expect(chooseNpcStat({strength:9,zeal:1,wealth:1},undefined,()=>0)).toBe("strength"));
it("may use only a supplied visible card",()=>expect(chooseNpcStat({strength:9,zeal:1,wealth:1},{strength:0,zeal:0,wealth:8},()=>.99)).toBe("wealth"));
