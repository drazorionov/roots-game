# Playbook reference

The nine core playbooks follow the user-supplied **Root Player Handouts Complete.pdf** (149 pages), a compiled handout with expanded skill choices. The six-section creation flow groups the twelve steps on handout page 149: identity (1–3), background and starting reputation (4), nature and drives (5–6), abilities (7–9), equipment (10), and review/introductions/connections (11–12). This supplied document identifies itself as a fan compilation with expanded options, rather than an official core-book printing. Handout variants may differ from other printings. No PDF or complete rulebook text is distributed with the app; move descriptions are brief rewritten reminders. Russian and German translations are provided for this companion.

| Playbook   | First handout page |
| ---------- | ------------------ |
| Adventurer | 3                  |
| Arbiter    | 7                  |
| Harrier    | 37                 |
| Ranger     | 73                 |
| Ronin      | 77                 |
| Scoundrel  | 81                 |
| Thief      | 93                 |
| Tinker     | 97                 |
| Vagrant    | 101                |

Creation uses each playbook’s attributes plus one chosen +1 (maximum +2 before move bonuses), one nature, two drives, three starting moves, roguish feats, and starting weapon choices. Tinker includes Toolbox and Repair. Starting value is a spendable coin budget; players can add weapons and supplies during creation, with payment from coin selected by default. Background choices mark two prestige with a served faction and one notoriety with an enemy. Creation can be saved incomplete, with a checklist for remaining choices.

## Automatic effects

- Well-Read, Brute, Fleet of Foot and Hand, Always Watching, and Master Thief add their attribute bonus once, to a maximum +3.
- Hardy, Cross Country, and Big Pockets add their harm boxes. Advanced settings allow base tracks to grow from four to six; move bonuses are additional.
- Always Armed, Pocket Sand, Don’t Shoot the Messenger, and It’s a Distraction add their corresponding skill or feat.
- Dirty Fighter guides two extra weapon choices.
- Attribute rolls use 2d6 plus the effective attribute, forward, and ongoing. Forward is consumed after a successful save. Hold is tracked manually.
- Fulfilling the selected nature clears exhaustion; a drive awards one advancement per session. Starting a new session resets drive marks without reducing advancement.
- Equipment load is compared with 4 + Might and twice that value. Optional purchases deduct the item’s value from coins. Wear is bounded by the item’s configured capacity, including zero-wear items.

## Manual decisions

Players and the GM resolve move triggers, situational effects, damage, and advancement purchases. The generic roll result is a reminder; the particular move determines its outcome. Reputation standing, prestige, and notoriety are separate manual counters. Equipment prices, tags, and capacities are entered by players. This is a character companion, not a complete rules engine.

Existing free-text moves, skills, drives, background, and equipment remain editable. New structured fields use defaults when older sheets are loaded. No database migration is needed for this update because sheets are stored as JSON.

## Application campaign lock

Campaign assignment locks the character build for regular players; this is an application policy, not a Root rule. The API compares normalized setup fields against the stored version and permits regular players to change only tabletop tracking fields. The current campaign owner can edit full campaign copies through Player sheets; personal base characters remain unaffected. Ownership transfer reassigns these permissions to another existing member and leaves the former owner as a regular member. Existing campaign assignment cannot be cleared through the character update endpoint. Campaign deletion retains characters and clears their assignment as before. Unassigned characters and browser-local quick characters use the same page editor. Drafts can be saved without joining; the final review offers the explicit campaign-joining action.

The Play view keeps harm, attribute rolls, weapon load/wear, and playbook reminders visible. Weapon cards store their type, range and harm and offer the basic Might/Finesse rolls (handout pages 114–116). Special-move costs and outcomes remain table decisions. Existing equipment defaults to generic gear and retains its notes, value, load and wear.

## Reputation ledger

The live sheet follows the reputation area in the user's `IMG_6528.heic` photo and the supplied handout's printed page 4: nine notoriety boxes in three groups of three, zero in the middle, and fifteen prestige boxes in three groups of five. Notoriety fills from the center toward the left; prestige fills toward the right. Tapping a marked box clears it and the marks farther from zero. The seven standing values remain separate, manually selected milestones from -3 to +3; marking boxes does not automatically change standing or apply playbook effects.

New sheets include Denizens, Marquisate, Eyrie Dynasties, Woodland Alliance, Grand Duchy, Riverfolk Company, Lizard Cult, and Corvid Conspiracy. Older sheets gain the latter four when loaded or opened in the creation and active-sheet reputation forms, with zero standing, prestige, and notoriety; existing entries, marks, and order are preserved. Underground Duchy counts as Grand Duchy, and case or surrounding whitespace does not create duplicates. The ledger supports sixteen entries so a full legacy twelve-entry sheet has room for these additions. Starting reputation appears above the tracks; the live sheet has no add-faction control. Previously saved custom factions keep their neutral flag. Board-game aliases Marquise de Cat, Underground Duchy, and Lord of the Hundreds use their corresponding RPG faction icons. Legacy sheets with more than nine notoriety retain their value and show an adjustment counter; the storage schema remains backward compatible.

Cross-checks: [Magpie's core play materials](https://magpiegames.com/collections/pdfs-all/products/play-materials-corebookroot), the [Adventurer playbook](https://root-rpg.vercel.app/playbooks/Root-Playbook-Adventurer.pdf) for starting reputation, and [Root's official digital site](https://www.direwolfdigital.com/root/) for faction identities. The user's later faction chart guides the revised original artwork's species, costumes, flat colors, and compact cartoon proportions.

## Tap-to-read sheet reference

Attribute names open rule help separately from the dice buttons. Harm, modifiers, all 14 roguish feats, all 24 weapon skills, equipment terms, playbook moves, natures, and drives have tap/click descriptions. New base-rule reminders cite the supplied handout pages and are translated into English, Russian, and German. Mastery upgrades are not assumed. Reading help never rolls dice, consumes modifiers, or changes the sheet.

Equipment uses compact tiles with a permanent coin tile first, an original SVG coin illustration, and a load overview below the section heading. Character information and abilities use compact icon tiles with short previews and full descriptions on demand. General sheet guidance and setup notices live in the active game's footer. Existing saved equipment, reputation, and session state are preserved.
