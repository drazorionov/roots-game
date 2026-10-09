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
      await options.click();
      await expect(
        page.getByRole("button", { name: "Transfer campaign", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Player sheets", exact: true }),
      ).toBeVisible();
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
  "party tiles open the selected sheet with editing only for the campaign master",
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
        const otherHero = {
          ...hero,
          id: "other-hero",
          owner_id: "other-player",
          player: "Николай Разоренов с очень длинным именем",
          sheet: {
            ...sheets.blankSheet(),
            name: "Неуловимый с очень длинным именем",
            nature: "Defender",
          },
        };
        const writes = [];
        await page.route("**/api/**", (route) => {
          if (
            route.request().method() !== "GET" &&
            new URL(route.request().url()).pathname === "/api/heroes"
          )
            writes.push(route.request().postDataJSON());
          const path = new URL(route.request().url()).pathname;
          return route.fulfill({
            json:
              path === "/api/auth"
                ? { user, campaigns: [campaign], heroes: [hero] }
                : path === "/api/campaigns"
                  ? { campaigns: [campaign] }
                  : path === "/api/heroes"
                    ? {
                        heroes: new URL(route.request().url()).searchParams.has(
                          "campaign",
                        )
                          ? [hero, otherHero]
                          : [hero],
                      }
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
        const tile = page.getByRole("button", {
          name: `${otherHero.sheet.name} · ${otherHero.player}`,
          exact: true,
        });
        for (const width of [390, 820, 1280]) {
          await page.setViewportSize({ width, height: 1000 });
          await expect(tile).toBeVisible();
          await expect(tile).toHaveCSS("color", "rgb(52, 60, 51)");
          for (const selector of ["h3", "small"]) {
            const dimensions = await tile.locator(selector).evaluate((el) => ({
              whiteSpace: getComputedStyle(el).whiteSpace,
              overflow: getComputedStyle(el).textOverflow,
              height: el.getBoundingClientRect().height,
              lineHeight:
                parseFloat(getComputedStyle(el).lineHeight) ||
                parseFloat(getComputedStyle(el).fontSize) * 1.5,
            }));
            assert.equal(dimensions.whiteSpace, "nowrap");
            assert.equal(dimensions.overflow, "ellipsis");
            assert.ok(dimensions.height <= dimensions.lineHeight + 1);
          }
        }
        await tile.focus();
        await page.keyboard.press("Enter");
        const sheetDialog = page.getByRole("dialog", {
          name: "Player sheets",
          exact: true,
        });
        await expect(
          sheetDialog.getByLabel("Character", { exact: true }),
        ).toHaveValue(otherHero.id);
        await expect(sheetDialog.locator(".hero-caption h2")).toHaveText(
          otherHero.sheet.name,
        );
        const injury = sheetDialog.getByRole("button", {
          name: "Injury 2",
          exact: true,
        });
        if (isMaster) {
          await expect(injury).toBeEnabled();
          await expect(
            sheetDialog.getByRole("button", {
              name: "Edit character",
              exact: true,
            }),
          ).toBeVisible();
        } else {
          await expect(sheetDialog).toContainText("Read-only.");
          await expect(injury).toBeDisabled();
          await expect(
            sheetDialog.getByRole("button", {
              name: "Increase Hold",
              exact: true,
            }),
          ).toBeDisabled();
          await expect(
            sheetDialog.getByRole("button", {
              name: "Add equipment",
              exact: true,
            }),
          ).toBeDisabled();
          await expect(
            sheetDialog.getByRole("button", {
              name: "Edit character",
              exact: true,
            }),
          ).toHaveCount(0);
          await expect(
            sheetDialog.getByRole("button", { name: /^Roll / }),
          ).toHaveCount(0);
          await sheetDialog
            .locator("summary")
            .filter({ hasText: "Background" })
            .click();
          await expect(
            sheetDialog.getByRole("button", {
              name: "Increase Advancements",
              exact: true,
            }),
          ).toBeDisabled();
          await sheetDialog
            .getByLabel("Character", { exact: true })
            .selectOption(hero.id);
          await expect(sheetDialog.locator(".hero-caption h2")).toHaveText(
            hero.sheet.name,
          );
          assert.deepEqual(writes, []);
        }
        await sheetDialog
          .getByRole("button", { name: "Close dialog", exact: true })
          .click();
        await expect(tile).toBeFocused();
        await page.getByLabel("Game menu", { exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Player sheets", exact: true }),
        ).toHaveCount(1);
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

test(
  "transfer popup keeps translated fields and actions separated on phones and desktop",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage();
      const campaign = {
        id: "woods",
        owner_id: "master",
        name: "За Темными Горами",
        members: 2,
        member_list: [
          { id: "master", name: "Master" },
          { id: "next", name: "Roman Razorionov" },
        ],
      };
      await page.route("**/api/**", (route) =>
        route.fulfill({
          json: {
            user: { id: "master", name: "Master" },
            heroes: [],
            campaigns: [campaign],
          },
        }),
      );
      await page.goto(base);
      await page.getByRole("button", { name: /My campaigns/ }).click();
      for (const locale of ["ru", "de", "en"]) {
        await page.locator(".language-select").selectOption(locale);
        await page.locator(".campaign-options summary").click();
        const items = page.locator(".campaign-options .game-menu-items button");
        for (const item of await items.all())
          await expect(item.locator("svg")).toHaveCount(1);
        await items.nth(1).click();
        const dialog = page.locator(".campaign-transfer-dialog");
        await dialog.locator("select").selectOption("next");
        for (const width of [320, 390, 820, 1280]) {
          await page.setViewportSize({ width, height: 1000 });
          const metrics = await dialog.evaluate((el) => {
            const label = el
              .querySelector(".transfer-player-field span")
              .getBoundingClientRect();
            const select = el.querySelector("select").getBoundingClientRect();
            const note = el
              .querySelector(".transfer-consequences")
              .getBoundingClientRect();
            const buttons = [
              ...el.querySelectorAll(".form-actions button"),
            ].map((b) => b.getBoundingClientRect().toJSON());
            return {
              overflow: el.scrollWidth > el.clientWidth + 1,
              fieldGap: select.top - label.bottom,
              noteGap: note.top - select.bottom,
              buttons,
            };
          });
          assert.equal(
            metrics.overflow,
            false,
            `${locale} popup overflows at ${width}`,
          );
          assert.ok(metrics.fieldGap >= 8);
          assert.ok(metrics.noteGap >= 16);
          if (width <= 480)
            assert.ok(metrics.buttons[1].bottom <= metrics.buttons[0].top - 8);
          if (locale === "ru" && [390, 1280].includes(width))
            await dialog.screenshot({
              path: `test-results/campaign-transfer-ru-${width}.png`,
            });
        }
        await dialog.locator(".modal-title button").click();
      }
    } finally {
      await browser.close();
    }
  },
);
