import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test(
  "reputation marks run outward from zero, save, and fit translated sheets",
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
      await page.goto(base);
      await page
        .getByRole("button", { name: "Quick game", exact: true })
        .click();
      await page.getByLabel("Name", { exact: true }).fill("Reputation Scout");
      await page
        .locator(".wizard-steps")
        .getByRole("button", { name: /Background/ })
        .click();
      const additions = [
        "Grand Duchy",
        "Riverfolk Company",
        "Lizard Cult",
        "Corvid Conspiracy",
      ];
      for (const faction of additions) {
        await page
          .getByLabel("Which faction did you serve?", { exact: true })
          .selectOption(faction);
        await page
          .getByLabel("Which faction is your enemy?", { exact: true })
          .selectOption(faction);
      }
      await page
        .getByLabel("Which faction did you serve?", { exact: true })
        .selectOption("Grand Duchy");
      await page
        .getByLabel("Which faction is your enemy?", { exact: true })
        .selectOption("Riverfolk Company");
      await page
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      const panel = page.locator(".reputation-panel");
      const mark = (track, value) =>
        panel.getByRole("button", {
          name: `Denizens: ${track} ${value}`,
          exact: true,
        });
      await expect(panel.locator(".reputation-row")).toHaveCount(8);
      for (const faction of additions) {
        await expect(
          panel.getByRole("group", { name: faction, exact: true }),
        ).toBeVisible();
      }
      await expect(
        panel.getByRole("button", {
          name: "Grand Duchy: Prestige 2",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        panel.getByRole("button", {
          name: "Riverfolk Company: Notoriety 1",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await panel
        .getByRole("button", { name: "Lizard Cult: Prestige 3", exact: true })
        .click();
      await panel
        .getByRole("button", {
          name: "Corvid Conspiracy: Notoriety 2",
          exact: true,
        })
        .click();
      await page.reload();
      await expect(
        panel.getByRole("button", {
          name: "Corvid Conspiracy: Notoriety 2",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        panel.getByRole("button", {
          name: "Lizard Cult: Prestige 3",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      for (const id of [
        "denizens",
        "marquisate",
        "eyrie",
        "alliance",
        "lizard-cult",
        "duchy",
        "riverfolk",
        "corvid",
        "keepers",
        "hundreds",
      ]) {
        assert.equal(
          (await page.request.get(`${base}/art/factions/${id}.webp`)).status(),
          200,
          `${id} icon is available`,
        );
      }

      await mark("Prestige", 7).click();
      await expect(mark("Prestige", 7)).toHaveAttribute("aria-pressed", "true");
      await mark("Notoriety", 4).click();
      await mark("Standing", "-1").click();
      await expect(mark("Standing", "-1")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      assert.deepEqual(
        await panel
          .locator(".reputation-row")
          .first()
          .locator(".reputation-negative .reputation-box")
          .evaluateAll((buttons) =>
            buttons.map((b) => b.getAttribute("aria-label").split(" ").at(-1)),
          ),
        ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
      );
      await mark("Prestige", 15).click();
      await expect(mark("Prestige", 15)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await mark("Prestige", 8).click();
      await mark("Notoriety", 9).click();
      await expect(mark("Notoriety", 9)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await mark("Notoriety", 5).click();
      await page.reload();
      await expect(mark("Prestige", 7)).toHaveAttribute("aria-pressed", "true");
      await expect(mark("Notoriety", 4)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await mark("Prestige", 3).click();
      await expect(mark("Prestige", 2)).toHaveAttribute("aria-pressed", "true");
      await expect(mark("Prestige", 3)).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await mark("Notoriety", 1).click();
      const rep = await page.evaluate(
        () =>
          JSON.parse(sessionStorage.getItem("root-quick-sheet")).reputation[0],
      );
      assert.deepEqual(rep, {
        faction: "Denizens",
        standing: -1,
        prestige: 2,
        notoriety: 0,
      });
      await expect(
        panel.getByRole("button", { name: "Add faction", exact: true }),
      ).toHaveCount(0);
      const starting = await panel.locator(".reputation-notes").boundingBox();
      const ledger = await panel.locator(".reputation-ledger").boundingBox();
      assert.ok(
        starting.y + starting.height <= ledger.y,
        "Starting reputation precedes the tracks",
      );
      // Preserve already-saved factions even though adding them from the sheet is removed.
      await page.evaluate(() => {
        const sheet = JSON.parse(sessionStorage.getItem("root-quick-sheet"));
        sheet.reputation.push(
          {
            faction: "Keepers in Iron",
            standing: 0,
            prestige: 0,
            notoriety: 0,
          },
          {
            faction: "My very long custom woodland faction name",
            standing: 0,
            prestige: 0,
            notoriety: 0,
          },
        );
        sessionStorage.setItem("root-quick-sheet", JSON.stringify(sheet));
      });
      await page.reload();
      await expect(
        panel.locator('.faction-icon[src^="/art/factions/lizard-cult.webp"]'),
      ).toHaveCount(1);
      await expect(panel.locator(".faction-icon-fallback")).toHaveCount(1);
      for (const width of [1280, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const language of ["en", "ru", "de"]) {
          await page.locator(".language-select").selectOption(language);
          await expect(panel).toBeVisible();
          assert.ok(
            await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            `${language} panel overflow at ${width}`,
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${language} page overflow at ${width}`,
          );
        }
      }
      await page.locator(".language-select").selectOption("en");
      await page.setViewportSize({ width: 1280, height: 1000 });
      await panel.screenshot({ path: "test-results/reputation-desktop.png" });
      await page.setViewportSize({ width: 390, height: 1000 });
      await panel.screenshot({ path: "test-results/reputation-phone.png" });
      // Older sheets accepted up to 15 notoriety: rendering must not clamp them.
      await page.evaluate(() => {
        const sheet = JSON.parse(sessionStorage.getItem("root-quick-sheet"));
        sheet.reputation[0].notoriety = 12;
        sessionStorage.setItem("root-quick-sheet", JSON.stringify(sheet));
      });
      await page.reload();
      await expect(panel.locator(".reputation-legacy")).toBeVisible();
      assert.equal(
        await page.evaluate(
          () =>
            JSON.parse(sessionStorage.getItem("root-quick-sheet")).reputation[0]
              .notoriety,
        ),
        12,
      );
      await panel
        .getByRole("button", { name: "Decrease Notoriety", exact: true })
        .click();
      assert.equal(
        await page.evaluate(
          () =>
            JSON.parse(sessionStorage.getItem("root-quick-sheet")).reputation[0]
              .notoriety,
        ),
        11,
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  },
);
