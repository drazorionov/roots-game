import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sheets, rules } from "./load-typescript.mjs";
test("nine source-checked core presets and required Tinker moves", () => {
  assert.equal(Object.keys(rules.playbookData).length, 9);
  for (const name of sheets.playbooks) {
    const b = rules.playbookData[name];
    assert.equal(
      Object.values(b.stats).reduce((a, b) => a + b, 0),
      2,
      name,
    );
    assert.equal(b.moves.length, 6);
    assert.equal(b.natures.length, 2);
    assert.equal(b.drives.length, 4);
    assert.ok(b.weapons.length >= 3);
    assert.ok(b.requiredMoves.every((n) => b.moves.some((m) => m.name === n)));
  }
  assert.deepEqual(rules.playbookData.Thief.stats, {
    Charm: 0,
    Cunning: 0,
    Finesse: 2,
    Luck: 1,
    Might: -1,
  });
  assert.equal(rules.playbookData.Thief.chooseFeats, 4);
  assert.equal(rules.playbookData.Thief.value, 6);
  const t = rules.applyPlaybook(sheets.blankSheet(), "Tinker");
  assert.deepEqual(t.moveIds, ["Toolbox", "Repair"]);
  assert.ok(t.featIds.includes("Disable Device"));
  assert.equal(t.stats.Cunning, 2);
});
test("move bonuses are derived once, harm supports advancement, legacy data is preserved", () => {
  const s = {
    ...sheets.blankSheet(),
    name: "Legacy",
    moves: "Personal move notes",
    nature: "My own nature",
    equipment: [{ name: "Old sword", details: "kept", wear: 2, load: 1 }],
  };
  for (const key of [
    "moveIds",
    "driveIds",
    "featIds",
    "weaponSkillIds",
    "driveMarks",
    "startingBonus",
    "presetApplied",
    "hold",
    "forward",
    "ongoing",
    "coin",
    "harmSlots",
    "background",
  ])
    delete s[key];
  const parsed = sheets.sheetSchema.parse(s);
  assert.equal(parsed.moves, s.moves);
  assert.equal(parsed.nature, s.nature);
  assert.equal(parsed.equipment[0].maxWear, 4);
  assert.deepEqual(parsed.moveIds, []);
  assert.equal(parsed.harmSlots.injury, 4);
  const thief = {
    ...rules.applyPlaybook(parsed, "Thief"),
    moveIds: ["Master Thief"],
  };
  assert.equal(rules.effectiveStats(thief).Finesse, 3);
  assert.equal(rules.effectiveStats(thief).Finesse, 3);
  assert.equal(thief.stats.Finesse, 2);
  const tinker = {
    ...rules.applyPlaybook(parsed, "Tinker"),
    moveIds: ["Toolbox", "Repair", "Big Pockets"],
    depletion: 6,
  };
  assert.equal(sheets.harmCapacity(tinker, "depletion"), 6);
  assert.ok(sheets.sheetSchema.safeParse(tinker).success);
  assert.equal(
    sheets.sheetSchema.safeParse({ ...tinker, moveIds: [] }).success,
    false,
  );
  assert.ok(
    sheets.sheetSchema.safeParse({
      ...tinker,
      harmSlots: { ...tinker.harmSlots, depletion: 6 },
      depletion: 8,
    }).success,
  );
  assert.equal(
    sheets.sheetSchema.safeParse({ ...tinker, depletion: 9 }).success,
    false,
  );
  assert.equal(
    sheets.sheetSchema.safeParse({
      ...parsed,
      equipment: [
        { name: "Bad", details: "", load: 1, wear: 3, maxWear: 2, value: 0 },
      ],
    }).success,
    false,
  );
  assert.ok(
    sheets.sheetSchema.safeParse({
      ...parsed,
      equipment: [
        {
          name: "Fragile",
          details: "",
          load: 0,
          wear: 0,
          maxWear: 0,
          value: 0,
        },
      ],
    }).success,
  );
  const updated = rules.applyPlaybook(
    { ...parsed, biography: "Story", coin: 12 },
    "Ranger",
  );
  assert.equal(updated.biography, "Story");
  assert.equal(updated.equipment[0].name, "Old sword");
  assert.equal(updated.coin, 12);
});
test("all playbook content and selectable skills have Russian and German translations", () => {
  const messages = [
    ...rules.feats,
    ...rules.weaponSkills,
    ...Object.keys(rules.natureHints),
    ...Object.values(rules.natureHints),
    ...Object.keys(rules.driveHints),
    ...Object.values(rules.driveHints),
    ...Object.values(rules.playbookData).flatMap((b) => [
      b.summary,
      ...b.moves.flatMap((m) => [m.name, m.summary]),
    ]),
  ];
  for (const locale of ["ru", "de"]) {
    const dict = JSON.parse(
      readFileSync(`src/lib/locales/${locale}.json`, "utf8"),
    );
    for (const m of messages) assert.ok(dict[m], `${locale}: ${m}`);
  }
});

test("Dirty Fighter setup requires a starting skill and two eligible extra skills", () => {
  const s = {
    ...rules.applyPlaybook(sheets.blankSheet(), "Scoundrel"),
    moveIds: ["Dirty Fighter"],
    weaponSkillIds: ["Confuse Senses"],
  };
  const message = "Choose a starting weapon skill and two Dirty Fighter skills";
  assert.ok(rules.setupRemaining(s).includes(message));
  s.weaponSkillIds = ["Confuse Senses", "Disarm", "Trick Shot"];
  assert.ok(!rules.setupRemaining(s).includes(message));
});
