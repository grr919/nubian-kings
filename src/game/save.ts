import { createRandomState, isRandomState } from "./random";
import type { BeginnerState } from "./types";

export const SAVE_KEY = "nubian-kings:beginner:v1";

export function serializeGame(state: BeginnerState) {
  return JSON.stringify(state);
}

export function parseGame(raw: string): BeginnerState | undefined {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value?.players) || typeof value.selectorIndex !== "number") return;
    if (value.version === 2 && isRandomState(value.random)) return value as BeginnerState;
    if (value.version === 1) {
      const random = createRandomState(`NK-LEGACY-${Math.abs(hashText(raw)).toString(16).padStart(8, "0")}`);
      return { ...value, version: 2, random } as BeginnerState;
    }
  } catch {
    return;
  }
}

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index++) hash = (Math.imul(31, hash) + text.charCodeAt(index)) | 0;
  return hash;
}
