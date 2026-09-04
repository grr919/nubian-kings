import fs from "node:fs";
import { test } from "vitest";
import data from "../data/cards.json";
import { createBeginnerGame, FACTIONS } from "./setup";
import { playComparison } from "./beginner";
import { chooseNpcStatForCard, factionProfile } from "./npc";
import { randomSource } from "./random";
import {
  activePlayer,
  chooseBestNpcHeir,
  chooseNpcAttack,
  heirChoices,
  prepareAmateurGame,
  resolveAmateurAttack,
  resolveNpcReplenishment,
  startPreparedAmateurGame,
} from "./amateur";
import {
  activeMasterPlayer,
  autoArrangeMasterCards,
  beginMasterConstruction,
  confirmMasterArmy,
  constructionCards,
  masterHeirChoices,
  prepareMasterGame,
  resolveMasterAttack,
  resolveMasterNpcReplenishment,
  chooseMasterNpcAttack,
} from "./master";

const GAMES = 10_000;
const SAFETY_ACTIONS = 5_000;
const STATS = ["strength", "zeal", "wealth"] as const;
type Level = "Beginner" | "Amateur" | "Master";
type Faction = (typeof FACTIONS)[number];

type GameResult = {
  level: Level;
  completed: boolean;
  winnerFaction?: Faction;
  factions: Faction[];
  openingFaction: Faction;
  openingWon: boolean;
  rounds: number;
  actions: number;
};

const labels: Record<Faction, string> = {
  "nubian-christians": "Nubian Christians",
  "egyptian-christians": "Egyptian Christians",
  "ethiopian-christians": "Ethiopian Christians",
  "egyptian-muslims": "Egyptian Muslims",
  "ethiopian-jews": "Ethiopian Jews",
};

const canonical = data.cards as Array<{
  factionId: Faction;
  strength: number;
  zeal: number;
  wealth: number;
  deckCopies: number;
  availableInPrototype: boolean;
}>;

const profiles = Object.fromEntries(FACTIONS.map((faction) => [
  faction,
  factionProfile(canonical.filter((card) => card.factionId === faction)),
])) as Record<Faction, { strength: number; zeal: number; wealth: number }>;

function peekBeginnerCard(state: ReturnType<typeof createBeginnerGame>) {
  const player = state.players[state.selectorIndex];
  const excluded = new Set(state.tie?.usedCardIds[player.id] ?? []);
  for (let offset = 0; offset < player.cards.length; offset++) {
    const index = (player.cursor + offset) % player.cards.length;
    const card = player.cards[index];
    if (!card.discarded && !excluded.has(card.id)) return card;
  }
  return undefined;
}

function commonOptions(level: Level, index: number) {
  const humanFaction = FACTIONS[index % FACTIONS.length];
  const npcCount = 1 + (index % 4);
  const nileFloods = Math.floor(index / 4) % 2 === 1;
  const seed = `BAL-${level}-${String(index + 1).padStart(5, "0")}`;
  return { humanFaction, npcCount, nileFloods, seed, openingPlayer: "random" as const };
}

function runBeginner(index: number): GameResult {
  const state = createBeginnerGame(commonOptions("Beginner", index));
  const openingFaction = state.players[state.selectorIndex].factionId as Faction;
  let actions = 0;
  while (state.phase !== "complete" && actions < SAFETY_ACTIONS) {
    const selector = state.players[state.selectorIndex];
    const stat = chooseNpcStatForCard(
      profiles[selector.factionId as Faction],
      peekBeginnerCard(state),
      randomSource(state.random),
      STATS,
    );
    playComparison(state, stat);
    actions++;
  }
  const winner = state.winnerId ? state.players.find((player) => player.id === state.winnerId) : undefined;
  return {
    level: "Beginner",
    completed: state.phase === "complete",
    winnerFaction: winner?.factionId as Faction | undefined,
    factions: state.players.map((player) => player.factionId as Faction),
    openingFaction,
    openingWon: Boolean(winner && winner.factionId === openingFaction),
    rounds: state.round,
    actions,
  };
}

function runAmateur(index: number): GameResult {
  const victoryMode = Math.floor(index / 8) % 2 === 0 ? "standard" as const : "long" as const;
  const prepared = prepareAmateurGame({ ...commonOptions("Amateur", index), victoryMode });
  const human = prepared.players.find((player) => player.controller === "human")!;
  const heir = chooseBestNpcHeir(human);
  if (!heir || !heirChoices(prepared).some((candidate) => candidate.id === heir.id)) throw new Error("No valid simulated Amateur heir");
  const state = startPreparedAmateurGame(prepared, heir.id);
  state.players.forEach((player) => { player.controller = "npc"; });
  const openingFaction = state.players[state.activePlayerIndex].factionId as Faction;
  let actions = 0;
  while (state.phase !== "complete" && actions < SAFETY_ACTIONS) {
    if (state.phase === "attack") {
      const action = chooseNpcAttack(state);
      resolveAmateurAttack(state, action);
    } else {
      resolveNpcReplenishment(state);
    }
    actions++;
  }
  const winner = state.winnerId ? state.players.find((player) => player.id === state.winnerId) : undefined;
  return {
    level: "Amateur",
    completed: state.phase === "complete",
    winnerFaction: winner?.factionId as Faction | undefined,
    factions: state.players.map((player) => player.factionId as Faction),
    openingFaction,
    openingWon: Boolean(winner && winner.factionId === openingFaction),
    rounds: state.round,
    actions,
  };
}

