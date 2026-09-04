"use client";

import { useEffect, useMemo, useState } from "react";
import EparchCrownMark from "@/components/EparchCrownMark";
import EliminatedGamePrompt from "@/components/EliminatedGamePrompt";
import FeedbackButton from "@/components/FeedbackButton";
import cardData from "@/data/cards.json";
import {
  activeMasterPlayer,
  autoArrangeMasterCards,
  beginMasterConstruction,
  chooseMasterNpcAttack,
  confirmMasterArmy,
  constructionCards,
  isLegalInitialPile,
  legalMasterAttackers,
  legalMasterTargets,
  masterArmySize,
  masterHeirChoices,
  prepareMasterGame,
  replenishMasterArmy,
  resolveMasterAttack,
  resolveMasterNpcReplenishment,
  skipMasterReplenishment,
  type MasterAttack,
  type MasterCard,
  type MasterConstruction,
  type MasterEvent,
  type MasterPile,
  type MasterPlayer,
  type MasterState,
  type MasterVictoryMode,
} from "@/game/master";
import { MASTER_SAVE_KEY, parseMasterGame, serializeMasterGame } from "@/game/master-save";
import { humanMayEndEliminatedGame } from "@/game/elimination";
import { battleTitle, roundOutcomeText } from "@/game/player-language";
import { FACTIONS } from "@/game/setup";
import type { Stat } from "@/game/types";

const STATS: Stat[] = ["strength", "zeal", "wealth"];
const MASTER_NPC_ATTACK_KEY = "nubian-kings:master-npc-attack:v1";
const ART_BASE_URL = "https://nubian-kings-qtsa6vhio-grr919-6387s-projects.vercel.app";
const ART_BY_ID = Object.fromEntries(cardData.cards.flatMap((card) => card.assets[0] ? [[card.id, card.assets[0].filename]] : []));
const INFO: Record<string, { name: string; mark: string }> = {
  "nubian-christians": { name: "Nubian Christians", mark: "NC" },
  "egyptian-christians": { name: "Egyptian Christians", mark: "EC" },
  "ethiopian-christians": { name: "Ethiopian Christians", mark: "XC" },
  "egyptian-muslims": { name: "Egyptian Muslims", mark: "EM" },
  "ethiopian-jews": { name: "Ethiopian Jews", mark: "EJ" },
};

interface MasterReview {
  stat: Stat;
  attacker: MasterCard[];
  target: MasterCard[];
  attackerUnitId: string;
  targetUnitId: string;
  attackerPlayerId: string;
  targetPlayerId: string;
  scores: Array<{ playerId: string; unitId: string; base: number; die: number; total: number }>;
  tie: boolean;
}

function artwork(card: MasterCard) {
  const filename = ART_BY_ID[card.definitionId];
  return filename ? `${ART_BASE_URL}/cards/${encodeURIComponent(filename)}` : undefined;
}

function playerLabel(player: MasterPlayer) {
  return player.controller === "human" ? `You · ${INFO[player.factionId].name}` : INFO[player.factionId].name;
}

function possessive(player: MasterPlayer) {
  if (player.controller === "human") return "Your";
  const name = INFO[player.factionId].name;
  return `${name}${name.endsWith("s") ? "'" : "'s"}`;
}

function eventText(event: MasterEvent, state: MasterState) {
  const player = "playerId" in event ? state.players.find((candidate) => candidate.id === event.playerId) : undefined;
  const who = player?.controller === "human" ? "You" : player ? INFO[player.factionId].name : "A player";
  if (event.type === "tie") return "The attack ended in a tie. Neither unit was defeated.";
  if (event.type === "defeated") return `${player ? possessive(player) : "A player's"} ${event.heir ? "heir" : event.cardIds.length === 1 ? "card" : "pile"} was defeated.`;
  if (event.type === "replenishment-available") return `${who} may replenish the army.`;
  if (event.type === "replenished") return `${who} drew a hidden reserve card.`;
  if (event.type === "replenishment-skipped") return `${who} declined replenishment.`;
  if (event.type === "player-eliminated") return `${player ? possessive(player) : "A player's"} heir was eliminated.`;
  if (event.type === "turn-advanced") return player?.controller === "human" ? "You begin the next turn." : `${who} begin the next turn.`;
  if (event.type === "game-won") return `${who} won the game.`;
  return "";
}

