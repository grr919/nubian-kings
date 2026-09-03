create table if not exists public.nk_multiplayer_rooms (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'complete', 'abandoned')),
  level text not null default 'beginner' check (level = 'beginner'),
  settings jsonb not null,
  game_state jsonb,
  review jsonb,
  review_acks jsonb not null default '[]'::jsonb,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nk_multiplayer_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.nk_multiplayer_rooms(code) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  controller text not null check (controller in ('human', 'npc')),
  faction_id text check (faction_id in ('nubian-christians', 'egyptian-christians', 'ethiopian-christians', 'egyptian-muslims', 'ethiopian-jews')),
  seat_order integer not null check (seat_order between 0 and 4),
  joined_at timestamptz not null default now(),
  unique (room_code, user_id),
  unique (room_code, seat_order),
  unique (room_code, faction_id),
  check ((controller = 'human' and user_id is not null) or (controller = 'npc' and user_id is null))
);

alter table public.nk_multiplayer_rooms enable row level security;
alter table public.nk_multiplayer_players enable row level security;

-- Intentionally no public table policies. All reads and mutations pass through
-- Nubian Kings server routes, which authenticate the anonymous player and return
-- only the information that player is permitted to see.

create index if not exists nk_multiplayer_rooms_updated_at_idx on public.nk_multiplayer_rooms(updated_at);
create index if not exists nk_multiplayer_players_room_idx on public.nk_multiplayer_players(room_code);
