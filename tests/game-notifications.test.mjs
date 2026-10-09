import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium, expect } from "@playwright/test";
import { sheets, rules } from "./load-typescript.mjs";
const require = createRequire(import.meta.url);
const {
  sheetChanges,
  describeChanges,
  describeRoll,
} = require("../src/lib/game-activity.ts");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const sheet = sheets.sheetSchema.parse({
  ...rules.newCharacterSheet(),
  name: "Rowan",
  injury: 0,
  forward: 0,
});
const t = (text, values = {}) =>
  text.replace(/\{(\w+)\}/g, (_, key) => values[key]);

test("activity summaries include numeric changes, equipment wear, factions, drives, and roll arithmetic", () => {
  assert.deepEqual(sheetChanges(sheet, structuredClone(sheet)), []);
  assert.deepEqual(
    describeChanges(sheetChanges(sheet, { ...sheet, injury: 2 }), t),
    ["injury: 0 → 2"],
  );
  const old = [{ name: "Sword", wear: 0, secondaryWear: 0 }];
  assert.deepEqual(
    describeChanges(
      [{ field: "equipment", before: old, after: [{ ...old[0], wear: 2 }] }],
      t,
    ),
    ["Sword · Wear: 0 → 2"],
  );
  assert.deepEqual(
    describeChanges(
      [{ field: "equipment", before: old, after: [{ name: "Bow" }] }],
      t,
    ),
    ["Added Bow", "Removed Sword"],
  );
  assert.deepEqual(
    describeChanges(
      [
        {
          field: "reputation",
          before: [
            { faction: "Denizens", standing: 0, prestige: 0, notoriety: 0 },
          ],
          after: [
            { faction: "Denizens", standing: 1, prestige: 2, notoriety: 0 },
          ],
        },
      ],
      t,
    ),
    ["Denizens · Standing: 0 → 1", "Denizens · Prestige: 0 → 2"],
  );
  assert.deepEqual(
    describeChanges(
      [{ field: "driveMarks", before: [], after: ["Justice"] }],
      t,
    ),
    ["Fulfilled drives: +Justice"],
  );
  assert.equal(
    describeRoll({ label: "Charm", dice: [4, 3], modifier: -1 }, t),
    "Charm · 4 + 3 − 1 = 6 · 6−: miss",
  );
});

