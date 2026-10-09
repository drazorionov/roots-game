import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test(
  "campaign owners manage players with confirmation, cancellation and retry",
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
        {
          id: "owned",
          name: "Our woods",
          owner_id: "me",
          member_list: [
            { id: "me", name: "Owner" },
            { id: "guest", name: "Guest without a character" },
          ],
        },
        {
          id: "joined",
          name: "Other woods",
          owner_id: "other",
          member_list: null,
        },
      ].map((c) => ({
        description: "",
        clearing: "",
        invite_code: "1234567890abcdef",
        members: 2,
        ...c,
      }));
      let calls = 0;
      await page.route("**/api/**", async (route) => {
        const req = route.request();
        const path = new URL(req.url()).pathname;
        if (path === "/api/campaigns" && req.method() === "POST") {
          assert.deepEqual(req.postDataJSON(), {
            action: "removeMember",
            id: "owned",
            userId: "guest",
          });
          calls++;
          if (calls === 1)
            return route.fulfill({
              status: 400,
              json: { error: "Could not save campaign." },
            });
          campaigns[0].member_list = [{ id: "me", name: "Owner" }];
          campaigns[0].members = 1;
          return route.fulfill({ json: { id: "owned", userId: "guest" } });
        }
        await route.fulfill({
          json:
            path === "/api/auth"
              ? {
                  user: {
                    id: "me",
                    name: "Owner",
                    email: "owner@example.invalid",
                  },
                }
              : path === "/api/campaigns"
                ? { campaigns }
                : { heroes: [] },
        });
      });
      await page.goto(base);
      await page.getByRole("button", { name: /My campaigns/ }).click();
      const owned = page
        .locator(".campaign-card")
        .filter({ hasText: "Our woods" });
      const joined = page
        .locator(".campaign-card")
        .filter({ hasText: "Other woods" });
      await expect(
        joined.getByRole("button", { name: "Manage players" }),
      ).toHaveCount(0);
      await owned.getByRole("button", { name: "Manage players" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("Guest without a character");
      await expect(
        dialog.getByRole("button", { name: "Remove Owner", exact: true }),
      ).toHaveCount(0);
      const choose = () =>
        dialog
          .getByRole("button", {
            name: "Remove Guest without a character",
            exact: true,
          })
          .click();
      await choose();
      await expect(dialog).toContainText(
        "Their characters and progress will be kept",
      );
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.equal(calls, 0);
      await choose();
      await dialog
        .getByRole("button", { name: "Remove player", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toHaveText(
        "Could not save campaign.",
      );
      await dialog
        .getByRole("button", { name: "Remove player", exact: true })
        .click();
      await expect(dialog).toHaveAttribute("aria-label", "Manage players");
      await expect(dialog).not.toContainText("Guest without a character");
      await expect(owned.locator(".campaign-facts")).toContainText("1 player");
      await page.screenshot({
        path: "test-results/campaign-members-mobile.png",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(
        owned.getByRole("button", { name: "Manage players" }),
      ).toBeFocused();
      assert.equal(calls, 2);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
