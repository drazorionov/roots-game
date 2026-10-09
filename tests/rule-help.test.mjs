import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
import { sheets, rules as playbooks } from "./load-typescript.mjs";
const require = createRequire(import.meta.url);
const { rules } = require("../src/lib/rules.ts");
const dictionaries = Object.fromEntries(
  ["ru", "de"].map((locale) => [
    locale,
    JSON.parse(readFileSync(`src/lib/locales/${locale}.json`, "utf8")),
  ]),
);
test("every attribute, harm track, feat and weapon skill has translated rule help", () => {
  for (const name of [
    ...sheets.stats,
    ...sheets.harmTracks,
    ...playbooks.feats,
    ...playbooks.weaponSkills,
  ])
    assert.ok(rules[name], name);
  for (const { summary, page } of Object.values(rules)) {
    assert.ok(page >= 1 && page <= 149);
    for (const dictionary of Object.values(dictionaries)) {
      assert.ok(dictionary[summary], summary);
      assert.notEqual(dictionary[summary], summary);
    }
  }
});
test(
  "rule names open translated dialogs without changing sheet state; tiles fit touch screens",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 1000 },
        hasTouch: true,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const sheet = sheets.sheetSchema.parse({
        ...playbooks.newCharacterSheet(),
        name: "Rule Scout",
        forward: 2,
        nature: "Loner",
        moveIds: ["Silent Paws", "Slip Away", "Forager"],
        driveIds: ["Ambition"],
        featIds: playbooks.feats,
        weaponSkillIds: playbooks.weaponSkills,
        equipment: [
          {
            name: "Trail sword",
            kind: "weapon",
            load: 1,
            value: 3,
            wear: 0,
            maxWear: 4,
            harm: 1,
            range: "Close",
            details: "Hand-forged blade",
          },
        ],
      });
      await page.addInitScript((sheet) => {
        if (!sessionStorage.getItem("root-quick-sheet"))
          sessionStorage.setItem("root-quick-sheet", JSON.stringify(sheet));
        sessionStorage.setItem("root-quick-active", "1");
      }, sheet);
      await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:3000");
      await expect(page.locator(".field-sheet")).toBeVisible();
      await expect(page.locator(".equipment-grid > :first-child")).toHaveClass(
        "coin-tile",
      );
      await page
        .locator(".sheet-subsection > summary")
        .filter({ hasText: "Character info & moves" })
        .click();
      await page
        .locator(".sheet-subsection > summary")
        .filter({ hasText: "Background" })
        .click();
      const saved = await page.evaluate(() =>
        sessionStorage.getItem("root-quick-sheet"),
      );
      for (const locale of ["en", "ru", "de"]) {
        await page.locator(".language-select").selectOption(locale);
        const t = (text) => dictionaries[locale]?.[text] || text;
        for (const name of [
          ...sheets.stats,
          ...sheets.harmTracks,
          ...playbooks.feats,
          ...playbooks.weaponSkills,
          "Coin",
          "Wear",
          "Load",
          "Value",
          "Hold",
          "Forward",
          "Ongoing",
        ]) {
          const button = page
            .getByRole("button", { name: t(name), exact: true })
            .first();
          await button.click();
          await expect(page.locator(".rule-dialog")).toBeVisible();
          await expect(page.locator(".rule-dialog h2")).toHaveText(t(name));
          await expect(page.locator(".rule-dialog p")).toContainText(
            t(rules[name].summary),
          );
          await page.keyboard.press("Escape");
          await expect(page.locator(".rule-dialog")).toHaveCount(0);
          await expect(button).toBeFocused();
        }
        for (const width of [320, 390, 820, 1280]) {
          await page.setViewportSize({ width, height: 1000 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${locale} overflow at ${width}`,
          );
        }
      }
      assert.equal(
        await page.evaluate(() => sessionStorage.getItem("root-quick-sheet")),
        saved,
        "Reading help never consumes forward or mutates the sheet",
      );
      await page.locator(".language-select").selectOption("en");
      await page
        .locator(".equipment-section")
        .screenshot({ path: "test-results/equipment-tiles.png" });
      await page
        .locator(".character-info-grid")
        .screenshot({ path: "test-results/character-tiles.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .locator(".equipment-section")
        .screenshot({ path: "test-results/equipment-tiles-phone.png" });
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
