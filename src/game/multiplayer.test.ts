import { describe, expect, it } from "vitest";
import { createMultiplayerBeginnerGame, playMultiplayerComparison, publicBeginnerState, type MultiplayerSeat } from "./multiplayer";

const seats: MultiplayerSeat[] = [
  { id: "seat-a", userId: "user-a", displayName: "Amina", controller: "human", factionId: "nubian-christians", seatOrder: 0 },
  { id: "seat-b", userId: "user-b", displayName: "Musa", controller: "human", factionId: "egyptian-muslims", seatOrder: 1 },
];

describe("Beginner multiplayer engine", () => {
  it("creates one five-card army for every human participant", () => {
    const state = createMultiplayerBeginnerGame([...seats], { totalSeats: 2, npcCount: 0, nileFloods: false, openingPlayer: "human" }, "MULTI");
    expect(state.players.map((player) => player.id)).toEqual(["user-a", "user-b"]);
    expect(state.players.every((player) => player.cards.length === 5)).toBe(true);
    expect(state.players.every((player) => player.controller === "human")).toBe(true);
  });

  it("removes hidden card identities and statistics from public state", () => {
    const state = createMultiplayerBeginnerGame([...seats], { totalSeats: 2, npcCount: 0, nileFloods: false, openingPlayer: "human" }, "HIDDEN");
    const visible = publicBeginnerState(state);
    expect(visible.players[0].cards[0]).toEqual({ id: state.players[0].cards[0].id, face: "down", discarded: false });
    expect("name" in visible.players[0].cards[0]).toBe(false);
    expect("strength" in visible.players[0].cards[0]).toBe(false);
  });

  it("produces a review that pauses the next multiplayer action", () => {
    const state = createMultiplayerBeginnerGame([...seats], { totalSeats: 2, npcCount: 0, nileFloods: false, openingPlayer: "human" }, "REVIEW");
    const review = playMultiplayerComparison(state, "strength");
    expect(review.stat).toBe("strength");
    expect(review.scores).toHaveLength(2);
    expect(review.cardIds.length).toBeGreaterThanOrEqual(2);
  });
});
