# Nubian Kings Multiplayer Specification

Status: active design document  
Last updated: September 4, 2026

This document is the authoritative record of multiplayer decisions for *Nubian Kings: The Battle for Africa*. It distinguishes implemented behavior for Beginner and Amateur from approved work for Master.

## Shared multiplayer model

### Scope and access

- Multiplayer games contain two to five total participants.
- At least two participants must be human.
- Any remaining seats may be assigned to computer opponents.
- Games are private and invitation-only. The host creates a room and shares its six-character room code.
- Public matchmaking is deferred.
- Players use temporary display names and do not create conventional accounts.
- Supabase assigns each browser an anonymous identity for authorization and reconnection.
- One browser remembers one multiplayer room at a time.

### Lobby and host

- The room creator is the host.
- The host chooses the total number of participants, number of computer opponents, Nile Floods setting, opening initiative, and any level-specific victory setting.
- Every designated human seat must be occupied before the game can begin.
- Each human chooses an available faction. A faction can belong to only one participant.
- Computer factions are assigned from the remaining factions when the host begins the game.
- The host may not begin until all required humans have joined and selected factions.

### Timing, disconnection, and elimination

- Play is live and turn-based without a mandatory turn clock.
- A disconnected human retains the seat for two minutes.
- During that period, reconnecting from the same browser restores control automatically.
- After two minutes, the host may permanently replace the disconnected human with a computer opponent.
- A player may deliberately leave and permanently transfer control to a computer after confirming the choice.
- An eliminated human may leave the game or remain as an observer.
- Active games are saved automatically on the server.
- Inactive games may be deleted after seven days.

### Result pacing

- An attack or comparison result must remain visible long enough for the relevant players to understand it.
- Ordinary result screens use explicit continuation rather than disappearing automatically.
- A decisive final matchup must remain visible until each human deliberately chooses **View Final Result**.
- Victory and defeat screens must provide routes to another multiplayer game and the appropriate level menu.

### Language and presentation

- Battle headings use **A Battle of Strength**, **A Battle of Zeal**, or **A Battle of Wealth**.
- Outcome text is specific to the selected trait.
- Each player sees correct second-person language for their own result and third-person language for other players.
- Defeated cards use the same **Defeated** banner as solo play.
- Multiplayer should preserve the established sunlit Nubian Kings visual design.

## Server authority and hidden information

- The server owns the complete, authoritative game state.
- The server validates every faction choice, attack, replenishment, acknowledgement, and other game action.
- Clients send intentions, never replacement game states.
- Optimistic revision checks reject simultaneous or stale actions.
- Each client receives only information that participant is entitled to see.
- Face-down card names, statistics, canonical identifiers, reserve order, deck order, and other hidden data remain on the server.
- Multiplayer card identifiers are opaque and do not reveal the underlying card.
- Computer decisions are made on the server using only information legally available under the game rules.
- Database tables have Row Level Security enabled and no direct public table policies.
- Authenticated game actions pass through Nubian Kings server routes.
- Secret Supabase credentials remain server-only.

## Beginner multiplayer

### Implemented behavior

- Private room creation and joining by room code
- Anonymous browser identity and same-browser reconnection
- Two to five total participants with at least two humans
- Mixed human and computer games
- Host-selected Nile Floods and opening initiative
- Human faction selection and automatic computer faction assignment
- Server-authoritative five-card armies and trait comparisons
- Hidden-card filtering
- Server-controlled computer trait choices
- Conflict protection for simultaneous actions
- Shared ordinary-round review and continuation
- Persistent final matchup followed by deliberate **View Final Result**
- Trait-specific outcome language
- Victory-screen exits to a new multiplayer game or the Beginner menu

### Beginner follow-up work

- Host replacement of a disconnected player after two minutes
- Deliberate permanent transfer of a human seat to a computer
- Explicit eliminated-player leave-or-observe choice
- Same-room rematch preserving the group and settings
- Automated cleanup of games inactive for seven days
- CAPTCHA or equivalent anonymous-sign-in abuse protection
- Concurrent-game load testing

## Amateur multiplayer

The following behavior is implemented.

### Setup and heirs

- Amateur reuses the shared multiplayer lobby and room-code system.
- The host also chooses standard or long-game victory.
- Every faction's Leaders are removed before its ten-card army is dealt.
- Each human chooses an heir privately from all eligible Leaders in that faction.
- An heir selection is locked when its player confirms it.
- All heirs are revealed simultaneously after every human has confirmed.
- Computer factions choose their heirs on the server.

### Attacks

- On the active player's turn, that player selects a statistic, an attacking card, an opponent, and a target card.
- The player confirms the complete selection to declare the attack.
- Every human then sees the declared attacker, target, and statistic while both selected cards remain hidden.
- The attacking player deliberately chooses **Resolve Attack** after the declaration pause.
- Both cards are then revealed and the attack is resolved on the server.
- An heir cannot attack until its army is empty.
- An enemy heir cannot be targeted until its army is empty.
- Tied attacks defeat neither card and provide no replenishment.

### Result acknowledgement

- Every non-eliminated human acknowledges an ordinary attack result before the game advances.
- This shared pause applies even to humans who were neither attacker nor defender.
- The decisive final attack remains visible until each human deliberately selects **View Final Result**.

### Replenishment

- After a non-tied attack, the winning card's owner receives any available replenishment decision.
- The winner may be the attacker or defender.
- If the winner is human, only that player may restore a public discarded card, draw from the hidden unused deck, or skip replenishment.
- If the winner is a computer, the server makes the replenishment choice.
- The game remains paused until replenishment is completed or skipped.

### Victory and elimination

