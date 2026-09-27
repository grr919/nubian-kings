# Nubian Kings: Items Necessary to Complete Production

Last reviewed: September 26, 2026

This document records the remaining work required to move *Nubian Kings* from its current playtest state to a production-ready release. It distinguishes necessary completion work from features that may remain deferred.

## Current foundation

The application currently includes:

- Beginner, Amateur, and Master play.
- Solo and private room-code multiplayer variants.
- Master play with special effects either disabled or enabled.
- Server-authoritative multiplayer state and hidden-card filtering.
- Multiplayer reconnection, voluntary computer transfer, same-room rematches, and seven-day cleanup.
- Responsive interfaces for desktop and portable devices.
- Automated coverage consisting of 130 passing tests.
- A successful production build.

The remaining work is primarily card reconciliation, asset independence, final rules language, production safeguards, and release testing.

## 1. Complete card-statistics reconciliation

- [ ] Finish reconciling every remaining difference between the spreadsheet statistics and the statistics printed on the card images.
- [ ] Record the final authority for each card: printed image, spreadsheet, or a specifically approved exception.
- [ ] Regenerate or verify the canonical card database after the final decisions.
- [ ] Confirm that the statistics displayed over card artwork match the values used by the game engine.
- [ ] Freeze the production card dataset before final balance testing.

## 2. Make the card artwork production-independent

This is a release blocker. Most ordinary card artwork is currently loaded from an older, deployment-specific Vercel URL rather than from the present production project.

The canonical data references 180 distinct ordinary card-image files. The current repository contains 30 of those images, plus the seven mercenary images. The missing ordinary images must be imported into the current production source or moved to durable asset storage.

- [ ] Import all card images referenced by the canonical card data.
- [ ] Replace the hard-coded older Vercel asset URL with paths belonging to the current deployment or durable asset storage.
- [ ] Confirm that every card face loads without relying on a previous deployment.
- [ ] Verify capitalization, spaces, and punctuation in every filename on case-sensitive production storage.
- [ ] Add an automated test that fails when canonical data references a missing image.
- [ ] Locate or create the missing artwork for **The Hunchback's Son**.
- [ ] Return The Hunchback's Son to its intended deck only after its artwork and statistics are approved.

## 3. Finalize special-effect wording

The Master special-effects engine implements the clarified rules, but the printed language and formal rules still need to be revised to express those rulings directly.

- [ ] Rewrite every effect that advances the game clock to state that the same player receives another turn.
- [ ] Standardize the language for guarantees, including optional use, use after a tie, and cancellation of opposing guarantees.
- [ ] Standardize immunity language and state clearly that immunity prevents targeting.
- [ ] Standardize interruption language and state what happens to the initiating action and participating cards.
- [ ] Standardize elimination, recovery, random-discard, support, mercenary, and rollback language.
- [ ] State activation timing directly on cards wherever space permits.
- [ ] Ensure that one-time effects clearly say that they are one-time effects.
- [ ] Conduct a final card-by-card review comparing printed text, programmed behavior, and the approved rulings.

## 4. Produce final rules and player guidance

- [ ] Incorporate all approved special-effect interpretations into the Master rules.
- [ ] Explain the difference between Master Effects Off and Master Effects On.
- [ ] Document unlimited legal pile size and the Place–People–Things ordering rule.
- [ ] Document mercenary recruitment, deployment, elimination, and reserve exhaustion.
- [ ] Document guarantees, immunity, interrupts, conditional bonuses, simultaneous effects, and effect ordering.
- [ ] Document forward and backward clock movement, including rollback of revealed information and spent effects.
- [ ] Make the in-game rules and the external rulebook agree.
- [ ] Replace obsolete interface instructions such as **Resolve Attack** with the current interface wording.
- [ ] Review all player-facing sentences for consistent terminology and punctuation.

## 5. Perform final balance testing

Balance testing should occur only after statistics, deck copies, and effect text are frozen.

- [ ] Run large simulations for all five civilizations at Beginner level.
- [ ] Run large simulations for all five civilizations at Amateur level.
- [ ] Run large simulations for all five civilizations at Master level with effects disabled.
- [ ] Run large simulations for all five civilizations at Master level with effects enabled.
- [ ] Compare win rates by civilization, opening position, opponent count, Nile Flood setting, and victory rule.
- [ ] Check for excessive ties, stalled games, unusually long games, and effects that dominate play.
- [ ] Decide whether any remaining imbalance should be corrected through statistics, card-copy counts, or effect wording.
- [ ] Record the final production balance results and approved adjustments.

## 6. Finish the remaining multiplayer work

- [ ] Add an explicit leave-or-observe choice when a human player is eliminated in multiplayer.
- [ ] Add CAPTCHA, rate limiting, or equivalent protection against automated anonymous room creation before opening multiplayer to the general public.
- [ ] Load-test simultaneous rooms and concurrent player actions.
- [ ] Test two-, three-, four-, and five-participant games at every level.
- [ ] Test mixtures of human and computer participants.
- [ ] Test disconnection, same-browser reconnection, host replacement, voluntary computer transfer, and rematches.
- [ ] Confirm that hidden cards, reserves, pile contents, and private army construction never leak through multiplayer responses.

