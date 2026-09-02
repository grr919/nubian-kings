import type{BeginnerState}from"./types";
export const SAVE_KEY="nubian-kings:beginner:v1";
export function serializeGame(state:BeginnerState){return JSON.stringify(state)}
export function parseGame(raw:string):BeginnerState|undefined{try{const value=JSON.parse(raw);if(value?.version!==1||!Array.isArray(value.players)||typeof value.selectorIndex!=="number")return;return value as BeginnerState}catch{return}}
