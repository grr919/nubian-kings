-- My Games is now served by /api/account/games with server-side user verification.
-- Keep this old function inaccessible to browser SQL roles.
revoke execute on function public.nsg_my_nubian_games() from public, anon, authenticated;
