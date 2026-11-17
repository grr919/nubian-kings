-- Account-owned room discovery without exposing game_state, review, or other players' data.
-- This is the sole new RPC grant; all multiplayer tables retain their existing RLS.
create or replace function public.nsg_my_nubian_games()
returns table (
  room_code text,
  game_level text,
  room_status text,
  player_name text,
  faction_id text,
  is_host boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code::text, r.level::text, r.status::text,
         p.display_name::text, p.faction_id::text,
         (r.host_user_id = auth.uid())::boolean,
         r.updated_at
  from public.nk_multiplayer_players as p
  join public.nk_multiplayer_rooms as r on r.code = p.room_code
  where p.user_id = auth.uid()
    and p.controller = 'human'
    and auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous') = 'false', false)
    and r.status in ('waiting','active','complete')
  order by r.updated_at desc
  limit 100
$$;
revoke all on function public.nsg_my_nubian_games() from public, anon;
grant execute on function public.nsg_my_nubian_games() to authenticated;
