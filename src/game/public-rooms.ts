export const PUBLIC_ROOM_HOST_TTL_MS = 120_000;
export interface PublicRoomRow {
  code: string; host_user_id: string; level: string; status: string;
  settings: { isPublic?: boolean; totalSeats: number; npcCount: number; nileFloods: boolean; openingPlayer: string; victoryMode?: string; effectsMode?: string };
}
export interface PublicPlayerRow {
  room_code: string; user_id: string | null; display_name: string; controller: string; last_seen_at: string;
}
export function publicNubianRoom(room: PublicRoomRow, players: PublicPlayerRow[], now = Date.now()) {
  const s = room.settings;
  if (room.status !== "waiting" || s?.isPublic !== true || !["beginner", "amateur", "master"].includes(room.level)) return null;
  if (!/^[A-Z2-9]{6}$/.test(room.code) || !Number.isInteger(s.totalSeats) || s.totalSeats < 2 || s.totalSeats > 5 || !Number.isInteger(s.npcCount) || s.npcCount < 0 || s.npcCount > s.totalSeats - 2) return null;
  const humans = players.filter(p => p.room_code === room.code && p.controller === "human");
  const host = humans.find(p => p.user_id === room.host_user_id), seen = Date.parse(host?.last_seen_at ?? ""), capacity = s.totalSeats - s.npcCount;
  if (!host || !Number.isFinite(seen) || now - seen >= PUBLIC_ROOM_HOST_TTL_MS || seen > now + 30_000 || humans.length >= capacity) return null;
  const settings = [
    { key: "level", label: "Level", value: room.level[0].toUpperCase() + room.level.slice(1) },
    { key: "nileFloods", label: "Nile Floods", value: s.nileFloods ? "On" : "Off" },
    { key: "opening", label: "Opening initiative", value: s.openingPlayer === "human" ? "Human player" : s.openingPlayer === "npc" ? "Computer opponent" : "Random participant" },
  ];
  if (room.level !== "beginner") settings.push({ key: "victory", label: "Victory rule", value: s.victoryMode === "long" ? "Last heir standing" : "First heir eliminated" });
  if (room.level === "master") settings.push({ key: "effects", label: "Special effects", value: s.effectsMode === "on" ? "On" : "Off" });
  return {
    schemaVersion: 1, id: `nubian-kings:${room.code}`, gameId: "nubian-kings", gameTitle: "Nubian Kings", code: room.code,
    hostName: host.display_name.slice(0, 24), humanPlayers: humans.length, humanCapacity: capacity,
    openSeats: capacity - humans.length, computerPlayers: s.npcCount, settings,
    joinUrl: `https://nubian-kings.vercel.app/${room.level}/multiplayer?room=${encodeURIComponent(room.code)}`,
  };
}
