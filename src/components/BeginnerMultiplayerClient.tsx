"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EparchCrownMark from "@/components/EparchCrownMark";
import MultiplayerPresenceControls from "@/components/MultiplayerPresenceControls";
import cardData from "@/data/cards.json";
import { battleTitle, multiplayerRoundOutcomeText } from "@/game/player-language";
import { browserSupabase } from "@/lib/supabase-browser";
import type { Stat } from "@/game/types";

const FACTIONS = ["nubian-christians", "egyptian-christians", "ethiopian-christians", "egyptian-muslims", "ethiopian-jews"] as const;
const STATS: Stat[] = ["strength", "zeal", "wealth"];
const ROOM_KEY = "nubian-kings:multiplayer-room:v1";
const ART_BASE_URL = "https://nubian-kings-qtsa6vhio-grr919-6387s-projects.vercel.app";
const ART_BY_NAME = Object.fromEntries(cardData.cards.flatMap((card) => card.assets[0] ? [[card.name, card.assets[0].filename]] : []));
const INFO: Record<string, { name: string; mark: string }> = {
  "nubian-christians": { name: "Nubian Christians", mark: "NC" },
  "egyptian-christians": { name: "Egyptian Christians", mark: "EC" },
  "ethiopian-christians": { name: "Ethiopian Christians", mark: "XC" },
  "egyptian-muslims": { name: "Egyptian Muslims", mark: "EM" },
  "ethiopian-jews": { name: "Ethiopian Jews", mark: "EJ" },
};

type Seat = { id: string; userId?: string; displayName: string; controller: "human" | "npc"; factionId?: string; seatOrder: number; isYou: boolean; replaceable?: boolean };
type PublicCard = { id: string; name?: string; factionId?: string; strength?: number; zeal?: number; wealth?: number; face: "up" | "down"; discarded: boolean };
type PublicPlayer = { id: string; factionId: string; controller: "human" | "npc"; cards: PublicCard[]; cursor: number; eliminated: boolean };
type PublicState = { players: PublicPlayer[]; selectorIndex: number; phase: "select" | "tie" | "complete"; selectedStat?: Stat; winnerId?: string; nileFloods: boolean; round: number; random: { seed: string }; tie?: { participantIds: string[]; usedCardIds: Record<string, string[]> } };
type Review = { stat: Stat; scores: Array<{ playerId: string; cardId: string; base: number; die: number; total: number }>; cardIds: string[]; sequenceCardIds: string[]; winnerId?: string; cards: Record<string, PublicCard> };
type Room = { code: string; status: "waiting" | "active" | "complete" | "abandoned"; isHost: boolean; settings: { totalSeats: number; npcCount: number; nileFloods: boolean; openingPlayer: "random" | "human" | "npc" }; revision: number; acknowledged: boolean; seats: Seat[]; state?: PublicState; review?: Review };

async function accessToken() {
  const client = browserSupabase();
  if (!client) throw new Error("Multiplayer has not been configured yet.");
  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error || !result.data.session) throw new Error(result.error?.message ?? "A guest session could not be created.");
    session = result.data.session;
  }
  return session.access_token;
}

async function api(path: string, init?: RequestInit) {
  const token = await accessToken();
  const response = await fetch(path, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "The multiplayer service could not complete that request.");
  return data;
}

function nameForPlayer(room: Room, playerId: string) {
  return room.seats.find((seat) => (seat.userId ?? seat.id) === playerId)?.displayName ?? "Unknown player";
}

