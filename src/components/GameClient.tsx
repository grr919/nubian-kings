"use client";

import { useEffect, useMemo, useState } from "react";
import EparchCrownMark from "@/components/EparchCrownMark";
import cardData from "@/data/cards.json";
import { nextCard, playComparison, surviving } from "@/game/beginner";
import { chooseNpcStatForCard, factionProfile } from "@/game/npc";
import { beginnerEventText, roundOutcomeText } from "@/game/player-language";
import { randomSource } from "@/game/random";
import { parseGame, SAVE_KEY, serializeGame } from "@/game/save";
import { createBeginnerGame, FACTIONS } from "@/game/setup";
import type { BeginnerState, Card, GameEvent, Player, Stat } from "@/game/types";

const STATS: Stat[] = ["strength", "zeal", "wealth"];
const REVIEW_KEY = "nubian-kings:comparison-review:v1";
const NPC_CHOICE_KEY = "nubian-kings:npc-choice:v1";
const ART_BASE_URL = "https://nubian-kings-qtsa6vhio-grr919-6387s-projects.vercel.app";
const ART_BY_ID = Object.fromEntries(cardData.cards.flatMap((card) => card.assets[0] ? [[card.id, card.assets[0].filename]] : []));
interface ComparisonReview { stat: Stat; cardIds: string[]; sequenceCardIds?: string[]; scores: Array<{ playerId: string; cardId: string; base: number; die: number; total: number }>; outcome: string; winnerId?: string }
const INFO: Record<string, { name: string; short: string; mark: string }> = {
  "nubian-christians": { name: "Nubian Christians", short: "Nubia", mark: "NC" },
  "egyptian-christians": { name: "Egyptian Christians", short: "Egypt", mark: "EC" },
  "ethiopian-christians": { name: "Ethiopian Christians", short: "Ethiopia", mark: "XC" },
  "egyptian-muslims": { name: "Egyptian Muslims", short: "Egypt", mark: "EM" },
  "ethiopian-jews": { name: "Ethiopian Jews", short: "Ethiopia", mark: "EJ" },
};

function playerName(player: Player) {
  return player.controller === "human" ? `You · ${INFO[player.factionId].name}` : INFO[player.factionId].name;
}

function upcoming(player: Player, excluded: string[] = []) {
  const copy = { ...player, cards: player.cards.map((card) => ({ ...card })) };
  return nextCard(copy, new Set(excluded));
}

function artwork(card: Card) {
  const filename = ART_BY_ID[card.id.split(":")[0]];
  return filename ? `${ART_BASE_URL}/cards/${encodeURIComponent(filename)}` : undefined;
}

function CardView({ card, active, reviewed, onInspect }: { card: Card; active: boolean; reviewed: boolean; onInspect: (card: Card) => void }) {
  const visible = card.face === "up";
  const inspectable = visible && (!card.discarded || reviewed);
  const image = artwork(card);
  return (
    <article className={`card ${visible ? "face" : "back"} ${card.discarded && !reviewed ? "discarded" : ""} ${card.discarded && reviewed ? "reviewDefeated" : ""} ${active ? "active" : ""}`} role={inspectable ? "button" : undefined} tabIndex={inspectable ? 0 : undefined} aria-label={inspectable ? `Inspect ${card.name}` : undefined} onClick={() => inspectable && onInspect(card)} onKeyDown={(event) => { if (inspectable && (event.key === "Enter" || event.key === " ")) onInspect(card); }}>
      {card.discarded && !reviewed ? (
        <span className="discardMark">Discarded</span>
      ) : visible && image ? (
        <>
          <img className="cardArtwork" src={image} alt={`${card.name} card artwork`} />
          {card.discarded && reviewed && <span className="outcomeMark">Defeated</span>}
          <div className="authoritativeStats" aria-label="Official prototype statistics">
            {STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat[0].toUpperCase()}</span>)}
          </div>
        </>
      ) : visible ? (
        <>
          <EparchCrownMark className="cardCrown" />
          <h3>{card.name}</h3>
          <div className="cardStats">
            {STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat}</span>)}
          </div>
        </>
      ) : (
        <><div className="backOrnament">NK</div><span>Hidden</span></>
      )}
    </article>
  );
}

