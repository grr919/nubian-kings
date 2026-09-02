"use client";

import { useEffect, useMemo, useState } from "react";
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
  type AmateurPlayer,
  type AmateurState,
  type AmateurVictoryMode,
  type PreparedAmateurGame,
} from "@/game/amateur";
import { AMATEUR_SAVE_KEY, parseAmateurGame, serializeAmateurGame } from "@/game/amateur-save";
import { FACTIONS } from "@/game/setup";
import type { Stat } from "@/game/types";

const STATS: Stat[] = ["strength", "zeal", "wealth"];
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
  badge,
  onClick,
}: {
  card: AmateurCard;
  visible?: boolean;
  selected?: boolean;
  enabled?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  const image = artwork(card);
  return (
    <button
      type="button"
      className={`card amateurCard ${visible ? "face" : "back"} ${selected ? "selectedCard" : ""} ${enabled ? "selectableCard" : ""}`}
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
    </button>
  );
}

function eventText(event: AmateurEvent, state: AmateurState) {
  const playerId = "playerId" in event ? event.playerId : undefined;
  const player = playerId ? state.players.find((candidate) => candidate.id === playerId) : undefined;
  const who = player ? (player.controller === "human" ? "You" : INFO[player.factionId].name) : "A player";
  if (event.type === "tie") return "The attack ended in a tie. Neither card was defeated.";
  if (event.type === "defeated") return `${who}'s ${event.heir ? "heir" : "card"} was defeated.`;
  if (event.type === "replenishment-available") return `${who} may replenish the army.`;
  if (event.type === "replenished") return event.source === "discard" ? `${who} restored a discarded card.` : `${who} drew a hidden card from the unused deck.`;
  if (event.type === "replenishment-skipped") return `${who} declined replenishment.`;
  if (event.type === "player-eliminated") return `${who}'s heir was eliminated.`;
  if (event.type === "turn-advanced") return `${who} begins the next turn.`;
  if (event.type === "game-won") return `${who} won the game.`;
  return "";
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
  const [selectedStat, setSelectedStat] = useState<Stat>();
  const [attackerId, setAttackerId] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => setHasSave(Boolean(parseAmateurGame(localStorage.getItem(AMATEUR_SAVE_KEY) ?? ""))), []);

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
    persist(next);
    setState(next);
    setPrepared(undefined);
    setHistory(["Ten hidden cards form each army. The heirs stand ready behind them."]);
    setScreen("game");
  }

  function continueGame() {
    const saved = parseAmateurGame(localStorage.getItem(AMATEUR_SAVE_KEY) ?? "");
    if (!saved) return;
    setState(saved);
    setHistory(["Amateur game restored."]);
    setScreen("game");
  }

  function addEvents(events: AmateurEvent[], next: AmateurState) {
    const lines = events.map((event) => eventText(event, next)).filter(Boolean);
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
    if (!state || review || state.phase !== "attack" || activePlayer(state).controller !== "npc") return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const actionState = structuredClone(state);
      const action = chooseNpcAttack(actionState);
      setThinking(false);
      attack(action.targetPlayerId, action.targetId, { attackerId: action.attackerId, stat: action.stat });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, review]);

  useEffect(() => {
    if (!state || review || state.phase !== "replenish") return;
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
  }, [state, review]);

  const setupChoices = useMemo(() => prepared ? heirChoices(prepared) : [], [prepared]);

  if (screen === "home") return (
    <main className="landing amateurLanding">
      <section className="panel titlePanel">
        <p className="kicker">THE CATHEDRAL AT QASR IBRIM</p>
        <div className="royalMark">♜</div>
        <h1>Amateur Game</h1>
        <p className="subtitle">Protected heirs and targeted attacks</p>
        <p>Command a ten-card army, expose an enemy heir, and eliminate it before your own falls.</p>
        <div className="actions">
          <button onClick={() => setScreen("setup")}>New Amateur Game</button>
          <button className="secondary" disabled={!hasSave} onClick={continueGame}>Continue Amateur Game</button>
        </div>
        <div className="routeLinks"><a href="/">Beginner Game</a><button className="textButton" onClick={() => setHelp(true)}>Amateur Rules</button></div>
        <small>Core profile · Special card effects are not used</small>
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
        <p className="lede">Each faction receives ten hidden army cards and deliberately chooses a Leader as heir.</p>
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
        <p className="lede">Your ten-card army has been dealt. Choose one remaining Leader to stand face up behind it.</p>
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
  const allowedAttackers = new Set(humanTurn && selectedStat ? legalAttackers(state).map((card) => card.id) : []);

  return (
    <main className="gamePage amateurGame">
      <header className="gameHeader">
        <div><span className="miniMark">♜</span><b>Nubian Kings</b><small>Amateur · Turn {state.round} · {state.victoryMode === "standard" ? "First heir" : "Last heir"} victory</small></div>
        <div className="toolbar"><button className="iconButton" onClick={() => navigator.clipboard?.writeText(state.random.seed)}>Copy Seed</button><button className="iconButton" onClick={() => setHelp(true)}>Rules</button><a className="iconButton linkButton" href="/amateur">Leave</a></div>
      </header>
      <section className="statusBar">
        <span className={`turnDot ${thinking ? "thinking" : ""}`} />
        <div>
          <b>{review ? "Review the attack" : state.phase === "complete" ? "Game complete" : thinking ? `${INFO[active.factionId].name} are deciding…` : state.phase === "replenish" ? `${pending?.controller === "human" ? "You may" : INFO[pending!.factionId].name + " may"} replenish` : humanTurn ? !selectedStat ? "Choose a statistic" : !attackerId ? "Choose your attacker" : "Choose an enemy target" : `${INFO[active.factionId].name}'s turn`}</b>
          <small>{humanTurn ? "Your heir may attack even while protected. Enemy heirs are protected until their armies are empty." : "Every army position may be targeted."}</small>
        </div>
      </section>

      {review ? <AmateurReviewPanel review={review} state={state} onContinue={() => setReview(undefined)} /> : (
        <section className="amateurBoard">
          <AmateurPlayerArea player={human} active={active.id === human.id} attackerId={attackerId} allowedAttackers={allowedAttackers} targetIds={new Set()} onCard={(id) => setAttackerId(id)} />
          <div className="amateurOpponents">{state.players.filter((player) => player.controller === "npc").map((player) => {
            const targets = humanTurn && attackerId && selectedStat ? new Set(legalTargets(state, player.id).map((card) => card.id)) : new Set<string>();
            return <AmateurPlayerArea key={player.id} player={player} active={active.id === player.id} allowedAttackers={new Set()} targetIds={targets} onCard={(id) => attack(player.id, id)} />;
          })}</div>
        </section>
      )}

      {!review && humanTurn && (
        <section className="chooser amateurChooser">
          <p>{!selectedStat ? "Which statistic will decide the attack?" : !attackerId ? "Now choose one of your army cards—or your heir—to attack." : "Now select any enemy army card. An exposed heir may also be selected."}</p>
          <div>{STATS.map((stat) => <button key={stat} className={selectedStat === stat ? "chosenStat" : ""} onClick={() => { setSelectedStat(stat); setAttackerId(undefined); }}><span>{stat === "strength" ? "⚔" : stat === "zeal" ? "✦" : "◆"}</span>{stat}</button>)}</div>
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

      {winner && !review && <section className="victory"><span>♜</span><p className="kicker">VICTORY</p><h2>{winner.controller === "human" ? "You eliminated the decisive heir" : `${INFO[winner.factionId].name} are victorious`}</h2><a className="buttonLink" href="/amateur">Play Again</a></section>}
      <aside className="history"><h2>Game record</h2>{history.length ? <ol>{history.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol> : <p>No attacks yet.</p>}</aside>
      {help && <AmateurHelp onClose={() => setHelp(false)} />}
    </main>
  );
}

function AmateurPlayerArea({
  player,
  active,
  attackerId,
  allowedAttackers,
  targetIds,
  onCard,
}: {
  player: AmateurPlayer;
  active: boolean;
  attackerId?: string;
  allowedAttackers: Set<string>;
  targetIds: Set<string>;
  onCard: (id: string) => void;
}) {
  const enabled = (id: string) => allowedAttackers.has(id) || targetIds.has(id);
  return (
    <section className={`playerArea amateurPlayer faction-${player.factionId} ${player.controller === "human" ? "humanArea" : "npcArea"} ${player.eliminated ? "eliminated" : ""}`}>
      <header><span className="sigil small">{INFO[player.factionId].mark}</span><div><h2>{label(player)}</h2><small>{player.eliminated ? "Heir eliminated" : `${player.army.length} army · ${player.discard.length} discarded · ${player.unused.length} unused`}</small></div>{active && !player.eliminated && <span className="selectorBadge">Active</span>}</header>
      <div className="heirRow"><span>Heir</span><AmateurCardView card={player.heir} visible selected={attackerId === player.heir.id} enabled={enabled(player.heir.id)} badge={player.eliminated ? "Eliminated" : "Heir"} onClick={() => onCard(player.heir.id)} /></div>
      <div className="amateurArmy">{player.army.map((card, index) => <AmateurCardView key={card.id} card={card} selected={attackerId === card.id} enabled={enabled(card.id)} badge={`#${index + 1}`} onClick={() => onCard(card.id)} />)}</div>
      {player.discard.length > 0 && <details className="discardViewer"><summary>View discard pile ({player.discard.length})</summary><div>{player.discard.map((card) => <AmateurCardView key={card.id} card={card} visible />)}</div></details>}
    </section>
  );
}

function AmateurReviewPanel({ review, state, onContinue }: { review: AmateurReview; state: AmateurState; onContinue: () => void }) {
  const attackerPlayer = state.players.find((player) => player.id === review.attackerPlayerId)!;
  const targetPlayer = state.players.find((player) => player.id === review.targetPlayerId)!;
  const high = Math.max(...review.scores.map((score) => score.total));
  return (
    <section className="comparisonStage amateurReview" aria-live="polite">
      <header><p className="kicker">{review.stat} attack</p><h2>{review.tie ? "The attack is tied" : "The attack is resolved"}</h2></header>
      <div className="comparisonCards">{[
        { player: attackerPlayer, card: review.attacker, role: "Attacker" },
        { player: targetPlayer, card: review.target, role: "Target" },
      ].map(({ player, card, role }) => {
        const score = review.scores.find((entry) => entry.cardId === card.id)!;
        const result = review.tie ? "Tied" : score.total === high ? "Winner" : "Defeated";
        return <article key={card.id} className={`comparisonCard result-${result.toLowerCase()}`}><div className="comparisonOwner"><b>{role} · {player.controller === "human" ? "You" : INFO[player.factionId].name}</b></div><AmateurCardView card={card} visible badge={card.type === "leader" ? "Heir" : undefined} /><div className="comparisonScore"><span>{result}</span><b>{score.total}</b><small>{score.base}{score.die ? ` + d6 ${score.die}` : ""}</small></div></article>;
      })}</div>
      <button className="reviewContinue" onClick={onContinue}>Continue</button>
    </section>
  );
}

function AmateurHelp({ onClose }: { onClose: () => void }) {
  return <div className="modalShade" role="dialog" aria-modal="true"><section className="modal"><button className="modalClose" onClick={onClose}>×</button><p className="kicker">THE CATHEDRAL AT QASR IBRIM</p><h2>Amateur Rules</h2><ol><li>Each player begins with ten hidden army cards and one face-up Leader heir.</li><li>On your turn, choose a statistic, one attacker, an opponent, and any card in that opponent’s army.</li><li>Your heir may attack at any time. An enemy heir cannot be targeted until its army is empty.</li><li>Reveal the two cards. The lower score is discarded; on a tie, both remain face up.</li><li>After a non-tied win, the winning card’s owner may add one face-down card from their public discard pile or hidden unused deck, provided their army has fewer than ten cards.</li><li>If an attacking heir loses, it is eliminated immediately.</li><li>Standard play ends when the first heir is eliminated. Long play continues until only one heir remains.</li></ol><p className="note">Printed special effects are not used in this Core prototype.</p></section></div>;
}