export default function BeginnerMultiplayerClient() {
  const [mode, setMode] = useState<"entry" | "create" | "join" | "room">("entry");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [totalSeats, setTotalSeats] = useState(2);
  const [npcCount, setNpcCount] = useState(0);
  const [nileFloods, setNileFloods] = useState(false);
  const [openingPlayer, setOpeningPlayer] = useState<"random" | "human" | "npc">("random");
  const [room, setRoom] = useState<Room>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const npcRevision = useRef<number | undefined>(undefined);

  const refresh = useCallback(async (code: string, quiet = false) => {
    try {
      const next = await api(`/api/multiplayer/rooms/${code}`) as Room;
      setRoom(next); setMode("room"); if (!quiet) setError("");
    } catch (caught) { if (!quiet) setError(caught instanceof Error ? caught.message : "The room could not be loaded."); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(ROOM_KEY);
    if (saved) refresh(saved, true).catch(() => localStorage.removeItem(ROOM_KEY));
  }, [refresh]);

  useEffect(() => {
    if (!room?.code) return;
    const timer = window.setInterval(() => refresh(room.code, true), 1800);
    return () => window.clearInterval(timer);
  }, [room?.code, refresh]);

  const act = useCallback(async (body: object) => {
    if (!room) return;
    setBusy(true); setError("");
    try {
      const next = await api(`/api/multiplayer/rooms/${room.code}`, { method: "PATCH", body: JSON.stringify(body) });
      if (next.transferred) { localStorage.removeItem(ROOM_KEY); setRoom(undefined); setMode("entry"); }
      else setRoom(next);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The action could not be completed."); await refresh(room.code, true); }
    finally { setBusy(false); }
  }, [room, refresh]);

  useEffect(() => {
    if (!room?.state || room.review || room.status !== "active") return;
    const selector = room.state.players[room.state.selectorIndex];
    if (selector.controller !== "npc" || npcRevision.current === room.revision) return;
    npcRevision.current = room.revision;
    const timer = window.setTimeout(() => act({ action: "npc-turn" }), 1200);
    return () => window.clearTimeout(timer);
  }, [room, act]);

  async function createRoom() {
    setBusy(true); setError("");
    try {
      const result = await api("/api/multiplayer/rooms", { method: "POST", body: JSON.stringify({ displayName, totalSeats, npcCount, nileFloods, openingPlayer }) });
      localStorage.setItem(ROOM_KEY, result.code); await refresh(result.code);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The room could not be created."); }
    finally { setBusy(false); }
  }

  async function joinRoom() {
    setBusy(true); setError("");
    try {
      const result = await api("/api/multiplayer/rooms/join", { method: "POST", body: JSON.stringify({ displayName, code: joinCode }) });
      localStorage.setItem(ROOM_KEY, result.code); await refresh(result.code);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The room could not be joined."); }
    finally { setBusy(false); }
  }

  function leaveView() { localStorage.removeItem(ROOM_KEY); setRoom(undefined); setMode("entry"); setError(""); }

  if (mode === "entry") return <Shell><section className="panel multiplayerEntry"><p className="kicker">BEGINNER MULTIPLAYER</p><EparchCrownMark className="royalMark" /><h1>Nubian Kings</h1><p className="subtitle">Play together by room code</p><div className="actions"><button onClick={() => setMode("create")}>Create Game</button><button className="secondary" onClick={() => setMode("join")}>Join Game</button></div><a className="landingBack" href="/beginner">← Beginner Game</a></section></Shell>;

  if (mode === "create" || mode === "join") return <Shell><section className="setupPanel multiplayerSetup"><button className="backButton" onClick={() => setMode("entry")}>← Back</button><p className="kicker">BEGINNER MULTIPLAYER</p><h1>{mode === "create" ? "Create a game" : "Join a game"}</h1><label className="multiplayerField"><span>Your name</span><input value={displayName} maxLength={24} autoComplete="nickname" onChange={(event) => setDisplayName(event.target.value)} /></label>{mode === "join" ? <label className="multiplayerField"><span>Room code</span><input className="roomCodeInput" value={joinCode} maxLength={6} autoCapitalize="characters" onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))} /></label> : <div className="settings"><label><span>Total players</span><select value={totalSeats} onChange={(event) => { const total = Number(event.target.value); setTotalSeats(total); setNpcCount((old) => Math.min(old, total - 2)); }}>{[2,3,4,5].map((count) => <option key={count}>{count}</option>)}</select></label><label><span>Computer opponents</span><select value={npcCount} onChange={(event) => setNpcCount(Number(event.target.value))}>{Array.from({ length: totalSeats - 1 }, (_, count) => <option key={count}>{count}</option>)}</select></label><label><span>Opening initiative</span><select value={openingPlayer} onChange={(event) => setOpeningPlayer(event.target.value as typeof openingPlayer)}><option value="random">Random participant</option><option value="human">Human player</option>{npcCount > 0 && <option value="npc">Computer opponent</option>}</select></label><label className="toggle"><input type="checkbox" checked={nileFloods} onChange={(event) => setNileFloods(event.target.checked)} /><span><b>Nile Floods</b><small>Add a die roll to every score.</small></span></label></div>}{error && <p className="formError" role="alert">{error}</p>}<button className="beginButton" disabled={busy || !displayName.trim() || (mode === "join" && joinCode.length !== 6)} onClick={mode === "create" ? createRoom : joinRoom}>{busy ? "Connecting…" : mode === "create" ? "Create Room" : "Join Room"}</button></section></Shell>;

  if (!room) return null;
  if (room.status === "waiting") return <><MultiplayerPresenceControls isHost={room.isHost} seats={room.seats} busy={busy} onAct={act} /><Lobby room={room} busy={busy} error={error} onAct={act} onLeave={leaveView} /></>;
  return <><MultiplayerPresenceControls isHost={room.isHost} seats={room.seats} busy={busy} onAct={act} /><MultiplayerBoard room={room} busy={busy} error={error} onAct={act} onLeave={leaveView} /></>;
}

function Shell({ children }: { children: React.ReactNode }) { return <main className="landing multiplayerPage">{children}</main>; }

function Lobby({ room, busy, error, onAct, onLeave }: { room: Room; busy: boolean; error: string; onAct: (body: object) => void; onLeave: () => void }) {
  const humanCapacity = room.settings.totalSeats - room.settings.npcCount;
  const humans = room.seats.filter((seat) => seat.controller === "human");
  const taken = new Set(room.seats.flatMap((seat) => seat.factionId ? [seat.factionId] : []));
  const ready = humans.length === humanCapacity && humans.every((seat) => seat.factionId);
  return <main className="setupPage multiplayerPage"><section className="setupPanel lobbyPanel"><div className="lobbyTop"><button className="backButton" onClick={onLeave}>← Leave</button><div className="roomCode"><small>ROOM CODE</small><strong>{room.code}</strong><button className="textButton" onClick={() => navigator.clipboard?.writeText(room.code)}>Copy</button></div></div><p className="kicker">BEGINNER MULTIPLAYER</p><h1>Choose your factions</h1><p className="lede">Share the room code with the other players. The host can begin when every human seat is filled and each player has chosen a different faction.</p><div className="lobbySeats">{Array.from({ length: room.settings.totalSeats }, (_, index) => { const seat = room.seats.find((candidate) => candidate.seatOrder === index); return <article key={index} className={`lobbySeat ${seat?.isYou ? "you" : ""}`}><span className="seatNumber">{index + 1}</span><div><strong>{seat?.displayName ?? "Waiting for player…"}</strong><small>{seat?.isYou ? "You" : seat?.controller === "npc" ? "Computer" : seat ? "Connected" : "Open seat"}</small></div>{seat?.factionId && <span className={`sigil small faction-${seat.factionId}`}>{INFO[seat.factionId].mark}</span>}</article>; })}</div><h2>Choose your faction</h2><div className="factionGrid">{FACTIONS.map((id) => { const yours = room.seats.some((seat) => seat.isYou && seat.factionId === id); const unavailable = taken.has(id) && !yours; return <button key={id} disabled={busy || unavailable} className={`faction faction-${id} ${yours ? "selected" : ""}`} onClick={() => onAct({ action: "choose-faction", factionId: id })}><span className="sigil">{INFO[id].mark}</span><span>{INFO[id].name}</span>{yours && <b>Selected</b>}{unavailable && <b>Taken</b>}</button>; })}</div>{error && <p className="formError" role="alert">{error}</p>}{room.isHost ? <button className="beginButton" disabled={busy || !ready} onClick={() => onAct({ action: "start" })}>{ready ? "Begin Game" : `Waiting for ${Math.max(0, humanCapacity - humans.length)} player${humanCapacity - humans.length === 1 ? "" : "s"}`}</button> : <p className="waitingMessage">{ready ? "All players are ready. Waiting for the host to begin." : "Waiting for the remaining players and faction choices."}</p>}</section></main>;
}

function MultiplayerBoard({ room, busy, error, onAct, onLeave }: { room: Room; busy: boolean; error: string; onAct: (body: object) => void; onLeave: () => void }) {
  const [showFinalVictory, setShowFinalVictory] = useState(false);
  const state = room.state!;
  const selector = state.players[state.selectorIndex];
  const yourSeat = room.seats.find((seat) => seat.isYou)!;
  const yourTurn = selector.id === yourSeat.userId && !room.review && room.status === "active";
  const winner = state.players.find((player) => player.id === state.winnerId);
  const reviewing = Boolean(room.review) && !(room.status === "complete" && showFinalVictory);
  return <main className="gamePage multiplayerGame"><header className="gameHeader"><div><EparchCrownMark className="miniMark" /><b>Nubian Kings</b><small>Beginner multiplayer · Round {state.round} · Room {room.code}</small></div><div className="toolbar"><button className="iconButton" onClick={() => navigator.clipboard?.writeText(room.code)}>Copy Room Code</button><button className="iconButton" onClick={onLeave}>Leave View</button></div></header>{reviewing ? <MultiplayerReviewView room={room} /> : <div className="board"><div className="opponentBoard multiplayerPlayers">{state.players.map((player) => <PublicPlayerArea key={player.id} room={room} state={state} player={player} />)}</div></div>}{reviewing ? <section className="chooser ready multiplayerContinue">{room.status === "complete" ? <button onClick={() => setShowFinalVictory(true)}>View Final Result</button> : room.acknowledged ? <p>Waiting for the other players to continue…</p> : <button disabled={busy} onClick={() => onAct({ action: "acknowledge" })}>Continue</button>}</section> : room.status === "active" ? <section className={`chooser ${yourTurn ? "ready" : "waiting"}`}><p>{yourTurn ? "It is your turn. Select a trait to decide this comparison." : selector.controller === "npc" ? `${nameForPlayer(room, selector.id)} is considering which trait to select…` : `${nameForPlayer(room, selector.id)} is taking a turn.`}</p><div>{STATS.map((stat) => <button key={stat} disabled={!yourTurn || busy} onClick={() => onAct({ action: "choose", stat })}><span>{stat === "strength" ? "⚔" : stat === "zeal" ? "✦" : "◆"}</span>{stat}</button>)}</div></section> : winner && <section className="victory"><EparchCrownMark /><p className="kicker">VICTORY</p><h2>{winner.id === yourSeat.userId ? "You are victorious" : `${nameForPlayer(room, winner.id)} is victorious`}</h2><div className="victoryActions">{room.isHost?<button disabled={busy} onClick={()=>onAct({action:"rematch"})}>Play Again in This Room</button>:<p>Waiting for the host to start a rematch…</p>}<button onClick={onLeave}>Leave Room</button><a className="buttonLink secondary" href="/beginner">Beginner Menu</a></div></section>}{error && <p className="formError multiplayerError" role="alert">{error}</p>}</main>;
}

function PublicPlayerArea({ room, state, player }: { room: Room; state: PublicState; player: PublicPlayer }) {
  const selected = state.players[state.selectorIndex].id === player.id;
  return <section className={`playerArea npcArea faction-${player.factionId} ${player.eliminated ? "eliminated" : ""}`}><header><span className="sigil small">{INFO[player.factionId].mark}</span><div><h2>{room.seats.some((seat) => seat.isYou && seat.userId === player.id) ? `You · ${INFO[player.factionId].name}` : `${nameForPlayer(room, player.id)} · ${INFO[player.factionId].name}`}</h2><small>{player.eliminated ? "Eliminated" : `${player.cards.filter((card) => !card.discarded).length} cards remain`}</small></div>{selected && !player.eliminated && <span className="selectorBadge">Selector</span>}</header><div className="cards">{player.cards.map((card) => <PublicCardView key={card.id} card={card} />)}</div></section>;
}

function PublicCardView({ card, defeated = false }: { card: PublicCard; defeated?: boolean }) {
  const image = card.name && ART_BY_NAME[card.name] ? `${ART_BASE_URL}/cards/${encodeURIComponent(ART_BY_NAME[card.name])}` : undefined;
  if (card.face === "down" && !card.discarded) return <article className="card back"><div className="backOrnament">NK</div><span>Hidden</span></article>;
  return <article className={`card face ${defeated || card.discarded ? "reviewDefeated" : ""}`}>{image ? <img className="cardArtwork" src={image} alt={`${card.name} card artwork`} /> : <><EparchCrownMark className="cardCrown" /><h3>{card.name}</h3></>}{(defeated || card.discarded) && <span className="outcomeMark">Defeated</span>}<div className="authoritativeStats">{STATS.map((stat) => <span key={stat}><b>{card[stat]}</b>{stat[0].toUpperCase()}</span>)}</div></article>;
}

function MultiplayerReviewView({ room }: { room: Room }) {
  const review = room.review!;
  const high = Math.max(...review.scores.map((score) => score.total));
  const viewerId = room.seats.find((seat) => seat.isYou)!.userId!;
  const result = multiplayerRoundOutcomeText(review.stat, review.winnerId, review.scores.map((score) => score.playerId), viewerId, review.winnerId ? nameForPlayer(room, review.winnerId) : undefined, !review.winnerId);
  return <section className="comparisonStage"><p className="kicker">{battleTitle(review.stat)}</p><h1>{result}</h1><div className="comparisonCards">{review.scores.map((score) => { const card = review.cards[score.cardId]; return <div key={`${score.playerId}-${score.cardId}`} className={`comparisonEntry ${score.total === high ? "roundLeader" : ""}`}><h2>{nameForPlayer(room, score.playerId)}</h2>{card ? <PublicCardView card={card} defeated={Boolean(review.winnerId && score.playerId !== review.winnerId)} /> : <article className="card back"><span>Card unavailable</span></article>}<p className="scoreLine"><b>{score.total}</b><span>{score.base}{score.die ? ` + ${score.die}` : ""}</span></p></div>; })}</div></section>;
}
