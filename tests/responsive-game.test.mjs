import { dismissRollPopup } from "./roll-popup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { rules } from "./load-typescript.mjs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test(
  "campaign controls, dice and navigation stay responsive while saves wait or fail",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const campaign = {
        id: "game",
        owner_id: "me",
        name: "Slow woods",
        members: 1,
        started_at: "2026-10-09",
      };
      let hero = {
        id: "hero",
        owner_id: "me",
        campaign_id: "game",
        player: "Player",
        version: 1,
        sheet: {
          ...rules.newCharacterSheet(),
          name: "Swift Fox",
          hold: 0,
          forward: 1,
        },
      };
      const requests = [];
      let dataReads = 0;
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/auth")
          return route.fulfill({
            json: {
              user: { id: "me", name: "Player" },
              heroes: [hero],
              campaigns: [campaign],
            },
          });
        if (url.pathname === "/api/activity")
          return route.fulfill({ json: { events: [], cursor: "0" } });
        if (url.pathname === "/api/presence")
          return route.fulfill({ json: { players: [] } });
        if (url.pathname === "/api/campaigns") {
          dataReads++;
          return route.fulfill({ json: { campaigns: [campaign] } });
        }
        if (route.request().method() === "POST") {
          requests.push({ route, body: route.request().postDataJSON() });
          return; // Explicitly held until the test acknowledges this version.
        }
        dataReads++;
        return route.fulfill({ json: { heroes: [hero] } });
      });
      await page.addInitScript(() =>
        localStorage.setItem("root-session-me", "hero"),
      );
      await page.goto(base);
      await page.getByRole("button", { name: /Continue game/ }).waitFor();
      assert.equal(
        dataReads,
        0,
        "bootstrap includes the workspace without more data requests",
      );
      await page.getByRole("button", { name: /Continue game/ }).click();
      const increase = page.getByRole("button", {
        name: "Increase Hold",
        exact: true,
      });
      const hold = page
        .locator(".sheet-counter")
        .filter({ has: increase })
        .locator("output");
      await increase.waitFor();
      await page.evaluate(() => {
        const button = document.querySelector('[aria-label="Increase Hold"]');
        const output = button.closest(".sheet-counter").querySelector("output");
        window.clickLatencies = [];
        let clicked;
        button.addEventListener(
          "click",
          () => {
            clicked = performance.now();
          },
          true,
        );
        new MutationObserver(() => {
          if (clicked !== undefined) {
            window.clickLatencies.push(performance.now() - clicked);
            clicked = undefined;
          }
        }).observe(output, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
      for (let i = 0; i < 5; i++) await increase.click();
      await expect(hold).toHaveText("5", { timeout: 500 });
      await expect.poll(() => requests.length).toBe(1);
      await page.getByRole("button", { name: "Injury 2", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Injury 2", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.locator('.own-character progress[aria-label="Swift Fox: Injury"]'),
      ).toHaveAttribute("value", "2");
      await page
        .getByRole("button", { name: "Roll Charm", exact: true })
        .click();
      await expect(page.locator(".activity-roll").first()).toBeVisible({
        timeout: 500,
      });
      await expect(page.locator(".dice-dialog")).toBeVisible({ timeout: 500 });
      await dismissRollPopup(page);
      const forward = page
        .locator(".sheet-counter")
        .filter({
          has: page.getByRole("button", {
            name: "Increase Forward",
            exact: true,
          }),
        })
        .locator("output");
      await expect(forward).toHaveText("0");
      // Old polling responses must not remove any pending local change.
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      await expect.poll(() => dataReads).toBeGreaterThan(1);
      await expect(hold).toHaveText("5");
      await page.locator(".workspace-back").click();
      await expect(
        page.getByText("Saving changes for Swift Fox…"),
      ).toBeVisible();
      const finish = async (index) => {
        const { route, body } = requests[index];
        assert.equal(body.version, hero.version);
        hero = { ...hero, sheet: body.sheet, version: hero.version + 1 };
        await route.fulfill({ json: { hero } });
      };
      await finish(0);
      await expect.poll(() => requests.length).toBe(2);
      assert.equal(requests[1].body.sheet.hold, 5);
      assert.equal(requests[1].body.sheet.injury, 2);
      assert.equal(requests[1].body.sheet.forward, 0);
      await page
        .getByRole("button", { name: "Return to game", exact: true })
        .click();
      await expect(hold).toHaveText("5");
      await finish(1);
      await expect(page.locator(".quick-save-status")).toContainText(
        "Character sheet saved.",
      );

      await increase.click();
      await expect.poll(() => requests.length).toBe(3);
      await requests[2].route.fulfill({
        status: 503,
        json: { error: "Unable to connect. Please try again." },
      });
      await expect(page.locator(".play-sheet .error")).toContainText(
        "Your unsaved changes are kept in this tab.",
      );
      await expect(hold).toHaveText("6");
      await increase.click();
      await expect(hold).toHaveText("7");
      assert.equal(requests.length, 3);
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect.poll(() => requests.length).toBe(4);
      await finish(3);
      await expect(page.locator(".quick-save-status")).toContainText(
        "Character sheet saved.",
      );

      await increase.click();
      await expect.poll(() => requests.length).toBe(5);
      hero = {
        ...hero,
        version: hero.version + 1,
        sheet: { ...hero.sheet, hold: 9 },
      };
      await requests[4].route.fulfill({
        status: 409,
        json: { error: "Changed elsewhere" },
      });
      await expect(hold).toHaveText("8");
      await expect(increase).toBeDisabled();
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .getByRole("button", { name: "Reload saved sheet", exact: true })
        .click();
      await expect(hold).toHaveText("9");
      await expect(increase).toBeEnabled();
      assert.equal(
        requests.length,
        5,
        "conflict recovery does not overwrite remote changes",
      );
      const latencies = await page.evaluate(() => window.clickLatencies);
      assert.ok(latencies.length >= 5);
      assert.ok(
        Math.max(...latencies) < 250,
        `click-to-DOM latency: ${latencies}`,
      );
      console.log(
        `Held-network click-to-DOM latency: ${latencies.map((n) => n.toFixed(1)).join(", ")} ms`,
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