function runMaster(index: number): GameResult {
  const victoryMode = Math.floor(index / 8) % 2 === 0 ? "standard" as const : "long" as const;
  const prepared = prepareMasterGame({ ...commonOptions("Master", index), victoryMode });
  const leaders = masterHeirChoices(prepared);
  const heir = [...leaders].sort((a, b) =>
    (b.strength + b.zeal + b.wealth) - (a.strength + a.zeal + a.wealth) || a.id.localeCompare(b.id)
  )[0];
  if (!heir) throw new Error("No valid simulated Master heir");
  const construction = beginMasterConstruction(prepared, heir.id);
  const arranged = autoArrangeMasterCards(constructionCards(construction), "human-pile");
  const state = confirmMasterArmy(construction, arranged);
  state.players.forEach((player) => { player.controller = "npc"; });
  const openingFaction = state.players[state.activePlayerIndex].factionId as Faction;
  let actions = 0;
  while (state.phase !== "complete" && actions < SAFETY_ACTIONS) {
    if (state.phase === "attack") {
      const action = chooseMasterNpcAttack(state);
      resolveMasterAttack(state, action);
    } else {
      resolveMasterNpcReplenishment(state);
    }
    actions++;
  }
  const winner = state.winnerId ? state.players.find((player) => player.id === state.winnerId) : undefined;
  return {
    level: "Master",
    completed: state.phase === "complete",
    winnerFaction: winner?.factionId as Faction | undefined,
    factions: state.players.map((player) => player.factionId as Faction),
    openingFaction,
    openingWon: Boolean(winner && winner.factionId === openingFaction),
    rounds: state.round,
    actions,
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(level: Level, results: GameResult[]) {
  const completed = results.filter((result) => result.completed && result.winnerFaction);
  const factionRows = FACTIONS.map((faction) => {
    const appearances = completed.filter((result) => result.factions.includes(faction));
    const wins = completed.filter((result) => result.winnerFaction === faction).length;
    const expectedWins = appearances.reduce((sum, result) => sum + 1 / result.factions.length, 0);
    return {
      faction,
      label: labels[faction],
      appearances: appearances.length,
      wins,
      winRate: appearances.length ? wins / appearances.length : 0,
      expectedWins,
      difference: wins - expectedWins,
    };
  });
  const rounds = completed.map((result) => result.rounds);
  const actions = completed.map((result) => result.actions);
  return {
    level,
    games: results.length,
    completed: completed.length,
    stalled: results.length - completed.length,
    openingWins: completed.filter((result) => result.openingWon).length,
    openingRate: completed.length ? completed.filter((result) => result.openingWon).length / completed.length : 0,
    avgRounds: rounds.reduce((a, b) => a + b, 0) / Math.max(1, rounds.length),
    medianRounds: median(rounds),
    avgActions: actions.reduce((a, b) => a + b, 0) / Math.max(1, actions.length),
    factions: factionRows,
  };
}

function pct(value: number) { return `${(value * 100).toFixed(1)}%`; }
function n1(value: number) { return value.toFixed(1); }

function markdown(summaries: ReturnType<typeof summarize>[]) {
  const lines: string[] = [
    "# Nubian Kings Current Balance Simulation",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Games: ${GAMES * summaries.length.toLocaleString()} total (${GAMES.toLocaleString()} per level).`,
    "",
    "Method: current repository NPC decision rules; 2–5 players; rotating faction assignment; randomized faction combinations, seat order, opening player and deck order; Nile Floods varied; Amateur/Master standard and long victory modes varied. Fair expected wins are the sum of 1/player-count across completed appearances.",
    "",
    "## Overall results",
    "",
    "| Level | Faction | Appearances | Wins | Win rate | Expected wins | Difference |",
    "|---|---|---:|---:|---:|---:|---:|",
  ];
  for (const summary of summaries) for (const row of summary.factions) {
    lines.push(`| ${summary.level} | ${row.label} | ${row.appearances.toLocaleString()} | ${row.wins.toLocaleString()} | ${pct(row.winRate)} | ${n1(row.expectedWins)} | ${row.difference >= 0 ? "+" : ""}${n1(row.difference)} |`);
  }
  lines.push("", "## Opening-player advantage", "", "| Level | Opening player won | Completed games | Rate |", "|---|---:|---:|---:|");
  for (const summary of summaries) lines.push(`| ${summary.level} | ${summary.openingWins.toLocaleString()} | ${summary.completed.toLocaleString()} | ${pct(summary.openingRate)} |`);
  lines.push("", "## Game length", "", "| Level | Average rounds | Median rounds | Average actions |", "|---|---:|---:|---:|");
  for (const summary of summaries) lines.push(`| ${summary.level} | ${n1(summary.avgRounds)} | ${n1(summary.medianRounds)} | ${n1(summary.avgActions)} |`);
  lines.push("", "## Completion", "", "| Level | Completed | Stalled at safety limit |", "|---|---:|---:|");
  for (const summary of summaries) lines.push(`| ${summary.level} | ${summary.completed.toLocaleString()} | ${summary.stalled.toLocaleString()} |`);
  lines.push("", "## Interpretation caution", "", "These results measure balance under the present NPC decision rules, not optimal human play. Large, persistent faction differences are useful warning signs; close differences should be verified later with neutral-strategy and human-play data.", "");
  return lines.join("\n");
}

test("runs 10,000 balance games per implemented level", () => {
  const levels: Array<[Level, (index: number) => GameResult]> = [
    ["Beginner", runBeginner],
    ["Amateur", runAmateur],
    ["Master", runMaster],
  ];
  const summaries = levels.map(([level, runner]) => {
    const results = Array.from({ length: GAMES }, (_, index) => runner(index));
    return summarize(level, results);
  });
  const report = markdown(summaries);
  fs.writeFileSync("balance-current.md", report);
  fs.writeFileSync("balance-current.json", JSON.stringify(summaries, null, 2));
  console.log("\nBALANCE_REPORT_START\n" + report + "BALANCE_REPORT_END\n");
}, 900_000);
