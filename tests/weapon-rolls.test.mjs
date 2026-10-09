import { dismissRollPopup } from "./roll-popup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
import { sheets, rules } from "./load-typescript.mjs";

const require = createRequire(import.meta.url);
const { weaponRolls } = require("../src/lib/weapon-rolls.ts");
const { rules: references } = require("../src/lib/rules.ts");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

test("weapon roll attributes match the existing rules, including non-attribute exceptions", () => {
  assert.deepEqual(
    Object.keys(weaponRolls).sort(),
    [...rules.weaponSkills].sort(),
  );
  for (const [name, move] of Object.entries(weaponRolls)) {
    if (move.kind === "attribute") {
      const attribute = references[name].summary.match(/roll \+(\w+)/i)?.[1];
      assert.equal(move.stat, attribute, name);
    }
  }
  assert.equal(weaponRolls["Paired Fighting"].kind, "paired");
  assert.equal(weaponRolls["Long-Shot"].kind, "modifier");
});

test(
  "weapon actions show results, use modifiers once, and support learned skills on mobile",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const sheet = sheets.sheetSchema.parse({
        ...rules.newCharacterSheet(),
        name: "Weapon Tester",
        stats: { Charm: 0, Cunning: 1, Finesse: 1, Luck: -1, Might: 2 },
        moveIds: [],
        weaponSkillIds: [
          "Cleave",
          "Quick Shot",
          "Harry a Group",
          "Improvise Weapon",
          "Paired Fighting",
          "Long-Shot",
        ],
        forward: 1,
        ongoing: -1,
        equipment: [
          {
            name: "Test sword",
            kind: "weapon",
            range: "Close",
            details: "",
            wear: 0,
            load: 1,
            skillTags: ["Cleave", "Disarm", "Paired Fighting"],
          },
        ],
      });
      await page.addInitScript((sheet) => {
        sessionStorage.setItem("root-quick-sheet", JSON.stringify(sheet));
        sessionStorage.setItem("root-quick-active", "1");
        window.testDice = [4, 4];
        crypto.getRandomValues = (array) => {
          array[0] = window.testDice.shift() - 1;
          return array;
        };
      }, sheet);
      await page.goto(base);
      const gear = page.locator(".gear-weapon");
      await expect(gear.getByText("Disarm", { exact: true })).toHaveCount(0);
      await expect(
        gear.getByRole("button", { name: "Roll Disarm", exact: true }),
      ).toHaveCount(0);
      const cleave = gear.getByRole("button", {
        name: "Roll Cleave",
        exact: true,
      });
      await expect(cleave).toContainText("+2");
      const notification = page.locator(".activity-roll").first();
      for (const [dice, total, result] of [
        [[4, 4], "10", "10+: strong hit"],
        [[3, 3], "7", "7–9: mixed hit"],
        [[2, 3], "6", "6−: miss"],
      ]) {
        await page.evaluate((dice) => {
          window.testDice = dice;
        }, dice);
        await cleave.click();
        await expect(notification).toContainText(
          `Test sword · Cleave · ${dice.join(" + ")} + ${total === "10" ? 2 : 1} = ${total} · ${result}`,
        );
        await dismissRollPopup(page);
        await expect(cleave).toBeFocused();
      }
      const stored = await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("root-quick-sheet")),
      );
      assert.equal(stored.forward, 0);
      assert.equal(stored.ongoing, -1);
      assert.equal(stored.exhaustion, sheet.exhaustion);
      assert.deepEqual(stored.equipment, sheet.equipment);

      await gear.getByLabel("Paired Fighting bonus").selectOption("3");
      await page.evaluate(() => {
        window.testDice = [2, 3];
      });
      await gear
        .getByRole("button", { name: "Roll Paired Fighting", exact: true })
        .click();
      await expect(notification).toContainText(
        "Test sword · Paired Fighting · 2 + 3 + 2 = 7",
      );
      await dismissRollPopup(page);
      await page.getByRole("button", { name: "Hide all", exact: true }).click();

      await page.getByText("Character info & moves", { exact: true }).click();
      const skills = page.locator(".weapon-skills");
      await expect(
        skills.getByRole("button", { name: "Roll Long-Shot", exact: true }),
      ).toHaveCount(0);
      await expect(skills).toContainText("Enhances another far-range move");
      await expect(
        skills.getByRole("button", { name: "Roll Quick Shot", exact: true }),
      ).toContainText("-1");
      await expect(
        skills.getByRole("button", { name: "Roll Harry a Group", exact: true }),
      ).toContainText("+1");
      await page.evaluate(() => {
        window.testDice = [3, 4];
      });
      await skills
        .getByRole("button", { name: "Roll Improvise Weapon", exact: true })
        .click();
      await expect(notification).toContainText(
        "Improvise Weapon · 3 + 4 + 0 = 7",
      );
      await dismissRollPopup(page);
      await gear.screenshot({
        path: "test-results/weapon-actions-desktop.png",
      });

      for (const locale of ["en", "ru", "de"]) {
        await page.locator(".language-select").selectOption(locale);
        for (const width of [320, 390, 820]) {
          await page.setViewportSize({ width, height: 844 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${locale} ${width}px overflow`,
          );
          const clearance = await gear.locator("select").evaluate((select) => {
            const row = select
              .closest(".weapon-skill-roll")
              .getBoundingClientRect();
            const control = select.getBoundingClientRect();
            return {
              top: control.top - row.top,
              bottom: row.bottom - control.bottom,
            };
          });
          assert.ok(
            clearance.top >= 13 && clearance.bottom >= 10,
            `${locale} ${width}px dropdown must clear the row dividers: ${JSON.stringify(clearance)}`,
          );
        }
      }
      await page.locator(".language-select").selectOption("en");
      await page.setViewportSize({ width: 390, height: 844 });
      await gear.screenshot({
        path: "test-results/weapon-actions-spacing-v2.png",
      });
      await page.evaluate(() => {
        window.testDice = [5, 5];
      });
      await cleave.click();
      await expect(notification).toContainText(
        "Test sword · Cleave · 5 + 5 + 1 = 11",
      );
      await dismissRollPopup(page);
      await page.locator(".game-activity").screenshot({
        path: "test-results/weapon-action-result.png",
      });
      await expect(cleave).toBeFocused();
      for (const [control, stat, modifier] of [
        ["Melee · Might", "Might", 1],
        ["Ranged · Finesse", "Finesse", 0],
      ]) {
        await page
          .getByRole("button", { name: "Hide all", exact: true })
          .click();
        await page.evaluate(() => {
          window.testDice = [3, 3];
        });
        await gear.getByRole("button", { name: control, exact: true }).click();
        await expect(notification).toContainText(
          `Test sword · ${stat} · 3 + 3 + ${modifier} = ${6 + modifier}`,
        );
        await dismissRollPopup(page);
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
