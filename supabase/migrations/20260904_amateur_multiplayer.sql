alter table public.nk_multiplayer_rooms
  drop constraint if exists nk_multiplayer_rooms_level_check;

alter table public.nk_multiplayer_rooms
  add constraint nk_multiplayer_rooms_level_check
  check (level in ('beginner', 'amateur'));
