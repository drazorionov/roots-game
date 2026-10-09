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
test("built-in sheet names are capitalized, valid Unicode, and preserve stored identifiers", () => {
  const { translate } = require("../src/lib/i18n.ts");
  const names = [
    ...sheets.stats,
    ...sheets.harmTracks,
    ...playbooks.feats,
    ...playbooks.weaponSkills,
    ...Object.keys(playbooks.playbookData),
    ...playbooks.allMoves.map((move) => move.name),
    ...Object.keys(playbooks.natureHints),
    ...Object.keys(playbooks.driveHints),
  ];
  for (const locale of ["en", "ru", "de"])
    for (const name of names) {
      const label = translate(locale, name);
      assert.ok(
        !/[\uFFFD\u0000-\u001F]/u.test(label),
        `${locale}: corrupted ${name}`,
      );
      assert.equal(
        label[0],
        label[0].toLocaleUpperCase(locale),
        `${locale}: lowercase ${name}`,
      );
    }
  assert.deepEqual(sheets.harmTracks, ["injury", "exhaustion", "depletion"]);
  assert.equal(translate("en", "miXeD customName"), "miXeD customName");
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
        const t = (text) =>
          dictionaries[locale]?.[text] ||
          ({
            injury: "Injury",
            exhaustion: "Exhaustion",
            depletion: "Depletion",
          }[text] ??
            text);
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
          const typography = await page
            .locator(".rule-dialog")
            .evaluate((dialog) => {
              const title = getComputedStyle(
                dialog.querySelector(".rule-title"),
              );
              const description = getComputedStyle(
                dialog.querySelector(".rule-description"),
              );
              const reference = getComputedStyle(
                dialog.querySelector(".rule-source"),
              );
              return {
                parent: dialog.parentElement.tagName,
                titleWeight: title.fontWeight,
                descriptionWeight: description.fontWeight,
                descriptionSize: description.fontSize,
                descriptionFamily: description.fontFamily,
                referenceSize: reference.fontSize,
                referenceWeight: reference.fontWeight,
                bodyFamily: getComputedStyle(document.body).fontFamily,
              };
            });
          assert.equal(typography.parent, "BODY");
          assert.equal(typography.titleWeight, "700");
          assert.equal(typography.descriptionWeight, "400");
          assert.equal(typography.descriptionSize, "16px");
          assert.equal(typography.descriptionFamily, typography.bodyFamily);
          assert.equal(typography.referenceSize, "12px");
          assert.equal(typography.referenceWeight, "400");
          if (locale === "en" && ["injury", "Forward", "Coin"].includes(name))
            await page
              .locator(".rule-dialog")
              .screenshot({ path: `test-results/rule-dialog-${name}.png` });
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
          for (const name of ["Forward", "Ongoing"]) {
            const label = page
              .locator(".modifier-counters")
              .getByRole("button", { name: t(name), exact: true });
            assert.equal(
              await label.evaluate((el) => {
                const text = el.firstChild;
                return [...text.textContent.matchAll(/\S+/gu)].every(
                  (match) => {
                    const range = document.createRange();
                    range.setStart(text, match.index);
                    range.setEnd(text, match.index + match[0].length);
                    return (
                      new Set(
                        [...range.getClientRects()].map((rect) =>
                          Math.round(rect.top),
                        ),
                      ).size === 1
                    );
                  },
                );
              }),
              true,
              `${locale} ${name} must not split words across lines at ${width}`,
            );
          }
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

test(
  "creation captions share rule dialogs without selecting choices or submitting forms",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:3000");
      await page
        .getByRole("button", { name: "Quick game", exact: true })
        .click();
      await page.getByLabel("Name", { exact: true }).fill("miXeD customName");
      const steps = page.locator(".wizard-steps");
      for (const locale of ["en", "ru", "de"]) {
        await page.locator(".language-select").selectOption(locale);
        const t = (text) =>
          dictionaries[locale]?.[text] ||
          ({
            injury: "Injury",
            exhaustion: "Exhaustion",
            depletion: "Depletion",
          }[text] ??
            text);
        async function help(name, scope = page) {
          const button = scope
            .getByRole("button", { name: t(name), exact: true })
            .first();
          await button.click();
          await expect(page.locator("body > .rule-dialog")).toBeVisible();
          await expect(page.locator(".rule-title")).toHaveText(t(name));
          assert.ok(
            (await page.locator(".rule-description").textContent()).length > 20,
          );
          await page.keyboard.press("Escape");
          await expect(button).toBeFocused();
        }
        await steps
          .getByRole("button", { name: new RegExp(t("Identity")) })
          .click();
        await help("Charm", page.locator(".builder-stats"));
        const info = page.getByRole("button", {
          name: t("About {name}").replace("{name}", t("Ranger")),
          exact: true,
        });
        await info.click();
        await expect(page.locator(".rule-title")).toHaveText(t("Ranger"));
        await page.keyboard.press("Escape");
        await steps
          .getByRole("button", { name: new RegExp(t("Nature & drives")) })
          .click();
        const nature = playbooks.playbookData.Ranger.natures[0],
          drive = playbooks.playbookData.Ranger.drives[0];
        for (const name of [nature, drive]) {
          const choice = page.getByRole("checkbox", {
            name: t(name),
            exact: true,
          });
          const checked = await choice.isChecked();
          await help(name);
          assert.equal(await choice.isChecked(), checked);
        }
        await steps
          .getByRole("button", { name: new RegExp(t("Abilities")) })
          .click();
        await help("Silent Paws");
        await expect(
          page.getByRole("checkbox", { name: t("Silent Paws"), exact: true }),
        ).not.toBeChecked();
        await page
          .locator("details")
          .filter({ has: page.locator(".skill-picker") })
          .evaluateAll((details) => details.forEach((el) => (el.open = true)));
        await help("Sneak");
        await help(playbooks.playbookData.Ranger.weapons[0]);
        await page
          .locator(".optional-details")
          .filter({ hasText: t("Custom abilities & advancement") })
          .locator("summary")
          .click();
        await help("injury");
        for (const width of [320, 390, 820, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${locale} creation overflow at ${width}`,
          );
        }
        await steps
          .getByRole("button", { name: new RegExp(t("Equipment")) })
          .click();
        await page
          .getByRole("button", { name: t("Add equipment"), exact: true })
          .click();
        await help("Value", page.locator(".quick-gear-form"));
        await help("Wear boxes", page.locator(".quick-gear-form"));
        await expect(page.locator(".quick-gear-form")).toBeVisible();
        await page
          .getByRole("button", { name: t("Cancel"), exact: true })
          .click();
        await steps
          .getByRole("button", { name: new RegExp(t("Review & connections")) })
          .click();
        await help("Connections");
        await expect(page.locator(".review-identity strong")).toHaveText(
          "miXeD customName",
        );
        assert.equal(
          await page.locator("label button, button button").count(),
          0,
          "Help is separate from form selection controls",
        );
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
