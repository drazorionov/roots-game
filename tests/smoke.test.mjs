import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { mkdir } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const sql = neon(process.env.DATABASE_URL);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emails = [
  `owner-${suffix}@example.invalid`,
  `guest-${suffix}@example.invalid`,
];
const password = `Root-test-${suffix}`;
const accounts = [];
let campaignId;
async function request(path, method = "GET", data, cookie, origin = base) {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
test(
  "campaign sharing, ownership, persistence, validation, and browser workflow",
  { timeout: 180000 },
  async () => {
    let browser;
    try {
      assert.equal((await request("campaigns")).status, 401);
      for (let i = 0; i < 2; i++) {
        const a = await request("auth", "POST", {
          action: "signup",
          name: i ? "Guest Tester" : "Owner Tester",
          email: emails[i],
          password,
        });
        assert.equal(a.status, 200, JSON.stringify(a.data));
        accounts.push(a);
      }
      const owner = accounts[0],
        guest = accounts[1];
      assert.equal(
        (
          await request("auth", "POST", {
            action: "login",
            email: emails[0],
            password: "wrong-password",
          })
        ).status,
        401,
      );
      const create = await request(
        "campaigns",
        "POST",
        {
          action: "create",
          name: "Smoke Test Woodland",
          description: "Temporary test campaign",
          clearing: "Test Glade",
        },
        owner.cookie,
      );
      assert.equal(create.status, 200, JSON.stringify(create.data));
      campaignId = create.data.id;
      const list = await request("campaigns", "GET", undefined, owner.cookie);
      const campaign = list.data.campaigns.find((c) => c.id === campaignId);
      assert.ok(campaign.invite_code);
      assert.equal(
        (await request("campaigns", "GET", undefined, guest.cookie)).data
          .campaigns.length,
        0,
      );
      const sheet = {
        name: "Test Otter",
        species: "Otter",
        playbook: "Vagrant",
        pronouns: "they / them",
        description: "Testing every woodland path.",
        stats: { Charm: 2, Cunning: 2, Finesse: -1, Luck: 0, Might: 0 },
        injury: 1,
        exhaustion: 2,
        depletion: 0,
        nature: "Curious",
        drives: "Explore",
        bonds: "A trusted friend",
        biography: "Born by the river.",
        moves: "A custom move",
        feats: "Lockpicking",
        weaponSkills: "Trick shot",
        equipment: [
          { name: "Longbow", details: "Far range", wear: 1, load: 2 },
        ],
        reputation: [
          {
            faction: "Woodland Alliance",
            standing: 1,
            prestige: 2,
            notoriety: 0,
          },
        ],
        advancement: 1,
      };
      const created = await request(
        "heroes",
        "POST",
        { campaignId, sheet },
        owner.cookie,
      );
      assert.equal(created.status, 200, JSON.stringify(created.data));
      const hero = created.data.hero;
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
        (await request("heroes", "POST", { campaignId, sheet }, guest.cookie))
          .status,
        409,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            "POST",
            { action: "join", code: campaign.invite_code },
            guest.cookie,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            `heroes?campaign=${campaignId}`,
            "GET",
            undefined,
            guest.cookie,
          )
        ).data.heroes[0].sheet.name,
        "Test Otter",
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            {
              id: hero.id,
              campaignId,
              version: 1,
              sheet: { ...sheet, name: "Stolen" },
            },
            guest.cookie,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            {
              id: hero.id,
              campaignId,
              version: 1,
              sheet: { ...sheet, injury: 3 },
            },
            owner.cookie,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "heroes",
            "POST",
            { id: hero.id, campaignId, version: 1, sheet },
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
            { campaignId, sheet: { ...sheet, injury: 99 } },
            owner.cookie,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            "POST",
            { action: "join", code: campaign.invite_code },
            owner.cookie,
            "https://untrusted.example",
          )
        ).status,
        400,
      );
      browser = await chromium.launch({ channel: "chrome", headless: true });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1050 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page.getByText("A peek into the woodland.").waitFor();
      await mkdir("test-results", { recursive: true });
      await page.screenshot({
        path: "test-results/desktop.png",
        fullPage: true,
      });
      await page.getByLabel("Find a vagabond").fill("Rowan");
      assert.equal(await page.locator(".hero-card").count(), 1);
      await page.getByLabel("Find a vagabond").fill("");
      await page
        .getByRole("button", { name: "Sign in", exact: true })
        .first()
        .click();
      await page.getByLabel("Email", { exact: true }).fill(emails[0]);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page
        .locator("dialog")
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Smoke Test Woodland" })
        .waitFor();
      await page
        .getByRole("button", { name: "Create a character", exact: true })
        .click();
      await page.getByLabel("Name", { exact: true }).fill("Browser Fox");
      await page.getByLabel("Pronouns", { exact: true }).fill("she / her");
      await page.getByLabel("Charm", { exact: true }).selectOption("2");
      await page.getByRole("button", { name: "injury 2", exact: true }).click();
      await page
        .getByRole("button", { name: "Story & moves", exact: true })
        .click();
      await page
        .getByLabel("Biography", { exact: true })
        .fill("A biography saved from the browser.");
      await page
        .getByRole("button", { name: "Equipment", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Add equipment", exact: true })
        .click();
      await page
        .getByLabel("Item name", { exact: true })
        .fill("Woodland staff");
      await page
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await page.locator("dialog").waitFor({ state: "hidden" });
      await page
        .getByRole("heading", { name: "Browser Fox", exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByRole("heading", { name: "Browser Fox", exact: true })
        .waitFor();
      await page
        .locator(".hero-card")
        .filter({ hasText: "Browser Fox" })
        .click();
      assert.equal(
        await page.getByLabel("Charm", { exact: true }).inputValue(),
        "2",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "injury 2", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page
        .getByRole("button", { name: "Story & moves", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Biography", { exact: true }).inputValue(),
        "A biography saved from the browser.",
      );
      await page
        .getByRole("button", { name: "Equipment", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Item name", { exact: true }).inputValue(),
        "Woodland staff",
      );
      await page.screenshot({ path: "test-results/sheet.png", fullPage: true });
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await context.clearCookies();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base);
      await page.getByText("A peek into the woodland.").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
        "mobile horizontal overflow",
      );
      await page.screenshot({
        path: "test-results/mobile.png",
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Toggle navigation", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Campaigns", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Your campaigns", exact: true })
        .waitFor();
      assert.deepEqual(errors, []);
      assert.equal(
        (await request("auth", "DELETE", undefined, owner.cookie)).status,
        200,
      );
      assert.equal(
        (await request("campaigns", "GET", undefined, owner.cookie)).status,
        401,
      );
      console.log(
        "Verified auth, campaign invites, cross-user visibility, edit isolation, conflict protection, validation, CSRF, browser creation, reload persistence, mobile layout, and logout.",
      );
    } finally {
      if (browser) await browser.close();
      if (campaignId) await sql`DELETE FROM campaigns WHERE id=${campaignId}`;
      for (const email of emails)
        await sql`DELETE FROM users WHERE email=${email}`;
    }
  },
);
