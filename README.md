# Root Helper

A simple React + Next.js companion for Root: The Roleplaying Game, designed for iPhone and iPad.

[Live app](https://root-helper.vercel.app) · [Repository](https://github.com/drazorionov/roots-game)

## Use the app

- My characters opens the character editor directly. Saving or leaving the editor returns to the character list; playable sheets appear only in campaign and Quick game modes. Create or edit a character on a full page with six sections: identity, background, nature and drives, abilities, equipment, and review/connections. A section sidebar supports desktop and iPad; phones use compact section navigation. Nine core playbooks supply starting attributes, nature, drives, moves, feats, and weapon choices. Save an unfinished draft at any step and finish it later.
- Choose Quick game on the welcome page for an offline tabletop companion: create a character without an account or campaign. Its sheet stays in session storage in the current browser tab, survives refresh, and is not uploaded. Start online once; “Ready for offline play” confirms the public app assets are cached for offline refresh. Closing the tab ends this temporary game (browser session restoration may restore it).
- Sign in for persistent characters and online campaigns.
- Delete your own characters from My characters, or campaigns you created from My campaigns. Both actions ask for confirmation. Deleting a campaign keeps every player’s characters and removes their campaign assignment.
- See your campaigns, join with an invite code, or create one and share its code. Leave a joined campaign from its card or the active game menu. Leaving removes your membership and online presence while keeping your characters, equipment, and progress; characters from that campaign become unassigned and editable. Rejoin later with an invite code. Current campaign owners must transfer ownership before leaving.
- Choose a campaign for your saved character. Joining saves an independent campaign copy; My characters keeps the editable base. Base edits never change an existing campaign copy, and campaign progress never changes the base. Tap harm boxes to track injury, exhaustion, and depletion; manage equipment, coins, load, and wear. Roll attributes with forward/ongoing modifiers, mark fulfilled drives, and track faction reputation. Controls update immediately while a per-character queue saves changes in the background. Rapid clicks are combined into ordered writes. Attribute and weapon rolls open an animated result popup and also appear in activity notifications. Both show the same dice and modifiers; forward is consumed once locally without waiting for the network. Tap anywhere on an attribute tile to roll; its name opens the rules popup.
- During an active game, bottom-left activity popups show saved character changes from all campaign players and attribute or weapon rolls. Popups stack without overlapping, scroll on small screens, and can be hidden individually or all at once. Hiding affects only your current view; new activity still appears. Campaign activity polls every three seconds while visible; Quick game logs stay local and work offline. Run `npm run db:migrate` to create the shared activity table and sheet-change trigger before using this update.
- In Equipment, use Add equipment → Choose a visual to browse 35 illustrated deck presets, or create a custom Weapon or Item. Choose harm, ranges, skill tags, and special tags with definitions; paired items can track wear separately. The searchable reference covers all 24 special weapon skills. See [equipment reference](docs/equipment-reference.md) for source details.
- Campaign members can click a party tile or open **… → Player sheets** to display any campaign character sheet directly on the page, with a return to their own character. Long tile names stay on one line with an ellipsis and a full-name tooltip. Campaign owners can open **… → Player sheets** from a campaign card or the active game menu to view every campaign character, change live trackers, or edit the full build. Saves preserve each player’s personal base and reject conflicting versions. **… → Transfer campaign** opens a player dropdown and explicit confirmation; the new owner gains master permissions, while the former owner remains a regular member. Only current members with active accounts can receive ownership.
- Switch between English, Russian, and German. Your device remembers the language; your written content remains unchanged.

The welcome page uses an illustrated forest background. After sign-in, home offers three actions: Continue (or Start / join), My characters, and My campaigns. Continue remembers the last active game on this device. New games select, create, or join a campaign first, then select or create a character using the same card screens as My campaigns and My characters. The landing-page Quick game button opens a fresh character draft immediately. Each screen has a distinct illustrated background: home camp, character armory, campaign crossroads, and active-game watchtower. During play, the campaign name and online players appear above the sheet, with a compact menu containing Exit to main, Restart game, and Start new game. The consistent header has a home link and EN / RU / DE language control on every screen. Inner screens share a Back control: active game → home; character selection → campaign selection → home; editors retain their unsaved-change confirmation. Phone collections and admin screens use the same individual parchment tiles as desktop, with transparent outer containers, one-column grids, and wrapping actions. Inner pages share the home page’s left edge. My characters and My campaigns use two-column card grids on iPad and three columns on desktop. Character cards show the five main attributes (including move bonuses), with original woodland ink icons; campaign cards show membership, clearing, and a short description with management actions at the bottom. Their main action is Continue for the current or previously started campaign, Start for an unstarted campaign you own, or Join for another player’s unstarted campaign. Start opens step 2, character selection. Switching away from the current campaign requires confirmation and preserves both games. Campaign activity is recorded permanently once a character enters, even if all players later leave. Restart reopens character selection in the current campaign and preserves all saved stats; Start new game begins campaign selection without deleting an existing game. Phone screens stack the controls; iPad screens put harm and equipment side by side. The visual theme uses textured parchment, ink borders, serif headings, and rust, sage, ochre, and slate accents inspired by the supplied character reference and [Root’s official digital site](https://www.direwolfdigital.com/root/). Character portraits cover all 108 playbook/species combinations, including bears and lizards, with original generated artwork, stored as transparent WebP images. Create and edit screens use matching illustrated cards for playbook and species selection, with previews reflecting both choices. The same portrait appears in the character list, review, and play sheet. Custom combinations retain an SVG fallback. The empty-state woodland illustration was also generated with imagegen and optimized as a local WebP. Asset provenance and the generation prompt are recorded in [public/art/README.md](public/art/README.md). Existing character data is preserved when editing an unassigned sheet. For regular players, the campaign copy locks identity, attributes, background, and ability choices in both the interface and API; the current campaign master can edit these through Player sheets. Base characters remain editable at any time. Returning to a campaign reuses its saved copy; another campaign gets its own snapshot. Harm, rolls, hold/modifiers, equipment, coin, reputation, and session progress remain editable. Characters cannot be detached through sheet updates; campaign deletion releases the assignment. The default Play tab shows equipment and special moves together, with harm and attribute rolls close at hand.

Campaign saves continue when navigating within the app. Failed requests keep pending edits in memory in the current tab, with Retry, Reload saved sheet, and Discard controls. Version conflicts pause editing until resolved explicitly; they never silently overwrite a newer sheet. Closing or reloading a tab with unsaved changes triggers the browser warning. Pending changes do not survive a forced reload or closed tab. Sign-out, campaign departure, and deletion wait for pending changes to be saved or discarded.

Initial account loading combines authentication, characters, and campaigns in one response. Character and campaign refreshes pause in hidden tabs, do not overlap, and retain unchanged data; roster refreshes follow the same rules. Administration and password recovery load on demand. Quick game's offline editor remains available.

## Development

Game activity notifications show the acting hero's portrait alongside a dice or character-change badge. Shared events retain their species and playbook snapshot; older events without portrait details use a neutral avatar. Run `npm run db:migrate` before deploying the notification portrait update.

Requires Node.js 20.9+, npm, and Neon Postgres (production uses Node 24).

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL and ADMIN_EMAIL in .env.local.
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

Tests cover character privacy, campaign membership, character-owner and campaign-master edit permissions, stale-write rejection, validation, origin checks, tab-only quick games, offline refresh, owner-only deletion, campaign deletion preserving characters, automatic harm and gear saves, campaign creation/joining, and translated phone/tablet layouts. The browser test uses installed Google Chrome through Playwright, creates temporary accounts, and cleans them up. Screenshots go in ignored `test-results/`.

## Deployment

Vercel project `root-helper` uses the Neon marketplace database `root-helper-db` (Frankfurt, free plan).

```sh
vercel link --project root-helper
vercel env pull .env.local
npm run db:migrate
vercel deploy --prod --yes
```

The application uses `users`, `sessions`, `campaigns`, `memberships`, `heroes`, `rate_limits`, and `campaign_presence`. Reads and writes are authenticated; character lists are personal, campaign reads require membership, and character owners can edit their own sheets; campaign owners can also edit every campaign copy in their campaign, including setup. Personal base sheets remain private and owner-only. Version checks prevent stale edits. Passwords use salted scrypt; session cookies are HttpOnly and SameSite, with Secure in production. Account and join requests have database-backed rate limits. Mutations require matching origins.

Translations live in `src/lib/locales/{ru,de}.json`. Character data retains stable identifiers regardless of language. Tests check translation coverage and placeholders.

Playbook presets and short move reminders follow the supplied player handouts; [reference notes](docs/playbook-reference.md) explain automatic and manual effects. Password recovery uses emailed single-use codes; configure the sender as described below. Offline editing is supported only in Quick game; account-backed characters require a connection. Root belongs to Leder Games; Root: The Roleplaying Game is published by Magpie Games. This is an unofficial fan companion.

Campaign presence sends a heartbeat every 20 seconds while the game is visible. Campaign members active within 75 seconds count as online; duplicate tabs count once. The endpoint requires authentication, matching origin, and campaign membership. Names are visible only to members of that campaign. Run `npm run db:migrate` before deploying this update.

## Administration

Set the server-only `ADMIN_EMAIL=d.razorionov@gmail.com` environment variable locally and in the deployment environment, then run `npm run db:migrate` before starting the updated app. The administrator signs in with the normal account password; the variable does not create an account or bypass authentication. If it is unset, no account has admin access.

Open **… → Administration** in the header between the language and sign-out controls. The searchable directory shows every user's profile, registration date, ban status, active session count, full character sheets, owned campaigns, and campaign memberships/presence. Password hashes and session tokens are never returned. Admin authorization is checked on the server for every read and action. The administrator cannot ban or purge their own account.

Ban revokes sessions and prevents sign-in and authenticated API access. Unban requires a fresh sign-in. Purge requires typing the account's email and permanently deletes the user, their sessions, memberships, presence, characters, and owned campaigns. Other players retain their characters from those campaigns as unassigned sheets. Abuse-prevention counters expire normally.

Registration permits at most **50 stored accounts total**, including the administrator and banned accounts. Concurrent signups serialize the count and insert in a database transaction. Existing accounts can still sign in at capacity; a purge frees a slot. The migration does not delete accounts if a pre-existing database already exceeds 50; registration stays closed until the count drops below 50.

## Password recovery

Set `RESEND_API_KEY` and `RECOVERY_FROM_EMAIL` in each deployment environment, using a verified Resend sender. Run `npm run db:migrate` before deployment. The [Resend send API](https://resend.com/docs/api-reference/emails/send-email) delivers plain-text recovery messages; credentials remain server-only. Without these variables, requests return a clear configuration error and never change passwords.

The login dialog offers **Forgot password?** and **Use a temporary code**. Admin tiles offer **Send recovery email**, including for the administrator's own account. Codes are sent only to the email saved on the account. Banned accounts cannot recover. Public requests give the same success response for unknown and ineligible accounts. Sending is limited to three requests per email per 15 minutes, with additional requester and verification limits.

A code has 64 bits of cryptographic randomness, is stored only as a SHA-256 hash, expires after 15 minutes, and is consumed atomically. Users can enter it in the login password field or the temporary-code form. Verification creates only a restricted, HttpOnly 10-minute recovery cookie, never an authenticated app session. The next screen requires a new password, after which all existing sessions are revoked and the user signs in normally. A newer recovery request invalidates earlier codes and recovery cookies; bans and purges remove outstanding recovery records. Merely requesting recovery does not change a password or revoke sessions.
