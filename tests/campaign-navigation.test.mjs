import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { rules } from "./load-typescript.mjs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test(
  "campaign actions, switching confirmation and game Back to home",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const campaigns = [
        { id: "current", name: "Current woods", owner_id: "me" },
        { id: "fresh", name: "Fresh woods", owner_id: "me" },
        { id: "join", name: "Friends woods", owner_id: "friend" },
        {
          id: "played",
          name: "Played woods",
          owner_id: "friend",
          started_at: "2026-10-09T10:00:00Z",
        },
        {
          id: "saved",
          name: "Saved woods",
          owner_id: "me",
          started_at: "2026-10-09T10:00:00Z",
        },
      ].map((c) => ({
        description: "",
        clearing: "",
        invite_code: c.id,
        members: 2,
        ...c,
      }));
      const heroes = ["current", "saved"].map((id) => ({
        id: `${id}-hero`,
        owner_id: "me",
        campaign_id: id,
        version: 1,
        sheet: { ...rules.newCharacterSheet(), name: `${id} hero` },
      }));
      await page.addInitScript(() =>
        localStorage.setItem("root-session-me", "current-hero"),
      );
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const body =
          path === "/api/auth"
            ? {
                user: {
                  id: "me",
                  name: "Player",
                  email: "player@example.invalid",
                },
              }
            : path === "/api/campaigns"
              ? { campaigns }
              : path === "/api/heroes"
                ? { heroes }
                : { players: [] };
        await route.fulfill({ json: body });
      });
      await page.goto(base);
      const openCampaigns = () =>
        page.getByRole("button", { name: /My campaigns/ }).click();
      const card = (name) =>
        page.locator(".campaign-card").filter({ hasText: name });
      await openCampaigns();
      for (const [name, action] of [
        ["Current woods", "Continue"],
        ["Fresh woods", "Start"],
        ["Friends woods", "Join"],
        ["Played woods", "Continue"],
        ["Saved woods", "Continue"],
      ]) {
        await expect(
          card(name).getByRole("button", { name: action, exact: true }),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("button", { name: "My characters", exact: true }),
      ).toHaveCount(0);
      await card("Current woods")
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await expect(page.locator(".game-heading")).toContainText(
        "Current woods",
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.locator(".workspace-back").click();
      await expect(
        page.getByRole("button", { name: /Continue game/ }),
      ).toBeVisible();
      await openCampaigns();
      await card("Fresh woods")
        .getByRole("button", { name: "Start", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toContainText("Current woods");
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(page.locator(".campaigns-collection")).toBeVisible();
      assert.equal(
        await page.evaluate(() => localStorage.getItem("root-session-me")),
        "current-hero",
      );
      for (const [name, action] of [
        ["Fresh woods", "Start"],
        ["Friends woods", "Join"],
        ["Played woods", "Continue"],
      ]) {
        await card(name)
          .getByRole("button", { name: action, exact: true })
          .click();
        await page
          .getByRole("button", { name: "Switch campaign", exact: true })
          .click();
        await expect(page.locator(".journey-progress")).toContainText(
          "2 · Choose your character",
        );
        await expect(page.locator(".game-heading")).toHaveCount(0);
        await page.locator(".workspace-back").click();
      }
      await card("Saved woods")
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await card("Saved woods")
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Switch campaign", exact: true })
        .click();
      await expect(page.locator(".game-heading")).toContainText("Saved woods");
      assert.equal(
        await page.evaluate(() => localStorage.getItem("root-session-me")),
        "saved-hero",
      );
      await page.locator(".workspace-back").click();
      await expect(
        page.getByRole("button", { name: /Continue game/ }),
      ).toBeVisible();
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
