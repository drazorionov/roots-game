import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test(
  "quick game stays in its tab and works offline",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page
        .getByRole("button", { name: "Quick game", exact: true })
        .click();
      const requests = [];
      page.on("request", (r) => {
        if (r.url().includes("/api/")) requests.push(r.url());
      });
      const creation = page.locator(".creation-page");
      await expect(page).toHaveURL(/\/characters\/new\?mode=quick$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await creation.getByLabel("Name", { exact: true }).fill("Offline Otter");
      await creation
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Offline Otter", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".campaign-presence")).toHaveCount(0);
      await expect(page.locator(".language-select option")).toHaveText([
        "EN",
        "RU",
        "DE",
      ]);
      await page.getByRole("button", { name: "injury 2", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "injury 2", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      if (process.env.TEST_OFFLINE_RELOAD)
        await expect(page.locator(".offline-ready")).toBeVisible({
          timeout: 30000,
        });
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Offline Otter", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "injury 2", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await context.setOffline(true);
      if (process.env.TEST_OFFLINE_RELOAD) await page.reload();
      await page
        .getByRole("button", { name: "exhaustion 3", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await page.getByLabel("Item name", { exact: true }).fill("Offline sword");
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await expect(
        page.getByText("Offline sword", { exact: true }),
      ).toBeVisible();
      const stored = await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("root-quick-sheet")),
      );
      assert.equal(stored.exhaustion, 3);
      assert.equal(stored.injury, 2);
      assert.ok(stored.equipment.some((i) => i.name === "Offline sword"));
      await page.locator(".game-menu summary").click();
      await page
        .getByRole("button", { name: "Restart game", exact: true })
        .click();
      await expect(creation).toBeVisible();
      if (process.env.TEST_OFFLINE_RELOAD) {
        await page.reload();
        await expect(creation).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
      await creation.locator(".creation-back").click();
      await expect(
        page.getByRole("heading", { name: "Offline Otter", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Edit character", exact: true })
        .click();
      await expect(page).toHaveURL(/\/characters\/edit/);
      if (process.env.TEST_OFFLINE_RELOAD) await page.reload();
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
        "Offline Otter",
      );
      await creation.locator(".creation-back").click();
      assert.deepEqual(requests, []);
      assert.deepEqual(errors, []);
      await context.setOffline(false);
      await page.locator(".language-select").selectOption("ru");
      await expect(page.locator(".campaign-heading h1")).toHaveText(
        "Быстрая игра",
      );
      await page.screenshot({
        path: "test-results/quick-game-iphone.png",
        fullPage: true,
      });
      // A separate tab in the same browser has no character data.
      const other = await context.newPage();
      await other.goto(base);
      assert.equal(
        await other.evaluate(() => sessionStorage.getItem("root-quick-sheet")),
        null,
      );
      await expect(
        other.getByRole("heading", { name: "Offline Otter", exact: true }),
      ).toHaveCount(0);
    } finally {
      await browser.close();
    }
  },
);
