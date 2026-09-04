"use client";

import { useEffect, useMemo, useState } from "react";
import EparchCrownMark from "@/components/EparchCrownMark";
import EliminatedGamePrompt from "@/components/EliminatedGamePrompt";
import FeedbackButton from "@/components/FeedbackButton";
import cardData from "@/data/cards.json";
import {
  activePlayer,
  chooseNpcAttack,
  heirChoices,
  legalAttackers,
  legalTargets,
  prepareAmateurGame,
  replenishFromDiscard,
  replenishFromUnused,
  resolveAmateurAttack,
  resolveNpcReplenishment,
  skipReplenishment,
  startPreparedAmateurGame,
  type AmateurCard,
  type AmateurEvent,
  type AmateurAttack,
  type AmateurPlayer,
  type AmateurState,
  type AmateurVictoryMode,
  type PreparedAmateurGame,
} from "@/game/amateur";
import { AMATEUR_SAVE_KEY, parseAmateurGame, serializeAmateurGame } from "@/game/amateur-save";
import { humanMayEndEliminatedGame } from "@/game/elimination";
import { amateurEventText, battleTitle, roundOutcomeText } from "@/game/player-language";
import { FACTIONS } from "@/game/setup";
import type { Stat } from "@/game/types";

const STATS: Stat[] = ["strength", "zeal", "wealth"];
const AMATEUR_NPC_ATTACK_KEY = "nubian-kings:amateur-npc-attack:v1";
const ART_BASE_URL = "https://nubian-kings-qtsa6vhio-grr919-6387s-projects.vercel.app";
const ART_BY_ID = Object.fromEntries(cardData.cards.flatMap((card) => card.assets[0] ? [[card.id, card.assets[0].filename]] : []));
const INFO: Record<string, { name: string; mark: string }> = {
  "nubian-christians": { name: "Nubian Christians", mark: "NC" },
  "egyptian-christians": { name: "Egyptian Christians", mark: "EC" },
  "ethiopian-christians": { name: "Ethiopian Christians", mark: "XC" },
  "egyptian-muslims": { name: "Egyptian Muslims", mark: "EM" },
  "ethiopian-jews": { name: "Ethiopian Jews", mark: "EJ" },
};

interface AmateurReview {
  stat: Stat;
  attacker: AmateurCard;
  target: AmateurCard;
  attackerPlayerId: string;
  targetPlayerId: string;
  scores: Array<{ playerId: string; cardId: string; base: number; die: number; total: number }>;
  tie: boolean;
}

function label(player: AmateurPlayer) {
  return player.controller === "human" ? `You · ${INFO[player.factionId].name}` : INFO[player.factionId].name;
}

function artwork(card: AmateurCard) {
  const filename = ART_BY_ID[card.definitionId];
  return filename ? `${ART_BASE_URL}/cards/${encodeURIComponent(filename)}` : undefined;
}

function AmateurCardView({
  card,
  visible = card.face === "up",
  selected = false,
  enabled = false,
  defeated = false,
  badge,
  onClick,
}: {
  card: AmateurCard;
  visible?: boolean;
  selected?: boolean;
  enabled?: boolean;
  defeated?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  const image = artwork(card);
  return (
    <button
      type="button"
      className={`card amateurCard ${visible ? "face" : "back"} ${defeated ? "reviewDefeated" : ""} ${selected ? "selectedCard" : ""} ${enabled ? "selectableCard" : ""}`}
      disabled={!enabled}
      onClick={onClick}
      aria-label={enabled ? `Select ${visible ? card.name : "hidden card"}` : undefined}
    >
      {badge && <span className="amateurBadge">{badge}</span>}
      {visible && image ? (
        <>
          <img className="cardArtwork" src={image} alt="" />
          <div className="authoritativeStats">{STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat[0].toUpperCase()}</span>)}</div>
        </>
      ) : visible ? (
        <>
          <h3>{card.name}</h3>
          <div className="cardStats">{STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat}</span>)}</div>
        </>
      ) : (
        <><div className="backOrnament">NK</div><span>Hidden</span></>
      )}
      {defeated && <span className="outcomeMark">Defeated</span>}
    </button>
  );
}

