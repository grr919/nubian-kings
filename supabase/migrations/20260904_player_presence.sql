alter table public.nk_multiplayer_players
  add column if not exists last_seen_at timestamptz not null default now();

alter table public.nk_multiplayer_players
  add column if not exists former_user_id uuid;

create index if not exists nk_multiplayer_players_last_seen_idx
  on public.nk_multiplayer_players(room_code, last_seen_at);
