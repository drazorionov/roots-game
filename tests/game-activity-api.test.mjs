import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { loadRoutes, jars, cookieJar } from "./load-routes.mjs";
nextEnv.loadEnvConfig(process.cwd());

test(
  "shared activity is atomic, ordered, private to members, and roll retries are idempotent",
  { timeout: 60000 },
  async () => {
    const raw = neon(process.env.DATABASE_URL);
    const schema = `activity_test_${randomUUID().replaceAll("-", "")}`;
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
      const AsyncFunction = Object.getPrototypeOf(
        async function () {},
      ).constructor;
      await new AsyncFunction("sql", body)(sql);
      const { activity } = loadRoutes(sql);
      const people = ["Rowan", "Moss", "Outsider"].map((name) => ({
        name,
        id: randomUUID(),
        token: randomUUID(),
      }));
      for (const person of people) {
        await sql`INSERT INTO users (id,name,email,password_hash) VALUES (${person.id},${person.name},${person.id + "@example.invalid"},'test-only')`;
        await sql`INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (${createHash("sha256").update(person.token).digest("hex")},${person.id},now() + interval '10 minutes')`;
      }
      const [owner, member, outsider] = people;
      const [campaign] =
        await sql`INSERT INTO campaigns (owner_id,name,invite_code) VALUES (${owner.id},'Woods','test') RETURNING id`;
      for (const person of [owner, member])
        await sql`INSERT INTO memberships (campaign_id,user_id) VALUES (${campaign.id},${person.id})`;
      const [hero] =
        await sql`INSERT INTO heroes (owner_id,campaign_id,sheet) VALUES (${owner.id},${campaign.id},'{"name":"Rowan","coin":0}') RETURNING id`;
      const request = async (
        person,
        method = "GET",
        body,
        after,
        origin = "http://localhost",
      ) =>
        jars.run(cookieJar(person?.token), async () => {
          const response = await activity[method](
            new Request(
              `http://localhost/api/activity?campaign=${campaign.id}${after === undefined ? "" : "&after=" + after}`,
              {
                method,
                headers: { origin, "Content-Type": "application/json" },
                ...(body ? { body: JSON.stringify(body) } : {}),
              },
            ),
          );
          return { status: response.status, data: await response.json() };
        });
      assert.equal((await request(null)).status, 401);
      assert.equal((await request(outsider)).status, 403);
      assert.deepEqual((await request(member)).data, {
        events: [],
        cursor: "0",
      });
      await sql`UPDATE heroes SET sheet='{"name":"Rowan","coin":2}', version=version+1 WHERE id=${hero.id}`;
      await sql`UPDATE heroes SET sheet=sheet, version=version+1 WHERE id=${hero.id}`;
      let feed = await request(member, "GET", undefined, "0");
      assert.equal(feed.data.events.length, 1);
      assert.equal(feed.data.events[0].player, "Rowan");
      assert.deepEqual(feed.data.events[0].changes, [
        { field: "coin", before: 0, after: 2 },
      ]);
      const cursor = feed.data.cursor;
      const roll = {
        id: randomUUID(),
        campaignId: campaign.id,
        heroId: hero.id,
        roll: { label: "Charm", dice: [4, 3], modifier: -1 },
      };
      assert.equal((await request(outsider, "POST", roll)).status, 403);
      assert.equal((await request(member, "POST", roll)).status, 403);
      assert.equal(
        (await request(owner, "POST", roll, undefined, "http://evil.invalid"))
          .status,
        400,
      );
      assert.equal(
        (
          await request(owner, "POST", {
            ...roll,
            roll: { ...roll.roll, dice: [7, 3] },
          })
        ).status,
        400,
      );
      assert.equal((await request(owner, "POST", roll)).status, 200);
      assert.equal((await request(owner, "POST", roll)).status, 200);
      feed = await request(member, "GET", undefined, cursor);
      assert.equal(feed.data.events.length, 1);
      assert.equal(feed.data.events[0].id, roll.id);
      assert.deepEqual(feed.data.events[0].roll, roll.roll);
      assert.equal(
        (await request(member, "GET", undefined, feed.data.cursor)).data.events
          .length,
        0,
      );
      // Independent transactions must expose every committed event in cursor order.
      await Promise.all(
        [2, 3, 4].map(
          (coin) =>
            sql`UPDATE heroes SET sheet=jsonb_set(sheet,'{coin}',${String(coin)}::jsonb),version=version+1 WHERE id=${hero.id}`,
        ),
      );
      const rows = (await request(member, "GET", undefined, feed.data.cursor))
        .data.events;
      assert.ok(rows.length >= 2);
      assert.ok(
        rows.every(
          (row, index) =>
            index === 0 ||
            BigInt(row.sequence) > BigInt(rows[index - 1].sequence),
        ),
      );
      await sql`DELETE FROM memberships WHERE campaign_id=${campaign.id} AND user_id=${member.id}`;
      assert.equal((await request(member, "GET", undefined, "0")).status, 403);
    } finally {
      await raw.query(`DROP SCHEMA ${schema} CASCADE`);
    }
  },
);
