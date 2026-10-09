import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { rules } from "./load-typescript.mjs";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const sql = neon(process.env.DATABASE_URL);

test(
  "campaign snapshots and editable bases remain independent",
  { timeout: 120000 },
  async () => {
    const owner = randomUUID(),
      token = randomBytes(32).toString("hex");
    const campaigns = [randomUUID(), randomUUID()];
    let browser;
    async function request(body, method = "POST") {
      const response = await fetch(`${base}/api/heroes`, {
        method,
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          Cookie: `root-session=${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, ...(await response.json()) };
    }
    const save = (hero, sheet = hero.sheet, campaignId = hero.campaign_id) =>
      request({ id: hero.id, version: hero.version, campaignId, sheet });
    const latest = async (id) =>
      (await request(undefined, "GET")).heroes.find((h) => h.id === id);
    try {
      await sql`INSERT INTO users (id, name, email, password_hash) VALUES (${owner}, 'Copy tester', ${`copy-${owner}@example.invalid`}, 'test-only')`;
      await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${createHash("sha256").update(token).digest("hex")}, ${owner}, now() + interval '10 minutes')`;
      for (const id of campaigns) {
        await sql`INSERT INTO campaigns (id, owner_id, name, invite_code) VALUES (${id}, ${owner}, ${`Copy test ${campaigns.indexOf(id) + 1}`}, ${randomBytes(8).toString("hex")})`;
        await sql`INSERT INTO memberships (campaign_id, user_id) VALUES (${id}, ${owner})`;
      }
      const sheet = {
        ...rules.newCharacterSheet(),
        name: "Original",
        biography: "Before joining",
      };
      let original = (await request({ campaignId: null, sheet })).hero;
      const joined = await save(
        original,
        { ...sheet, name: "Unsaved change" },
        campaigns[0],
      );
      assert.equal(joined.status, 200);
      let copy = joined.hero;
      assert.notEqual(copy.id, original.id);
      assert.equal(copy.source_hero_id, original.id);
      assert.deepEqual(
        copy.sheet,
        original.sheet,
        "joining snapshots persisted fields",
      );
      assert.deepEqual(
        await latest(original.id),
        original,
        "joining leaves the base unchanged",
      );
      // Concurrent/repeated joins reuse the snapshot and never reset its progress.
      copy = (await save(copy, { ...copy.sheet, injury: 2, coin: 8 })).hero;
      assert.deepEqual(await latest(original.id), original);
      const edited = await save(original, {
        ...original.sheet,
        name: "Edited base",
        biography: "After joining",
        injury: 1,
      });
      assert.equal(edited.status, 200);
      original = edited.hero;
      assert.deepEqual(await latest(copy.id), copy);
      const repeated = await Promise.all([
        save(original, original.sheet, campaigns[0]),
        save(original, original.sheet, campaigns[0]),
      ]);
      for (const result of repeated) {
        assert.equal(result.status, 200);
        assert.deepEqual(result.hero, copy);
      }
      const second = (await save(original, original.sheet, campaigns[1])).hero;
      assert.notEqual(second.id, copy.id);
      assert.deepEqual(second.sheet, original.sheet);
      const originalCopySheet = structuredClone(copy.sheet);
      const ownerEdit = await save(copy, {
        ...copy.sheet,
        name: "Master correction",
      });
      assert.equal(ownerEdit.status, 200);
      assert.deepEqual((await latest(original.id)).sheet, original.sheet);
      copy = (await save(ownerEdit.hero, originalCopySheet)).hero;
      assert.equal((await save(copy, copy.sheet, campaigns[1])).status, 403);
      assert.equal((await save(copy, copy.sheet, null)).status, 403);
      assert.equal(
        (await save({ ...original, version: original.version - 1 })).status,
        409,
      );
      // Creating directly in a campaign also retains an editable base.
      const created = await request({
        campaignId: campaigns[0],
        sheet: { ...sheet, name: "Campaign-created" },
      });
      assert.equal(created.status, 200);
      assert.equal(created.baseHero.campaign_id, null);
      assert.equal(created.hero.source_hero_id, created.baseHero.id);
      assert.deepEqual(created.hero.sheet, created.baseHero.sheet);
      const before = (await request(undefined, "GET")).heroes.length;
      assert.equal(
        (await request({ campaignId: randomUUID(), sheet })).status,
        409,
      );
      assert.equal(
        (await request(undefined, "GET")).heroes.length,
        before,
        "failed join creates no orphan base",
      );
      // The general menu shows editable bases; campaign selection shows the saved copy.
      browser = await chromium.launch({ channel: "chrome", headless: true });
      const context = await browser.newContext();
      await context.addCookies([
        { name: "root-session", value: token, url: base },
      ]);
      const page = await context.newPage();
      await page.goto(base);
      await page.getByRole("button", { name: /My characters/ }).click();
      await expect(page.locator(".character-tile")).toHaveCount(2);
      await expect(page.locator(".setup-lock-tag")).toHaveCount(0);
      await page
        .locator(".character-tile")
        .filter({ hasText: "Edited base" })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/characters/edit\\?id=${original.id}$`),
      );
      await expect(page.locator(".character-builder")).toBeVisible();
      await expect(page.locator(".play-sheet")).toHaveCount(0);
      await page.reload();
      await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
        "Edited base",
      );
      await page.locator(".creation-back").click();
      await expect(page.locator(".character-tile")).toHaveCount(2);
      await expect(page.locator(".play-sheet")).toHaveCount(0);
      await page
        .locator(".character-tile")
        .filter({ hasText: "Edited base" })
        .click();
      await page.getByLabel("Name", { exact: true }).fill("Menu edit");
      await page
        .getByRole("button", { name: "Save character", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "My characters", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(".character-tile").filter({ hasText: "Menu edit" }),
      ).toBeVisible();
      await expect(page.locator(".play-sheet")).toHaveCount(0);
      original = await latest(original.id);
      assert.equal(original.sheet.name, "Menu edit");
      assert.deepEqual(await latest(copy.id), copy);
      await page.locator(".brand").click();
      await page.getByRole("button", { name: /My campaigns/ }).click();
      await page
        .locator(".campaign-card")
        .filter({ hasText: "Copy test 1" })
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      await page
        .locator(".character-tile")
        .filter({ hasText: "Original" })
        .click();
      await expect(page.locator(".active-game")).toBeVisible();
      await expect(page.locator(".campaign-heading h1")).toHaveText(
        "Copy test 1",
      );
      await page.locator(".brand").click();
      await page.getByRole("button", { name: /Continue game/ }).click();
      await expect(page.locator(".active-game")).toBeVisible();
      await page.locator(".game-menu summary").click();
      await page
        .getByRole("button", { name: "Restart game", exact: true })
        .click();

      await expect(
        page.locator(".character-tile").filter({ hasText: "Menu edit" }),
      ).toHaveCount(0);
      const campaignTile = page
        .locator(".character-tile")
        .filter({ hasText: "Original" });
      await expect(campaignTile).toHaveCount(1);
      await expect(campaignTile.locator(".setup-lock-tag")).toBeVisible();
      await campaignTile.click();
      await expect(
        page.getByRole("heading", { name: "Original", exact: true, level: 2 }),
      ).toBeVisible();
      assert.deepEqual(await latest(copy.id), copy);
      await page.goto(`${base}/characters/edit?id=${copy.id}`);
      await expect(page.locator(".locked-editor")).toContainText(
        "This campaign copy has locked setup",
      );
      await expect(page.locator(".character-builder")).toHaveCount(0);
      // Removing a base cannot remove either campaign's progress.
      assert.equal(
        (
          await request(
            { id: original.id, version: original.version },
            "DELETE",
          )
        ).status,
        200,
      );
      assert.deepEqual((await latest(copy.id)).sheet, copy.sheet);
      assert.deepEqual((await latest(second.id)).sheet, second.sheet);
    } finally {
      await browser?.close();
      await sql`DELETE FROM campaigns WHERE owner_id = ${owner}`;
      await sql`DELETE FROM heroes WHERE owner_id = ${owner}`;
      await sql`DELETE FROM users WHERE id = ${owner}`;
    }
  },
);
