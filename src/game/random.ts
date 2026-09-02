import type { RandomState } from "./types";

const STEP = 0x6d2b79f5;

export function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeSeed(seed: string) {
  const normalized = seed.trim().replace(/\s+/g, "-").toUpperCase();
  if (!normalized) throw new Error("A game seed cannot be empty");
  return normalized.slice(0, 48);
}

export function generateSeed() {
  const values = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else {
    values[0] = Date.now() >>> 0;
    values[1] = Math.floor(Math.random() * 0x100000000) >>> 0;
  }
  return `NK-${values[0].toString(16).padStart(8, "0")}-${values[1].toString(16).padStart(8, "0")}`.toUpperCase();
}

export function createRandomState(seed = generateSeed()): RandomState {
  const normalized = normalizeSeed(seed);
  return { seed: normalized, state: hashSeed(normalized), calls: 0 };
}

export function nextRandom(random: RandomState) {
  random.state = (random.state + STEP) >>> 0;
  let value = random.state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  random.calls++;
  return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
}

export function randomSource(random: RandomState) {
  return () => nextRandom(random);
}

export function isRandomState(value: unknown): value is RandomState {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RandomState>;
  return typeof item.seed === "string" && item.seed.length > 0 && Number.isInteger(item.state) && item.state! >= 0 && item.state! <= 0xffffffff && Number.isInteger(item.calls) && item.calls! >= 0;
}
