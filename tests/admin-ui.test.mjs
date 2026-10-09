import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test(
  "admin menu, responsive directory, localized controls and purge confirmation",
  { timeout: 60000 },
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
      page.on("pageerror", (error) => errors.push(error.message));
      let administrator = true;
      const admin = {
        id: "a",
        name: "Administrator",
        email: "admin@example.invalid",
        isAdmin: true,
      };
      const details = {
        created_at: "2026-10-09T08:00:00Z",
        banned_at: null,
        active_sessions: 1,
        heroes: [],
        campaigns: [],
        memberships: [],
      };
      let users = [
        { ...admin, ...details },
        {
          id: "b",
          name: "Woodland Player",
          email: "player@example.invalid",
          isAdmin: false,
          ...details,
          heroes: [
            {
              id: "hero",
              sheet: { name: "Rowan", equipment: [{ name: "Sword" }] },
            },
          ],
          memberships: [
            {
              campaign_id: "campaign",
              name: "Autumn clearing",
              last_seen: "2026-10-09T09:00:00Z",
            },
          ],
        },
      ];
      const actions = [];
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        let body = {};
        if (path === "/api/auth")
          body = { user: { ...admin, isAdmin: administrator } };
        if (path === "/api/heroes") body = { heroes: [] };
        if (path === "/api/campaigns") body = { campaigns: [] };
        if (path === "/api/admin") {
          if (route.request().method() === "POST") {
            const action = route.request().postDataJSON();
            actions.push(action);
            if (action.action === "purge")
              users = users.filter((u) => u.id !== action.id);
            else
              users = users.map((u) =>
                u.id === action.id
                  ? {
                      ...u,
                      banned_at:
                        action.action === "ban"
                          ? new Date().toISOString()
                          : null,
                    }
                  : u,
              );
            body = { ok: true };
          } else body = { users, maxUsers: 50 };
        }
        await route.fulfill({ json: body });
      });
      await page.goto(base);
      await page
        .getByRole("button", { name: "My characters", exact: false })
        .waitFor();
      await page.getByLabel("More options", { exact: true }).click();
      await page
        .getByRole("button", { name: "Administration", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Administration" }),
      ).toBeVisible();
      await expect(
        page.getByText("2 / 50 users", { exact: true }),
      ).toBeVisible();
      assert.equal(
        await page
          .getByRole("button", { name: "Ban user", exact: true })
          .count(),
        1,
      );
      const player = page
        .locator(".admin-user")
        .filter({ hasText: "Woodland Player" });
      await player.getByText("View all user data", { exact: true }).click();
      await player.getByText("Rowan", { exact: true }).click();
      await expect(player.locator("pre")).toContainText("Sword");
      await mkdir("test-results", { recursive: true });
      await page.screenshot({
        path: "test-results/admin-desktop.png",
        fullPage: true,
      });
      await page.getByLabel("Search users").fill("player@");
      await expect(page.locator(".admin-user")).toHaveCount(1);
      await page.getByLabel("Search users").fill("");
      page.once("dialog", (dialog) => dialog.accept());
      await player
        .getByRole("button", { name: "Ban user", exact: true })
        .click();
      await expect(
        player.getByRole("button", { name: "Unban user", exact: true }),
      ).toBeVisible();
      await player
        .getByRole("button", { name: "Unban user", exact: true })
        .click();
      await expect(
        player.getByRole("button", { name: "Ban user", exact: true }),
      ).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByLabel("Language", { exact: true }).selectOption("ru");
      await expect(
        page.getByRole("heading", { name: "Администрирование" }),
      ).toBeVisible();
      await page.screenshot({
        path: "test-results/admin-mobile-ru.png",
        fullPage: true,
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
      await page.getByLabel("Язык", { exact: true }).selectOption("de");
      await expect(
        page.getByRole("heading", { name: "Verwaltung" }),
      ).toBeVisible();
      await page.getByLabel("Sprache", { exact: true }).selectOption("en");
      await player
        .getByRole("button", { name: "Purge user", exact: true })
        .click();
      await expect(
        player.getByRole("button", { name: "Permanently purge", exact: true }),
      ).toBeDisabled();
      await player
        .getByLabel("Type player@example.invalid to confirm")
        .fill("wrong@example.invalid");
      await expect(
        player.getByRole("button", { name: "Permanently purge", exact: true }),
      ).toBeDisabled();
      await player
        .getByLabel("Type player@example.invalid to confirm")
        .fill("player@example.invalid");
      await player
        .getByRole("button", { name: "Permanently purge", exact: true })
        .click();
      await expect(
        page.getByText("1 / 50 users", { exact: true }),
      ).toBeVisible();
      assert.deepEqual(
        actions.map((action) => action.action),
        ["ban", "unban", "purge"],
      );
      assert.equal(actions[2].confirmation, "player@example.invalid");
      administrator = false;
      await page.reload();
      await page
        .getByRole("button", { name: "My characters", exact: false })
        .waitFor();
      await expect(
        page.getByLabel("More options", { exact: true }),
      ).toHaveCount(0);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
