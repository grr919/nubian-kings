-- Restrict player-profile access to each signed-in permanent user.
-- Enables the preview to use a verified bearer token, without a service-role secret.
-- This change affects ONLY the new Nile South player-profile table.
grant select, insert, update on public.nsg_player_profiles to authenticated;
revoke all on public.nsg_player_profiles from anon;

create policy "nsg_profile_select_own" on public.nsg_player_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
  );

create policy "nsg_profile_insert_own" on public.nsg_player_profiles
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
  );

create policy "nsg_profile_update_own" on public.nsg_player_profiles
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
  )
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'is_anonymous') = 'false'
  );
