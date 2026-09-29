import { describe, expect, it } from "vitest";
import { castRematchVote } from "./rematch-consent";

const players = [{ user_id: "host", controller: "human" as const }, { user_id: "guest", controller: "human" as const }, { user_id: null, controller: "npc" as const }];
const room = { status: "complete", revision: 10, settings: { nileFloods: true, rematchVotes: {} as Record<string, boolean> } };

describe("rematch consent", () => {
  it("keeps the completed game until every human explicitly accepts", () => {
    const first = castRematchVote(room, players, "host", { accept: true, revision: 10 });
    expect(first).toMatchObject({ ready: false, settings: { rematchVotes: { host: true } } });
    if ("error" in first) throw Error(first.error);
    const last = castRematchVote({ ...room, revision: 11, settings: first.settings }, players, "guest", { accept: true, revision: 11 });
    expect(last).toEqual({ ready: true, settings: { nileFloods: true } });
  });
  it("honors No and lets a player change their own answer", () => {
    const declined = { ...room, settings: { rematchVotes: { guest: false } } };
    const host = castRematchVote(declined, players, "host", { accept: true, revision: 10 });
    expect(host).toMatchObject({ ready: false, settings: { rematchVotes: { host: true, guest: false } } });
    if ("error" in host) throw Error(host.error);
    expect(castRematchVote({ ...room, settings: host.settings }, players, "guest", { accept: true, revision: 10 })).toMatchObject({ ready: true });
  });
  it("includes eliminated and disconnected humans until their seat is transferred", () => {
    const extra = [...players, { user_id: "third", controller: "human" as const }];
    expect(castRematchVote({ ...room, settings: { rematchVotes: { host: true } } }, extra, "guest", { accept: true, revision: 10 })).toMatchObject({ ready: false });
  });
  it("rejects stale votes, legacy immediate-rematch requests, outsiders, and active games", () => {
    expect(castRematchVote(room, players, "guest", { accept: true, revision: 9 })).toMatchObject({ status: 409 });
    expect(castRematchVote(room, players, "host", { revision: 10 })).toMatchObject({ status: 400 });
    expect(castRematchVote(room, players, "outsider", { accept: true, revision: 10 })).toMatchObject({ status: 403 });
    expect(castRematchVote({ ...room, status: "active" }, players, "guest", { accept: true, revision: 10 })).toMatchObject({ status: 409 });
  });
});