## 7. Verify production services and recovery

- [ ] Confirm that all Supabase migrations are installed in the production project:
  - `20260903_beginner_multiplayer.sql`
  - `20260904_amateur_multiplayer.sql`
  - `20260904_player_presence.sql`
  - `20260905_master_multiplayer.sql`
- [ ] Confirm the production Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `CRON_SECRET`
  - `RESEND_API_KEY`
  - `FEEDBACK_FROM_EMAIL`
- [ ] Add `CRON_SECRET` to `.env.example`.
- [ ] Confirm that anonymous Supabase authentication is enabled and restricted as intended.
- [ ] Confirm that the scheduled seven-day room cleanup runs successfully.
- [ ] Confirm that feedback email delivery works from the deployed site.
- [ ] Enable or document Supabase backup and recovery procedures.
- [ ] Establish a procedure for diagnosing failed deployments and restoring the previous working release.

## 8. Add release gates and production monitoring

The production build currently compiles successfully, and all 130 automated tests pass. Those tests should become an automatic deployment requirement.

- [ ] Add continuous integration that runs `pnpm test` and `pnpm build` for every proposed production change.
- [ ] Prevent deployment or merging when either command fails.
- [ ] Add automated checks for missing card artwork and incomplete effect records.
- [ ] Add error monitoring for failed API requests and multiplayer server errors.
- [ ] Establish a simple production health check for the application, Supabase connection, and scheduled cleanup.
- [ ] Tag or otherwise identify production releases so that reported problems can be tied to a precise version.

## 9. Complete browser, device, and accessibility testing

- [ ] Play complete games in desktop Chrome and at least one additional desktop browser.
- [ ] Play complete games on iPhone and iPad.
- [ ] Verify mouse, touch, click, and drag-and-drop behavior.
- [ ] Test very large Master piles and long effect-choice lists.
- [ ] Test narrow screens, landscape orientation, browser zoom, and large text settings.
- [ ] Verify keyboard navigation, visible focus, button labels, dialog behavior, and meaningful image alternatives.
- [ ] Confirm that the redesigned state and army panels remain aligned in every level and variant.
- [ ] Check that all victory, defeat, elimination, rematch, and abandonment paths are usable.

## 10. Replace prototype metadata and stale documentation

When the project is ready to be described as production software:

- [ ] Replace the site description **Private Core-rules playtest prototype**.
- [ ] Decide whether the site should remain unindexed or become discoverable by search engines.
- [ ] Update `README.md`, which currently describes special effects as deferred and understates the implemented levels.
- [ ] Update `docs/MULTIPLAYER.md`, which contains both implemented information and older planned-language sections.
- [ ] Remove obsolete uses of **prototype** from player-facing rules and descriptions where they are no longer accurate.
- [ ] Advance the package version from `0.1.0` to the chosen production version.
- [ ] Confirm the final product title, subtitle, copyright notice, and publisher identification everywhere they appear.

## 11. Complete release-policy and attribution decisions

- [ ] Decide whether the first production release is public, unlisted, or protected for invited playtesters.
- [ ] If feedback continues to collect optional email addresses and diagnostics, provide an appropriate privacy notice.
- [ ] Record the source and usage status of the background map and other third-party material in visible credits or release documentation.
- [ ] Confirm ownership or permission for all card artwork, portraits, logos, fonts, and other production assets.
- [ ] Decide whether public terms of use or a playtest notice are required.

## Deliberately deferred features

The following features are not necessary for the first production release unless the intended scope changes:

- Public matchmaking.
- Built-in player chat.
- Conventional player accounts.
- Cross-device identity recovery.
- Multiple remembered rooms in one browser.
- Spectators who were not original participants.
- Rankings, statistics, achievements, or persistent player profiles.

## Recommended completion order

1. Finish statistics reconciliation.
2. Import and internalize all card artwork, including resolving The Hunchback's Son.
3. Rewrite card effects and complete the formal Master rules.
4. Freeze the card data, deck composition, and effect language.
5. Run final balance simulations.
6. Finish eliminated-player multiplayer handling and public-access abuse protection.
7. Verify Supabase, feedback, cleanup, backup, and recovery configuration.
8. Add continuous-integration release gates and production monitoring.
9. Complete browser, device, multiplayer-load, and accessibility testing.
10. Update metadata, documentation, versioning, credits, and release policies.

## Production-complete definition

Nubian Kings may reasonably be considered production-complete when:

- The statistics and deck composition are approved and frozen.
- Every playable card has durable artwork and final rules text.
- All programmed effects agree with the card text and formal rules.
- Balance results fall within approved tolerances.
- Multiplayer survives realistic concurrent use without leaking hidden information.
- Production services, cleanup, feedback, backups, and recovery are verified.
- Tests and builds are enforced before deployment.
- The supported desktop and portable-device workflows pass final acceptance testing.
- Public-facing metadata and documentation accurately describe the released game.
