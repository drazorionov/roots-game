# Root Helper

A simple React + Next.js companion for Root: The Roleplaying Game, designed for iPhone and iPad.

[Live app](https://root-helper.vercel.app) · [Repository](https://github.com/drazorionov/roots-game)

## Use the app

- Create or edit a character on a full page with six sections: identity, background, nature and drives, abilities, equipment, and review/connections. A section sidebar supports desktop and iPad; phones use compact section navigation. Nine core playbooks supply starting attributes, nature, drives, moves, feats, and weapon choices. Save an unfinished draft at any step and finish it later.
- Choose Quick game on the welcome page for an offline tabletop companion: create a character without an account or campaign. Its sheet stays in session storage in the current browser tab, survives refresh, and is not uploaded. Start online once; “Ready for offline play” confirms the public app assets are cached for offline refresh. Closing the tab ends this temporary game (browser session restoration may restore it).
- Sign in for persistent characters and online campaigns.
- Delete your own characters from My characters, or campaigns you created from My campaigns. Both actions ask for confirmation. Deleting a campaign keeps every player’s characters and removes their campaign assignment.
- See your campaigns, join with an invite code, or create one and share its code. Leave a joined campaign from its card or the active game menu. Leaving removes your membership and online presence while keeping your characters, equipment, and progress; characters from that campaign become unassigned and editable. Rejoin later with an invite code. Campaign creators cannot leave their own campaign.
- Choose a campaign for your saved character. Joining saves an independent campaign copy; My characters keeps the editable base. Base edits never change an existing campaign copy, and campaign progress never changes the base. Tap harm boxes to track injury, exhaustion, and depletion; manage equipment, coins, load, and wear. Roll attributes with forward/ongoing modifiers, mark fulfilled drives, and track faction reputation. Each change saves immediately.
- Switch between English, Russian, and German. Your device remembers the language; your written content remains unchanged.

The welcome page uses an illustrated forest background. After sign-in, home offers three actions: Continue (or Start / join), My characters, and My campaigns. Continue remembers the last active game on this device. New games select, create, or join a campaign first, then select or create a character using the same card screens as My campaigns and My characters. The landing-page Quick game button opens a fresh character draft immediately. Each screen has a distinct illustrated background: home camp, character armory, campaign crossroads, and active-game watchtower. During play, the campaign name and online players appear above the sheet, with a compact menu containing Exit to main, Restart game, and Start new game. The consistent header has a home link and EN / RU / DE language control on every screen. Inner pages share the home page’s left edge. My characters and My campaigns use two-column card grids on iPad and three columns on desktop. Character cards show the five main attributes (including move bonuses), with original woodland ink icons; campaign cards show membership, clearing, and a short description with management actions at the bottom. Restart reopens character selection in the current campaign and preserves all saved stats; Start new game begins campaign selection without deleting an existing game. Phone screens stack the controls; iPad screens put harm and equipment side by side. The visual theme uses textured parchment, ink borders, serif headings, and rust, sage, ochre, and slate accents inspired by the supplied character reference and [Root’s official digital site](https://www.direwolfdigital.com/root/). Character portraits cover all 90 core playbook/species combinations with original generated artwork, stored as transparent WebP images. Create and edit screens use matching illustrated cards for playbook and species selection, with previews reflecting both choices. The same portrait appears in the character list, review, and play sheet. Custom combinations retain an SVG fallback. The empty-state woodland illustration was also generated with imagegen and optimized as a local WebP. Asset provenance and the generation prompt are recorded in [public/art/README.md](public/art/README.md). Existing character data is preserved when editing an unassigned sheet. The campaign copy locks identity, attributes, background, and ability choices in both the interface and API. Base characters remain editable at any time. Returning to a campaign reuses its saved copy; another campaign gets its own snapshot. Harm, rolls, hold/modifiers, equipment, coin, reputation, and session progress remain editable. Owners cannot bypass the lock by detaching the character; campaign deletion releases the assignment. The default Play tab shows equipment and special moves together, with harm and attribute rolls close at hand.

## Development

Requires Node.js 20.9+, npm, and Neon Postgres (production uses Node 24).

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL in .env.local.
npm run db:migrate
npm run dev
```

Database migrations are idempotent and run explicitly. The current migration links campaign copies to their base characters and creates editable bases for legacy assigned characters using their current saved sheets. Earlier pre-campaign values cannot be recovered. Run the migration before starting the updated app. Database credentials remain server-only.

```sh
npm run lint
npm run build
npm run typecheck
# With the app running and .env.local pointing to the same database:
npm test
```

Tests cover character privacy, campaign membership, owner-only edits, stale-write rejection, validation, origin checks, tab-only quick games, offline refresh, owner-only deletion, campaign deletion preserving characters, automatic harm and gear saves, campaign creation/joining, and translated phone/tablet layouts. The browser test uses installed Google Chrome through Playwright, creates temporary accounts, and cleans them up. Screenshots go in ignored `test-results/`.

## Deployment

Vercel project `root-helper` uses the Neon marketplace database `root-helper-db` (Frankfurt, free plan).

```sh
vercel link --project root-helper
vercel env pull .env.local
npm run db:migrate
vercel deploy --prod --yes
```

The application uses `users`, `sessions`, `campaigns`, `memberships`, `heroes`, `rate_limits`, and `campaign_presence`. Reads and writes are authenticated; character lists are personal, campaign reads require membership, and only owners can change their characters. Version checks prevent stale edits. Passwords use salted scrypt; session cookies are HttpOnly and SameSite, with Secure in production. Account and join requests have database-backed rate limits. Mutations require matching origins.

Translations live in `src/lib/locales/{ru,de}.json`. Character data retains stable identifiers regardless of language. Tests check translation coverage and placeholders.

Playbook presets and short move reminders follow the supplied player handouts; [reference notes](docs/playbook-reference.md) explain automatic and manual effects. Password recovery is not available. Offline editing is supported only in Quick game; account-backed characters require a connection. Root belongs to Leder Games; Root: The Roleplaying Game is published by Magpie Games. This is an unofficial fan companion.

Campaign presence sends a heartbeat every 20 seconds while the game is visible. Campaign members active within 75 seconds count as online; duplicate tabs count once. The endpoint requires authentication, matching origin, and campaign membership. Names are visible only to members of that campaign. Run `npm run db:migrate` before deploying this update.
