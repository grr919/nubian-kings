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


## November 17 — Cross-device My Games milestone

- Added `/account/games` and navigation from the account and game landing pages.
- Existing permanent users with the same Supabase Auth user ID can discover their own Beginner, Amateur and Master multiplayer rooms without relying on the original browser's local-storage room selection.
- The `nsg_my_nubian_games()` RPC is security-definer because the underlying multiplayer tables intentionally block browser SELECT. It has a fixed, no-argument query, restricts rows to `auth.uid()` and non-anonymous JWTs, has an empty SQL search_path, exposes only room code, level, status, own player name/faction, host flag and modification timestamp; never returns game_state, hidden cards or opponents' data. `EXECUTE` is revoked from PUBLIC/anon and granted only to authenticated. Supabase security advisor flags exposed security-definer RPC by design: manually review this exception before production release.
- My Games Resume sets only the established per-level local-storage room code and navigates to the existing multiplayer screen, which must still perform server-side account UUID authorization. This does not join a new seat or transfer another player's seat.
- The RPC is installed on the existing Nubian Kings project, tested to return no rows without an authenticated identity; permission checks show anon cannot execute. The preview build passed.
- **Not yet verified end-to-end:** account-based room listing against a real signed-in user's room, and cross-device multiplayer resume. The preview's server-side `SUPABASE_SECRET_KEY` is not configured, so existing multiplayer routes can still return 503 even when the My Games list works.
- Guest rooms made under a *different* anonymous identity are not automatically linked to a newly created permanent account. In-place guest upgrades keep the same user ID. Previously transferred/removed seats are excluded.
- This milestone does not sync solo localStorage saves or create a cross-game account portal.
- Before production release: provision branch-only server secret without exposing it publicly, run positive and negative (another user's room) cross-device tests for all three levels, check inactive/expired games and disconnected-host replacement behavior, and keep existing room-table permissions unchanged.


## November 17 — Consistent account names in all multiplayer levels

- Beginner, Amateur and Master create/join screens use `MultiplayerPlayerName` to show the permanent Nile South profile display name as read-only text; registered players do not enter a separate name for each room.
- Guests retain editable temporary room names. A signed-in player with an unverified email or a missing profile is directed to /account and cannot create/join until the account is complete.
- Both `POST /api/multiplayer/rooms` and `POST /api/multiplayer/rooms/join` resolve the displayed player name from the verified account and server-side profile table. Submitted client names cannot override registered identities.
- Extended `nk_multiplayer_players.display_name` from 24 to 40 characters, matching the existing profile display-name limit. No game state or player ID was modified; zero multiplayer seats existed at the time of migration.
- The stable pilot Preview built successfully. Positive/negative live browser tests with both registered and guest accounts remain to be completed.


## November 17 — Single controlling browser per multiplayer seat

- Added `public.nk_seat_control_leases` and service-only, atomic lease RPC `nk_seat_control_lease`. The lease is scoped to an individual (room code, user UUID), has a 45-second expiry, and stores only a SHA-256 hash of a random 256-bit browser token.
- The three level-specific multiplayer GET endpoints attempt to acquire a vacant/expired lease or renew the browser's existing one. GETs from another browser remain read-only and do not refresh the participant's `last_seen_at`.
- All Beginner, Amateur, and Master multiplayer PATCH actions require current controller status checked on the server before any mutations, including host operations and NPC-turn triggers. A stale browser receives HTTP 409 `VIEW_ONLY`.
- A dedicated POST `/api/multiplayer/controller` endpoint accepts only an existing human participant's verified Supabase identity and an explicit `takeover` action. The database switches controller atomically; the previous browser's controller token immediately stops authorizing new PATCH requests.
- Clients use room-specific, browser-session-scoped tokens in the `X-NK-Controller` request header. The token is never sent in a URL or logged by the app. A secondary browser still receives only the account-authorized private view and sees a banner with `Take control here`, `My Games`, and `Return to game selection`. Controls inside the game are inert until control returns.
- The lease is per multiplayer room, not global account: one account may control other games simultaneously. Guests are likewise protected from accidentally simultaneous actions on cloned sessions where tokens differ.
- Verified by a synthetic SQL test: claim A succeeds; claim B while A active fails; renewing A succeeds; explicit takeover by B succeeds; renewing A then fails and renewing B succeeds. The synthetic room was deleted in the same transaction block.
- Permission checks confirm direct lease table SELECT and lease RPC execution are denied to both `anon` and `authenticated` Postgres roles; only the server-side `service_role` can execute the RPC. RLS remains enabled.
- Pending real-browser acceptance tests: two browser/device sessions for each of Beginner, Amateur, Master; take-control transfer, original device view-only, 45-second lease expiration, games under multiple rooms, guest behavior, and elimination/host replacement.
- The implementation is on a draft Vercel preview, not merged to production. Historical immutable preview deployments or other older backends may still accept actions without a lease; production enforcement requires deploying the updated routes and retiring or access-protecting older vulnerable deployments.
- Extremely close in-flight concurrent actions around an explicit takeover remain protected by existing room revision checks, but require an additional transactional fencing review before promising strict ordering across the takeover boundary.

## November 17 — False second-device warning diagnosis

- Neuromancer in active Beginner room W3K5ZJ reported view-only with no other browser. Read-only database audit initially showed **no control lease** for the player's seat, so this was not evidence another device was controlling them.
- The previous GET handler used `controlRoom(...,"ensure").catch(()=>false)` and reported any missing token or RPC failure as `canControl:false`, indistinguishable from a genuine different-device conflict.
- The most likely cause is a browser tab retaining an older preview JavaScript bundle that does not send `X-NK-Controller`, though a server-side lease service error cannot be excluded without request-level evidence.
- Updated Beginner, Amateur, Master GET responses and UI to distinguish `reload`, `unavailable`, and `other-device`. Missing header now displays a reload instruction, not a false assertion of another device; RPC failure says the controller service is unavailable.
- DB-side service-role RPC claim/rollback verified operation without persistent test mutations. Vercel updated preview built successfully; a genuine logged-in browser test is still pending.

## November 17 — Amateur/Master validation and automated checks

- User independently verified Beginner control transfer across devices and completed a multiplayer game successfully.
- Reviewed Amateur and Master request handlers: every PATCH is guarded by server-side `controlRoom(...,"renew")`; GETs report `roomControlState`; heir selection, army construction, effects, host actions and NPC actions all traverse those routes. View-only controls are disabled client-side.
- Added `.github/workflows/nile-south-account-pilot.yml` to run the existing `pnpm test` suite on feature-branch pushes and relevant pull requests.
- Initial run: 247 passed, one failed because the existing Beginner rematch-route test fixture lacked a mocked controller lease after the new server-side guard. Updated the fixture to mock an authorized controller and added a test proving view-only rematch requests are denied.
- Subsequent GitHub Actions run 44124289257 **passed**. Vercel preview was READY on feature commit `c29f11e7111ff975f0f9ccaab0d7756dbf1dd164` before this documentation update.
- Still not verified: live two-device testing of Amateur heir selection and Master heir selection, army construction, effects and ordinary turns. Do not mark those as completed solely on the strength of unit tests.

## November 17 — Stabilize controller banner during asynchronous room updates

- Live user test confirmed cross-device takeover for Amateur and Master. User reported the Master "Take control" banner intermittently returning after moves, even though the device had taken control; Amateur recurrence was not confirmed.
- Root-cause candidate in all three clients: independent 1.8-second GET polling, PATCH responses and explicit takeover refreshes called `setRoom` without checking whether a newer response had already been applied. This permits stale view-only snapshots to overwrite more recent room/control data.
- Introduced shared `MultiplayerResponseGate` with monotonic request tickets and nondecreasing room revision checks. A room response is accepted only if it is not older than the last applied response and does not regress the room revision.
- Beginner, Amateur, Master now gate GET/PATCH response application, invalidate outstanding responses on explicit controller takeover, and clear pending responses when leaving a room. Server-side controller lease enforcement remains unchanged.
- Added regression tests covering: poll-before-action reorder, newer request with older revision, takeover after a view-only poll, legitimate later loss of control, and leaving/changing rooms.
- GitHub Actions unit tests passed on commit `2170ec5a3263f1f365d42891b3e4826abeeeb5f7` and Vercel Preview build was READY. A live Master session replay remains needed to verify banner stability under the user's network conditions.

## November 17 — Persistent control banner from background tabs

- User retested after stale-poll response ordering fix and still saw Take Control banners for both players, including a player never intentionally opened from another device. The display-only fix was insufficient.
- Live database inspection of active Master room showed both human seats had **active controller leases refreshed within seconds**, meaning some browser instances were still sending authorized controller heartbeats. This is not consistent with expired leases, and is not proof of different physical devices: an older tab in the same browser/device may still be polling.
- Identified a design defect: all three clients continued their 1.8-second GET polling in hidden/background tabs. As GET renews the 45-second control lease, a forgotten or hidden tab could retain its seat indefinitely and cause visible new tabs to be view-only.
- Introduced `shouldPollMultiplayerRoom` and updated Beginner/Amateur/Master to stop polling while `document.visibilityState === 'hidden'`, immediately resume a refresh on `visibilitychange`/ `pageshow`, and avoid initiating automated NPC actions from hidden tabs.
- Adjusted view-only banner to say another *tab or device* can control the room. Server authorization and explicit takeover semantics remain unchanged.
- Added visibility helper unit tests. GitHub Actions run `44128870439` passed and Vercel preview deployment `nubian-kings-e8qi6dx12-grr919-6387s-projects.vercel.app` was READY.
- Still requires a live multi-tab, multi-device retest: background old tabs should relinquish the lease after 45 seconds while inactive, a foreground controller should retain it, and a real explicit takeover should still revoke its predecessor. Do not merge on the strength of the automated test alone.


## November 17 — Security audit and account recovery

- Added client-side `/account/recover` for existing email accounts. Unsigned users can request an email reset through Supabase `resetPasswordForEmail`; the recovery link authenticates the **existing** user and `updateUser({ password })` changes only that password, never creating a replacement account UUID. The page requires a recognized recovery event (or recovery-type email URL) and an authenticated non-anonymous session, uses a fixed same-origin callback URL, a 12-character password minimum, and matching confirmation.
- Linked `Forgot your password?` from the account sign-in screen. The recovery page does not reveal whether an email belongs to an account on a successful request. No test reset emails were sent to actual users in this audit.
- Added regression tests for password constraints and fixed callback URL.
- Verified two registered accounts using simulated authenticated database contexts: each saw exactly its own player profile, neither could read direct `nk_multiplayer_rooms` or `nk_multiplayer_players` table rows, and the `nsg_my_nubian_games()` RPC only returned respective account-associated games. A simulated anonymous JWT with an existing user ID saw zero profiles and zero My Games entries.
- Verified that the `nk_seat_control_lease` RPC is unavailable to anon/authenticated roles, RLS is enabled on all reviewed tables, and multiplayer GET/PATCH routes require a server-verified room participant and controlling-browser lease before actions.
- Hardened direct grants by revoking anon/authenticated table privileges for server-authoritative `nk_multiplayer_rooms` and `nk_multiplayer_players`; service role retains SELECT/INSERT/UPDATE/DELETE. Applied to the existing shared Supabase project, with grants verified afterward. Because this project is shared with production, these database grants changed there too; the API routes remain server-authoritative.
- Outstanding Supabase advisor warnings: `nsg_my_nubian_games()` is intentionally exposed as a bounded `SECURITY DEFINER` RPC restricted to `authenticated`; this still warrants final review for production. Leaked-password protection remains disabled.
- Vercel `SUPABASE_SECRET_KEY` remains sensitive and scoped to both Production and all Preview branches; it needs Preview narrowed to `feature/nile-south-account-pilot` before release, without losing the existing Production scope.
- Real email-delivery/password-reset test remains pending. Check Supabase Auth URL allow-list to ensure the exact stable pilot `/account/recover` callback URL is permitted. Browser verification should confirm recovery retains user UUID and My Games membership. Do not merge until confirmed.
