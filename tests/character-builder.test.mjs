import { dismissRollPopup } from "./roll-popup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { rules } from "./load-typescript.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

test(
  "six-section builder saves reputation and weapons, edits in a page, and fits all devices",
  { timeout: 120000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page
        .getByRole("button", { name: "Quick game", exact: true })
        .click();
      await expect(page).toHaveURL(/\/characters\/new\?mode=quick$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByLabel("Name", { exact: true }).fill("Juniper");
      await page.getByRole("button", { name: "Tinker", exact: true }).click();
      await page
        .getByLabel("Starting bonus", { exact: true })
        .selectOption("Might");
      const steps = page.locator(".wizard-steps");
      await steps.getByRole("button", { name: /Background/ }).click();
      await page
        .getByLabel("Where do you call home?", { exact: true })
        .fill("Moss Clearing");
      await page
        .getByLabel("Which faction did you serve?", { exact: true })
        .selectOption("Marquisate");
      await page
        .getByLabel("Which faction is your enemy?", { exact: true })
        .selectOption("Eyrie Dynasties");
      await steps.getByRole("button", { name: /Nature & drives/ }).click();
      const book = rules.playbookData.Tinker;
      await page
        .getByRole("checkbox", { name: book.natures[0], exact: true })
        .click();
      for (const drive of book.drives.slice(0, 2))
        await page.getByRole("checkbox", { name: drive, exact: true }).click();
      await steps.getByRole("button", { name: /Abilities/ }).click();
      for (const name of book.requiredMoves) {
        await expect(
          page.getByRole("checkbox", { name: new RegExp(`^${name}`) }),
        ).toBeChecked();
        await expect(
          page.getByRole("checkbox", { name: new RegExp(`^${name}`) }),
        ).toBeDisabled();
      }
      const move = book.moves.find(
        (move) => !book.requiredMoves.includes(move.name),
      );
      await page
        .getByRole("checkbox", { name: move.name, exact: true })
        .check();
      await page
        .getByRole("checkbox", { name: book.weapons[0], exact: true })
        .check();
      await steps.getByRole("button", { name: /Equipment/ }).click();
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await page
        .getByLabel("Equipment type", { exact: true })
        .selectOption("weapon");
      await page
        .getByLabel("Item name", { exact: true })
        .fill("Workshop sword");
      await page.getByRole("checkbox", { name: "Close", exact: true }).check();
      await page.getByLabel("Value", { exact: true }).fill("2");
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await expect(
        page.getByText("Workshop sword", { exact: true }),
      ).toBeVisible();
      await steps.getByRole("button", { name: /Review & connections/ }).click();
      await page
        .getByLabel("Connections", { exact: true })
        .fill("I repaired Willow’s pack.");
      await page
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(page.locator(".play-sheet")).toBeVisible();
      const stored = await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("root-quick-sheet")),
      );
      assert.equal(stored.coin, book.value - 2);
      assert.equal(stored.equipment[0].kind, "weapon");
      assert.equal(stored.equipment[0].range, "Close");
      assert.equal(
        stored.reputation.find((f) => f.faction === "Marquisate").prestige,
        2,
      );
      assert.equal(
        stored.reputation.find((f) => f.faction === "Eyrie Dynasties")
          .notoriety,
        1,
      );
      await expect(
        page.locator(".equipment-section .gear-panel"),
      ).toBeVisible();
      await expect(page.locator(".sheet-subsection .move-tile")).toHaveCount(3);
      await page
        .getByRole("button", { name: "Melee · Might", exact: true })
        .click();
      await expect(page.locator(".activity-roll").first()).toContainText(
        "Might",
      );
      await dismissRollPopup(page);
      await page.getByRole("button", { name: "Injury 2", exact: true }).click();
      await page
        .getByRole("button", { name: "Edit character", exact: true })
        .click();
      await expect(page).toHaveURL(
        /\/characters\/edit\?id=quick-game&mode=quick$/,
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByLabel("Name", { exact: true }).fill("Juniper the Smith");
      await page
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Juniper the Smith",
          exact: true,
          level: 2,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Injury 2", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      for (const locale of ["en", "ru", "de"]) {
        const dict =
          locale === "en"
            ? {}
            : JSON.parse(
                await readFile(`src/lib/locales/${locale}.json`, "utf8"),
              );
        const t = (key) => dict[key] || key;
        await page.locator(".language-select").selectOption(locale);
        await page
          .getByRole("button", { name: t("Edit character"), exact: true })
          .click();
        for (const [device, width, height] of [
          ["phone", 390, 844],
          ["small-phone", 320, 700],
          ["ipad", 820, 1180],
          ["desktop", 1280, 900],
        ]) {
          await page.setViewportSize({ width, height });
          for (const name of [
            "Identity",
            "Abilities",
            "Equipment",
            "Review & connections",
          ]) {
            await steps
              .getByRole("button", { name: new RegExp(t(name)) })
              .click();
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
              false,
              `${locale} ${device} ${name} overflow`,
            );
          }
          await steps
            .getByRole("button", { name: new RegExp(t("Identity")) })
            .click();
          await page
            .locator(".optional-details > summary")
            .filter({ hasText: t("Custom attributes") })
            .click();
          const selectsFit = await page
            .locator(".attribute-inputs select")
            .evaluateAll((selects) =>
              selects.every((select) => {
                const style = getComputedStyle(select);
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                context.font = style.font;
                const textWidth = context.measureText(
                  select.selectedOptions[0].text,
                ).width;
                return (
                  select.clientWidth -
                    parseFloat(style.paddingLeft) -
                    parseFloat(style.paddingRight) >=
                    textWidth && style.appearance === "none"
                );
              }),
            );
          assert.ok(
            selectsFit,
            `${locale} ${device} attribute dropdown text overlaps its arrow`,
          );
          await page
            .locator(".optional-details > summary")
            .filter({ hasText: t("Custom attributes") })
            .click();
          await page.screenshot({
            path: `test-results/builder-${locale}-${device}.png`,
            fullPage: true,
          });
        }
        await page.locator(".creation-back").click();
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.screenshot({
          path: `test-results/play-${locale}-desktop.png`,
          fullPage: true,
        });
      }
      await page.locator(".language-select").selectOption("en");
      await page.getByRole("button", { name: "Home", exact: true }).click();
      await page
        .getByRole("button", { name: "Quick game", exact: true })
        .click();
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
