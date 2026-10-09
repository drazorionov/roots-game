# Equipment catalogue

Source: the user-supplied **Root RPG - Equipment Deck.pdf**, 90 PDF pages. Each equipment card uses an illustration on an odd page and rules on the following even page (1–70). The final 20 pages alternate ten special weapon skills with basic combat moves.

- `src/lib/equipment-catalogue.json` records all 35 cards: weapon/item category, range, printed harm, wear, value, weapon skill tags, special tags, and the rules page number.
- `src/lib/equipment-tags.json` contains all 36 distinct special tags and their definitions, source pages, and printed +/− values. Explosive is ++; Slow and Expendable are flaws. These values describe the deck, and do not automatically recalculate prices or apply effects.
- `public/art/equipment/*.webp` contains the illustrations extracted from the supplied PDF with their embedded transparency. They are source artwork, not newly generated illustrations. Each illustration is selectable independently of the item’s rules. No PDF is bundled in the app.
- `src/lib/equipment.ts` supplies editable presets and the 24-skill reference using the existing handout definitions. Ten skills have corresponding deck page references. The deck’s “Harry” maps to the existing “Harry a Group” identifier, and “Improvise a Weapon” maps to “Improvise Weapon.”

## Behavior

Equipment offers Weapon and Item. Shields, the flute, and the herb satchel are Items; damaging equipment with a Range/Harm block is a Weapon. Legacy `gear` and `armor` entries remain accepted without rewriting their saved notes, range, or category. New fields default on schema parsing, so existing character sheets need no database migration.

Use **Add equipment → Choose a visual** to browse the catalogue while creating an item. Choosing a card fills its default settings; review and customize them before adding it. The catalogue is not a section on the player card. When editing existing equipment, Choose a visual changes only its illustration. Selecting a card does not spend coin. “Pay from coin” is checked by default during character creation and optional during play; insufficient funds reject the entire addition. Editing never charges again. The source does not specify load: presets suggest 1, with an explicit instruction to agree on load with the GM.

Harm supports injury, exhaustion, wear, morale, depletion, special, and none, with a numerical amount and optional conditions. Only injury, exhaustion, special, and no listed harm occur as base harm on these cards; the other choices support custom items and effects. Ranges support Intimate, Close, and Far together, plus preserved custom text. No range is valid for items such as caltrops.

The dagger pair has two separate two-box wear tracks; its printed price is for the pair. Other cards have one wear track by default. Each track is independently validated against its capacity.

Skill tags do not teach character skills. The reference identifies learned skills but does not mutate the sheet. Tag rules open with the deck source and page, and selected special-tag effects are also shown in the editor. Conditional harm, reputation, poison, and other tag effects remain tabletop decisions; the editor does not automatically spend harm, wear, or exhaustion. Tag settings store contextual details such as Ceremonial’s faction or a poison’s cure.

All new interface labels, card names, and tag definitions are localized in English, Russian, and German. Existing translations supply the weapon-skill definitions. The small WebP illustrations are included in Quick game’s offline asset preparation.

## Verification

`tests/equipment.test.mjs` checks deck integrity, artwork and translations, legacy parsing, harm validation, independent paired wear, catalogue filtering, saving/reloading, coin payment and rejection, visual changes without property loss, tag persistence without learned-skill changes, read-only reference browsing, and tablet/phone overflow. Related character-builder, quick-game, active-game, and rule-help tests cover the existing flows.
