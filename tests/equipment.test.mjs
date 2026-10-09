import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import { sheets, rules } from "./load-typescript.mjs";
const require = createRequire(import.meta.url);
const equipment = require("../src/lib/equipment.ts");

test("all deck presets have valid properties, illustrations, supported tags and translations", () => {
  const {
    equipmentCatalogue,
    specialTags,
    weaponSkillCatalogue,
    newEquipment,
  } = equipment;
  assert.equal(equipmentCatalogue.length, 35);
  assert.equal(specialTags.length, 36);
  assert.equal(weaponSkillCatalogue.length, 24);
  assert.equal(
    weaponSkillCatalogue.filter((skill) => skill.deckPage).length,
    10,
  );
  for (const card of equipmentCatalogue) {
    const item = sheets.equipmentSchema.parse(newEquipment(card.id));
    assert.equal(item.maxWear + item.secondaryMaxWear, card.maxWear, card.name);
    assert.ok(existsSync(`public/art/equipment/${card.id}.webp`));
    assert.ok(
      item.skillTags.every((name) =>
        weaponSkillCatalogue.some((skill) => skill.name === name),
      ),
    );
    assert.ok(
      item.specialTags.every((id) => specialTags.some((tag) => tag.id === id)),
    );
    assert.equal(card.page, equipmentCatalogue.indexOf(card) * 2 + 2);
  }
  assert.equal(newEquipment("blowgun").harmType, "exhaustion");
  assert.equal(newEquipment("bolas").harmType, "special");
  assert.equal(newEquipment("flute").kind, "item");
  assert.equal(newEquipment("daggers").secondaryMaxWear, 2);
  assert.deepEqual(newEquipment("long-bow").skillTags, [
    "Harry a Group",
    "Trick Shot",
  ]);
  assert.equal(specialTags.find((tag) => tag.id === "explosive").value, 2);
  assert.equal(specialTags.find((tag) => tag.id === "slow").value, -1);
  assert.ok(
    specialTags
      .find((tag) => tag.id === "hidden")
      .description.endsWith("if you do have it."),
  );
  for (const locale of ["ru", "de"]) {
    const dictionary = JSON.parse(
      readFileSync(`src/lib/locales/${locale}.json`, "utf8"),
    );
    for (const name of equipmentCatalogue.map((entry) => entry.name))
      assert.ok(dictionary[name], `${locale}: ${name}`);
    for (const tag of specialTags)
      for (const key of [tag.name, tag.description])
        assert.ok(dictionary[key], `${locale}: ${key}`);
  }
});

test("legacy equipment survives migration, custom ranges survive selection, and paired wear is bounded", () => {
  for (const kind of ["gear", "armor", "weapon"]) {
    const old = {
      name: "Old kit",
      kind,
      range: "Across the clearing",
      harm: 2,
      details: "Keep handwritten tags",
      wear: 2,
      maxWear: 4,
      value: 7,
      load: 2,
    };
    const parsed = sheets.equipmentSchema.parse(old);
    for (const [key, value] of Object.entries(old))
      assert.equal(parsed[key], value);
    assert.deepEqual(parsed.skillTags, []);
    assert.deepEqual(parsed.specialTags, []);
  }
  assert.equal(
    equipment.toggleRange("close, Across the clearing", "Close"),
    "Across the clearing",
  );
  const pair = equipment.newEquipment("daggers");
  assert.ok(
    sheets.equipmentSchema.safeParse({ ...pair, secondaryWear: 2 }).success,
  );
  assert.equal(
    sheets.equipmentSchema.safeParse({ ...pair, secondaryWear: 3 }).success,
    false,
  );
  assert.equal(
    sheets.equipmentSchema.safeParse({ ...pair, harmType: "fire" }).success,
    false,
  );
  assert.equal(
    sheets.equipmentSchema.safeParse({ ...pair, harm: -1 }).success,
    false,
  );
});