- Standard victory ends the game when the first heir is eliminated.
- Long-game victory continues until only one heir remains.
- Eliminated humans receive the shared option to leave or remain as observers.
- Final victory or defeat appears only after the decisive matchup has been reviewed.

## Master multiplayer

The following design is approved for implementation.

### Shared room behavior

- Master reuses the private six-character room-code system.
- Games contain two to five total participants and at least two humans; remaining seats may be assigned to computer opponents.
- The host selects participant count, computer opponents, Nile Floods, opening initiative, and standard or long-game victory.
- Every human selects a unique available faction.
- Anonymous Supabase identities, same-browser reconnection, server authority, deliberate result pacing, and the established multiplayer language and presentation rules apply unchanged.

### Private heir selection and deal

- Each human privately selects any eligible Leader from that faction.
- A confirmed heir choice is locked.
- Unchosen Leaders return to that player's deck before the twenty-card army is dealt.
- All heirs are revealed simultaneously only after every human has confirmed an heir.
- The server chooses computer heirs.
- The server privately deals each human twenty cards. No participant may inspect another player's cards.

### Private army construction

- Each human independently arranges all twenty cards into legal Place–Person–Thing piles.
- A Leader may occupy the Person position.
- A Thing may not stand alone in the initial army.
- The interface provides Undo, Reset, and Auto-arrange.
- The server stores each construction action, validates pile legality, and permits same-browser reconnection without losing the draft.
- A player presses **Confirm Army** when every card belongs to a legal pile. Confirmation is irreversible.
- Play begins only after every human has confirmed.
- During construction, opponents see only whether each participant is arranging or ready. They never receive that participant's cards, types, pile structure, or selections.
- Computer armies are legally arranged on the server without using knowledge unavailable under the rules.

### Public information and attacks

- When play begins, each participant may see every faction, revealed heir, number of army piles, and number of cards in each pile.
- The identities, types, statistics, and internal order of face-down cards remain hidden.
- On the active player's turn, that player selects a statistic, an attacking pile, an opponent, and a target pile, then confirms the complete attack.
- An heir cannot attack until every card in its army is gone.
- An enemy heir cannot be targeted until every card in its army is gone.
- Every human sees the declared units and statistic while their cards remain hidden.
- The attacker deliberately chooses **Resolve Attack** after the declaration pause.

### Resolution and acknowledgement

- Resolution reveals every card in the attacking and defending units.
- Each unit's score is the selected statistic's combined card total plus any Nile Floods die roll.
- A defeated pile is discarded in full.
- A tie defeats neither unit and provides no replenishment.
- Every non-eliminated human acknowledges an ordinary result before play advances.
- The decisive final battle remains visible until each human deliberately selects **View Final Result**.

### Replenishment

- After a non-tied battle, the winning player receives any available replenishment decision.
- A human winner may draw one hidden reserve card as a new standalone unit, up to the twenty-card army limit, or skip.
- The replenishment card does not join or reopen an existing pile.
- The server makes computer replenishment decisions.
- Play remains paused until replenishment is completed or skipped.

### Victory, elimination, and recovery

- Standard victory ends when the first heir is eliminated.
- Long-game victory continues until only one heir remains.
- Eliminated humans may leave or remain as observers.
- Final victory or defeat appears only after the decisive matchup has been reviewed.
- Active game state and private construction drafts are stored on the server for reconnection.

## Deferred shared features

- Public matchmaking
- Built-in player chat
- Conventional player accounts
- Cross-device identity recovery
- Multiple remembered rooms in one browser
- Spectators who were not original participants
- Rankings, statistics, or persistent player profiles

## Implementation checklist

| Area | Approved | Implemented | Tested |
|---|---:|---:|---:|
| Shared private rooms and anonymous identities | Yes | Yes | Yes |
| Beginner lobby and faction assignment | Yes | Yes | Yes |
| Beginner synchronized gameplay | Yes | Yes | Yes |
| Beginner hidden-information filtering | Yes | Yes | Yes |
| Beginner trait-specific results | Yes | Yes | Yes |
| Beginner persistent final matchup | Yes | Yes | Yes |
| Disconnect replacement and voluntary transfer | Yes | No | No |
| Eliminated-player observer choice | Yes | No | No |
| Same-room rematch | Yes | Yes | Yes |
| Seven-day cleanup | Yes | Yes | Yes |
| CAPTCHA or equivalent abuse protection | Yes | No | No |
| Concurrent-game load testing | Yes | No | No |
| Amateur multiplayer setup and private heir selection | Yes | Yes | Yes |
| Amateur declared attacks and resolution pause | Yes | Yes | Yes |
| Amateur synchronized result acknowledgement | Yes | Yes | Yes |
| Amateur replenishment | Yes | Yes | Yes |
| Amateur standard and long-game victory | Yes | Yes | Yes |
| Master multiplayer shared lobby and setup | Yes | Yes | Yes |
| Master private heir selection and twenty-card deal | Yes | Yes | Yes |
| Master server-managed private pile construction | Yes | Yes | Yes |
| Master hidden-information filtering | Yes | Yes | Yes |
| Master pile combat and synchronized resolution | Yes | Yes | Yes |
| Master replenishment and victory | Yes | Yes | Yes |

## Deployment dependencies

Multiplayer currently depends on:

- Vercel for the Nubian Kings application and server routes
- Supabase Auth for anonymous player identities
- Supabase Postgres for rooms, participants, authoritative game state, reviews, and revision control
- The migration in `supabase/migrations/20260903_beginner_multiplayer.sql`
- The migration in `supabase/migrations/20260904_amateur_multiplayer.sql`
- The migration in `supabase/migrations/20260905_master_multiplayer.sql`

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `CRON_SECRET`

No secret values belong in this document, the repository, browser-visible code, or screenshots.
