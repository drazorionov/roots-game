import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { rules } from "./load-typescript.mjs";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const sql = neon(process.env.DATABASE_URL);
const digest = (value) => createHash("sha256").update(value).digest("hex");
async function request(path, body, token, method = "POST", origin = base) {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(token ? { Cookie: `root-session=${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
test(
  "owners can remove members, revoke access and preserve their characters",
  { timeout: 180000 },
  async () => {
    const people = ["owner", "guest", "outsider"].map((name) => ({
      id: randomUUID(),
      name,
      token: randomBytes(32).toString("hex"),
    }));
    const [owner, guest, outsider] = people;
    const campaignIds = [];
    try {
      for (const person of people) {
        await sql`INSERT INTO users (id, name, email, password_hash) VALUES (${person.id}, ${person.name}, ${`remove-${person.id}@example.invalid`}, 'test-only')`;
        await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${digest(person.token)}, ${person.id}, now() + interval '10 minutes')`;
      }
      const created = await request(
        "campaigns",
        {
          action: "create",
          name: "Remove test",
          description: "",
          clearing: "",
        },
        owner.token,
      );
      assert.equal(created.status, 200, JSON.stringify(created.data));
      const id = created.data.id;
      campaignIds.push(id);
      const campaigns = await request(
        "campaigns",
        undefined,
        owner.token,
        "GET",
      );
      const code = campaigns.data.campaigns.find(
        (c) => c.id === id,
      ).invite_code;
      const removal = { action: "removeMember", id, userId: guest.id };
      assert.equal((await request("campaigns", removal)).status, 401);
      assert.equal(
        (await request("campaigns", removal, outsider.token)).status,
        403,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            { ...removal, userId: owner.id },
            owner.token,
          )
        ).status,
        403,
      );
      assert.equal(
        (await request("campaigns", { action: "join", code }, guest.token))
          .status,
        200,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            removal,
            guest.token,
            "POST",
            "https://invalid.example",
          )
        ).status,
        400,
      );
      assert.equal(
        (await request("campaigns", removal, guest.token)).status,
        403,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            { ...removal, userId: outsider.id },
            owner.token,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            { ...removal, userId: "invalid" },
            owner.token,
          )
        ).status,
        400,
      );
      const ownerRoster = (
        await request("campaigns", undefined, owner.token, "GET")
      ).data.campaigns[0].member_list;
      assert.deepEqual(
        ownerRoster.map((m) => m.id).sort(),
        [owner.id, guest.id].sort(),
      );
      assert.ok(
        ownerRoster.every((m) => Object.keys(m).sort().join(",") === "id,name"),
      );
      assert.equal(
        (await request("campaigns", undefined, guest.token, "GET")).data
          .campaigns[0].member_list,
        null,
      );
      const sheet = {
        ...rules.newCharacterSheet(),
        name: "Preserved hero",
        injury: 2,
        coin: 7,
        biography: "Keep my story",
      };
      async function saveHero(token, campaignId) {
        const saved = await request("heroes", { campaignId, sheet }, token);
        assert.equal(saved.status, 200, JSON.stringify(saved.data));
        return saved.data.hero;
      }
      const owned = await saveHero(owner.token, id);
      const first = await saveHero(guest.token, id),
        second = await saveHero(guest.token, id);
      const unrelated = await saveHero(guest.token, null);
      assert.equal(
        (await request("presence", { campaignId: id }, guest.token)).status,
        200,
      );
      const result = await request("campaigns", removal, owner.token);
      assert.equal(result.status, 200, JSON.stringify(result.data));
      assert.equal(result.data.userId, guest.id);
      const detached = (
        await request("heroes", undefined, guest.token, "GET")
      ).data.heroes.filter((h) => [first.id, second.id].includes(h.id));
      assert.deepEqual(
        detached.map((h) => h.id).sort(),
        [first.id, second.id].sort(),
      );
      for (const h of detached) {
        assert.equal(h.campaign_id, null);
        assert.equal(h.version, first.version + 1);
        assert.deepEqual(h.sheet, first.sheet);
      }
      const current = (await request("heroes", undefined, guest.token, "GET"))
        .data.heroes;
      assert.deepEqual(
        current.find((h) => h.id === unrelated.id),
        unrelated,
      );
      assert.equal(
        (await request("campaigns", undefined, guest.token, "GET")).data
          .campaigns.length,
        0,
      );
      const ownerCampaign = (
        await request("campaigns", undefined, owner.token, "GET")
      ).data.campaigns.find((c) => c.id === id);
      assert.equal(ownerCampaign.members, 1);
      assert.deepEqual(ownerCampaign.member_list, [
        { id: owner.id, name: owner.name },
      ]);
      assert.deepEqual(
        (
          await request("heroes", undefined, owner.token, "GET")
        ).data.heroes.find((h) => h.id === owned.id),
        owned,
      );
      assert.equal(
        (await request(`heroes?campaign=${id}`, undefined, guest.token, "GET"))
          .data.heroes.length,
        0,
      );
      assert.equal(
        (await request("presence", { campaignId: id }, guest.token)).status,
        403,
      );
      assert.equal(
        (
          await sql`SELECT * FROM campaign_presence WHERE campaign_id = ${id} AND user_id = ${guest.id}`
        ).length,
        0,
      );
      assert.equal(
        (
          await request(
            "heroes",
            {
              id: first.id,
              campaignId: id,
              version: first.version,
              sheet: first.sheet,
            },
            guest.token,
          )
        ).status,
        409,
      );
      assert.equal(
        (await request("campaigns", removal, guest.token)).status,
        403,
      );
      // A player without any character can also be removed.
      assert.equal(
        (await request("campaigns", { action: "join", code }, outsider.token))
          .status,
        200,
      );
      assert.equal(
        (
          await request(
            "campaigns",
            { ...removal, userId: outsider.id },
            owner.token,
          )
        ).status,
        200,
      );
      // Rejoining is explicit and never silently reassigns a detached sheet.
      assert.equal(
        (await request("campaigns", { action: "join", code }, guest.token))
          .status,
        200,
      );
      assert.ok(
        (
          await request("heroes", undefined, guest.token, "GET")
        ).data.heroes.every((h) => h.campaign_id === null),
      );
      // Either assignment wins first and is detached, or removal wins and saving is rejected.
      const [saving, removing] = await Promise.all([
        request("heroes", { campaignId: id, sheet }, guest.token),
        request("campaigns", removal, owner.token),
      ]);
      assert.ok([200, 409].includes(saving.status), JSON.stringify(saving));
      assert.equal(removing.status, 200, JSON.stringify(removing));
      assert.equal(
        (
          await sql`SELECT id FROM heroes WHERE owner_id = ${guest.id} AND campaign_id = ${id}`
        ).length,
        0,
      );
    } finally {
      for (const id of campaignIds)
        await sql`DELETE FROM campaigns WHERE id = ${id}`;
      for (const person of people) {
        await sql`DELETE FROM heroes WHERE owner_id = ${person.id}`;
        await sql`DELETE FROM rate_limits WHERE key = ${digest(`campaigns:${person.id}`)}`;
        await sql`DELETE FROM users WHERE id = ${person.id}`;
      }
    }
  },
);