function MasterCardView({ card, visible = card.face === "up", defeated = false, badge }: { card: MasterCard; visible?: boolean; defeated?: boolean; badge?: string }) {
  const image = artwork(card);
  return <div className={`card amateurCard masterCard ${visible ? "face" : "back"} ${defeated ? "reviewDefeated" : ""}`}>
    {badge && <span className="amateurBadge">{badge}</span>}
    {visible && image ? <><img className="cardArtwork" src={image} alt="" /><div className="authoritativeStats">{STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat[0].toUpperCase()}</span>)}</div></>
      : visible ? <><h3>{card.name}</h3><div className="cardStats">{STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat}</span>)}</div></>
      : <><div className="backOrnament">NK</div><span>Hidden</span></>}
    {defeated && <span className="outcomeMark">Defeated</span>}
  </div>;
}

function clonePiles(piles: MasterPile[]) {
  return piles.map((pile) => ({ ...pile, cards: [...pile.cards] }));
}

function orderedAddition(cards: MasterCard[], card: MasterCard) {
  const candidates = cards.length === 1
    ? [[...cards, card], [card, ...cards]]
    : [[card, ...cards], [...cards, card]];
  return candidates.find((candidate) => isLegalInitialPile(candidate));
}

export default function MasterClient() {
  const [screen, setScreen] = useState<"home" | "setup" | "heir" | "arrange" | "game">("home");
  const [state, setState] = useState<MasterState>();
  const [prepared, setPrepared] = useState<ReturnType<typeof prepareMasterGame>>();
  const [construction, setConstruction] = useState<MasterConstruction>();
  const [draftPiles, setDraftPiles] = useState<MasterPile[]>([]);
  const [undo, setUndo] = useState<MasterPile[][]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const [faction, setFaction] = useState<(typeof FACTIONS)[number]>(FACTIONS[0]);
  const [npcCount, setNpcCount] = useState<number | "random">("random");
  const [openingPlayer, setOpeningPlayer] = useState<"random" | "human" | "npc">("random");
  const [victoryMode, setVictoryMode] = useState<MasterVictoryMode>("standard");
  const [seed, setSeed] = useState("");
  const [floods, setFloods] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [help, setHelp] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [review, setReview] = useState<MasterReview>();
  const [npcAttack, setNpcAttack] = useState<MasterAttack>();
  const [selectedStat, setSelectedStat] = useState<Stat>();
  const [attackerId, setAttackerId] = useState<string>();
  const [history, setHistory] = useState<string[]>([]);
  const [watchAfterElimination, setWatchAfterElimination] = useState(false);
  const eliminationPending = humanMayEndEliminatedGame(state) && !watchAfterElimination;

  useEffect(() => setHasSave(Boolean(parseMasterGame(localStorage.getItem(MASTER_SAVE_KEY) ?? ""))), []);
  useEffect(() => { if (review) window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }, [review]);

  function persist(next: MasterState) {
    localStorage.setItem(MASTER_SAVE_KEY, serializeMasterGame(next));
    setHasSave(true);
  }

  function assemble() {
    const next = prepareMasterGame({ humanFaction: faction, npcCount: npcCount === "random" ? undefined : npcCount, nileFloods: floods, victoryMode, openingPlayer, seed: seed || undefined });
    setSeed(next.random.seed);
    setPrepared(next);
    setScreen("heir");
  }

  function chooseHeir(id: string) {
    if (!prepared) return;
    const next = beginMasterConstruction(prepared, id);
    setConstruction(next);
    setDraftPiles([]);
    setUndo([]);
    setSelectedCardId(undefined);
    setPrepared(undefined);
    setScreen("arrange");
  }

  const allSetupCards = useMemo(() => construction ? constructionCards(construction) : [], [construction]);
  const assignedIds = useMemo(() => new Set(draftPiles.flatMap((pile) => pile.cards.map((card) => card.id))), [draftPiles]);
  const unassigned = allSetupCards.filter((card) => !assignedIds.has(card.id));
  const selectedCard = allSetupCards.find((card) => card.id === selectedCardId);

  function moveSelected(targetPileId?: string) {
    if (!selectedCard) return;
    const source = draftPiles.find((pile) => pile.cards.some((card) => card.id === selectedCard.id));
    const withoutSource = draftPiles.map((pile) => pile.id === source?.id ? { ...pile, cards: pile.cards.filter((card) => card.id !== selectedCard.id) } : { ...pile, cards: [...pile.cards] });
    const remaining = withoutSource.find((pile) => pile.id === source?.id)?.cards ?? [];
    if (source && remaining.length && !isLegalInitialPile(remaining)) return;
    let next = withoutSource.filter((pile) => pile.cards.length);
    if (targetPileId) {
      const target = next.find((pile) => pile.id === targetPileId);
      if (!target || target.id === source?.id) return;
      const ordered = orderedAddition(target.cards, selectedCard);
      if (!ordered) return;
      next = next.map((pile) => pile.id === targetPileId ? { ...pile, cards: ordered } : pile);
    } else {
      if (!isLegalInitialPile([selectedCard])) return;
      next.push({ id: `human-pile-${Date.now()}-${selectedCard.id}`, cards: [selectedCard] });
    }
    setUndo((prior) => [...prior, clonePiles(draftPiles)]);
    setDraftPiles(next);
    setSelectedCardId(undefined);
  }

  function resetArrangement() {
    if (draftPiles.length) setUndo((prior) => [...prior, clonePiles(draftPiles)]);
    setDraftPiles([]);
    setSelectedCardId(undefined);
  }

  function autoArrange() {
    setUndo((prior) => [...prior, clonePiles(draftPiles)]);
    setDraftPiles(autoArrangeMasterCards(allSetupCards, "human-pile"));
    setSelectedCardId(undefined);
  }

  function undoArrangement() {
    const prior = undo.at(-1);
    if (!prior) return;
    setDraftPiles(clonePiles(prior));
    setUndo((items) => items.slice(0, -1));
    setSelectedCardId(undefined);
  }

  function confirmArmy() {
    if (!construction || unassigned.length || !draftPiles.every((pile) => isLegalInitialPile(pile.cards))) return;
    const next = confirmMasterArmy(construction, clonePiles(draftPiles));
    localStorage.removeItem(MASTER_NPC_ATTACK_KEY);
    persist(next);
    setState(next);
    setWatchAfterElimination(false);
    setConstruction(undefined);
    setHistory(["The twenty-card armies are locked into hidden piles. The heirs stand ready behind them."]);
    setScreen("game");
  }

  function continueGame() {
    const saved = parseMasterGame(localStorage.getItem(MASTER_SAVE_KEY) ?? "");
    if (!saved) return;
    try {
      const pending = JSON.parse(localStorage.getItem(MASTER_NPC_ATTACK_KEY) ?? "null");
      if (pending && typeof pending.attackerUnitId === "string" && typeof pending.targetPlayerId === "string" && typeof pending.targetUnitId === "string" && STATS.includes(pending.stat)) setNpcAttack(pending);
    } catch { localStorage.removeItem(MASTER_NPC_ATTACK_KEY); }
    setState(saved);
    setWatchAfterElimination(false);
    setHistory(["Master game restored."]);
    setScreen("game");
  }

  function addEvents(events: MasterEvent[], next: MasterState) {
    const lines = events.map((event) => eventText(event, next)).filter(Boolean);
    setHistory((prior) => [...lines.reverse(), ...prior].slice(0, 24));
  }

  function locateUnit(game: MasterState, playerId: string, unitId: string) {
    const player = game.players.find((candidate) => candidate.id === playerId)!;
    return player.heir.id === unitId ? [player.heir] : player.army.find((pile) => pile.id === unitId)!.cards;
  }

  function attack(targetPlayerId: string, targetUnitId: string, forced?: { attackerUnitId: string; stat: Stat }) {
    if (!state) return;
    const currentAttackerId = forced?.attackerUnitId ?? attackerId;
    const stat = forced?.stat ?? selectedStat;
    if (!currentAttackerId || !stat) return;
    localStorage.removeItem(MASTER_NPC_ATTACK_KEY);
    setNpcAttack(undefined);
    const attackerPlayerId = activeMasterPlayer(state).id;
    const beforeAttacker = structuredClone(locateUnit(state, attackerPlayerId, currentAttackerId)).map((card) => ({ ...card, face: "up" as const }));
    const beforeTarget = structuredClone(locateUnit(state, targetPlayerId, targetUnitId)).map((card) => ({ ...card, face: "up" as const }));
    const next = structuredClone(state);
    const events = resolveMasterAttack(next, { attackerUnitId: currentAttackerId, targetPlayerId, targetUnitId, stat });
    const scores = events.filter((event): event is Extract<MasterEvent, { type: "score" }> => event.type === "score").map(({ playerId, unitId, base, die, total }) => ({ playerId, unitId, base, die, total }));
    setReview({ stat, attacker: beforeAttacker, target: beforeTarget, attackerUnitId: currentAttackerId, targetUnitId, attackerPlayerId, targetPlayerId, scores, tie: events.some((event) => event.type === "tie") });
    setSelectedStat(undefined);
    setAttackerId(undefined);
    persist(next);
    setState(next);
    addEvents(events, next);
  }

  function applyReplenishment(kind: "draw" | "skip") {
    if (!state) return;
    const next = structuredClone(state);
    const events = kind === "draw" ? replenishMasterArmy(next) : skipMasterReplenishment(next);
    persist(next);
    setState(next);
    addEvents(events, next);
  }

  useEffect(() => {
    if (!state || review || npcAttack || eliminationPending || state.phase !== "attack" || activeMasterPlayer(state).controller !== "npc") return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const actionState = structuredClone(state);
      const action = chooseMasterNpcAttack(actionState);
      persist(actionState);
      setState(actionState);
      localStorage.setItem(MASTER_NPC_ATTACK_KEY, JSON.stringify(action));
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
      const events = resolveMasterNpcReplenishment(next);
      persist(next);
      setState(next);
      addEvents(events, next);
      setThinking(false);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, review, eliminationPending]);

  function endEliminatedGame() {
    localStorage.removeItem(MASTER_SAVE_KEY);
    localStorage.removeItem(MASTER_NPC_ATTACK_KEY);
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

  const heirOptions = useMemo(() => prepared ? masterHeirChoices(prepared) : [], [prepared]);

  if (screen === "home") return <main className="landing masterLanding"><section className="panel titlePanel">
    <p className="kicker">MASTER LEVEL: THE ROCK CHURCH OF LALIBELA</p><EparchCrownMark className="royalMark" /><h1>Nubian Kings</h1><p className="subtitle">Armies assembled in hidden formations</p>
    <p>Build twenty cards into legal piles, protect your heir, and defeat opposing formations as complete units.</p>
    <div className="actions"><button onClick={() => setScreen("setup")}>New Master Game</button><button className="secondary" disabled={!hasSave} onClick={continueGame}>Continue Master Game</button></div>
    <a className="buttonLink secondary" href="/master/multiplayer">Multiplayer</a>
    <div className="routeLinks landingLinks"><button className="textButton" onClick={() => setHelp(true)}>Master Rules</button><a className="landingBack" href="/">Return to Main</a></div>
    <small>Core profile · Special card effects are not used</small>
    <footer className="landingFooter">© 2026 Nile South Games</footer>
  </section>{help && <MasterHelp onClose={() => setHelp(false)} />}</main>;

  if (screen === "setup") return <main className="setupPage"><section className="setupPanel">
    <button className="backButton" onClick={() => setScreen("home")}>← Back</button><p className="kicker">MASTER GAME</p><h1>Assemble your army</h1><p className="lede">Choose your faction and heir, then arrange twenty privately revealed cards into legal piles.</p>
    <h2>Choose a faction</h2><div className="factionGrid">{FACTIONS.map((id) => <button key={id} className={`faction faction-${id} ${faction === id ? "selected" : ""}`} onClick={() => setFaction(id)}><span className="sigil">{INFO[id].mark}</span><span>{INFO[id].name}</span>{faction === id && <b>Selected</b>}</button>)}</div>
    <div className="settings">
      <label><span>Computer opponents</span><select value={npcCount} onChange={(event) => setNpcCount(event.target.value === "random" ? "random" : Number(event.target.value))}><option value="random">Random (1–4)</option>{[1,2,3,4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
      <label><span>Opening initiative</span><select value={openingPlayer} onChange={(event) => setOpeningPlayer(event.target.value as "random" | "human" | "npc")}><option value="random">Random participant</option><option value="human">You</option><option value="npc">Computer opponent</option></select></label>
      <label><span>Victory rule</span><select value={victoryMode} onChange={(event) => setVictoryMode(event.target.value as MasterVictoryMode)}><option value="standard">First heir eliminated</option><option value="long">Last heir standing</option></select></label>
      <label className="toggle"><input type="checkbox" checked={floods} onChange={(event) => setFloods(event.target.checked)} /><span><b>Nile Floods</b><small>Add one d6 to each competing unit.</small></span></label>
      <label className="seedSetting"><span><b>Game seed</b><small>Use identical settings and a seed to reproduce setup.</small></span><input value={seed} maxLength={48} placeholder="Generated automatically" onChange={(event) => setSeed(event.target.value)} /></label>
    </div><button className="beginButton" onClick={assemble}>Choose Heir</button>
  </section></main>;

  if (screen === "heir" && prepared) return <main className="setupPage"><section className="setupPanel heirSetup">
    <button className="backButton" onClick={() => { setPrepared(undefined); setScreen("setup"); }}>← Back</button><p className="kicker">CHOOSE YOUR HEIR</p><h1>Select a Leader</h1>
    <p className="lede">After you choose, the other Leaders return to the faction deck before your twenty cards are dealt.</p>
    <div className="heirChoices">{heirOptions.map((card) => <div key={card.id}><button className="bareCardButton" onClick={() => chooseHeir(card.id)}><MasterCardView card={card} visible /></button><b>{card.name}</b></div>)}</div><small>Computer factions choose their own heirs.</small>
  </section></main>;

  if (screen === "arrange" && construction) {
    const complete = unassigned.length === 0 && draftPiles.length > 0 && draftPiles.every((pile) => isLegalInitialPile(pile.cards));
    return <main className="setupPage masterArrangePage"><section className="masterArrangePanel">
      <header><div><p className="kicker">BUILD YOUR ARMY</p><h1>Arrange twenty cards</h1><p>Tap a card, then place it in a legal pile. Pile order runs from bottom to top: Place–Person–Thing.</p></div><div className="arrangeActions"><button className="secondary" disabled={!undo.length} onClick={undoArrangement}>Undo</button><button className="secondary" onClick={resetArrangement}>Reset</button><button onClick={autoArrange}>Auto-arrange</button></div></header>
      <section className="unassignedTray"><h2>Unassigned cards <span>{unassigned.length}</span></h2><div>{unassigned.map((card) => <button key={card.id} className={`setupCardButton ${selectedCardId === card.id ? "selectedSetupCard" : ""}`} onClick={() => setSelectedCardId(card.id)}><MasterCardView card={card} visible badge={card.type} /></button>)}</div></section>
      <section className="pileWorkshop"><div className="workshopHeading"><h2>Your piles <span>{draftPiles.length}</span></h2>{selectedCard && <p>Selected: <b>{selectedCard.name}</b></p>}</div>
        <div className="draftPileGrid">{draftPiles.map((pile, index) => {
          const canAdd = selectedCard && !pile.cards.some((card) => card.id === selectedCard.id) && Boolean(orderedAddition(pile.cards, selectedCard));
          return <article key={pile.id} className="draftPile"><header><b>Pile {index + 1}</b><small>{pile.cards.map((card) => card.type).join(" → ")}</small></header><div>{pile.cards.map((card) => <button key={card.id} className={selectedCardId === card.id ? "selectedSetupCard" : ""} onClick={() => setSelectedCardId(card.id)}><MasterCardView card={card} visible /></button>)}</div>{selectedCard && <button className="pileDestination" disabled={!canAdd} onClick={() => moveSelected(pile.id)}>{canAdd ? "Place here" : "Not legal here"}</button>}</article>;
        })}</div>
        {selectedCard && <button className="newPileButton" disabled={!isLegalInitialPile([selectedCard])} onClick={() => moveSelected()}>Create New Pile</button>}
      </section>
      <footer className="arrangeFooter"><span>{complete ? "All twenty cards are in legal piles." : `${unassigned.length} unassigned · Finish every legal pile to continue.`}</span><button disabled={!complete} onClick={confirmArmy}>Confirm Army</button></footer>
    </section></main>;
  }

  if (!state) return null;
  const active = activeMasterPlayer(state);
  const human = state.players.find((player) => player.controller === "human")!;
  const humanTurn = active.controller === "human" && state.phase === "attack";
  const pending = state.players.find((player) => player.id === state.pendingReplenishmentPlayerId);
  const winner = state.players.find((player) => player.id === state.winnerId);
  const feedbackDiagnostics = { level: "Master" as const, seed: state.random.seed, round: state.round, phase: state.phase, humanFaction: INFO[human.factionId].name, npcCount: state.players.filter((player) => player.controller === "npc").length, nileFloods: state.nileFloods, victoryMode: state.victoryMode, recentHistory: history.slice(0, 10) };
  const allowedAttackers = new Set(humanTurn && selectedStat ? legalMasterAttackers(state) : []);

  return <main className="gamePage amateurGame masterGame">
    <header className="gameHeader"><div><EparchCrownMark className="miniMark" /><b>Nubian Kings</b><small>Master · Turn {state.round} · {state.victoryMode === "standard" ? "First heir" : "Last heir"} victory</small></div><div className="toolbar"><button className="iconButton" onClick={() => navigator.clipboard?.writeText(state.random.seed)}>Copy Seed</button><button className="iconButton" onClick={() => setHelp(true)}>Rules</button><FeedbackButton diagnostics={feedbackDiagnostics} /><a className="iconButton linkButton" href="/master">Leave</a></div></header>
    <section className="statusBar"><span className={`turnDot ${thinking ? "thinking" : ""}`} /><div><b>{review ? "Review the attack" : npcAttack ? `${INFO[active.factionId].name} have declared an attack` : state.phase === "complete" ? "Game complete" : thinking ? `${INFO[active.factionId].name} are deciding…` : state.phase === "replenish" ? `${pending?.controller === "human" ? "You may" : INFO[pending!.factionId].name + " may"} replenish` : humanTurn ? !selectedStat ? "Choose a statistic" : !attackerId ? "Choose your attacker" : "Choose an enemy target" : `${INFO[active.factionId].name}'s turn`}</b><small>{npcAttack ? "The selected units remain hidden until you resolve the attack." : humanTurn ? masterArmySize(human) ? "Choose an army pile. Your heir cannot attack until every army card is gone." : "Your heir is your last card and must attack alone." : "Defeated piles are discarded as complete units."}</small></div></section>

    {review ? <MasterReviewPanel review={review} state={state} onContinue={() => setReview(undefined)} /> : <section className="amateurBoard masterBoard">
      <MasterPlayerArea player={human} active={active.id === human.id} attackerId={attackerId} highlightIds={new Set(npcAttack?.targetPlayerId === human.id ? [npcAttack.targetUnitId] : [])} allowedAttackers={allowedAttackers} targetIds={new Set()} onUnit={setAttackerId} />
      <div className="amateurOpponents">{state.players.filter((player) => player.controller === "npc").map((player) => {
        const targets = humanTurn && attackerId && selectedStat ? new Set(legalMasterTargets(state, player.id)) : new Set<string>();
        const highlights = new Set<string>();
        if (npcAttack && active.id === player.id) highlights.add(npcAttack.attackerUnitId);
        if (npcAttack?.targetPlayerId === player.id) highlights.add(npcAttack.targetUnitId);
        return <MasterPlayerArea key={player.id} player={player} active={active.id === player.id} highlightIds={highlights} allowedAttackers={new Set()} targetIds={targets} onUnit={(id) => attack(player.id, id)} />;
      })}</div>
    </section>}

    {!review && humanTurn && <section className="chooser amateurChooser"><p>{!selectedStat ? "Which statistic will decide the attack?" : !attackerId ? masterArmySize(human) ? "Now choose one of your army piles to attack." : "Your heir is your last card. Choose it to attack." : "Now select an enemy pile. An exposed heir may also be selected."}</p><div>{STATS.map((stat) => <button key={stat} className={selectedStat === stat ? "chosenStat" : ""} onClick={() => { setSelectedStat(stat); setAttackerId(undefined); }}><span>{stat === "strength" ? "⚔" : stat === "zeal" ? "✦" : "◆"}</span>{stat}</button>)}</div></section>}
    {!review && npcAttack && <section className="chooser npcChoicePanel" aria-live="polite"><p className="kicker">ATTACK DECLARED</p><h2>{INFO[active.factionId].name} attack {state.players.find((player) => player.id === npcAttack.targetPlayerId)?.controller === "human" ? "you" : INFO[state.players.find((player) => player.id === npcAttack.targetPlayerId)!.factionId].name} using <b>{npcAttack.stat}</b></h2><p>The attacker and target are highlighted. Their cards remain hidden until you are ready.</p><button onClick={() => attack(npcAttack.targetPlayerId, npcAttack.targetUnitId, { attackerUnitId: npcAttack.attackerUnitId, stat: npcAttack.stat })}>Resolve Attack</button></section>}
    {!review && state.phase === "replenish" && pending?.controller === "human" && <section className="chooser replenishmentPanel"><div className="replenishmentHeading"><div><p className="kicker">VICTORIOUS PLAYER</p><b>Replenish your army?</b></div><button onClick={() => applyReplenishment("skip")}>Skip</button></div><div className="replenishmentChoices">{pending.unused.length > 0 && <button onClick={() => applyReplenishment("draw")}><b>Draw hidden reserve card</b><small>{pending.unused.length} cards remain in reserve</small></button>}</div></section>}
    {winner && !review && <section className="victory"><EparchCrownMark /><p className="kicker">VICTORY</p><h2>{winner.controller === "human" ? "You eliminated the decisive heir" : `${INFO[winner.factionId].name} are victorious`}</h2><a className="buttonLink" href="/master">Play Again</a></section>}
    {eliminationPending && !review && <EliminatedGamePrompt onContinue={() => setWatchAfterElimination(true)} onEnd={endEliminatedGame} />}
    <aside className="history"><h2>Game record</h2>{history.length ? <ol>{history.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol> : <p>No attacks yet.</p>}</aside>
    {help && <MasterHelp onClose={() => setHelp(false)} />}
  </main>;
}

function MasterUnit({ cards, enabled, selected, highlighted, badge, onClick }: { cards: MasterCard[]; enabled: boolean; selected: boolean; highlighted: boolean; badge: string; onClick: () => void }) {
  return <button type="button" className={`masterUnit ${enabled ? "selectableUnit" : ""} ${selected || highlighted ? "selectedUnit" : ""}`} disabled={!enabled} onClick={onClick} aria-label={enabled ? `Select ${badge}` : undefined}><span className="unitBadge">{badge}</span><span className="unitCards">{cards.map((card) => <MasterCardView key={card.id} card={card} />)}</span></button>;
}

function MasterPlayerArea({ player, active, attackerId, highlightIds, allowedAttackers, targetIds, onUnit }: { player: MasterPlayer; active: boolean; attackerId?: string; highlightIds: Set<string>; allowedAttackers: Set<string>; targetIds: Set<string>; onUnit: (id: string) => void }) {
  const enabled = (id: string) => allowedAttackers.has(id) || targetIds.has(id);
  return <section className={`playerArea amateurPlayer masterPlayer faction-${player.factionId} ${player.controller === "human" ? "humanArea" : "npcArea"} ${player.eliminated ? "eliminated" : ""}`}>
    <header><span className="sigil small">{INFO[player.factionId].mark}</span><div><h2>{playerLabel(player)}</h2><small>{player.eliminated ? "Heir eliminated" : `${masterArmySize(player)} army cards · ${player.army.length} piles · ${player.discard.length} discarded`}</small></div>{active && !player.eliminated && <span className="selectorBadge">Active</span>}</header>
    <div className="masterHeir"><span>Heir</span><MasterUnit cards={[player.heir]} enabled={enabled(player.heir.id)} selected={attackerId === player.heir.id} highlighted={highlightIds.has(player.heir.id)} badge={player.eliminated ? "Eliminated" : "Heir"} onClick={() => onUnit(player.heir.id)} /></div>
    <div className="masterArmy">{player.army.map((pile, index) => <MasterUnit key={pile.id} cards={pile.cards} enabled={enabled(pile.id)} selected={attackerId === pile.id} highlighted={highlightIds.has(pile.id)} badge={`Pile ${index + 1}`} onClick={() => onUnit(pile.id)} />)}</div>
    {player.discard.length > 0 && <details className="discardViewer"><summary>View discard pile ({player.discard.length})</summary><div>{player.discard.map((card) => <MasterCardView key={card.id} card={card} visible />)}</div></details>}
  </section>;
}

function MasterReviewPanel({ review, state, onContinue }: { review: MasterReview; state: MasterState; onContinue: () => void }) {
  const attackerPlayer = state.players.find((player) => player.id === review.attackerPlayerId)!;
  const targetPlayer = state.players.find((player) => player.id === review.targetPlayerId)!;
  const high = Math.max(...review.scores.map((score) => score.total));
  const winnerId = review.tie ? undefined : review.scores.find((score) => score.total === high)?.playerId;
  const headline = roundOutcomeText(state.players, winnerId, [review.attackerPlayerId, review.targetPlayerId], review.stat, review.tie);
  return <section className="comparisonStage amateurReview masterReview" aria-live="polite"><header><p className="kicker">{battleTitle(review.stat)}</p><h2>{headline}</h2></header><div className="comparisonCards">{[
    { player: attackerPlayer, cards: review.attacker, unitId: review.attackerUnitId, role: "Attacker" },
    { player: targetPlayer, cards: review.target, unitId: review.targetUnitId, role: "Target" },
  ].map(({ player, cards, unitId, role }) => {
    const score = review.scores.find((entry) => entry.unitId === unitId)!;
    const result = review.tie ? "Tied" : score.total === high ? "Winner" : "Defeated";
    return <article key={`${player.id}-${unitId}`} className={`comparisonCard masterComparison result-${result.toLowerCase()}`}><div className="comparisonOwner"><b>{role} · {player.controller === "human" ? "You" : INFO[player.factionId].name}</b></div><div className="reviewPileCards">{cards.map((card) => <MasterCardView key={card.id} card={card} visible defeated={result === "Defeated"} />)}</div><div className="comparisonScore"><span>{result}</span><b>{score.total}</b><small>{score.base}{score.die ? ` + d6 ${score.die}` : ""}</small></div></article>;
  })}</div><button className="reviewContinue" onClick={onContinue}>Continue</button></section>;
}

function MasterHelp({ onClose }: { onClose: () => void }) {
  return <div className="modalShade" role="dialog" aria-modal="true"><section className="modal"><button className="modalClose" onClick={onClose}>×</button><p className="kicker">THE ROCK CHURCH OF LALIBELA</p><h2>Master Rules</h2><ol><li>Choose a Leader heir before the deal. Unchosen Leaders return to the deck and may appear in your twenty-card army.</li><li>Arrange the army into Place–Person–Thing piles. A Leader may occupy the Person position. A Thing cannot stand alone during initial setup.</li><li>Choose an army pile to attack an opposing pile using Strength, Zeal, or Wealth. Your chosen heir may attack only after every army card is gone.</li><li>Every pile uses the combined statistic of all its cards. The losing pile is discarded in full; tied piles survive face up.</li><li>An enemy heir is protected until every army pile is gone.</li><li>After a non-tied win, the victorious player may draw one random face-down reserve card as a new standalone unit, up to twenty army cards.</li><li>Standard play ends when the first heir is eliminated. Long play continues until only one heir remains.</li></ol><p className="note">Printed special effects are not used in this Core prototype.</p></section></div>;
}
