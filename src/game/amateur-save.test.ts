import { describe, expect, it } from "vitest";
import { heirChoices, prepareAmateurGame, startPreparedAmateurGame } from "./amateur";
import { parseAmateurGame, serializeAmateurGame } from "./amateur-save";

describe("Amateur saves", () => {
  it("round-trips a prepared Amateur game", () => {
    const prepared = prepareAmateurGame({
      humanFaction: "ethiopian-christians",
      npcCount: 2,
      nileFloods: true,
      seed: "AMATEUR-SAVE",
    });
    const game = startPreparedAmateurGame(prepared, heirChoices(prepared)[0].id);
    expect(parseAmateurGame(serializeAmateurGame(game))).toEqual(game);
  });

  it("rejects incompatible and corrupt saves", () => {
    expect(parseAmateurGame("{}")).toBeUndefined();
    expect(parseAmateurGame("not json")).toBeUndefined();
  });
});
