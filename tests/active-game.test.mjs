import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { sheets, rules } from "./load-typescript.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const makeSheet = (patch = {}) =>
  sheets.sheetSchema.parse({
    ...rules.newCharacterSheet(),
    name: "Rowan Ashfoot",
    species: "Fox",
    pronouns: "they / them",
    description:
      "A soft-spoken scout with a sharp eye and a weakness for lost causes.",
    injury: 2,
    exhaustion: 1,
    forward: 1,
    ongoing: -1,
    hold: 2,
    equipment: [
      {
        name: "Weathered longsword",
        kind: "weapon",
        range: "Close",
        harm: 2,
        details: "Reliable • Two-handed",
        wear: 1,
        maxWear: 4,
        load: 2,
        value: 3,
      },
    ],
    ...patch,
  });

test(
  "character sheet tracks harm, rolls in an accessible dialog, and fits mobile layouts",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript((sheet) => {
        if (!sessionStorage.getItem("root-quick-sheet"))
          sessionStorage.setItem("root-quick-sheet", JSON.stringify(sheet));
        sessionStorage.setItem("root-quick-active", "1");
      }, makeSheet());
      await page.goto(base);
      await expect(
        page.getByRole("heading", { name: "Rowan Ashfoot", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Increase Forward", exact: true }),
      ).toBeVisible();
      const portrait = await page
        .locator(".character-portrait-card")
        .boundingBox();
      const harm = await page.locator(".character-vitals").boundingBox();
      assert.ok(
        harm.x > portrait.x + portrait.width,
        "Harm sits beside the portrait",
      );
      await page.getByRole("button", { name: "injury 3", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "injury 3", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "injury 3", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "injury 3", exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await mkdir("test-results", { recursive: true });
      await page.screenshot({
        path: "test-results/redesign-desktop.png",
        fullPage: true,
      });
      const rollButton = page.getByRole("button", {
        name: "Roll Charm",
        exact: true,
      });
      await rollButton.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(".dice-total")).toBeVisible();
      const stored = await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem("root-quick-sheet")),
      );
      assert.equal(stored.forward, 0);
      assert.equal(stored.ongoing, -1);
      assert.equal(stored.hold, 2);
      const equation = await dialog.locator(".dice-equation").textContent();
      const match = equation.match(/(\d) \+ (\d) ([+−])(\d+) = (-?\d+)/);
      assert.ok(match, equation);
      assert.ok([+match[1], +match[2]].every((n) => n >= 1 && n <= 6));
      assert.equal(
        +match[5],
        +match[1] + +match[2] + (match[3] === "+" ? 1 : -1) * +match[4],
      );
      await page.screenshot({ path: "test-results/redesign-dice.png" });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(rollButton).toBeFocused();
      await page
        .getByRole("button", { name: "Campaign overview", exact: true })
        .click();
      await expect(page.locator(".party-card")).toHaveCount(1);
      await expect(page.locator(".party-notice")).toContainText("Quick game");
      await page
        .getByRole("button", { name: "Open character sheet", exact: true })
        .click();
      await expect(
        page.getByText("Weathered longsword", { exact: true }),
      ).toBeVisible();
      for (const locale of ["en", "ru", "de"]) {
        await page.locator(".language-select").selectOption(locale);
        for (const width of [320, 390, 820, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${locale} ${width}px overflow`,
          );
        }
      }
      await page.locator(".language-select").selectOption("en");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: "test-results/redesign-mobile.png",
        fullPage: true,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await rollButton.click();
      await expect(dialog.locator(".dice-total")).toBeVisible();
      await dialog
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "injury 2", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      assert.equal(
        await page.evaluate(
          () => JSON.parse(sessionStorage.getItem("root-quick-sheet")).forward,
        ),
        0,
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);

test(
  "campaign overview loads companions separately and remains read-only",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      const campaign = {
        id: "campaign-one",
        name: "The Long Road",
        clearing: "Mossbank Clearing",
        description: "A trail through a changing Woodland.",
        members: 2,
      };
      const own = {
        id: "hero-one",
        owner_id: "user-one",
        campaign_id: campaign.id,
        player: "Rowan Player",
        version: 1,
        sheet: makeSheet(),
      };
      const other = {
        ...own,
        id: "hero-two",
        owner_id: "user-two",
        player: "Morgan",
        sheet: makeSheet({
          name: "Moss Underbough",
          species: "Rabbit",
          playbook: "Tinker",
          nature: "Curious",
        }),
      };
      let fail = true;
      let mutations = 0;
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (
          route.request().method() !== "GET" &&
          url.pathname !== "/api/presence"
        )
          mutations++;
        if (url.pathname === "/api/auth")
          return route.fulfill({
            json: {
              user: {
                id: "user-one",
                name: "Rowan Player",
                email: "fixture@example.invalid",
              },
            },
          });
        if (url.pathname === "/api/campaigns")
          return route.fulfill({ json: { campaigns: [campaign] } });
        if (url.pathname === "/api/presence")
          return route.fulfill({ json: { players: [] } });
        if (url.searchParams.has("campaign"))
          return fail
            ? route.fulfill({
                status: 503,
                json: { error: "Could not load characters." },
              })
            : route.fulfill({ json: { heroes: [own, other] } });
        return route.fulfill({ json: { heroes: [own] } });
      });
      await page.addInitScript(() =>
        localStorage.setItem("root-session-user-one", "hero-one"),
      );
      await page.goto(base);
      await page.getByRole("button", { name: /Continue game/ }).click();
      await page
        .getByRole("button", { name: "Campaign overview", exact: true })
        .click();
      await expect(
        page.locator(".campaign-overview").getByRole("alert"),
      ).toContainText("Could not load characters.");
      fail = false;
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(page.locator(".party-card")).toHaveCount(2);
      const companion = page
        .locator(".party-card")
        .filter({ hasText: "Moss Underbough" });
      await expect(companion).toContainText("Morgan");
      await expect(companion.getByRole("button")).toHaveCount(0);
      await expect(page.locator(".clearing-badge")).toContainText(
        "Mossbank Clearing",
      );
      await page
        .locator(".party-card img")
        .evaluateAll((images) =>
          Promise.all(images.map((img) => img.decode().catch(() => {}))),
        );
      await page.screenshot({
        path: "test-results/redesign-party.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 320, height: 700 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page
        .getByRole("button", { name: "My character", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Rowan Ashfoot", exact: true }),
      ).toBeVisible();
      assert.equal(mutations, 0);
    } finally {
      await browser.close();
    }
  },
);