export default function AmateurClient() {
  const [screen, setScreen] = useState<"home" | "setup" | "heir" | "game">("home");
  const [state, setState] = useState<AmateurState>();
  const [prepared, setPrepared] = useState<PreparedAmateurGame>();
  const [faction, setFaction] = useState<(typeof FACTIONS)[number]>(FACTIONS[0]);
  const [npcCount, setNpcCount] = useState<number | "random">("random");
  const [openingPlayer, setOpeningPlayer] = useState<"random" | "human" | "npc">("random");
  const [victoryMode, setVictoryMode] = useState<AmateurVictoryMode>("standard");
  const [seed, setSeed] = useState("");
  const [floods, setFloods] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [help, setHelp] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [review, setReview] = useState<AmateurReview>();
  const [npcAttack, setNpcAttack] = useState<AmateurAttack>();
  const [selectedStat, setSelectedStat] = useState<Stat>();
  const [attackerId, setAttackerId] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);
  const [watchAfterElimination, setWatchAfterElimination] = useState(false);
  const eliminationPending = humanMayEndEliminatedGame(state) && !watchAfterElimination;

  useEffect(() => setHasSave(Boolean(parseAmateurGame(localStorage.getItem(AMATEUR_SAVE_KEY) ?? ""))), []);

  useEffect(() => {
    if (review) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [review]);

  function persist(next: AmateurState) {
    localStorage.setItem(AMATEUR_SAVE_KEY, serializeAmateurGame(next));
    setHasSave(true);
  }

  function assemble() {
    const next = prepareAmateurGame({
      humanFaction: faction,
      npcCount: npcCount === "random" ? undefined : npcCount,
      nileFloods: floods,
      victoryMode,
      openingPlayer,
      seed: seed || undefined,
    });
    setSeed(next.random.seed);
    setPrepared(next);
    setScreen("heir");
  }

  function chooseHeir(id: string) {
    if (!prepared) return;
    const next = startPreparedAmateurGame(prepared, id);
    localStorage.removeItem(AMATEUR_NPC_ATTACK_KEY);
    persist(next);
    setState(next);
    setWatchAfterElimination(false);
    setPrepared(undefined);
    setHistory(["Ten hidden cards form each army. The heirs stand ready behind them."]);
    setScreen("game");
  }

  function continueGame() {
    const saved = parseAmateurGame(localStorage.getItem(AMATEUR_SAVE_KEY) ?? "");
    if (!saved) return;
    try {
      const pending = JSON.parse(localStorage.getItem(AMATEUR_NPC_ATTACK_KEY) ?? "null");
      if (pending && typeof pending.attackerId === "string" && typeof pending.targetPlayerId === "string" && typeof pending.targetId === "string" && STATS.includes(pending.stat)) setNpcAttack(pending);
    } catch {
      localStorage.removeItem(AMATEUR_NPC_ATTACK_KEY);
    }
    setState(saved);
    setWatchAfterElimination(false);
    setHistory(["Amateur game restored."]);
    setScreen("game");
  }

  function addEvents(events: AmateurEvent[], next: AmateurState) {
    const lines = events.map((event) => amateurEventText(event, next)).filter(Boolean);
    setHistory((prior) => [...lines.reverse(), ...prior].slice(0, 24));
  }

  function locate(game: AmateurState, playerId: string, cardId: string) {
    const player = game.players.find((candidate) => candidate.id === playerId)!;
    return player.heir.id === cardId ? player.heir : player.army.find((card) => card.id === cardId)!;
  }

  function attack(targetPlayerId: string, targetId: string, forced?: { attackerId: string; stat: Stat }) {
    if (!state) return;
    const currentAttackerId = forced?.attackerId ?? attackerId;
    const stat = forced?.stat ?? selectedStat;
    if (!currentAttackerId || !stat) return;
    localStorage.removeItem(AMATEUR_NPC_ATTACK_KEY);
    setNpcAttack(undefined);
    const beforeAttacker = structuredClone(locate(state, activePlayer(state).id, currentAttackerId));
    const beforeTarget = structuredClone(locate(state, targetPlayerId, targetId));
    beforeAttacker.face = "up";
    beforeTarget.face = "up";
    const next = structuredClone(state);
    const attackerPlayerId = activePlayer(next).id;
    const events = resolveAmateurAttack(next, { attackerId: currentAttackerId, targetPlayerId, targetId, stat });
    const scores = events
      .filter((event): event is Extract<AmateurEvent, { type: "score" }> => event.type === "score")
      .map(({ playerId, cardId, base, die, total }) => ({ playerId, cardId, base, die, total }));
    setReview({
      stat,
      attacker: beforeAttacker,
      target: beforeTarget,
      attackerPlayerId,
      targetPlayerId,
      scores,
      tie: events.some((event) => event.type === "tie"),
    });
    setSelectedStat(undefined);
    setAttackerId(undefined);
    persist(next);
    setState(next);
    addEvents(events, next);
  }

  function applyReplenishment(kind: "unused" | "discard" | "skip", cardId?: string) {
    if (!state) return;
    const next = structuredClone(state);
    const events = kind === "unused"
      ? replenishFromUnused(next)
      : kind === "discard"
        ? replenishFromDiscard(next, cardId!)
        : skipReplenishment(next);
    persist(next);
    setState(next);
    addEvents(events, next);
  }

  useEffect(() => {
    if (!state || review || npcAttack || eliminationPending || state.phase !== "attack" || activePlayer(state).controller !== "npc") return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const actionState = structuredClone(state);
      const action = chooseNpcAttack(actionState);
      persist(actionState);
      setState(actionState);
      localStorage.setItem(AMATEUR_NPC_ATTACK_KEY, JSON.stringify(action));
      setNpcAttack(action);
      setThinking(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, review, npcAttack, eliminationPending]);

  useEffect(() => {
    if (!state || review || eliminationPending || state.phase !== "replenish") return;
    const pending = state.players.find((player) => player.id === state.pendingReplenishmentPlayerId);
    if (pending?.controller !== "npc") return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const next = structuredClone(state);
      const events = resolveNpcReplenishment(next);
      persist(next);
      setState(next);
      addEvents(events, next);
      setThinking(false);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, review, eliminationPending]);

  function endEliminatedGame() {
    localStorage.removeItem(AMATEUR_SAVE_KEY);
    localStorage.removeItem(AMATEUR_NPC_ATTACK_KEY);
    setHasSave(false);
    setState(undefined);
    setReview(undefined);
    setNpcAttack(undefined);
    setSelectedStat(undefined);
    setAttackerId(undefined);
    setThinking(false);
    setWatchAfterElimination(false);
    setHistory([]);
    setScreen("home");
  }

  const setupChoices = useMemo(() => prepared ? heirChoices(prepared) : [], [prepared]);

  if (screen === "home") return (
    <main className="landing amateurLanding">
      <section className="panel titlePanel">
        <p className="kicker">AMATEUR LEVEL: THE CATHEDRAL AT QASR IBRIM</p>
        <EparchCrownMark className="royalMark" />
        <h1>Nubian Kings</h1>
        <p className="subtitle">Protected heirs and targeted attacks</p>
        <p>Command a ten-card army, expose an enemy heir, and eliminate it before your own falls.</p>
        <div className="actions">
          <button onClick={() => setScreen("setup")}>New Amateur Game</button>
          <button className="secondary" disabled={!hasSave} onClick={continueGame}>Continue Amateur Game</button>
          <a className="buttonLink" href="/amateur/multiplayer">Multiplayer</a>
        </div>
        <div className="routeLinks landingLinks"><button className="textButton" onClick={() => setHelp(true)}>Amateur Rules</button><a className="landingBack" href="/">Return to Main</a></div>
        <small>Core profile · Special card effects are not used</small>
        <footer className="landingFooter">© 2026 Nile South Games</footer>
      </section>
      {help && <AmateurHelp onClose={() => setHelp(false)} />}
    </main>
  );

  if (screen === "setup") return (
    <main className="setupPage">
      <section className="setupPanel">
        <button className="backButton" onClick={() => setScreen("home")}>← Back</button>
        <p className="kicker">AMATEUR GAME</p>
        <h1>Assemble your army</h1>
        <p className="lede">Each faction receives ten hidden non-Leader army cards and deliberately chooses any Leader as heir.</p>
        <h2>Choose a faction</h2>
        <div className="factionGrid">{FACTIONS.map((id) => (
          <button key={id} className={`faction faction-${id} ${faction === id ? "selected" : ""}`} onClick={() => setFaction(id)}>
            <span className="sigil">{INFO[id].mark}</span><span>{INFO[id].name}</span>{faction === id && <b>Selected</b>}
          </button>
        ))}</div>
        <div className="settings">
          <label><span>Computer opponents</span><select value={npcCount} onChange={(event) => setNpcCount(event.target.value === "random" ? "random" : Number(event.target.value))}><option value="random">Random (1–4)</option>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
          <label><span>Opening initiative</span><select value={openingPlayer} onChange={(event) => setOpeningPlayer(event.target.value as "random" | "human" | "npc")}><option value="random">Random participant</option><option value="human">You</option><option value="npc">Computer opponent</option></select></label>
          <label><span>Victory rule</span><select value={victoryMode} onChange={(event) => setVictoryMode(event.target.value as AmateurVictoryMode)}><option value="standard">First heir eliminated</option><option value="long">Last heir standing</option></select></label>
          <label className="toggle"><input type="checkbox" checked={floods} onChange={(event) => setFloods(event.target.checked)} /><span><b>Nile Floods</b><small>Add one d6 to each competing card.</small></span></label>
          <label className="seedSetting"><span><b>Game seed</b><small>Use identical settings and a seed to reproduce setup.</small></span><input value={seed} maxLength={48} placeholder="Generated automatically" onChange={(event) => setSeed(event.target.value)} /></label>
        </div>
        <button className="beginButton" onClick={assemble}>Deal Armies</button>
      </section>
    </main>
  );

  if (screen === "heir" && prepared) return (
    <main className="setupPage">
      <section className="setupPanel heirSetup">
        <button className="backButton" onClick={() => { setPrepared(undefined); setScreen("setup"); }}>← Back</button>
        <p className="kicker">CHOOSE YOUR HEIR</p>
        <h1>Select a Leader</h1>
        <p className="lede">All Leaders were reserved from the initial deal. Choose one to stand face up behind your ten-card army.</p>
        <div className="heirChoices">{setupChoices.map((card) => (
          <div key={card.id}>
            <AmateurCardView card={card} visible enabled onClick={() => chooseHeir(card.id)} />
            <b>{card.name}</b>
          </div>
        ))}</div>
        <small>Computer factions choose their own heirs.</small>
      </section>
    </main>
  );

  if (!state) return null;
  const active = activePlayer(state);
  const human = state.players.find((player) => player.controller === "human")!;
  const humanTurn = active.controller === "human" && state.phase === "attack";
  const pending = state.players.find((player) => player.id === state.pendingReplenishmentPlayerId);
  const winner = state.players.find((player) => player.id === state.winnerId);
  const feedbackDiagnostics = { level: "Amateur" as const, seed: state.random.seed, round: state.round, phase: state.phase, humanFaction: INFO[human.factionId].name, npcCount: state.players.filter((player) => player.controller === "npc").length, nileFloods: state.nileFloods, victoryMode: state.victoryMode, recentHistory: history.slice(0, 10) };
  const allowedAttackers = new Set(humanTurn && selectedStat ? legalAttackers(state).map((card) => card.id) : []);

  return (
    <main className="gamePage amateurGame">
      <header className="gameHeader"><div><EparchCrownMark className="miniMark" /><b>Nubian Kings</b></div></header>
      <section className="statusBar">
        <span className={`turnDot ${thinking ? "thinking" : ""}`} />
        <div>
          <b>{review ? "Review the attack" : npcAttack ? `${INFO[active.factionId].name} have declared an attack` : state.phase === "complete" ? "Game complete" : thinking ? `${INFO[active.factionId].name} are deciding…` : state.phase === "replenish" ? `${pending?.controller === "human" ? "You may" : INFO[pending!.factionId].name + " may"} replenish` : humanTurn ? !selectedStat ? "Choose a statistic" : !attackerId ? "Choose your attacker" : "Choose an enemy target" : `${INFO[active.factionId].name}'s turn`}</b>
          <small>{npcAttack ? "The selected cards remain hidden until you resolve the attack." : humanTurn ? "An heir may attack only after its army is empty. Enemy heirs are protected by the same rule." : "Every army position may be targeted."}</small>
        </div>
      </section>

      {review ? <AmateurReviewPanel review={review} state={state} onContinue={() => setReview(undefined)} /> : (
        <section className="amateurBoard">
          <AmateurPlayerArea player={human} active={active.id === human.id} attackerId={attackerId} highlightIds={new Set(npcAttack?.targetPlayerId === human.id ? [npcAttack.targetId] : [])} allowedAttackers={allowedAttackers} targetIds={new Set()} onCard={(id) => setAttackerId(id)} />
          <div className="amateurOpponents">{state.players.filter((player) => player.controller === "npc").map((player) => {
            const targets = humanTurn && attackerId && selectedStat ? new Set(legalTargets(state, player.id).map((card) => card.id)) : new Set<string>();
            const highlights = new Set<string>();
            if (npcAttack && active.id === player.id) highlights.add(npcAttack.attackerId);
            if (npcAttack?.targetPlayerId === player.id) highlights.add(npcAttack.targetId);
            return <AmateurPlayerArea key={player.id} player={player} active={active.id === player.id} highlightIds={highlights} allowedAttackers={new Set()} targetIds={targets} onCard={(id) => attack(player.id, id)} />;
          })}</div>
        </section>
      )}

      {!review && humanTurn && (
        <section className="chooser amateurChooser">
          <p>{!selectedStat ? "Which statistic will decide the attack?" : !attackerId ? human.army.length ? "Now choose one of your army cards to attack." : "Your heir is your last card. Choose it to attack." : "Now select any enemy army card. An exposed heir may also be selected."}</p>
          <div>{STATS.map((stat) => <button key={stat} className={selectedStat === stat ? "chosenStat" : ""} onClick={() => { setSelectedStat(stat); setAttackerId(undefined); }}><span>{stat === "strength" ? "⚔" : stat === "zeal" ? "✦" : "◆"}</span>{stat}</button>)}</div>
        </section>
      )}

      {!review && npcAttack && (
        <section className="chooser npcChoicePanel" aria-live="polite">
          <p className="kicker">ATTACK DECLARED</p>
          <h2>{INFO[active.factionId].name} attack {state.players.find((player) => player.id === npcAttack.targetPlayerId)?.controller === "human" ? "you" : INFO[state.players.find((player) => player.id === npcAttack.targetPlayerId)!.factionId].name} using <b>{npcAttack.stat}</b></h2>
          <p>The attacker and target are highlighted. Their cards remain hidden until you are ready.</p>
          <button onClick={() => attack(npcAttack.targetPlayerId, npcAttack.targetId, { attackerId: npcAttack.attackerId, stat: npcAttack.stat })}>Resolve Attack</button>
        </section>
      )}

      {!review && state.phase === "replenish" && pending?.controller === "human" && (
        <section className="chooser replenishmentPanel">
          <div className="replenishmentHeading"><div><p className="kicker">VICTORIOUS PLAYER</p><b>Replenish your army?</b></div><button onClick={() => applyReplenishment("skip")}>Skip</button></div>
          <div className="replenishmentChoices">
            {pending.unused.length > 0 && <button onClick={() => applyReplenishment("unused")}><b>Draw hidden card</b><small>{pending.unused.length} cards remain unused</small></button>}
            {pending.discard.map((card) => <button key={card.id} onClick={() => applyReplenishment("discard", card.id)}><b>Restore {card.name}</b><small>{card.strength} Strength · {card.zeal} Zeal · {card.wealth} Wealth</small></button>)}
          </div>
        </section>
      )}

      {winner && !review && <section className="victory"><EparchCrownMark /><p className="kicker">VICTORY</p><h2>{winner.controller === "human" ? "You eliminated the decisive heir" : `${INFO[winner.factionId].name} are victorious`}</h2><a className="buttonLink" href="/amateur">Play Again</a></section>}
      {eliminationPending && !review && <EliminatedGamePrompt onContinue={() => setWatchAfterElimination(true)} onEnd={endEliminatedGame} />}
      <aside className="history"><h2>Game record</h2><small style={{display:"block",color:"var(--muted)",marginTop:-6,marginBottom:12}}>Amateur · Round {state.round} · Seed {state.random.seed}</small>{history.length ? <ol>{history.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol> : <p>No attacks yet.</p>}<div className="toolbar" style={{justifyContent:"flex-start",flexWrap:"nowrap",overflowX:"auto",marginTop:16}}><button className="iconButton" onClick={() => navigator.clipboard?.writeText(state.random.seed)}>Copy Seed</button><button className="iconButton" onClick={() => setHelp(true)}>Rules</button><FeedbackButton diagnostics={feedbackDiagnostics} /><a className="iconButton linkButton" href="/amateur">Leave</a></div></aside>
      {help && <AmateurHelp onClose={() => setHelp(false)} />}
    </main>
  );
}

function AmateurPlayerArea({
  player,
  active,
  attackerId,
  highlightIds = new Set<string>(),
  allowedAttackers,
  targetIds,
  onCard,
}: {
  player: AmateurPlayer;
  active: boolean;
  attackerId?: string;
  highlightIds?: Set<string>;
  allowedAttackers: Set<string>;
  targetIds: Set<string>;
  onCard: (id: string) => void;
}) {
  const enabled = (id: string) => allowedAttackers.has(id) || targetIds.has(id);
  return (
    <section className={`playerArea amateurPlayer faction-${player.factionId} ${player.controller === "human" ? "humanArea" : "npcArea"} ${player.eliminated ? "eliminated" : ""}`}>
      <header><span className="sigil small">{INFO[player.factionId].mark}</span><div><h2>{label(player)}</h2><small>{player.eliminated ? "Heir eliminated" : `${player.army.length} army · ${player.discard.length} discarded · ${player.unused.length} unused`}</small></div>{active && !player.eliminated && <span className="selectorBadge">Active</span>}</header>
      <div className="heirRow"><span>Heir</span><AmateurCardView card={player.heir} visible selected={attackerId === player.heir.id || highlightIds.has(player.heir.id)} enabled={enabled(player.heir.id)} badge={player.eliminated ? "Eliminated" : undefined} onClick={() => onCard(player.heir.id)} /></div>
      <div className="amateurArmy">{player.army.map((card, index) => <AmateurCardView key={card.id} card={card} selected={attackerId === card.id || highlightIds.has(card.id)} enabled={enabled(card.id)} badge={`#${index + 1}`} onClick={() => onCard(card.id)} />)}</div>
      {player.discard.length > 0 && <details className="discardViewer"><summary>View discard pile ({player.discard.length})</summary><div>{player.discard.map((card) => <AmateurCardView key={card.id} card={card} visible />)}</div></details>}
    </section>
  );
}

function AmateurReviewPanel({ review, state, onContinue }: { review: AmateurReview; state: AmateurState; onContinue: () => void }) {
  const attackerPlayer = state.players.find((player) => player.id === review.attackerPlayerId)!;
  const targetPlayer = state.players.find((player) => player.id === review.targetPlayerId)!;
  const high = Math.max(...review.scores.map((score) => score.total));
  const winnerId = review.tie ? undefined : review.scores.find((score) => score.total === high)?.playerId;
  const headline = roundOutcomeText(state.players, winnerId, [review.attackerPlayerId, review.targetPlayerId], review.stat, review.tie);
  return (
    <section className="comparisonStage amateurReview" aria-live="polite">
      <header><p className="kicker">{battleTitle(review.stat)}</p><h2>{headline}</h2></header>
      <div className="comparisonCards">{[
        { player: attackerPlayer, card: review.attacker, role: "Attacker" },
        { player: targetPlayer, card: review.target, role: "Target" },
      ].map(({ player, card, role }) => {
        const score = review.scores.find((entry) => entry.cardId === card.id)!;
        const result = review.tie ? "Tied" : score.total === high ? "Winner" : "Defeated";
        return <article key={card.id} className={`comparisonCard result-${result.toLowerCase()}`}><div className="comparisonOwner"><b>{role} · {player.controller === "human" ? "You" : INFO[player.factionId].name}</b></div><AmateurCardView card={card} visible defeated={result === "Defeated"} /><div className="comparisonScore"><span>{result}</span><b>{score.total}</b><small>{score.base}{score.die ? ` + d6 ${score.die}` : ""}</small></div></article>;
      })}</div>
      <button className="reviewContinue" onClick={onContinue}>Continue</button>
    </section>
  );
}

function AmateurHelp({ onClose }: { onClose: () => void }) {
  return <div className="modalShade" role="dialog" aria-modal="true"><section className="modal"><button className="modalClose" onClick={onClose}>×</button><p className="kicker">THE CATHEDRAL AT QASR IBRIM</p><h2>Amateur Rules</h2><ol><li>Every Leader is reserved from the initial deal. Each player begins with ten hidden non-Leader army cards and chooses one face-up Leader heir.</li><li>On your turn, choose a statistic, one attacker, an opponent, and any card in that opponent’s army.</li><li>Your heir cannot attack until your army is empty. An enemy heir cannot be targeted until its army is empty.</li><li>Reveal the two cards. The lower score is discarded; on a tie, both remain face up.</li><li>After a non-tied win, the winning card’s owner may add one face-down card from their public discard pile or hidden unused deck, provided their army has fewer than ten cards.</li><li>If an attacking heir loses, it is eliminated immediately.</li><li>Standard play ends when the first heir is eliminated. Long play continues until only one heir remains.</li></ol><p className="note">Printed special effects are not used in this Core prototype.</p></section></div>;
}
