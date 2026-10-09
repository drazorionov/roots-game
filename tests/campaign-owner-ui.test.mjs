import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { sheets } from "./load-typescript.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

test(
  "campaign owner views and edits player sheets and confirms transfer from the options menu",
  { timeout: 90000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 1000 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const master = { id: "master", name: "Master" };
      let campaign = {
        id: "woods",
        owner_id: "master",
        master_name: "Master",
        name: "Owner Woods",
        invite_code: "1234567890abcdef",
        members: 3,
        member_list: [
          master,
          { id: "alice", name: "Alice" },
          { id: "bob", name: "Bob" },
        ],
      };
      let hero = {
        id: "alice-hero",
        owner_id: "alice",
        campaign_id: "woods",
        player: "Alice",
        version: 1,
        sheet: { ...sheets.blankSheet(), name: "Willow", moveIds: ["Hardy"] },
      };
      const saves = [],
        transfers = [];
      await page.route("**/api/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.pathname === "/api/auth")
          return route.fulfill({
            json: { user: master, heroes: [], campaigns: [campaign] },
          });
        if (url.pathname === "/api/campaigns") {
          if (request.method() === "POST") {
            const data = request.postDataJSON();
            transfers.push(data);
            campaign = {
              ...campaign,
              owner_id: data.userId,
              master_name: "Bob",
              member_list: null,
            };
            return route.fulfill({
              json: { id: campaign.id, ownerId: data.userId },
            });
          }
          return route.fulfill({ json: { campaigns: [campaign] } });
        }
        if (url.pathname === "/api/heroes") {
          if (request.method() === "POST") {
            const data = request.postDataJSON();
            saves.push(data);
            if (data.version !== hero.version)
              return route.fulfill({
                status: 409,
                json: {
                  error:
                    "This sheet changed elsewhere, or you don’t have access. Reopen it to load the latest version.",
                },
              });
            hero = { ...hero, sheet: data.sheet, version: hero.version + 1 };
            return route.fulfill({ json: { hero } });
          }
          return route.fulfill({
            json: { heroes: url.searchParams.has("campaign") ? [hero] : [] },
          });
        }
        return route.fulfill({ json: { players: [] } });
      });
      await page.goto(base);
      await page.getByRole("button", { name: /My campaigns/ }).click();
      const options = page.getByLabel("Campaign options for Owner Woods", {
        exact: true,
      });
      await options.click();
      await page
        .getByRole("button", { name: "Player sheets", exact: true })
        .click();
      const manager = page.getByRole("dialog", {
        name: "Player sheets",
        exact: true,
      });
      await expect(manager).toBeVisible();
      await expect(
        manager.getByLabel("Character", { exact: true }),
      ).toHaveValue("alice-hero");
      await expect(manager.locator(".hero-caption h2")).toHaveText("Willow");
      await manager
        .getByRole("button", { name: "Injury 2", exact: true })
        .click();
      await expect.poll(() => hero.sheet.injury).toBe(2);
      await manager
        .getByRole("button", { name: "Edit character", exact: true })
        .click();
      await manager.getByLabel("Name", { exact: true }).fill("Willow revised");
      await manager
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(manager.locator(".hero-caption h2")).toHaveText(
        "Willow revised",
      );
      assert.equal(hero.sheet.injury, 2);
      await manager
        .getByRole("button", { name: "Edit character", exact: true })
        .click();
      await manager
        .getByLabel("Name", { exact: true })
        .fill("Conflicted draft");
      hero = {
        ...hero,
        version: hero.version + 1,
        sheet: { ...hero.sheet, name: "Concurrent change" },
      };
      await manager
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(manager.getByRole("alert")).toContainText(
        "changed elsewhere",
      );
      await expect(manager.getByLabel("Name", { exact: true })).toHaveValue(
        "Conflicted draft",
      );
      page.once("dialog", (dialog) => dialog.accept());
      await manager
        .getByRole("button", { name: "Reload saved sheet", exact: true })
        .click();
      await expect(manager.locator(".hero-caption h2")).toHaveText(
        "Concurrent change",
      );
      assert.ok(
        saves.every((s) => s.id === "alice-hero" && s.campaignId === "woods"),
      );
      for (const width of [320, 390, 820, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.ok(
          await manager.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          `dialog overflow at ${width}`,
        );
      }
      await page.setViewportSize({ width: 390, height: 1000 });
      await manager.screenshot({
        path: "test-results/campaign-owner-sheet-phone.png",
      });
      await manager
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await options.click();
      await page
        .getByRole("button", { name: "Transfer campaign", exact: true })
        .click();
      let transfer = page.getByRole("dialog", {
        name: "Transfer campaign",
        exact: true,
      });
      await expect(
        transfer.getByRole("button", { name: "Confirm transfer", exact: true }),
      ).toBeDisabled();
      const dropdown = transfer.getByLabel("New campaign master");
      assert.deepEqual(
        await dropdown
          .locator("option")
          .evaluateAll((nodes) => nodes.map((n) => n.value)),
        ["", "alice", "bob"],
      );
      await dropdown.selectOption("bob");
      assert.equal(transfers.length, 0);
      await transfer
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
      assert.equal(transfers.length, 0);
      await options.click();
      await page
        .getByRole("button", { name: "Transfer campaign", exact: true })
        .click();
      await transfer.getByLabel("New campaign master").selectOption("bob");
      await transfer.screenshot({
        path: "test-results/campaign-transfer-phone.png",
      });
      await transfer
        .getByRole("button", { name: "Confirm transfer", exact: true })
        .click();
      await expect(transfer).toHaveCount(0);
      assert.deepEqual(transfers, [
        { action: "transfer", id: "woods", userId: "bob" },
      ]);
      await expect(options).toHaveCount(0);
      await expect(page.locator(".campaign-card")).toContainText(
        "Joined campaign",
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);

test(
  "active game menu offers owner tools only to the current campaign master",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      for (const isMaster of [true, false]) {
        const page = await browser.newPage();
        const user = { id: "viewer", name: "Viewer" };
        const campaign = {
          id: "woods",
          owner_id: isMaster ? user.id : "other",
          name: "Woods",
          members: 2,
          member_list: [
            { id: "viewer", name: "Viewer" },
            { id: "other", name: "Other" },
          ],
        };
        const hero = {
          id: "hero",
          owner_id: user.id,
          campaign_id: campaign.id,
          player: user.name,
          version: 1,
          sheet: { ...sheets.blankSheet(), name: "Viewer hero" },
        };
        await page.route("**/api/**", (route) => {
          const path = new URL(route.request().url()).pathname;
          return route.fulfill({
            json:
              path === "/api/auth"
                ? { user, campaigns: [campaign], heroes: [hero] }
                : path === "/api/campaigns"
                  ? { campaigns: [campaign] }
                  : path === "/api/heroes"
                    ? { heroes: [hero] }
                    : path === "/api/activity"
                      ? { events: [], cursor: "0" }
                      : { players: [] },
          });
        });
        await page.addInitScript(() =>
          localStorage.setItem("root-session-viewer", "hero"),
        );
        await page.goto(base);
        await page.getByRole("button", { name: /Continue game/ }).click();
        await page.getByLabel("Game menu", { exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Player sheets", exact: true }),
        ).toHaveCount(isMaster ? 1 : 0);
        await expect(
          page.getByRole("button", { name: "Transfer campaign", exact: true }),
        ).toHaveCount(isMaster ? 1 : 0);
        if (isMaster) {
          await page
            .getByRole("button", { name: "Transfer campaign", exact: true })
            .click();
          await expect(
            page.getByRole("dialog", {
              name: "Transfer campaign",
              exact: true,
            }),
          ).toBeVisible();
        }
        await page.close();
      }
    } finally {
      await browser.close();
    }
  },
);
