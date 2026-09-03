# Nubian Kings prototype

Private playtest prototype for the Core Beginner and Amateur games of *Nubian Kings: The Battle for Africa*.

## Prototype scope

- Five playable factions
- One human player and one to four computer opponents
- Strength, zeal, and wealth comparisons
- Ties, discards, elimination, Nile Floods, victory, and browser autosave
- Amateur single-line non-Leader armies, fully available Leader heir choices, targeted attacks, and optional replenishment
- Standard first-heir and long-game last-heir victory rules
- Reconciled card artwork with spreadsheet-authoritative statistics
- Responsive desktop and portable-device interface
- Special card effects deferred
- The Hunchback's Son retained in canonical data but unavailable in prototype decks because its artwork is missing
- Anonymous in-game feedback with optional contact email and privacy-limited diagnostics
- Private Beginner multiplayer rooms for two to five participants, including mixed human and computer games
- Server-authoritative multiplayer turns, hidden-card filtering, reconnection, and shared result pauses

## Beginner multiplayer

Beginner multiplayer uses anonymous Supabase identities and six-character private room codes. Apply `supabase/migrations/20260903_beginner_multiplayer.sql` to the connected Supabase project before opening multiplayer in production. The database tables have Row Level Security enabled and intentionally expose no direct browser policies; authenticated game actions pass through the server routes.

Amateur multiplayer additionally requires `supabase/migrations/20260904_amateur_multiplayer.sql`.

The authoritative record of implemented, approved, and deferred multiplayer behavior is in [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md).

Configure these Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

The secret key is server-only and must never be exposed through a `NEXT_PUBLIC_` variable.

## Feedback delivery

The feedback form sends reports to `grr919@gmail.com` through Resend. Configure these Vercel environment variables before using it in production:

- `RESEND_API_KEY`: a Resend API key
- `FEEDBACK_FROM_EMAIL`: a sender on a domain verified in Resend, such as `Nubian Kings Feedback <feedback@example.com>`

The client sends only the game level, seed, round, phase, public settings, human faction, NPC count, recent public history, browser identifier, and viewport when the tester leaves diagnostic sharing enabled. Hidden cards, reserve order, complete saves, and deck contents are excluded by construction.

## Local verification

```sh
pnpm test
pnpm build
```

## Deployment

The project is configured for Vercel. Search indexing is blocked through page metadata and deployment headers. This makes an unlisted deployment difficult to discover but does not constitute authentication; use Vercel deployment protection or an application access gate if invitation-only access is required.
