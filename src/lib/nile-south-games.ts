export type NubianLevel = "beginner" | "amateur" | "master";
export type NubianGameSummary = {
  room_code: string;
  game_level: string;
  room_status: string;
  player_name: string;
  faction_id: string | null;
  is_host: boolean;
  updated_at: string;
};
const rooms: Record<NubianLevel, { path: string; key: string }> = {
  beginner: { path: "/beginner/multiplayer", key: "nubian-kings:multiplayer-room:v1" },
  amateur: { path: "/amateur/multiplayer", key: "nubian-kings:amateur-multiplayer-room:v1" },
  master: { path: "/master/multiplayer", key: "nubian-kings:master-multiplayer-room:v1" }
};
export function resumeNubianRoom(game: NubianGameSummary) {
  if (!Object.hasOwn(rooms, game.game_level) || !/^[A-Z2-9]{6}$/.test(game.room_code)) return;
  const level = game.game_level as NubianLevel;
  return { storageKey: rooms[level].key, code: game.room_code, href: rooms[level].path + "?room=" + game.room_code };
}
