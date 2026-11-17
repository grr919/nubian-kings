-- Match multiplayer seat labels to the 40-character Nile South player display name.
alter table public.nk_multiplayer_players
  drop constraint if exists nk_multiplayer_players_display_name_check;
alter table public.nk_multiplayer_players
  add constraint nk_multiplayer_players_display_name_check
  check (char_length(display_name) between 1 and 40);
