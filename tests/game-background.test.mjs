import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { sheets, rules } from "./load-typescript.mjs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

test(
  "game artwork follows local time across boundaries and clock changes",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      // UTC+3 makes this catch accidental use of UTC or the server's timezone.
      const page = await browser.newPage({
        timezoneId: "Europe/Minsk",
        viewport: { width: 1600, height: 1000 },
      });
      await mkdir("test-results", { recursive: true });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.clock.install({ time: new Date("2026-10-09T05:55:00+03:00") });
      await page.route("**/api/auth", (route) =>
        route.fulfill({ json: { user: null } }),
      );
      await page.addInitScript(
        (sheet) => {
          sessionStorage.setItem("root-quick-sheet", JSON.stringify(sheet));
          sessionStorage.setItem("root-quick-active", "1");
        },
        sheets.sheetSchema.parse({
          ...rules.newCharacterSheet(),
          name: "Morning Scout",
        }),
      );
      await page.goto(base);
      const scene = page.locator(".game-scene");
      await expect(scene).toHaveAttribute("data-game-time", "night");

      for (const [time, before, after] of [
        ["2026-10-09T05:59:59+03:00", "night", "morning"],
        ["2026-10-09T11:59:59+03:00", "morning", "day"],
        ["2026-10-09T17:59:59+03:00", "day", "evening"],
        ["2026-10-09T23:59:59+03:00", "evening", "night"],
      ]) {
        await page.clock.pauseAt(new Date(time));
        await expect(scene).toHaveAttribute("data-game-time", before);
        await page.clock.runFor(1000);
        await expect(scene).toHaveAttribute("data-game-time", after);
        await page.evaluate(async (period) => {
          const art = new Image();
          art.src = `/art/game-${period}.webp`;
          await art.decode();
        }, after);
        assert.ok(
          await scene.evaluate(
            (el, period) =>
              getComputedStyle(el, "::before").backgroundImage.includes(
                `/art/game-${period}.webp`,
              ),
            after,
          ),
        );
        await page.screenshot({ path: `test-results/game-${after}.png` });
      }

      await page.clock.setSystemTime(new Date("2026-10-10T09:00:00+03:00"));
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(scene).toHaveAttribute("data-game-time", "morning");
      await page.clock.setSystemTime(new Date("2026-10-10T20:00:00+03:00"));
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      await expect(scene).toHaveAttribute("data-game-time", "evening");

      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({ path: "test-results/game-evening-mobile.png" });

      await page.getByRole("button", { name: "Home", exact: true }).click();
      await expect(page.locator(".welcome-scene")).toBeVisible();
      assert.equal(
        await page.locator(".scene-app").getAttribute("data-game-time"),
        null,
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
