import { describe, expect, it } from "vitest";
import { MultiplayerResponseGate } from "./multiplayer-response-gate";

describe("multiplayer response ordering", () => {
  it("discards a polling response started before a newer action", () => {
    const gate = new MultiplayerResponseGate();
    const olderPoll = gate.begin();
    const move = gate.begin();
    expect(gate.accept(move, { code: "ABC234", revision: 8 })).toBe(true);
    expect(gate.accept(olderPoll, { code: "ABC234", revision: 7 })).toBe(false);
  });

  it("does not regress a room even when a later poll has a higher ticket", () => {
    const gate = new MultiplayerResponseGate();
    const move = gate.begin();
    const poll = gate.begin();
    expect(gate.accept(move, { code: "ABC234", revision: 12 })).toBe(true);
    expect(gate.accept(poll, { code: "ABC234", revision: 11 })).toBe(false);
    expect(gate.accept(gate.begin(), { code: "ABC234", revision: 12 })).toBe(true);
  });

  it("discards an in-flight view-only response after takeover", () => {
    const gate = new MultiplayerResponseGate();
    const viewOnlyPoll = gate.begin();
    gate.invalidate();
    const claimedRoom = gate.begin();
    expect(gate.accept(claimedRoom, { code: "ABC234", revision: 9 })).toBe(true);
    expect(gate.accept(viewOnlyPoll, { code: "ABC234", revision: 9 })).toBe(false);
  });

  it("allows a genuinely newer server response to revoke control", () => {
    const gate = new MultiplayerResponseGate();
    expect(gate.accept(gate.begin(), { code: "ABC234", revision: 9 })).toBe(true);
    expect(gate.accept(gate.begin(), { code: "ABC234", revision: 9 })).toBe(true);
  });

  it("rejects late polling responses after leaving and allows entering another room", () => {
    const gate = new MultiplayerResponseGate();
    const old = gate.begin();
    gate.clear();
    expect(gate.accept(old, { code: "ABC234", revision: 100 })).toBe(false);
    expect(gate.accept(gate.begin(), { code: "DEF567", revision: 1 })).toBe(true);
  });
});