export default function GameClient() {
  const [screen, setScreen] = useState<"home" | "setup" | "game">("home");
  const [state, setState] = useState<BeginnerState>();
  const [faction, setFaction] = useState<(typeof FACTIONS)[number]>(FACTIONS[0]);
  const [npcCount, setNpcCount] = useState<number | "random">("random");
  const [openingPlayer, setOpeningPlayer] = useState<"random" | "human" | "npc">("random");
  const [seed, setSeed] = useState("");
  const [floods, setFloods] = useState(false);
  const [guide, setGuide] = useState(true);
  const [help, setHelp] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hasSave, setHasSave] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [inspected, setInspected] = useState<Card>();
  const [review, setReview] = useState<ComparisonReview>();
  const [npcChoice, setNpcChoice] = useState<{ playerId: string; stat: Stat }>();

  const profiles = useMemo(() => Object.fromEntries(FACTIONS.map((id) => [id, factionProfile(cardData.cards.filter((c) => c.factionId === id))])), []);

  useEffect(() => setHasSave(Boolean(parseGame(localStorage.getItem(SAVE_KEY) ?? ""))), []);

  useEffect(() => {
    if (review) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [review]);

  function persist(next: BeginnerState) {
    localStorage.setItem(SAVE_KEY, serializeGame(next));
    setHasSave(true);
  }

  function start() {
    const next = createBeginnerGame({ humanFaction: faction, npcCount: npcCount === "random" ? undefined : npcCount, nileFloods: floods, openingPlayer, seed: seed || undefined });
    setSeed(next.random.seed);
    localStorage.removeItem(REVIEW_KEY); localStorage.removeItem(NPC_CHOICE_KEY); setReview(undefined); setNpcChoice(undefined); persist(next); setState(next); setHistory(["The armies are assembled. The first selector will choose a trait."]); setScreen("game");
  }

  function continueGame() {
    const saved = parseGame(localStorage.getItem(SAVE_KEY) ?? "");
    if (saved) { const savedReview = localStorage.getItem(REVIEW_KEY); const legacyChoice = localStorage.getItem(NPC_CHOICE_KEY); const choice = saved.pendingNpcChoice ?? (legacyChoice ? JSON.parse(legacyChoice) : undefined); if (choice && !saved.pendingNpcChoice) { saved.pendingNpcChoice = choice; persist(saved); } setReview(savedReview ? JSON.parse(savedReview) : undefined); setNpcChoice(choice); setState(saved); setHistory(["Saved game restored."]); setScreen("game"); }
  }

  function choose(stat: Stat, sourceState = state) {
    if (!sourceState || sourceState.phase === "complete") return;
    const priorSequence = Object.values(sourceState.tie?.usedCardIds ?? {}).flat();
    const next = structuredClone(sourceState);
    const events = playComparison(next, stat);
    const scores = events.filter((event): event is Extract<GameEvent, { type: "score" }> => event.type === "score").map(({ playerId, cardId, base, die, total }) => ({ playerId, cardId, base, die, total }));
    const discarded = events.filter((event): event is Extract<GameEvent, { type: "cards-discarded" }> => event.type === "cards-discarded").flatMap((event) => event.cardIds);
    const winnerEvent = events.find((event): event is Extract<GameEvent, { type: "comparison-won" }> => event.type === "comparison-won");
    const sequenceCardIds = [...new Set([...priorSequence, ...scores.map((score) => score.cardId)])];
    const tied = events.some((event) => event.type === "tie");
    const nextReview: ComparisonReview = { stat, scores, sequenceCardIds, cardIds: [...new Set([...sequenceCardIds, ...discarded])], winnerId: winnerEvent?.playerId, outcome: roundOutcomeText(next.players, winnerEvent?.playerId, scores.map((score) => score.playerId), tied) };
    localStorage.setItem(REVIEW_KEY, JSON.stringify(nextReview)); setReview(nextReview);
    persist(next); setState(next); setHistory((old) => [...events.map((e) => beginnerEventText(e, next)).reverse(), ...old].slice(0, 18));
  }

  function continueAfterReview() {
    if (!state) return;
    localStorage.removeItem(REVIEW_KEY); setInspected(undefined); setReview(undefined);
  }

  function revealNpcChoice() {
    if (!npcChoice || !state) return;
    const stat = npcChoice.stat;
    const ready = structuredClone(state); delete ready.pendingNpcChoice;
    localStorage.removeItem(NPC_CHOICE_KEY); setNpcChoice(undefined); choose(stat, ready);
  }

  useEffect(() => {
    if (!state || state.phase === "complete" || review || npcChoice) return;
    const selector = state.players[state.selectorIndex];
    if (selector.controller !== "npc") return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const participates = !state.tie || state.tie.participantIds.includes(selector.id);
      const excluded = state.tie?.usedCardIds[selector.id] ?? [];
      const card = participates ? upcoming(selector, excluded) : undefined;
      const next = structuredClone(state);
      const choice = { playerId: selector.id, stat: chooseNpcStatForCard(profiles[selector.factionId], card, randomSource(next.random), STATS) };
      next.pendingNpcChoice = choice;
      persist(next); setState(next);
      localStorage.removeItem(NPC_CHOICE_KEY); setNpcChoice(choice);
      setThinking(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, profiles, review, npcChoice]);

  function leaveGame() {
    if (!window.confirm("Leave this game? Your current game will remain saved.")) return;
    setScreen("home"); setState(undefined); setHelp(false);
  }

  if (screen === "home") return (
    <main className="landing"><section className="panel titlePanel">
      <p className="kicker">CORE RULES PROTOTYPE</p><EparchCrownMark className="royalMark" /><h1>Nubian Kings</h1><p className="subtitle">The Battle for Africa</p>
      <p>Lead a medieval African faction through a contest of strength, zeal, and wealth.</p>
      <div className="actions"><button onClick={() => setScreen("setup")}>New Beginner Game</button><button className="secondary" disabled={!hasSave} onClick={continueGame}>Continue Beginner Game</button></div>
      <div className="routeLinks"><button className="textButton" onClick={() => setHelp(true)}>Beginner Rules</button></div><small>Core prototype · Special card effects are deferred</small>
    </section>{help && <Help onClose={() => setHelp(false)} />}</main>
  );

  if (screen === "setup") return (
    <main className="setupPage"><section className="setupPanel">
      <button className="backButton" onClick={() => setScreen("home")}>← Back</button><p className="kicker">BEGINNER GAME</p><h1>Assemble your army</h1><p className="lede">Choose your faction. Each army begins with five hidden cards.</p>
      <h2>Choose a faction</h2><div className="factionGrid">{FACTIONS.map((id) => <button key={id} className={`faction faction-${id} ${faction === id ? "selected" : ""}`} onClick={() => setFaction(id)}><span className="sigil">{INFO[id].mark}</span><span>{INFO[id].name}</span>{faction === id && <b>Selected</b>}</button>)}</div>
      <div className="settings"><label><span>Computer opponents</span><select value={npcCount} onChange={(e) => setNpcCount(e.target.value === "random" ? "random" : Number(e.target.value))}><option value="random">Random (1–4)</option>{[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label><label><span>Opening initiative</span><select value={openingPlayer} onChange={(e) => setOpeningPlayer(e.target.value as "random" | "human" | "npc")}><option value="random">Random participant</option><option value="human">You</option><option value="npc">Computer opponent</option></select></label><label className="seedSetting"><span><b>Game seed</b><small>Use the same seed and setup choices to reproduce a game.</small></span><input value={seed} maxLength={48} placeholder="Generated automatically" onChange={(e) => setSeed(e.target.value)} /></label><label className="toggle"><input type="checkbox" checked={floods} onChange={(e) => setFloods(e.target.checked)} /><span><b>Nile Floods</b><small>Add a die roll to every score.</small></span></label><label className="toggle"><input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} /><span><b>Guided play</b><small>Show short prompts during the game.</small></span></label></div>
      <button className="beginButton" onClick={start}>Begin Game</button>
    </section></main>
  );

  if (!state) return null;
  const selector = state.players[state.selectorIndex];
  const humanTurn = selector.controller === "human" && state.phase !== "complete";
  const winner = state.players.find((p) => p.id === state.winnerId);
  const humanPlayer = state.players.find((player) => player.controller === "human")!;
  const opponents = state.players.filter((player) => player.controller === "npc");
  return (
    <main className="gamePage">
      <header className="gameHeader"><div><EparchCrownMark className="miniMark" /><b>Nubian Kings</b><small>Beginner game · Round {state.round} · Seed {state.random.seed}</small></div><div className="toolbar"><button className="iconButton" onClick={() => navigator.clipboard?.writeText(state.random.seed)}>Copy Seed</button><button className="iconButton" onClick={() => setHelp(true)}>Rules</button><button className="iconButton" onClick={leaveGame}>Leave</button></div></header>
      <section className="statusBar"><span className={`turnDot ${thinking ? "thinking" : ""}`} /><div><b>{review ? "Review the played cards" : npcChoice ? "Computer trait selected" : state.phase === "complete" ? "Game complete" : thinking ? `${INFO[selector.factionId].name} is choosing…` : humanTurn ? "Choose a trait" : `${INFO[selector.factionId].name}'s turn`}</b><small>{review ? "Select any played card to study it. Continue when you are ready." : npcChoice ? "The cards remain hidden until you are ready." : state.phase === "tie" ? `Tie: choose any trait, including ${state.selectedStat} again.` : guide && humanTurn ? "Choose before the hidden cards are revealed." : ""}</small></div></section>
      {review ? <ComparisonStage review={review} state={state} onInspect={setInspected} /> : <div className="board"><PlayerArea player={humanPlayer} state={state} onInspect={setInspected} /><div className="opponentBoard">{opponents.map((player) => <PlayerArea key={player.id} player={player} state={state} compact onInspect={setInspected} />)}</div></div>}
      {review ? <ReviewPanel review={review} state={state} onContinue={continueAfterReview} /> : npcChoice ? <NpcChoicePanel choice={npcChoice} state={state} onReveal={revealNpcChoice} /> : state.phase !== "complete" && <section className={`chooser ${humanTurn ? "ready" : "waiting"}`}><p>{thinking ? "Your opponent is considering the faction’s strengths…" : humanTurn ? state.phase === "tie" ? "Choose any trait for the tie." : "Which trait will decide this comparison?" : "Waiting for the selector…"}</p><div>{STATS.map((stat) => <button key={stat} disabled={!humanTurn || thinking} onClick={() => choose(stat)}><span>{stat === "strength" ? "⚔" : stat === "zeal" ? "✦" : "◆"}</span>{stat}</button>)}</div></section>}
      {winner && !review && <section className="victory"><EparchCrownMark /><p className="kicker">VICTORY</p><h2>{winner.controller === "human" ? "You are victorious" : `${INFO[winner.factionId].name} are victorious`}</h2><button onClick={() => { setSeed(""); setScreen("setup"); }}>Play Again</button></section>}
      <aside className="history"><h2>Game record</h2>{history.length ? <ol>{history.map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}</ol> : <p>No comparisons yet.</p>}</aside>
      {inspected && <CardDetail card={inspected} onClose={() => setInspected(undefined)} />}
      {help && <Help onClose={() => setHelp(false)} />}
    </main>
  );
}

function PlayerArea({ player, state, compact = false, onInspect }: { player: Player; state: BeginnerState; compact?: boolean; onInspect: (card: Card) => void }) {
  const excluded = state.tie?.usedCardIds[player.id] ?? [];
  const next = upcoming(player, excluded)?.id;
  const tiedOut = Boolean(state.tie && !state.tie.participantIds.includes(player.id));
  return <section className={`playerArea ${compact ? "npcArea" : "humanArea"} faction-${player.factionId} ${player.eliminated ? "eliminated" : ""}`}><header><span className="sigil small">{INFO[player.factionId].mark}</span><div><h2>{playerName(player)}</h2><small>{player.eliminated ? "Eliminated" : tiedOut ? "Out of this tie" : `${surviving(player).length} cards remain`}</small></div>{state.players[state.selectorIndex].id === player.id && !player.eliminated && <span className="selectorBadge">Selector</span>}</header><div className="cards">{player.cards.map((card) => <CardView key={card.id} card={card} active={!tiedOut && card.id === next} reviewed={false} onInspect={onInspect} />)}</div></section>;
}

function findCard(state: BeginnerState, cardId: string) {
  for (const player of state.players) {
    const card = player.cards.find((item) => item.id === cardId);
    if (card) return { player, card };
  }
}

function ComparisonStage({ review, state, onInspect }: { review: ComparisonReview; state: BeginnerState; onInspect: (card: Card) => void }) {
  const high = Math.max(...review.scores.map((score) => score.total));
  const leaders = review.scores.filter((score) => score.total === high);
  const winnerId = review.winnerId ?? (leaders.length === 1 && state.phase !== "tie" ? leaders[0].playerId : undefined);
  const currentIds = new Set(review.scores.map((score) => score.cardId));
  const earlierCards = (review.sequenceCardIds ?? review.cardIds).filter((cardId) => !currentIds.has(cardId)).flatMap((cardId) => { const found = findCard(state, cardId); return found ? [found] : []; });
  const headline = roundOutcomeText(state.players, winnerId, review.scores.map((score) => score.playerId), !winnerId && leaders.length > 1);
  return <section className="comparisonStage" aria-live="polite"><header><p className="kicker">{review.stat} comparison</p><h2>{headline}</h2></header>{review.scores.length === 0 && <p className="noNewCards">No new cards were played. An army without another card was eliminated.</p>}<div className="comparisonCards">{review.scores.map((score) => { const found = findCard(state, score.cardId)!; const result = winnerId === score.playerId ? "Winner" : winnerId ? "Defeated" : leaders.length > 1 && score.total === high ? "Tied" : "Defeated"; return <article key={score.cardId} className={`comparisonCard result-${result.toLowerCase()}`}><div className="comparisonOwner"><span className={`sigil small faction-${found.player.factionId}`}>{INFO[found.player.factionId].mark}</span><b>{found.player.controller === "human" ? "You" : INFO[found.player.factionId].name}</b></div><CardView card={found.card} active={result === "Winner"} reviewed onInspect={onInspect} /><div className="comparisonScore"><span>{result}</span><b>{score.total}</b><small>{score.base}{score.die ? ` + roll ${score.die}` : ""}</small></div></article>; })}</div>{earlierCards.length > 0 && <div className="tieTrail"><p>Earlier cards in this tie</p><div>{earlierCards.map(({ player, card }) => <article key={card.id}><CardView card={card} active={false} reviewed onInspect={onInspect} /><small>{player.controller === "human" ? "You" : INFO[player.factionId].name}</small></article>)}</div></div>}</section>;
}

function ReviewPanel({ review, state, onContinue }: { review: ComparisonReview; state: BeginnerState; onContinue: () => void }) {
  return <section className="chooser reviewPanel"><div className="reviewHeading"><div><p className="kicker">{review.stat} comparison</p><b>{review.outcome}</b></div><button onClick={onContinue}>{state.phase === "complete" ? "See Victory" : state.phase === "tie" ? "Choose Trait" : "Continue"}</button></div></section>;
}

function NpcChoicePanel({ choice, state, onReveal }: { choice: { playerId: string; stat: Stat }; state: BeginnerState; onReveal: () => void }) {
  const player = state.players.find((item) => item.id === choice.playerId)!;
  return <section className="chooser npcChoicePanel"><p className="kicker">TRAIT SELECTED</p><h2>{INFO[player.factionId].name} chose <b>{choice.stat}</b></h2><p>Take a moment to note the chosen trait. No cards have been revealed.</p><button onClick={onReveal}>Reveal Cards</button></section>;
}

function CardDetail({ card, onClose }: { card: Card; onClose: () => void }) {
  return <div className="modalShade" role="presentation" onMouseDown={onClose}><section className="modal cardDetail" role="dialog" aria-modal="true" aria-labelledby="card-detail-title" onMouseDown={(event) => event.stopPropagation()}><button className="modalClose" aria-label="Close card" onClick={onClose}>×</button><img src={artwork(card)} alt={`${card.name} card artwork`} /><div><p className="kicker">REVEALED CARD</p><h2 id="card-detail-title">{card.name}</h2><p>The card image shows the original printed design. The values below come from the spreadsheet and govern play.</p><div className="detailStats">{STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat}</span>)}</div><small>Special-effect text is not active in this core prototype.</small></div></section></div>;
}

function Help({ onClose }: { onClose: () => void }) {
  return <div className="modalShade" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onMouseDown={(e) => e.stopPropagation()}><button className="modalClose" aria-label="Close rules" onClick={onClose}>×</button><p className="kicker">CORE RULES</p><h2 id="rules-title">How to play</h2><ol><li>Each army begins with five hidden cards in a fixed order.</li><li>The selector chooses strength, zeal, or wealth before hidden cards are revealed.</li><li>Every active army plays its next card. The highest statistic wins.</li><li>The winner keeps its card in play. Lower cards are discarded.</li><li>After a tie, the original selector chooses any trait—including the one just used—and tied armies play their next card.</li><li>The last army with cards remaining wins.</li></ol><p className="note">Nile Floods, if enabled, adds a six-sided die roll to every score. Special card effects are not used in this prototype.</p></section></div>;
}
