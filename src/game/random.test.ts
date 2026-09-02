import { expect, it } from "vitest";
import { createRandomState, nextRandom, normalizeSeed, randomSource } from "./random";

it("normalizes human-entered seeds", () => expect(normalizeSeed("  nile floods 42 ")).toBe("NILE-FLOODS-42"));

it("produces the same sequence from the same seed", () => {
  const first = createRandomState("repeatable-game");
  const second = createRandomState("repeatable-game");
  expect(Array.from({ length: 20 }, () => nextRandom(first))).toEqual(Array.from({ length: 20 }, () => nextRandom(second)));
  expect(first).toEqual(second);
});

it("continues from an exact serialized generator position", () => {
  const original = createRandomState("saved-position");
  const source = randomSource(original);
  source(); source(); source();
  const restored = structuredClone(original);
  expect(Array.from({ length: 12 }, source)).toEqual(Array.from({ length: 12 }, randomSource(restored)));
  expect(original.calls).toBe(15);
  expect(restored.calls).toBe(15);
});
