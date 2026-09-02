import { isRandomState } from "./random";
import type { AmateurState } from "./amateur";

export const AMATEUR_SAVE_KEY = "nubian-kings:amateur:v1";

export function serializeAmateurGame(state: AmateurState) {
  return JSON.stringify(state);
}

export function parseAmateurGame(raw: string): AmateurState | undefined {
  try {
    const value = JSON.parse(raw);
    if (
      value?.version !== 1
      || value?.mode !== "amateur"
      || !Array.isArray(value.players)
      || typeof value.activePlayerIndex !== "number"
      || !isRandomState(value.random)
    ) return;
    return value as AmateurState;
  } catch {
    return;
  }
}
