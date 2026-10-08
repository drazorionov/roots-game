# Root Helper

A small React + Next.js companion for **Root: The Roleplaying Game**, with persistent character sheets and shared campaigns in Neon Postgres.

**Live:** https://root-helper.vercel.app  
**Repository:** https://github.com/drazorionov/roots-game

## What works

- Sign up and sign in with a name, email, and password.
- Create campaigns and invite players using a random 16-character code.
- Create illustrated character cards and view everyone in your campaign.
- Edit your own character: species, playbook, pronouns, five attributes, injury/exhaustion/depletion, nature, drives, bonds, biography, moves, roguish feats, and weapon skills.
- Track equipment, wear, total carried load, advancement, and faction standing / prestige / notoriety.
- Roll 2d6 plus an attribute. Search characters and filter by playbook.
- View a sample party before signing up. Sample characters are illustrative, not canonical pre-generated characters.
- Responsive desktop/mobile layouts; keyboard-accessible dialogs; saved changes refresh for other players every 15 seconds.

The field structure follows the supplied Russian character-sheet reference; the initial interface is in English. All portrait and woodland illustrations are original SVG artwork. No reference photo or scanned rulebook content is published.

## Local development

Requires Node.js 20.9+ (production uses Node 24), npm, and a Neon database.

```sh
npm ci
cp .env.example .env.local
# Put your Neon connection string in DATABASE_URL in .env.local.
npm run db:migrate
npm run dev
```

Open http://localhost:3000. `DATABASE_URL` is server-only; never expose it using `NEXT_PUBLIC_`. Migrations are idempotent and run explicitly, not during page requests or builds.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

For the end-to-end smoke test, run the app in another terminal and configure `.env.local` for **the same database used by that app**:

```sh
npm test
# Or test the deployed app against its configured database:
TEST_BASE_URL=https://root-helper.vercel.app npm test
```

The smoke test uses locally installed Google Chrome via Playwright. It creates two uniquely named temporary test accounts, exercises account sessions, campaign sharing, cross-user access restrictions, character validation, stale-write conflicts, origin checks, browser creation, reload persistence, and mobile layout, then removes its accounts and campaign in a `finally` block. Screenshots are saved in ignored `test-results/`. Run against a dedicated test database when developing schema changes.

## Deployment

Vercel project: `root-helper` in `drazorionov-projects`. Neon resource: `root-helper-db`, free plan, Frankfurt region. The Neon marketplace integration injects `DATABASE_URL` into Vercel environments. `.vercel/` and all real environment files are ignored.

```sh
vercel link --project root-helper
vercel env pull .env.local
npm run db:migrate
vercel --prod
```

Database tables: `users`, `sessions`, `campaigns`, `memberships`, `heroes`, and `rate_limits`. Parameterized queries run through the Neon serverless driver. Campaign membership gates reads; only character owners can write. Writes use version numbers to reject stale edits. Passwords use salted scrypt; session tokens are random, hashed in the database, and stored in HttpOnly, SameSite cookies (Secure in production). Auth and campaign joins have database-backed rate limits. Mutation requests require a matching origin.

## MVP boundaries

This is a manual digital character sheet, not a complete Root rules engine. Copy starting values and moves from your playbook. The four-box harm and wear tracks follow the reference sheet; reputation advancement and load consequences are applied manually. The app currently has no password recovery, email verification, account deletion UI, campaign moderation, portrait uploads, or offline editing. Campaign invite codes grant membership and should be shared only with intended players. Rate-limit/session records can be periodically pruned after their expiry.

Production dependencies pass `npm audit --omit=dev`. The initial full audit reports a development-only `braces` advisory through Next's ESLint plugin; npm's suggested downgrade is incompatible with the current framework. Do not lint untrusted third-party glob patterns.

Root is owned by Leder Games; Root: The Roleplaying Game is published by Magpie Games. This is an unofficial fan companion, not affiliated with either publisher and not a substitute for the rulebook. Official resources: https://magpiegames.com/collections/root
