import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { loadRoutes, jars, cookieJar } from "./load-routes.mjs";
import { rules } from "./load-typescript.mjs";
nextEnv.loadEnvConfig(process.cwd());

test(
  "campaign owners edit campaign copies and transfer permissions atomically",
  { timeout: 90000 },
  async () => {
    const raw = neon(process.env.DATABASE_URL);
    const schema = `owner_test_${randomUUID().replaceAll("-", "")}`;
    await raw.query(`CREATE SCHEMA ${schema}`);
    const scope = raw`SELECT set_config('search_path', ${schema}, true)`;
    function sql(strings, ...values) {
      const query = raw(strings, ...values);
      return {
        query,
        then(resolve, reject) {
          return raw
            .transaction([scope, query])
            .then((rows) => rows[1])
            .then(resolve, reject);
        },
      };
    }
    sql.transaction = (queries) =>
      raw
        .transaction([scope, ...queries.map((q) => q.query)])
        .then((rows) => rows.slice(1));
    try {
      const migration = readFileSync("scripts/migrate.mjs", "utf8");
      const body = migration.slice(
        migration.indexOf("await sql.transaction("),
        migration.indexOf("console.log("),
      );
      await new (Object.getPrototypeOf(async function () {}).constructor)(
        "sql",
        body,
      )(sql);
      const routes = loadRoutes(sql);
      const people = ["Master", "Alice", "Bob", "Outsider", "Banned"].map(
        (name) => ({ name, id: randomUUID(), token: randomUUID() }),
      );
      const [master, alice, bob, outsider, banned] = people;
      for (const p of people) {
        await sql`INSERT INTO users(id,name,email,password_hash) VALUES (${p.id},${p.name},${p.id + "@example.invalid"},'test-only')`;
        await sql`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (${createHash("sha256").update(p.token).digest("hex")},${p.id},now() + interval '15 minutes')`;
      }
      const [campaign] =
        await sql`INSERT INTO campaigns(owner_id,name,invite_code) VALUES (${master.id},'Owner test','1234567890abcdef') RETURNING *`;
      const [other] =
        await sql`INSERT INTO campaigns(owner_id,name,invite_code) VALUES (${outsider.id},'Other','abcdef1234567890') RETURNING *`;
      for (const p of [master, alice, bob, banned])
        await sql`INSERT INTO memberships(campaign_id,user_id) VALUES (${campaign.id},${p.id})`;
      await sql`UPDATE users SET banned_at=now() WHERE id=${banned.id}`;
      const original = { ...rules.newCharacterSheet(), name: "Alice hero" };
      const [base] =
        await sql`INSERT INTO heroes(owner_id,sheet) VALUES (${alice.id},${JSON.stringify(original)}::jsonb) RETURNING *`;
      let [hero] =
        await sql`INSERT INTO heroes(owner_id,campaign_id,source_hero_id,sheet) VALUES (${alice.id},${campaign.id},${base.id},${JSON.stringify(original)}::jsonb) RETURNING *`;
      const [foreign] =
        await sql`INSERT INTO heroes(owner_id,campaign_id,sheet) VALUES (${alice.id},${other.id},${JSON.stringify(original)}::jsonb) RETURNING *`;
      const call = (
        person,
        route,
        method = "GET",
        data,
        query = "",
        origin = "http://localhost",
      ) =>
        jars.run(cookieJar(person?.token), async () => {
          const response = await routes[route][method](
            new Request(`http://localhost/api/${route}${query}`, {
              method,
              headers: { origin, "Content-Type": "application/json" },
              ...(data ? { body: JSON.stringify(data) } : {}),
            }),
          );
          return { status: response.status, ...(await response.json()) };
        });
      const save = (person, h, sheet = h.sheet, campaignId = h.campaign_id) =>
        call(person, "heroes", "POST", {
          id: h.id,
          version: h.version,
          campaignId,
          sheet,
        });
      assert.equal(
        (
          await call(
            master,
            "heroes",
            "GET",
            undefined,
            `?campaign=${campaign.id}`,
          )
        ).heroes.length,
        1,
      );
      assert.equal(
        (
          await call(
            outsider,
            "heroes",
            "GET",
            undefined,
            `?campaign=${campaign.id}`,
          )
        ).heroes.length,
        0,
      );
      assert.equal((await save(bob, hero)).status, 409);
      assert.equal(
        (await save(alice, hero, { ...hero.sheet, name: "Forbidden" })).status,
        403,
      );
      assert.equal((await save(master, base)).status, 409);
      assert.equal((await save(master, foreign)).status, 409);
      assert.equal((await save(master, hero, hero.sheet, null)).status, 403);
      assert.equal(
        (
          await call(master, "heroes", "DELETE", {
            id: hero.id,
            version: hero.version,
          })
        ).status,
        409,
      );
      const stale = hero;
      const changed = await save(master, hero, {
        ...hero.sheet,
        name: "Updated by master",
        stats: { ...hero.sheet.stats, Might: 3 },
        injury: 2,
        coin: 17,
      });
      assert.equal(changed.status, 200, JSON.stringify(changed));
      hero = changed.hero;
      assert.equal(hero.player, alice.name);
      assert.equal(hero.owner_id, alice.id);
      assert.equal(hero.source_hero_id, base.id);
      assert.equal(hero.sheet.coin, 17);
      assert.equal((await save(master, stale)).status, 409);
      assert.deepEqual(
        (await sql`SELECT sheet FROM heroes WHERE id=${base.id}`)[0].sheet,
        original,
      );
      const tracked = await save(alice, hero, { ...hero.sheet, injury: 1 });
      assert.equal(tracked.status, 200);
      hero = tracked.hero;
      const transfer = (person, target) =>
        call(person, "campaigns", "POST", {
          action: "transfer",
          id: campaign.id,
          userId: target.id,
        });
      assert.equal((await transfer(null, bob)).status, 401);
      for (const target of [master, outsider, banned])
        assert.equal((await transfer(master, target)).status, 403);
      assert.equal((await transfer(alice, bob)).status, 403);
      assert.equal(
        (
          await call(
            master,
            "campaigns",
            "POST",
            { action: "transfer", id: campaign.id, userId: bob.id },
            "",
            "http://evil.invalid",
          )
        ).status,
        400,
      );
      assert.equal((await transfer(master, bob)).status, 200);
      const after = (await call(bob, "campaigns")).campaigns.find(
        (c) => c.id === campaign.id,
      );
      assert.equal(after.owner_id, bob.id);
      assert.equal(after.master_name, bob.name);
      assert.equal(after.invite_code, campaign.invite_code);
      assert.equal(after.members, 4);
      assert.ok(after.member_list.some((p) => p.id === master.id));
      assert.equal(
        (await call(master, "campaigns")).campaigns[0].member_list,
        null,
      );
      assert.equal(
        (await save(master, hero, { ...hero.sheet, coin: 99 })).status,
        409,
      );
      assert.equal((await transfer(master, alice)).status, 403);
      assert.equal(
        (await call(master, "campaigns", "DELETE", { id: campaign.id })).status,
        403,
      );
      assert.equal(
        (
          await call(master, "campaigns", "POST", {
            action: "removeMember",
            id: campaign.id,
            userId: alice.id,
          })
        ).status,
        403,
      );
      const byNewMaster = await save(bob, hero, {
        ...hero.sheet,
        name: "New master edit",
      });
      assert.equal(byNewMaster.status, 200);
      hero = byNewMaster.hero;
      assert.equal(
        (
          await call(bob, "campaigns", "POST", {
            action: "leave",
            id: campaign.id,
          })
        ).status,
        403,
      );
      // Departing target and ownership transfer cannot leave the owner outside the campaign.
      const race = await Promise.all([
        transfer(bob, alice),
        call(alice, "campaigns", "POST", { action: "leave", id: campaign.id }),
      ]);
      assert.ok(
        race.every((r) => [200, 403].includes(r.status)),
        JSON.stringify(race),
      );
      const [current] =
        await sql`SELECT c.owner_id, EXISTS(SELECT 1 FROM memberships m WHERE m.campaign_id=c.id AND m.user_id=c.owner_id) AS member FROM campaigns c WHERE c.id=${campaign.id}`;
      assert.equal(current.member, true);
      assert.notEqual(race[0].status === 200 && race[1].status === 200, true);
    } finally {
      await raw.query(`DROP SCHEMA ${schema} CASCADE`);
    }
  },
);
