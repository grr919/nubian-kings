-- Pilot: central identity/profile for Nile South Games.
-- Do not migrate existing anonymous auth.users or multiplayer seats.
-- Profiles are available only through authenticated, server-authoritative routes.
create table if not exists public.nsg_player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nsg_username_format check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  constraint nsg_display_name_length check (char_length(display_name) between 1 and 40)
);
alter table public.nsg_player_profiles enable row level security;
-- Intentionally no browser policies, including for authenticated users.
-- The server checks verified permanent Supabase identities before reading or writing.
revoke all on public.nsg_player_profiles from anon, authenticated;
create index if not exists nsg_player_profiles_updated_idx on public.nsg_player_profiles(updated_at);