test(
  "equipment catalogue edits and payments persist; reference browsing is read-only; layouts fit",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 1000 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const sheet = sheets.sheetSchema.parse({
        ...rules.newCharacterSheet(),
        name: "Equipment Scout",
        coin: 10,
        weaponSkillIds: ["Parry"],
      });
      await page.addInitScript((sheet) => {
        if (!sessionStorage.getItem("root-quick-sheet"))
          sessionStorage.setItem("root-quick-sheet", JSON.stringify(sheet));
        sessionStorage.setItem("root-quick-active", "1");
      }, sheet);
      await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:3000");
      const saved = () =>
        page.evaluate(() =>
          JSON.parse(sessionStorage.getItem("root-quick-sheet")),
        );
      await expect(page.locator(".field-sheet")).toBeVisible();
      await expect(page.locator(".equipment-catalogue")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      const editor = page.locator(".equipment-editor");
      await editor.locator(".visual-picker > summary").click();
      const library = editor.locator(".equipment-catalogue");
      await expect(library.locator(".equipment-choice")).toHaveCount(35);
      await library
        .getByLabel("Search equipment", { exact: true })
        .fill("Blowgun");
      await expect(library.locator(".equipment-choice")).toHaveCount(1);
      await library
        .getByRole("button", { name: "Choose Blowgun", exact: true })
        .click();
      await expect(editor.getByLabel("Harm type", { exact: true })).toHaveValue(
        "exhaustion",
      );
      await expect(editor.getByLabel("Range", { exact: true })).toHaveValue(
        "Far",
      );
      await expect(editor.locator(".selected-tag-effects")).toContainText(
        "poisoned until cured",
      );
      await editor.getByLabel("Pay from coin", { exact: true }).check();
      await editor
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      assert.equal((await saved()).coin, 7);
      await page.reload();
      await page
        .getByRole("button", { name: "Edit Blowgun", exact: true })
        .click();
      await editor
        .getByLabel("Harm type", { exact: true })
        .selectOption("wear");
      await editor.getByLabel("Weapon harm", { exact: true }).fill("2");
      await editor.getByLabel("Close", { exact: true }).check();
      await editor
        .getByLabel("Harm conditions & effects", { exact: true })
        .fill("Against shields only");
      await editor
        .getByLabel("Tag settings", { exact: true })
        .fill("Cure: river mint");
      await editor.locator(".visual-picker > summary").click();
      await editor
        .getByRole("button", { name: "Use visual: Crossbow", exact: true })
        .click();
      await expect(editor.getByLabel("Item name", { exact: true })).toHaveValue(
        "Blowgun",
      );
      await editor
        .locator(".tag-picker > summary")
        .filter({ hasText: "Weapon skill tags" })
        .click();
      await editor
        .getByLabel("Search weapon skills", { exact: true })
        .fill("Cleave");
      await editor
        .getByRole("checkbox", { name: "Cleave", exact: true })
        .check();
      await editor
        .locator(".tag-picker > summary")
        .filter({ hasText: "Special tags" })
        .click();
      await editor
        .getByLabel("Search special tags", { exact: true })
        .fill("Sharp");
      await editor.getByRole("checkbox", { name: /Sharp/ }).check();
      await editor
        .getByRole("button", { name: "Save equipment", exact: true })
        .click();
      let state = await saved();
      assert.equal(state.coin, 7);
      assert.equal(state.equipment[0].visualId, "crossbow");
      assert.equal(state.equipment[0].harmType, "wear");
      assert.equal(state.equipment[0].harm, 2);
      assert.equal(state.equipment[0].range, "Far, Close");
      assert.equal(state.equipment[0].tagSettings, "Cure: river mint");
      assert.equal(state.equipment[0].harmDetails, "Against shields only");
      assert.deepEqual(state.equipment[0].specialTags, ["poison", "sharp"]);
      assert.deepEqual(state.equipment[0].skillTags, ["Cleave"]);
      assert.deepEqual(state.weaponSkillIds, ["Parry"]);
      await page.locator(".weapon-skill-library > summary").click();
      const skills = page.locator(".weapon-skill-library");
      await skills.getByLabel("Search weapon skills").fill("Cleave");
      await expect(skills.locator("article")).toHaveCount(1);
      await expect(skills.locator("article")).toContainText("3 wear");
      assert.deepEqual(await saved(), state);
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await editor.locator(".visual-picker > summary").click();
      await library
        .getByLabel("Search equipment", { exact: true })
        .fill("Daggers");
      await library
        .getByRole("button", { name: "Choose Daggers", exact: true })
        .click();
      await editor.getByLabel("Pay from coin", { exact: true }).check();
      await editor
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await expect(
        page.locator(".gear-panel").getByRole("alert"),
      ).toContainText("Not enough coin.");
      assert.deepEqual(await saved(), state);
      await editor.getByLabel("Pay from coin", { exact: true }).uncheck();
      await editor
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Daggers: second item wear 2",
          exact: true,
        })
        .click();
      state = await saved();
      assert.equal(state.equipment[1].wear, 0);
      assert.equal(state.equipment[1].secondaryWear, 2);
      await page.reload();
      await expect(
        page.getByRole("button", {
          name: "Daggers: second item wear 2",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      mkdirSync("/tmp/root-equipment", { recursive: true });
      await expect(page.locator(".equipment-catalogue")).toHaveCount(0);
      await page.locator(".gear-panel").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: "/tmp/root-equipment/desktop.png",
        fullPage: true,
      });
      for (const width of [768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page
          .getByRole("button", { name: "Edit Blowgun", exact: true })
          .click();
        await editor
          .locator(".tag-picker > summary")
          .filter({ hasText: "Special tags" })
          .click();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${width}px overflow`,
        );
        await editor.screenshot({
          path: `/tmp/root-equipment/editor-${width}.png`,
        });
        await editor
          .getByRole("button", { name: "Cancel", exact: true })
          .click();
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
