# Nile South Games account pilot (Nubian Kings)

Status: code prepared on feature branch; NOT activated in production.

## Design
- Existing Supabase anonymous auth IDs remain the game-authoritative player IDs. In-place identity linking preserves these UUIDs and associated room seats.
- /account allows a guest to add a verified email, then set a password and profile. Existing permanent accounts can sign in.
- /api/account/profile accepts a verified permanent bearer token; the server queries/updates profiles with its server-only key.
- Unique lowercase usernames are separate from editable display names.
- Anonymous users cannot register permanent usernames.
- No changes to match data, room seats, host authority, hidden-card projections, or existing multiplayer API responses.
- All existing games remain playable without accounts. This is not yet cross-domain SSO.

## Before enabling
1. Run the migration in supabase/migrations/20261117_nile_south_player_profiles.sql on the Nubian Kings Supabase project only, after reviewing it.
2. In Supabase Auth settings, enable manual identity linking, confirm email delivery and verified redirects to the /account page, and configure the site's allowed redirect URLs.
3. Retain existing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY settings. Never expose the secret key in client code.
4. Test with fresh disposable anonymous users on a nonproduction deployment. Verify upgrade keeps the same auth user ID and that an existing room still admits that user after verification.
5. Test existing-account sign-in, password login from a second device, username collision, unauthenticated 401, anonymous 403, and no direct table access. Confirm anonymous users can still create/join/play all three levels.
6. Recheck CORS, email callback behavior, account recovery, browser privacy, link confirmation, and auth policies before merging. The account page does not claim that account linking to an existing permanent identity merges its previous guest rooms.
7. Note that sign-out from a guest account can make its identity irrecoverable. Product UI should warn before allowing guest sign-out in the final rollout.

## Follow-up
- Add a polished profile control to game screens and choose an account display-name policy (never silently overwrite an established room name).
- Build a shared OAuth/OIDC login service for cross-domain and Capacitor single sign-on.
- Introduce a server-verified account-to-seat linking workflow for existing accounts, including conflicts and transferred seats.
- Expand to other Nile South games after the Nubian Kings canary passes.
