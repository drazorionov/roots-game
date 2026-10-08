import { test } from "node:test";
import assert from "node:assert/strict";
import { sheets, rules } from "./load-typescript.mjs";

test("campaign setup remains immutable while every play tracker stays editable", () => {
  const original = sheets.sheetSchema.parse({
    ...rules.newCharacterSheet(),
    name: "Locked Ranger",
  });
  const allowed = {
    injury: 1,
    exhaustion: 1,
    depletion: 1,
    hold: 2,
    forward: 1,
    ongoing: -1,
    coin: 3,
    advancement: 1,
    driveMarks: ["Ambition"],
    equipment: [
      {
        name: "Sword",
        details: "",
        load: 1,
        wear: 0,
        maxWear: 4,
        value: 2,
        kind: "weapon",
        range: "close",
        harm: 1,
      },
    ],
    reputation: [
      { faction: "Denizens", standing: 1, prestige: 2, notoriety: 0 },
    ],
  };
  for (const [field, value] of Object.entries(allowed))
    assert.equal(
      sheets.sameCharacterSetup(
        original,
        sheets.sheetSchema.parse({ ...original, [field]: value }),
      ),
      true,
      field,
    );
  const protectedChanges = {
    name: "Other",
    species: "Otter",
    playbook: "Vagrant",
    pronouns: "they",
    description: "new",
    stats: { ...original.stats, Might: 2 },
    nature: "Curious",
    drives: "new",
    bonds: "new",
    biography: "new",
    moves: "new",
    feats: "new",
    weaponSkills: "new",
    moveIds: ["Hardy"],
    driveIds: ["Ambition"],
    featIds: ["Tracking"],
    weaponSkillIds: ["Parry"],
    startingBonus: "Might",
    presetApplied: false,
    harmSlots: { injury: 5, exhaustion: 4, depletion: 4 },
    background: { home: "new", motivation: "", leftBehind: "" },
  };
  for (const [field, value] of Object.entries(protectedChanges))
    assert.equal(
      sheets.sameCharacterSetup(
        original,
        sheets.sheetSchema.parse({ ...original, [field]: value }),
      ),
      false,
      field,
    );
  assert.equal(
    sheets.sameCharacterSetup(original, structuredClone(original)),
    true,
  );
});
