-- Restrict the server-authoritative Nubian Kings multiplayer tables.
-- RLS previously had no policies, but default grants still allowed broad SQL privileges.
-- Server API uses service_role and must retain its access.
revoke all privileges on table public.nk_multiplayer_rooms from anon, authenticated;
revoke all privileges on table public.nk_multiplayer_players from anon, authenticated;
grant select, insert, update, delete on table public.nk_multiplayer_rooms to service_role;
grant select, insert, update, delete on table public.nk_multiplayer_players to service_role;
