"use client";
import { useEffect, useState } from "react";
type Listing = {
  id: string; gameId: string; gameTitle: string; code: string; hostName: string;
  humanPlayers: number; humanCapacity: number; openSeats: number; computerPlayers: number;
  settings: { key: string; label: string; value: string }[]; joinUrl: string;
};
export default function PublicRoomDirectory({ level, displayName, busy, onJoin }: {
  level: string; displayName: string; busy: boolean; onJoin: (code: string) => void;
}) {
  const [rooms, setRooms] = useState<Listing[]>([]), [status, setStatus] = useState("Loading available rooms…"), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let stopped = false, loading = false;
    const controller = new AbortController();
    async function load() {
      if (loading || stopped || document.hidden) return;
      loading = true;
      try {
        const response = await fetch("https://szsucxaqxxxarwwypvqh.supabase.co/functions/v1/nile-south-lobby", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.rooms)) throw Error(data.error || "Available rooms could not be loaded. Try Refresh.");
        if (!stopped) { setRooms(data.rooms); setStatus(data.rooms.length ? "" : "No public rooms are available right now. Create a public room to invite other players."); }
      } catch (error) { if (!stopped) { setRooms([]); setStatus(error instanceof Error ? error.message : "Available rooms could not be loaded."); } }
      finally { loading = false; }
    }
    load();
    const timer = window.setInterval(load, 10000);
    const visible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { stopped = true; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  return <section className="publicRoomDirectory" aria-label="Available public rooms">
    <h2>Available public rooms</h2><p>Choose a game below, or enter a room code above. The list refreshes automatically.</p>
    <button className="secondary" type="button" onClick={() => setRefresh(n => n + 1)}>Refresh available rooms</button>
    <p role="status">{status}</p>
    <div className="publicRoomList">{rooms.map(room => {
      let url: URL; try { url = new URL(room.joinUrl); if (url.protocol !== "https:") return null; } catch { return null; }
      const sameLevel = room.gameId === "nubian-kings" && url.origin === "https://nubian-kings.vercel.app" && url.pathname === `/${level}/multiplayer`;
      return <article className="publicRoomCard" key={room.id}>
        <h3>{room.gameTitle} · {room.code}</h3>
        <p>Host: {room.hostName} · {room.humanPlayers}/{room.humanCapacity} humans · {room.openSeats} open {room.openSeats === 1 ? "seat" : "seats"} · {room.computerPlayers} computer opponents</p>
        <ul>{room.settings.map(setting => <li key={setting.key}>{setting.label}: {setting.value}</li>)}</ul>
        {sameLevel ? <button type="button" disabled={busy || !displayName.trim()} onClick={() => onJoin(room.code)}>Join {room.code}</button> : <a className="buttonLink" href={url.href}>Open {room.gameTitle} · {room.settings.find(s => s.key === "level")?.value ?? "Join game"}</a>}
      </article>;
    })}</div>
    {!displayName.trim() && <p>Enter your name above to join a room on this level.</p>}
  </section>;
}
