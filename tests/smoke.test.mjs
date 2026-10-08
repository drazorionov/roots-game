import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { mkdir, readFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const sql = neon(process.env.DATABASE_URL);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emails = ["owner", "guest"].map((x) => `${x}-${suffix}@example.invalid`);
const password = `Root-test-${suffix}`;
async function request(path, method = "GET", data, cookie, origin = base) {
  const res = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
async function waitForScene(page) {
  await page.evaluate(async () => {
    const scene = document.querySelector(".simple-app");
    const background = getComputedStyle(scene, "::before").backgroundImage;
    const url = background.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (!url) throw new Error("Missing scene background");
    const image = new Image();
    image.src = url;
    await image.decode();
  });
}
const sheet = {
  name: "Test Otter",
  species: "Otter",
  playbook: "Vagrant",
  pronouns: "",
  description: "",
  stats: { Charm: 2, Cunning: 1, Finesse: 0, Luck: -1, Might: 0 },
  injury: 0,
  exhaustion: 0,
  depletion: 0,
  nature: "Curious",
  drives: "Explore",
  bonds: "",
  biography: "",
  moves: "Keep existing moves",
  feats: "",
  weaponSkills: "",
  equipment: [],
  reputation: [],
  advancement: 0,
};
test(
  "standalone characters, campaign permissions, saved drafts and mobile play",
  { timeout: 240000 },
  async () => {
    let browser;
    try {
      assert.equal((await request("heroes")).status, 401);
      const accounts = [];
      for (const email of emails) {
        const a = await request("auth", "POST", {
          action: "signup",
          name: "Smoke Tester",
          email,
          password,
        });
        assert.equal(a.status, 200, JSON.stringify(a.data));
        accounts.push(a);
      }
      const [owner, guest] = accounts;
      let a = await request(
        "heroes",
        "POST",
        { campaignId: null, sheet },
        owner.cookie,
      );
      assert.equal(a.status, 200, JSON.stringify(a.data));
      let hero = a.data.hero;
      assert.equal(hero.campaign_id, null);
      assert.equal(
        (await request("heroes", "GET", undefined, guest.cookie)).data.heroes
          .length,
        0,
      );
      const created = await request(
        "campaigns",
        "POST",
        {
          action: "create",
          name: "API Test Campaign",
          description: "",
          clearing: "",
        },
        owner.cookie,
      );
      assert.equal(created.status, 200);
      const campaignId = created.data.id;
      assert.equal(
        (await request("presence", "POST", { campaignId })).status,
        401,
      );
      assert.equal(
        (await request("presence", "POST", { campaignId }, guest.cookie))
          .status,
        403,
      );
      assert.equal(
        (await request("presence", "POST", { campaignId: "bad" }, owner.cookie))
          .status,
        400,
      );
      assert.equal(
        (
          await request(
            "presence",
            "POST",
            { campaignId },
            owner.cookie,
            "https://evil.invalid",
          )
        ).status,
        400,
      );
      const firstPresence = await request(
        "presence",
        "POST",
        { campaignId },
        owner.cookie,
      );
      assert.equal(firstPresence.status, 200);
      assert.equal(firstPresence.data.players.length, 1);
      assert.equal(
        (await request("presence", "POST", { campaignId }, owner.cookie)).data
          .players.length,
        1,
      );

      assert.equal(
        (await request("heroes", "POST", { campaignId, sheet }, guest.cookie))
          .status,
        409,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            { id: hero.id, version: hero.version, campaignId: null, sheet },
            guest.cookie,
          )
        ).status,
        409,
      );
      a = await request(
        "heroes",
        "POST",
        { id: hero.id, version: hero.version, campaignId, sheet },
        owner.cookie,
      );
      assert.equal(a.status, 200);
      hero = a.data.hero;
      assert.equal(
        (
          await request(
            `heroes?campaign=${campaignId}`,
            "GET",
            undefined,
            guest.cookie,
          )
        ).data.heroes.length,
        0,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            { id: hero.id, version: 1, campaignId, sheet },
            owner.cookie,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            { campaignId: null, sheet: { ...sheet, injury: 5 } },
            owner.cookie,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            { campaignId: null, sheet },
            owner.cookie,
            "https://evil.invalid",
          )
        ).status,
        400,
      );
      browser = await chromium.launch({ channel: "chrome", headless: true });
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await expect(
        page.getByRole("heading", {
          name: "The Woodland awaits.",
          exact: true,
        }),
      ).toBeVisible();
      await mkdir("test-results", { recursive: true });
      for (const [device, width, height] of [
        ["iphone", 390, 844],
        ["ipad", 820, 1180],
      ]) {
        await page.setViewportSize({ width, height });
        await waitForScene(page);
        await page.screenshot({
          path: `test-results/welcome-${device}.png`,
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Start playing", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Create an account", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Create a character", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name", { exact: true }).fill("Willow Browser");
      await dialog.getByLabel("Species", { exact: true }).selectOption("Otter");
      await dialog
        .getByLabel("Playbook", { exact: true })
        .selectOption("Vagrant");
      await expect(dialog.getByLabel("Charm", { exact: true })).toHaveValue(
        "2",
      );
      await dialog
        .getByLabel("Starting bonus", { exact: true })
        .selectOption("Cunning");
      await dialog
        .locator(".wizard-steps")
        .getByRole("button", { name: /Abilities/ })
        .click();
      await dialog.getByRole("button", { name: /^Glutton/ }).click();
      await dialog.getByRole("button", { name: /^Chaos/ }).click();
      await dialog.getByRole("button", { name: /^Thrills/ }).click();
      for (const name of [
        "Instigator",
        "Pleasant Facade",
        "Desperate Smile",
        "Harry a Group",
      ])
        await dialog.getByRole("checkbox", { name, exact: true }).check();
      await dialog
        .locator(".wizard-steps")
        .getByRole("button", { name: /Background/ })
        .click();
      await dialog
        .getByLabel("Where do you call home?", { exact: true })
        .fill("Moss Clearing");
      await dialog
        .getByLabel("Notes", { exact: true })
        .fill("Черновик bleibt erhalten");
      await dialog
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Already have an account?", exact: true })
        .click();
      await dialog.getByLabel("Email", { exact: true }).fill(emails[0]);
      await dialog.getByLabel("Password", { exact: true }).fill(password);
      await dialog
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Willow Browser", exact: true }),
      ).toBeVisible();
      let saved = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.sheet.name === "Willow Browser");
      assert.equal(saved.sheet.biography, "Черновик bleibt erhalten");
      assert.equal(saved.campaign_id, null);
      assert.equal(saved.sheet.stats.Charm, 2);
      assert.equal(saved.sheet.stats.Cunning, 2);
      assert.equal(saved.sheet.nature, "Glutton");
      assert.equal(saved.sheet.background.home, "Moss Clearing");
      assert.equal(saved.sheet.moveIds.length, 3);
      assert.equal(saved.sheet.weaponSkillIds[0], "Harry a Group");
      async function mutate(click) {
        const response = page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/heroes") && r.request().method() === "POST",
        );
        await click();
        assert.equal((await response).status(), 200);
        await expect(page.locator(".quick-save-status")).toContainText(
          "Character sheet saved.",
        );
      }
      await mutate(() =>
        page.getByRole("button", { name: "injury 2", exact: true }).click(),
      );
      await mutate(() =>
        page.getByRole("button", { name: "exhaustion 3", exact: true }).click(),
      );
      await mutate(() =>
        page.getByRole("button", { name: "depletion 1", exact: true }).click(),
      );
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await page.getByLabel("Item name", { exact: true }).fill("Travel cloak");
      await page.getByLabel("Details & tags", { exact: true }).fill("Warm");
      await page.getByLabel("Value", { exact: true }).fill("2");
      await page.getByLabel("Wear boxes", { exact: true }).fill("2");
      await page.getByLabel("Pay from coin", { exact: true }).check();
      await mutate(() =>
        page
          .getByRole("button", { name: "Add equipment", exact: true })
          .click(),
      );
      await mutate(() =>
        page
          .getByRole("button", { name: "Travel cloak: wear 2", exact: true })
          .click(),
      );
      saved = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      assert.deepEqual(
        [
          saved.sheet.injury,
          saved.sheet.exhaustion,
          saved.sheet.depletion,
          saved.sheet.equipment[0].wear,
        ],
        [2, 3, 1, 2],
      );
      assert.equal(saved.sheet.coin, 7);
      await page.locator(".session-resources > summary").click();
      await mutate(() =>
        page
          .getByRole("button", { name: "Increase Forward", exact: true })
          .click(),
      );
      await mutate(() =>
        page.getByRole("button", { name: "Roll Charm", exact: true }).click(),
      );
      await expect(page.locator(".roll-result")).toContainText("Charm");
      assert.equal(
        (
          await request("heroes", "GET", undefined, owner.cookie)
        ).data.heroes.find((h) => h.id === saved.id).sheet.forward,
        0,
      );
      await page
        .locator(".sheet-tabs")
        .getByRole("button", { name: "Moves", exact: true })
        .click();
      await page
        .locator(".move-reminder")
        .filter({ hasText: "Pleasant Facade" })
        .locator("summary")
        .click();
      await expect(page.locator(".move-reminder[open]")).toContainText(
        "Flatter",
      );
      await page
        .locator(".sheet-tabs")
        .getByRole("button", { name: "Background", exact: true })
        .click();
      await mutate(() =>
        page.locator(".drive-check").filter({ hasText: "Chaos" }).click(),
      );
      await expect(
        page.locator(".drive-check").filter({ hasText: "Chaos" }),
      ).toBeDisabled();
      await page
        .locator(".sheet-tabs")
        .getByRole("button", { name: "Reputation", exact: true })
        .click();
      await page
        .locator(".faction-card")
        .filter({ hasText: "Denizens" })
        .locator("summary")
        .click();
      await mutate(() =>
        page
          .getByRole("button", { name: "Increase Prestige", exact: true })
          .click(),
      );
      saved = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      assert.equal(saved.sheet.advancement, 1);
      assert.deepEqual(saved.sheet.driveMarks, ["Chaos"]);
      assert.equal(
        saved.sheet.reputation.find((x) => x.faction === "Denizens").prestige,
        1,
      );
      await page
        .locator(".sheet-tabs")
        .getByRole("button", { name: "Equipment", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edit character", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      // With no active game, campaign selection comes before character selection.
      await page.getByRole("button", { name: /^(Home|Exit to main)$/ }).click();
      await expect(page.locator(".home-actions > button")).toHaveCount(3);
      for (const [device, width, height] of [
        ["iphone", 390, 844],
        ["ipad", 820, 1180],
      ]) {
        await page.setViewportSize({ width, height });
        await waitForScene(page);
        await page.screenshot({
          path: `test-results/home-${device}.png`,
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: /Start \/ join a game/ }).click();
      await expect(
        page.getByRole("heading", {
          name: "Where will you play?",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Create campaign", exact: true })
        .click();
      await dialog
        .getByLabel("Campaign name", { exact: true })
        .fill("Willow’s campaign");
      await dialog
        .getByRole("button", { name: "Create campaign", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Who will you be?", exact: true }),
      ).toBeVisible();
      await page
        .locator(".character-tile")
        .filter({ hasText: "Willow Browser" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Willow Browser", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".campaign-heading h1")).toBeVisible();
      const uiCampaign = (
        await request("campaigns", "GET", undefined, owner.cookie)
      ).data.campaigns.find((c) => c.name === "Willow’s campaign");
      await page.reload();
      await page.getByRole("button", { name: /Continue game/ }).click();
      await expect(
        page.getByRole("heading", { name: "Willow Browser", exact: true }),
      ).toBeVisible();
      // Management screens remain accessible, and Continue returns to this hero.
      await page.getByRole("button", { name: /^(Home|Exit to main)$/ }).click();
      await page.getByRole("button", { name: /My campaigns/ }).click();
      await expect(
        page.getByRole("heading", { name: "Willow’s campaign", exact: true }),
      ).toBeVisible();
      await waitForScene(page);
      await expect(page.locator(".simple-app")).toHaveClass(/campaigns-scene/);
      await page.screenshot({
        path: "test-results/campaigns-camp.png",
        fullPage: false,
      });
      await page.getByRole("button", { name: /^(Home|Exit to main)$/ }).click();
      await page.getByRole("button", { name: /My characters/ }).click();
      await expect(
        page.locator(".character-tile").filter({ hasText: "Willow Browser" }),
      ).toBeVisible();
      await waitForScene(page);
      await expect(page.locator(".simple-app")).toHaveClass(/characters-scene/);
      await page.screenshot({
        path: "test-results/characters-camp.png",
        fullPage: false,
      });
      await page.getByRole("button", { name: /^(Home|Exit to main)$/ }).click();
      await page.getByRole("button", { name: /Continue game/ }).click();
      await expect(page.locator(".game-actions button")).toHaveCount(3);
      await expect(page.getByLabel("Language", { exact: true })).toHaveCount(0);
      const beforeRestart = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      await page
        .getByRole("button", { name: "Restart game", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Who will you be?", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".campaign-selection")).toContainText(
        "Willow’s campaign",
      );
      await page
        .locator(".character-tile")
        .filter({ hasText: "Willow Browser" })
        .click();
      const afterRestart = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      assert.deepEqual(afterRestart.sheet, beforeRestart.sheet);
      await page
        .getByRole("button", { name: "Start new game", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Where will you play?",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create a character", exact: true }),
      ).toHaveCount(0);
      await page
        .locator(".campaign-choice")
        .filter({ hasText: "Willow’s campaign" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Who will you be?", exact: true }),
      ).toBeVisible();
      await page
        .locator(".character-tile")
        .filter({ hasText: "Willow Browser" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Willow Browser", exact: true }),
      ).toBeVisible();
      saved = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      assert.equal(saved.campaign_id, uiCampaign.id);
      await expect(page.locator(".campaign-presence")).toContainText(
        "Online: 1",
      );
      await expect(page.locator(".simple-app")).toHaveClass(/game-scene/);
      for (const label of ["Exit to main", "Restart game", "Start new game"]) {
        await expect(
          page.getByRole("button", { name: label, exact: true }),
        ).toHaveAttribute("title", label);
      }

      const guestContext = await browser.newContext();
      const [cookieName, cookieValue] = guest.cookie.split("=");
      await guestContext.addCookies([
        { name: cookieName, value: cookieValue, url: base },
      ]);
      const guestPage = await guestContext.newPage();
      await guestPage.goto(base);
      await guestPage
        .getByRole("button", { name: /Start \/ join a game/ })
        .click();
      await expect(
        guestPage.getByRole("heading", {
          name: "Where will you play?",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        guestPage.getByRole("button", {
          name: "Create a character",
          exact: true,
        }),
      ).toHaveCount(0);
      await guestPage
        .getByRole("button", { name: "Join a campaign", exact: true })
        .click();
      await guestPage
        .getByLabel("Campaign invite code")
        .fill(uiCampaign.invite_code);
      await guestPage
        .getByRole("button", { name: "Join the campaign", exact: true })
        .click();
      await expect(
        guestPage.getByRole("heading", {
          name: "Who will you be?",
          exact: true,
        }),
      ).toBeVisible();
      await guestPage
        .getByRole("button", { name: "Create a character", exact: true })
        .click();
      await guestPage
        .getByLabel("Name", { exact: true })
        .fill("Guest Vagabond");
      await guestPage
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(
        guestPage.getByRole("heading", { name: "Guest Vagabond", exact: true }),
      ).toBeVisible();
      await expect(guestPage.locator(".campaign-heading h1")).toHaveText(
        "Willow’s campaign",
      );
      assert.equal(
        (await request("heroes", "GET", undefined, guest.cookie)).data.heroes
          .length,
        1,
      );
      assert.equal(
        (
          await request(
            `heroes?campaign=${uiCampaign.id}`,
            "GET",
            undefined,
            guest.cookie,
          )
        ).data.heroes[0].id,
        saved.id,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            {
              id: saved.id,
              version: saved.version,
              campaignId: uiCampaign.id,
              sheet: saved.sheet,
            },
            guest.cookie,
          )
        ).status,
        409,
      );
      const ownerPresence = await request(
        "presence",
        "POST",
        { campaignId: uiCampaign.id },
        owner.cookie,
      );
      assert.equal(ownerPresence.status, 200);
      const together = await request(
        "presence",
        "POST",
        { campaignId: uiCampaign.id },
        guest.cookie,
      );
      assert.equal(together.data.players.length, 2);
      assert.equal(new Set(together.data.players.map((p) => p.id)).size, 2);
      await expect(guestPage.locator(".campaign-presence")).toContainText(
        "Online: 2",
      );
      await guestPage.close();
      await sql`UPDATE campaign_presence SET last_seen = now() - interval '2 minutes' WHERE campaign_id = ${uiCampaign.id} AND user_id = ${guest.data.user.id}`;
      const expired = await request(
        "presence",
        "POST",
        { campaignId: uiCampaign.id },
        owner.cookie,
      );
      assert.equal(expired.data.players.length, 1);
      await mkdir("test-results", { recursive: true });
      for (const locale of ["ru", "de"]) {
        const d = JSON.parse(
          await readFile(`src/lib/locales/${locale}.json`, "utf8"),
        );
        await page
          .getByRole("button", {
            name: /^(Exit to main|На главную|Zur Startseite)$/,
          })
          .click();
        await page.locator(".language-select").selectOption(locale);
        await page
          .getByRole("button", { name: new RegExp(d["Continue game"]) })
          .click();
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator(".campaign-presence")).toContainText(
          d["Online: {count}"].replace("{count}", "1"),
        );
        await expect(
          page.getByRole("button", { name: d["Edit character"], exact: true }),
        ).toBeVisible();
        for (const [device, width, height] of [
          ["iphone", 390, 844],
          ["small-phone", 320, 700],
          ["ipad", 820, 1180],
          ["ipad-landscape", 1180, 820],
        ]) {
          await page.setViewportSize({ width, height });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${locale} ${device} overflow`,
          );
          await waitForScene(page);
          await page.screenshot({
            path: `test-results/${device}-${locale}.png`,
            fullPage: true,
          });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("button", { name: d["Edit character"], exact: true })
          .click();
        await expect(
          dialog.getByLabel(d["Species"], { exact: true }),
        ).toHaveValue("Otter");
        await expect(
          dialog.getByLabel(d["Playbook"], { exact: true }),
        ).toHaveValue("Vagrant");
        await waitForScene(page);
        await page.screenshot({
          path: `test-results/create-${locale}.png`,
          fullPage: true,
        });
        await dialog
          .locator(".wizard-steps")
          .getByRole("button", { name: new RegExp(d["Abilities"]) })
          .click();
        await expect(
          dialog.getByRole("checkbox", {
            name: d["Pleasant Facade"],
            exact: true,
          }),
        ).toBeChecked();
        assert.ok(
          await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
          `${locale} ability form overflow`,
        );
        await waitForScene(page);
        await page.screenshot({
          path: `test-results/abilities-${locale}.png`,
          fullPage: false,
        });
        await dialog
          .getByRole("button", { name: d["Close dialog"], exact: true })
          .click();
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator(".home-actions > button")).toHaveCount(3);
        for (const [device, width, height] of [
          ["small-phone", 320, 700],
          ["iphone", 390, 844],
          ["ipad", 820, 1180],
        ]) {
          await page.setViewportSize({ width, height });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${locale} ${device} home overflow`,
          );
          await waitForScene(page);
          await page.screenshot({
            path: `test-results/home-${locale}-${device}.png`,
            fullPage: false,
          });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("button", { name: new RegExp(d["Continue game"]) })
          .click();
        await expect(
          page.getByRole("button", { name: `${d.injury} 2`, exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser?.close();
      for (const email of emails) {
        await sql`DELETE FROM campaigns WHERE owner_id IN (SELECT id FROM users WHERE email = ${email})`;
        await sql`DELETE FROM heroes WHERE owner_id IN (SELECT id FROM users WHERE email = ${email})`;
        await sql`DELETE FROM users WHERE email = ${email}`;
      }
    }
  },
);