test(
  "quick-game notifications stack, dismiss independently, stay dismissed, and fit phones",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript((value) => {
        sessionStorage.setItem("root-quick-sheet", JSON.stringify(value));
        sessionStorage.setItem("root-quick-active", "1");
      }, sheet);
      await page.goto(base);
      await expect(page.locator(".hero-caption h2")).toHaveText("Rowan");
      await expect(page.locator(".activity-popup")).toHaveCount(0);
      await page.getByRole("button", { name: "Injury 2", exact: true }).click();
      await expect(page.locator(".activity-popup")).toContainText(
        "Injury: 0 → 2",
      );
      await expect(page.locator(".activity-avatar img")).toHaveAttribute(
        "alt",
        "Fox · Ranger",
      );
      await expect
        .poll(() =>
          page
            .locator(".activity-avatar img")
            .evaluate((img) => img.complete && img.naturalWidth > 0),
        )
        .toBe(true);
      await page
        .getByRole("button", { name: "Increase Hold", exact: true })
        .click();
      await expect(page.locator(".activity-popup")).toHaveCount(2);
      const boxes = await page.locator(".activity-popup").evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom };
        }),
      );
      assert.ok(boxes[1].top >= boxes[0].bottom + 7);
      await page
        .getByRole("button", {
          name: "Hide notification from Rowan",
          exact: true,
        })
        .first()
        .click();
      await expect(page.locator(".activity-popup")).toHaveCount(1);
      await expect(page.locator(".activity-popup")).toContainText(
        "Injury: 0 → 2",
      );
      await page
        .getByRole("button", { name: "Roll Charm", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.locator(".activity-roll").first()).toBeVisible();
      await expect(
        page.locator(".activity-roll .activity-avatar img"),
      ).toHaveAttribute("alt", "Fox · Ranger");
      await expect(page.locator(".activity-roll")).toContainText(
        /Charm · [1-6] \+ [1-6] [−+] \d+ =/,
      );
      await page.screenshot({ path: "test-results/activity-desktop.png" });
      for (const width of [320, 390, 820]) {
        await page.setViewportSize({ width, height: 844 });
        const panel = await page.locator(".game-activity").boundingBox();
        assert.ok(panel.x >= 0 && panel.x + panel.width <= width);
        assert.ok(panel.y + panel.height <= 844);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "test-results/activity-mobile.png" });
      await page.getByRole("button", { name: "Hide all", exact: true }).click();
      await expect(page.locator(".activity-popup")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Increase Hold", exact: true })
        .click();
      await expect(page.locator(".activity-popup")).toHaveCount(1);
      await expect(page.locator(".activity-popup")).toContainText(
        "Hold: 1 → 2",
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);

test(
  "campaign feed receives other players, avoids history and duplicates, and retries sharing the same roll",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      const campaign = {
        id: "campaign-one",
        owner_id: "master",
        name: "Woodland",
        members: 2,
      };
      const hero = {
        id: "hero-one",
        owner_id: "user-one",
        campaign_id: campaign.id,
        player: "Rowan Player",
        version: 1,
        sheet,
      };
      const events = [];
      const posts = [];
      let failRoll = true;
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/auth")
          return route.fulfill({
            json: { user: { id: "user-one", name: "Rowan Player" } },
          });
        if (url.pathname === "/api/campaigns")
          return route.fulfill({ json: { campaigns: [campaign] } });
        if (url.pathname === "/api/presence")
          return route.fulfill({ json: { players: [] } });
        if (url.pathname === "/api/activity") {
          if (route.request().method() === "POST") {
            posts.push(route.request().postDataJSON());
            return route.fulfill(
              failRoll
                ? { status: 503, json: { error: "Offline" } }
                : { json: { id: posts.at(-1).id } },
            );
          }
          return route.fulfill({
            json: {
              events: url.searchParams.has("after") ? events : [],
              cursor: "5",
            },
          });
        }
        return route.fulfill({ json: { heroes: [hero] } });
      });
      await page.addInitScript(() =>
        localStorage.setItem("root-session-user-one", "hero-one"),
      );
      await page.goto(base);
      await page.getByRole("button", { name: /Continue game/ }).click();
      await expect(page.locator(".party-card")).toHaveCount(1);
      await expect(page.locator(".activity-popup")).toHaveCount(0);
      events.push({
        id: "change-one",
        player: "Morgan",
        character: "Moss",
        portrait: { species: "Otter", playbook: "Tinker" },
        kind: "change",
        created_at: new Date().toISOString(),
        changes: [{ field: "coin", before: 4, after: 2 }],
      });
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      await expect(page.locator(".activity-popup")).toContainText("Morgan");
      await expect(page.locator(".activity-popup")).toContainText(
        "Coin: 4 → 2",
      );
      await expect(page.locator(".activity-avatar img")).toHaveAttribute(
        "alt",
        "Otter · Tinker",
      );
      events.push({
        id: "legacy-change",
        player: "Older player",
        character: "Legacy hero",
        kind: "change",
        created_at: new Date().toISOString(),
        changes: [{ field: "coin", before: 1, after: 2 }],
      });
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      const legacy = page
        .locator(".activity-popup")
        .filter({ hasText: "Legacy hero" });
      await expect(legacy).toBeVisible();
      await expect(legacy.locator(".activity-avatar")).toBeVisible();
      await expect(legacy.locator(".portrait")).toHaveCount(0);
      await page.getByRole("button", { name: "Hide all", exact: true }).click();
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      await page
        .getByRole("button", { name: "Roll Charm", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.locator(".activity-roll").first()).toBeVisible();
      await expect(page.locator(".activity-popup")).toHaveCount(1);
      await expect(page.locator(".activity-share-error")).toContainText(
        "Roll not shared",
      );
      failRoll = false;
      await page
        .locator(".activity-popup")
        .getByRole("button", { name: "Retry", exact: true })
        .click();
      await expect(page.locator(".activity-share-error")).toHaveCount(0);
      assert.equal(posts.length, 2);
      assert.deepEqual(posts[0], posts[1]);
      events.push({
        id: posts[0].id,
        player: "Rowan Player",
        character: "Rowan",
        kind: "roll",
        created_at: new Date().toISOString(),
        roll: posts[0].roll,
      });
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      await expect(page.locator(".activity-popup")).toHaveCount(1);
    } finally {
      await browser.close();
    }
  },
);

