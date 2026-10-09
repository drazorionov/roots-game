import { dismissRollPopup } from "./roll-popup.mjs";
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
  "saved characters, campaign permissions, deletion and mobile play",
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
      const bootstrap = await request(
        "auth?bootstrap=1",
        "GET",
        undefined,
        owner.cookie,
      );
      assert.equal(bootstrap.status, 200);
      assert.equal(bootstrap.data.user.id, owner.data.user.id);
      assert.deepEqual(
        bootstrap.data.heroes.map((h) => h.id),
        [hero.id],
      );
      assert.deepEqual(
        bootstrap.data.campaigns.map((c) => c.id),
        [campaignId],
      );
      const guestBootstrap = await request(
        "auth?bootstrap=1",
        "GET",
        undefined,
        guest.cookie,
      );
      assert.deepEqual(guestBootstrap.data.heroes, []);
      assert.deepEqual(guestBootstrap.data.campaigns, []);
      const anonymousBootstrap = await request("auth?bootstrap=1");
      assert.equal(anonymousBootstrap.data.user, null);
      assert.deepEqual(anonymousBootstrap.data.heroes, []);
      assert.deepEqual(anonymousBootstrap.data.campaigns, []);
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
      const originalSetup = structuredClone(hero.sheet);
      for (const patch of [
        { name: "Owner correction" },
        { stats: { ...hero.sheet.stats, Might: 3 } },
        { moveIds: ["Hardy"] },
      ]) {
        const ownerEdit = await request(
          "heroes",
          "POST",
          {
            id: hero.id,
            version: hero.version,
            campaignId,
            sheet: { ...hero.sheet, ...patch },
          },
          owner.cookie,
        );
        assert.equal(ownerEdit.status, 200, JSON.stringify(ownerEdit.data));
        hero = ownerEdit.data.hero;
      }
      const restoredSetup = await request(
        "heroes",
        "POST",
        {
          id: hero.id,
          version: hero.version,
          campaignId,
          sheet: originalSetup,
        },
        owner.cookie,
      );
      assert.equal(restoredSetup.status, 200);
      hero = restoredSetup.data.hero;
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            {
              id: hero.id,
              version: hero.version,
              campaignId: null,
              sheet: hero.sheet,
            },
            owner.cookie,
          )
        ).status,
        403,
      );
      const tracked = await request(
        "heroes",
        "POST",
        {
          id: hero.id,
          version: hero.version,
          campaignId,
          sheet: { ...hero.sheet, injury: 1, forward: 1 },
        },
        owner.cookie,
      );
      assert.equal(tracked.status, 200, JSON.stringify(tracked.data));
      hero = tracked.data.hero;
      assert.equal(hero.sheet.injury, 1);
      assert.equal(hero.sheet.name, "Test Otter");
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
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Email", { exact: true }).fill(emails[0]);
      await dialog.getByLabel("Password", { exact: true }).fill(password);
      await dialog
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await page.getByRole("button", { name: /My characters/ }).click();
      await page
        .getByRole("button", { name: "Create a character", exact: true })
        .click();
      const creation = page.locator(".creation-page");
      await expect(page).toHaveURL(/\/characters\/new$/);
      await expect(dialog).toHaveCount(0);
      await page.goBack();
      await expect(
        page.getByRole("heading", { name: "My characters", exact: true }),
      ).toBeVisible();
      await page.goForward();
      await expect(creation).toBeVisible();
      await creation.getByLabel("Name", { exact: true }).fill("Willow Browser");
      page.once("dialog", (confirmation) => confirmation.dismiss());
      await creation.locator(".creation-back").click();
      await expect(creation.getByLabel("Name", { exact: true })).toHaveValue(
        "Willow Browser",
      );
      await page.screenshot({
        path: "test-results/character-creation-page.png",
        fullPage: true,
      });
      await creation
        .getByRole("group", { name: "Species", exact: true })
        .getByRole("button", { name: "Otter", exact: true })
        .click();
      await creation
        .getByRole("button", { name: "Vagrant", exact: true })
        .click();
      await expect(creation.getByLabel("Charm", { exact: true })).toHaveValue(
        "2",
      );
      await creation
        .getByLabel("Starting bonus", { exact: true })
        .selectOption("Cunning");
      await creation
        .locator(".wizard-steps")
        .getByRole("button", { name: /Nature & drives/ })
        .click();
      await creation
        .getByRole("checkbox", { name: "Glutton", exact: true })
        .click();
      await creation
        .getByRole("checkbox", { name: "Chaos", exact: true })
        .click();
      await creation
        .getByRole("checkbox", { name: "Thrills", exact: true })
        .click();
      await creation
        .locator(".wizard-steps")
        .getByRole("button", { name: /Abilities/ })
        .click();
      for (const name of [
        "Instigator",
        "Pleasant Facade",
        "Desperate Smile",
        "Harry a Group",
      ])
        await creation.getByRole("checkbox", { name, exact: true }).check();
      await creation
        .locator(".wizard-steps")
        .getByRole("button", { name: /Background/ })
        .click();
      await creation
        .getByLabel("Where do you call home?", { exact: true })
        .fill("Moss Clearing");
      await creation
        .locator(".wizard-steps")
        .getByRole("button", { name: /Review & connections/ })
        .click();
      await creation
        .getByLabel("Notes", { exact: true })
        .fill("Черновик bleibt erhalten");
      await creation
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(
        page.locator(".character-tile").filter({ hasText: "Willow Browser" }),
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
      await page
        .locator(".character-tile")
        .filter({ hasText: "Willow Browser" })
        .click();
      await expect(page).toHaveURL(/\/characters\/edit/);
      await expect(creation).toBeVisible();
      await creation.locator(".creation-back").click();
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
          name: "My campaigns",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Create campaign", exact: true })
        .click();
      await expect(page).toHaveURL(/\/campaigns\/new\?from=play$/);
      await page.reload();
      await expect(creation).toBeVisible();
      await expect(dialog).toHaveCount(0);
      await creation
        .getByLabel("Campaign name", { exact: true })
        .fill("Willow’s campaign");
      await page.screenshot({
        path: "test-results/campaign-creation-page.png",
        fullPage: true,
      });
      await creation
        .getByRole("button", { name: "Create campaign", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "My characters", exact: true }),
      ).toBeVisible();
      await page
        .locator(".character-tile")
        .filter({ hasText: "Willow Browser" })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Willow Browser",
          exact: true,
          level: 2,
        }),
      ).toBeVisible();
      await expect(page.locator(".campaign-heading h1")).toBeVisible();
      const uiCampaign = (
        await request("campaigns", "GET", undefined, owner.cookie)
      ).data.campaigns.find((c) => c.name === "Willow’s campaign");
      const baseSaved = saved;
      saved = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find(
        (h) =>
          h.source_hero_id === baseSaved.id && h.campaign_id === uiCampaign.id,
      );
      assert.notEqual(saved.id, baseSaved.id);
      async function mutate(click) {
        const [response] = await Promise.all([
          page.waitForResponse(
            (r) =>
              r.url().endsWith("/api/heroes") &&
              r.request().method() === "POST",
          ),
          click(),
        ]);
        assert.equal(response.status(), 200);
        await expect(page.locator(".quick-save-status")).toContainText(
          "Character sheet saved.",
        );
      }
      await mutate(() =>
        page.getByRole("button", { name: "Injury 2", exact: true }).click(),
      );
      await mutate(() =>
        page.getByRole("button", { name: "Exhaustion 3", exact: true }).click(),
      );
      await mutate(() =>
        page.getByRole("button", { name: "Depletion 1", exact: true }).click(),
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
      await mutate(() =>
        page
          .getByRole("button", { name: "Increase Forward", exact: true })
          .click(),
      );
      await mutate(() =>
        page
          .locator(".attribute-rolls")
          .getByRole("button", { name: "Roll Charm", exact: true })
          .click(),
      );
      await expect(page.locator(".activity-roll").first()).toContainText(
        "Charm",
      );
      await dismissRollPopup(page);
      assert.equal(
        (
          await request("heroes", "GET", undefined, owner.cookie)
        ).data.heroes.find((h) => h.id === saved.id).sheet.forward,
        0,
      );
      await page
        .locator(".sheet-subsection > summary")
        .filter({ hasText: "Character info & moves" })
        .click();
      await page
        .getByRole("button", { name: "Pleasant Facade", exact: true })
        .click();
      await expect(page.locator(".rule-dialog")).toContainText("Flatter");
      await page.keyboard.press("Escape");
      await page
        .locator(".sheet-subsection > summary")
        .filter({ hasText: "Background" })
        .click();
      await mutate(() =>
        page
          .getByRole("button", { name: "Mark Chaos fulfilled", exact: true })
          .click(),
      );
      await expect(
        page.getByRole("button", { name: "Mark Chaos fulfilled", exact: true }),
      ).toBeDisabled();

      await mutate(() =>
        page
          .getByRole("button", { name: "Denizens: Prestige 1", exact: true })
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

      await page.reload();
      await page.getByRole("button", { name: /Continue game/ }).click();
      await expect(
        page.getByRole("heading", {
          name: "Willow Browser",
          exact: true,
          level: 2,
        }),
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
      await expect(page.locator(".game-menu")).toHaveCount(1);
      await expect(page.locator(".language-select option")).toHaveText([
        "EN",
        "RU",
        "DE",
      ]);
      await expect(page.getByLabel("Language", { exact: true })).toHaveCount(1);
      const beforeRestart = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      await page.locator(".game-menu summary").click();
      await page
        .getByRole("button", { name: "Restart game", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "My characters", exact: true }),
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
      await page.locator(".game-menu summary").click();
      await page
        .getByRole("button", { name: "Start new game", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "My campaigns",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create a character", exact: true }),
      ).toHaveCount(0);
      await page
        .locator(".campaign-card")
        .filter({ hasText: "Willow’s campaign" })
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Willow Browser",
          exact: true,
          level: 2,
        }),
      ).toBeVisible();
      saved = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      assert.equal(saved.campaign_id, uiCampaign.id);
      await expect(page.locator(".campaign-presence")).toContainText(
        "Online: 1",
      );
      await expect(page.locator(".simple-app")).toHaveClass(/game-scene/);
      await page.locator(".game-menu summary").click();
      for (const label of ["Exit to main", "Restart game", "Start new game"]) {
        await expect(
          page.getByRole("button", { name: label, exact: true }),
        ).toBeVisible();
      }

      await page.locator(".game-menu summary").click();
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
          name: "My campaigns",
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
          name: "My characters",
          exact: true,
        }),
      ).toBeVisible();
      await guestPage
        .getByRole("button", { name: "Create a character", exact: true })
        .click();
      await expect(guestPage).toHaveURL(
        /\/characters\/new\?from=play&campaign=/,
      );
      await guestPage.reload();
      await expect(guestPage.getByRole("dialog")).toHaveCount(0);
      await guestPage
        .getByLabel("Name", { exact: true })
        .fill("Guest Vagabond");
      await guestPage
        .locator(".wizard-steps")
        .getByRole("button", { name: /Review & connections/ })
        .click();
      await guestPage
        .getByRole("button", { name: "Save & join campaign", exact: true })
        .click();
      await expect(
        guestPage.getByRole("heading", {
          name: "Guest Vagabond",
          exact: true,
          level: 2,
        }),
      ).toBeVisible();
      await expect(guestPage.locator(".campaign-heading h1")).toHaveText(
        "Willow’s campaign",
      );
      assert.equal(
        (await request("heroes", "GET", undefined, guest.cookie)).data.heroes
          .length,
        2,
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
      const lockedPage = await context.newPage();
      await lockedPage.goto(`${base}/characters/edit?id=${saved.id}`);
      await expect(lockedPage.locator(".locked-editor")).toContainText(
        "This campaign copy has locked setup",
      );
      await expect(lockedPage.locator(".character-builder")).toHaveCount(0);
      await lockedPage.close();
      const basePage = await context.newPage();
      await basePage.goto(`${base}/characters/edit?id=${baseSaved.id}`);
      await expect(basePage.locator(".character-builder")).toBeVisible();
      await basePage.getByLabel("Name", { exact: true }).fill("Willow Base");
      await basePage
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(
        basePage.locator(".character-tile").filter({ hasText: "Willow Base" }),
      ).toBeVisible();
      assert.equal(
        (
          await request("heroes", "GET", undefined, owner.cookie)
        ).data.heroes.find((h) => h.id === saved.id).sheet.name,
        "Willow Browser",
      );
      await basePage.close();
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
        await page.locator(".brand").click();
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
        ).toHaveCount(0);
        await expect(page.locator(".setup-locked-note")).toContainText(
          d["Setup locked"],
        );
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
      await page.locator(".language-select").selectOption("en");
      for (const [width, height] of [
        [320, 700],
        [390, 844],
        [820, 1180],
        [1440, 1000],
      ]) {
        await page.setViewportSize({ width, height });
        await page.locator(".brand").click();
        const edge = (await page.locator(".home-content").boundingBox()).x;
        for (const label of [
          "My characters",
          "My campaigns",
          "Continue game",
        ]) {
          await page.getByRole("button", { name: new RegExp(label) }).click();
          const target =
            label === "Continue game" ? ".game-heading" : ".journey-picker";
          assert.equal(
            (await page.locator(target).boundingBox()).x,
            edge,
            `${width}px ${label} left edge`,
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${width}px ${label} overflow`,
          );
          await page.locator(".brand").click();
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: /Continue game/ }).click();
      await page.locator(".game-menu summary").click();
      await page.screenshot({
        path: "test-results/game-menu-iphone.png",
        fullPage: false,
      });
      await page.locator(".game-menu summary").click();
      // Owner-only deletion, stale versions, confirmation, and campaign preservation.
      await page.locator(".language-select").selectOption("en");
      assert.equal(
        (
          await request(
            "campaigns",
            "DELETE",
            { id: uiCampaign.id },
            guest.cookie,
          )
        ).status,
        403,
      );
      assert.equal(
        (await request("campaigns", "DELETE", { id: uiCampaign.id })).status,
        401,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            "DELETE",
            { id: uiCampaign.id },
            owner.cookie,
            "https://evil.invalid",
          )
        ).status,
        400,
      );
      const beforeDelete = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      assert.equal(
        (
          await request(
            "heroes",
            "DELETE",
            { id: saved.id, version: beforeDelete.version },
            guest.cookie,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "DELETE",
            { id: saved.id, version: beforeDelete.version - 1 },
            owner.cookie,
          )
        ).status,
        409,
      );
      await page.locator(".brand").click();
      const left = (await page.locator(".home-content").boundingBox()).x;
      await page.getByRole("button", { name: /My campaigns/ }).click();
      assert.equal(
        (await page.locator(".journey-picker").boundingBox()).x,
        left,
      );
      await page
        .getByRole("button", { name: "Delete Willow’s campaign", exact: true })
        .click();
      await expect(dialog).toContainText("Characters are kept");
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(
        page.locator(".campaign-card").filter({ hasText: "Willow’s campaign" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Delete Willow’s campaign", exact: true })
        .click();
      await dialog.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      const afterDelete = (
        await request("heroes", "GET", undefined, owner.cookie)
      ).data.heroes.find((h) => h.id === saved.id);
      assert.equal(afterDelete.campaign_id, null);
      assert.equal(afterDelete.version, beforeDelete.version + 1);
      assert.deepEqual(afterDelete.sheet, beforeDelete.sheet);
      const guestHeroes = (
        await request("heroes", "GET", undefined, guest.cookie)
      ).data.heroes;
      assert.ok(guestHeroes.length > 0);
      assert.ok(guestHeroes.every((h) => h.campaign_id === null));
      await page.locator(".brand").click();
      await page.getByRole("button", { name: /My characters/ }).click();
      assert.equal(
        (await page.locator(".journey-picker").boundingBox()).x,
        left,
      );
      await page
        .getByRole("button", { name: "Delete Willow Browser", exact: true })
        .click();
      await dialog.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      assert.ok(
        !(
          await request("heroes", "GET", undefined, owner.cookie)
        ).data.heroes.some((h) => h.id === saved.id),
      );
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
