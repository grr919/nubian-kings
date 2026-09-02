# Nubian Kings prototype

Private playtest prototype for the core Beginner game of *Nubian Kings: The Battle for Africa*.

## Prototype scope

- Five playable factions
- One human player and one to four computer opponents
- Strength, zeal, and wealth comparisons
- Ties, discards, elimination, Nile Floods, victory, and browser autosave
- Reconciled card artwork with spreadsheet-authoritative statistics
- Responsive desktop and portable-device interface
- Special card effects deferred
- The Hunchback's Son excluded

## Local verification

```sh
pnpm test
pnpm build
```

## Deployment

The project is configured for Vercel. Search indexing is blocked through page metadata and deployment headers. This makes an unlisted deployment difficult to discover but does not constitute authentication; use Vercel deployment protection or an application access gate if invitation-only access is required.