test(
  "attribute tile icon, value, dice, and empty space roll; names only open rules",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        hasTouch: true,
      });
      await page.addInitScript((value) => {
        sessionStorage.setItem("root-quick-sheet", JSON.stringify(value));
        sessionStorage.setItem("root-quick-active", "1");
      }, sheet);
      await page.goto(base);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const stat of sheets.stats) {
          const tile = page.locator(".attribute-roll").filter({
            has: page.getByRole("button", {
              name: `Roll ${stat}`,
              exact: true,
            }),
          });
          const name = tile.getByRole("button", { name: stat, exact: true });
          await name.click();
          await expect(page.locator(".rule-dialog")).toBeVisible();
          await expect(page.locator(".activity-roll")).toHaveCount(0);
          await page.keyboard.press("Escape");
          await expect(name).toBeFocused();
          for (const target of [
            ".attribute-icon",
            ".attribute-roll-action strong",
            ".attribute-dice",
            "padding",
            "beside-name",
          ]) {
            await tile.scrollIntoViewIfNeeded();
            const bounds = await tile.boundingBox();
            const box =
              target === "padding"
                ? {
                    x: bounds.x + bounds.width - 5,
                    y: bounds.y + 5,
                    width: 0,
                    height: 0,
                  }
                : target === "beside-name"
                  ? {
                      x: bounds.x + bounds.width - 5,
                      y: (await name.boundingBox()).y + 10,
                      width: 0,
                      height: 0,
                    }
                  : await tile.locator(target).boundingBox();
            if (width === 390)
              await page.touchscreen.tap(
                box.x + box.width / 2,
                box.y + box.height / 2,
              );
            else
              await page.mouse.click(
                box.x + box.width / 2,
                box.y + box.height / 2,
              );
            await expect(page.locator(".activity-roll")).toHaveCount(1);
            await expect(page.locator(".activity-roll")).toContainText(
              `${stat} ·`,
            );
            await expect(page.getByRole("dialog")).toHaveCount(0);
            await page
              .getByRole("button", { name: "Hide all", exact: true })
              .click();
          }
          const rollButton = tile.getByRole("button", {
            name: `Roll ${stat}`,
            exact: true,
          });
          for (const key of ["Enter", "Space"]) {
            await rollButton.focus();
            await page.keyboard.press(key);
            await expect(page.locator(".activity-roll")).toHaveCount(1);
            await expect(rollButton).toBeFocused();
            await page
              .getByRole("button", { name: "Hide all", exact: true })
              .click();
          }
        }
      }
      // New results scroll into view when the stack was scrolled to older rolls.
      const roll = page.getByRole("button", {
        name: "Roll Charm",
        exact: true,
      });
      for (let i = 0; i < 6; i++) await roll.click();
      const stack = page.locator(".activity-stack");
      await stack.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await roll.click();
      await expect
        .poll(() => stack.evaluate((element) => element.scrollTop))
        .toBe(0);
      await expect(page.locator(".activity-roll")).toHaveCount(7);
      await page.screenshot({
        path: "test-results/attribute-tile-notifications.png",
      });
    } finally {
      await browser.close();
    }
  },
);
