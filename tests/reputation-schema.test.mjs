import { test } from "node:test";
import assert from "node:assert/strict";
import { sheets } from "./load-typescript.mjs";

const added = [
  "Grand Duchy",
  "Riverfolk Company",
  "Lizard Cult",
  "Corvid Conspiracy",
];
const entry = (faction) => ({
  faction,
  standing: 0,
  prestige: 0,
  notoriety: 0,
});

test("new sheets include the four requested factions and no other additions", () => {
  assert.deepEqual(
    sheets.blankSheet().reputation.map((r) => r.faction),
    [
      "Denizens",
      "Marquisate",
      "Eyrie Dynasties",
      "Woodland Alliance",
      ...added,
    ],
  );
});

test("legacy reputation upgrades preserve marks, aliases, custom factions, and order", () => {
  const reputation = [
    { faction: "Denizens", standing: -2, prestige: 7, notoriety: 12 },
    { faction: " Underground Duchy ", standing: 2, prestige: 9, notoriety: 3 },
    entry("riverfolk company"),
    { faction: "corvid conspiracy", standing: 1, prestige: 4, notoriety: 2 },
    entry("My woodland faction"),
  ];
  const original = { ...sheets.blankSheet(), name: "Legacy", reputation };
  const upgraded = sheets.sheetSchema.parse(original);
  assert.deepEqual(upgraded.reputation, [...reputation, entry("Lizard Cult")]);
  assert.deepEqual(original.reputation, reputation);
  assert.deepEqual(sheets.sheetSchema.parse(upgraded), upgraded);
  assert.equal(sheets.sameCharacterSetup(original, upgraded), true);
});

test("a full legacy ledger retains all twelve entries and can save its upgrade", () => {
  const reputation = Array.from({ length: 12 }, (_, i) => entry(`Custom ${i}`));
  const upgraded = sheets.sheetSchema.parse({
    ...sheets.blankSheet(),
    name: "Full ledger",
    reputation,
  });
  assert.deepEqual(upgraded.reputation, [...reputation, ...added.map(entry)]);
  assert.deepEqual(sheets.sheetSchema.parse(upgraded), upgraded);
});

test("seven-faction sheets gain Corvid Conspiracy without changing saved reputation", () => {
  const reputation = sheets
    .blankSheet()
    .reputation.filter((r) => r.faction !== "Corvid Conspiracy");
  reputation[4].prestige = 8;
  reputation[5].notoriety = 3;
  const upgraded = sheets.sheetSchema.parse({
    ...sheets.blankSheet(),
    name: "Existing",
    reputation,
  });
  assert.deepEqual(upgraded.reputation, [
    ...reputation,
    entry("Corvid Conspiracy"),
  ]);
  assert.deepEqual(sheets.sheetSchema.parse(upgraded), upgraded);
});
