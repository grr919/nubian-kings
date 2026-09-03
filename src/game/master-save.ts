import { isRandomState } from "./random";
import type { MasterState } from "./master";

export const MASTER_SAVE_KEY = "nubian-kings:master:v1";

export function serializeMasterGame(state: MasterState) {
  return JSON.stringify(state);
}

export function parseMasterGame(raw: string): MasterState | undefined {
  try {
    const value = JSON.parse(raw);
    if (
      value?.version !== 1
      || value?.mode !== "master"
      || !Array.isArray(value.players)
      || typeof value.activePlayerIndex !== "number"
      || !isRandomState(value.random)
    ) return;
    return value as MasterState;
  } catch {
    return;
  }
}
