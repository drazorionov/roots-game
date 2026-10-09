import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

test(
  "campaign activity survives character removal and migration backfills legacy games",
  { timeout: 60000 },
  async () => {
    const raw = neon(process.env.DATABASE_URL);
    const schema = `campaign_test_${randomUUID().replaceAll("-", "")}`;
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
      await new AsyncFunction("sql", body)(sql); // The migration is idempotent.

      const [user] =
        await sql`INSERT INTO users (name,email,password_hash) VALUES ('Test','test@example.invalid','test-only') RETURNING id`;
      const [campaign] =
        await sql`INSERT INTO campaigns (owner_id,name,invite_code) VALUES (${user.id},'Woods','test') RETURNING *`;
      assert.equal(campaign.started_at, null);
      const [base] =
        await sql`INSERT INTO heroes (owner_id,sheet) VALUES (${user.id},'{}') RETURNING id`;
      assert.equal(
        (await sql`SELECT started_at FROM campaigns WHERE id=${campaign.id}`)[0]
          .started_at,
        null,
      );
      const [hero] =
        await sql`INSERT INTO heroes (owner_id,campaign_id,sheet) VALUES (${user.id},${campaign.id},'{}') RETURNING id`;
      const started = (
        await sql`SELECT started_at FROM campaigns WHERE id=${campaign.id}`
      )[0].started_at;
      assert.ok(started);
      await sql`UPDATE heroes SET sheet='{"coin":2}' WHERE id=${hero.id}`;
      await sql`UPDATE heroes SET campaign_id=NULL WHERE id=${hero.id}`;
      await sql`DELETE FROM heroes WHERE id=${hero.id}`;
      assert.deepEqual(
        (await sql`SELECT started_at FROM campaigns WHERE id=${campaign.id}`)[0]
          .started_at,
        started,
      );
      // Simulate a pre-migration campaign with existing player progress.
      await sql`DROP TRIGGER heroes_mark_campaign_started ON heroes`;
      const [legacy] =
        await sql`INSERT INTO campaigns (owner_id,name,invite_code) VALUES (${user.id},'Legacy','legacy') RETURNING id`;
      await sql`UPDATE heroes SET campaign_id=${legacy.id} WHERE id=${base.id}`;
      await new AsyncFunction("sql", body)(sql);
      assert.ok(
        (await sql`SELECT started_at FROM campaigns WHERE id=${legacy.id}`)[0]
          .started_at,
      );
      assert.deepEqual(
        (await sql`SELECT started_at FROM campaigns WHERE id=${campaign.id}`)[0]
          .started_at,
        started,
      );
    } finally {
      await raw.query(`DROP SCHEMA ${schema} CASCADE`);
    }
  },
);
