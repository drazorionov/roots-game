import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { loadRoutes, jars, cookieJar } from "./load-routes.mjs";

nextEnv.loadEnvConfig(process.cwd());
const base = "http://127.0.0.1:3000";

test(
  "admin authorization, ban/session revocation, purge and concurrent 50-user cap",
  { timeout: 120000 },
  async () => {
    const raw = neon(process.env.DATABASE_URL);
    const schema = `admin_test_${randomUUID().replaceAll("-", "")}`;
    const previousAdmin = process.env.ADMIN_EMAIL;
    process.env.ADMIN_EMAIL = "admin@example.invalid";
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
      const routes = loadRoutes(sql);
      let ip = 0;
      async function request(
        route,
        method = "GET",
        data,
        jar = cookieJar(),
        origin = base,
      ) {
        const req = new Request(`${base}/api/${route}`, {
          method,
          headers: {
            origin,
            "content-type": "application/json",
            "x-forwarded-for": `test-${ip++}`,
          },
          ...(data ? { body: JSON.stringify(data) } : {}),
        });
        const response = await jars.run(jar, () => routes[route][method](req));
        return { status: response.status, data: await response.json(), jar };
      }
      async function signup(email) {
        const result = await request("auth", "POST", {
          action: "signup",
          email,
          name: email.split("@")[0],
          password: "TestPassword123",
        });
        return result;
      }
      assert.equal((await request("admin")).status, 403);
      const admin = await signup("admin@example.invalid");
      const player = await signup("player@example.invalid");
      const other = await signup("other@example.invalid");
      assert.equal(admin.status, 200);
      assert.equal(admin.data.user.isAdmin, true);
      assert.equal(player.data.user.isAdmin, false);
      const id = player.data.user.id;
      assert.equal(
        (await request("admin", "GET", undefined, player.jar)).status,
        403,
      );
      assert.equal(
        (await request("admin", "POST", { id, action: "ban" }, player.jar))
          .status,
        403,
      );
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            { id, action: "ban" },
            admin.jar,
            "https://evil.invalid",
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            { id: admin.data.user.id, action: "ban" },
            admin.jar,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            {
              id: admin.data.user.id,
              action: "purge",
              confirmation: "admin@example.invalid",
            },
            admin.jar,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            { id: "invalid", action: "ban" },
            admin.jar,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            { id: randomUUID(), action: "ban" },
            admin.jar,
          )
        ).status,
        404,
      );
      // Fail closed when the environment variable is missing; matching is normalized.
      delete process.env.ADMIN_EMAIL;
      assert.equal(
        (await request("admin", "GET", undefined, admin.jar)).status,
        403,
      );
      process.env.ADMIN_EMAIL = " ADMIN@EXAMPLE.INVALID ";
      assert.equal(
        (await request("admin", "GET", undefined, admin.jar)).status,
        200,
      );

      const campaign = (
        await request(
          "campaigns",
          "POST",
          {
            action: "create",
            name: "Purge campaign",
            description: "Owned by target",
            clearing: "Clearing",
          },
          player.jar,
        )
      ).data.id;
      await sql`INSERT INTO memberships (campaign_id, user_id) VALUES (${campaign}, ${other.data.user.id})`;
      await sql`INSERT INTO campaign_presence (campaign_id, user_id) VALUES (${campaign}, ${id})`;
      await sql`INSERT INTO heroes (owner_id, campaign_id, sheet) VALUES (${id}, ${campaign}, '{"name":"Deleted hero"}'::jsonb), (${id}, NULL, '{"name":"Deleted base"}'::jsonb), (${other.data.user.id}, ${campaign}, '{"name":"Kept hero"}'::jsonb)`;
      const directory = await request("admin", "GET", undefined, admin.jar);
      assert.equal(directory.data.maxUsers, 50);
      assert.equal(directory.data.users.length, 3);
      const record = directory.data.users.find((u) => u.id === id);
      assert.equal(record.heroes.length, 2);
      assert.equal(record.campaigns.length, 1);
      assert.equal(record.memberships.length, 1);
      assert.equal(record.active_sessions, 1);
      assert.ok(!JSON.stringify(directory.data).includes("password_hash"));
      assert.ok(!JSON.stringify(directory.data).includes("token_hash"));
      const oldCookie = cookieJar(player.jar.get("root-session").value);
      assert.equal(
        (await request("admin", "POST", { id, action: "ban" }, admin.jar))
          .status,
        200,
      );
      assert.equal(
        (await request("auth", "GET", undefined, oldCookie)).data.user,
        null,
      );
      for (const route of ["heroes", "campaigns"])
        assert.equal(
          (await request(route, "GET", undefined, oldCookie)).status,
          401,
        );
      assert.equal(
        (
          await request("auth", "POST", {
            action: "login",
            email: "player@example.invalid",
            password: "TestPassword123",
          })
        ).status,
        403,
      );
      assert.equal(
        (await sql`SELECT * FROM sessions WHERE user_id = ${id}`).length,
        0,
      );
      assert.equal(
        (await sql`SELECT * FROM campaign_presence WHERE user_id = ${id}`)
          .length,
        0,
      );
      assert.equal(
        (await request("admin", "POST", { id, action: "unban" }, admin.jar))
          .status,
        200,
      );
      assert.equal(
        (await request("auth", "GET", undefined, oldCookie)).data.user,
        null,
      );
      assert.equal(
        (
          await request("auth", "POST", {
            action: "login",
            email: "player@example.invalid",
            password: "TestPassword123",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            { id, action: "purge", confirmation: "wrong" },
            admin.jar,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            { id, action: "purge", confirmation: "player@example.invalid" },
            admin.jar,
          )
        ).status,
        200,
      );
      for (const table of [
        "users",
        "heroes",
        "campaigns",
        "memberships",
        "sessions",
        "campaign_presence",
      ]) {
        const column =
          table === "users"
            ? "id"
            : ["heroes", "campaigns"].includes(table)
              ? "owner_id"
              : "user_id";
        const rows = await raw.transaction([
          scope,
          raw.query(
            `SELECT count(*)::int AS total FROM ${table} WHERE ${column} = $1`,
            [id],
          ),
        ]);
        assert.equal(rows[1][0].total, 0, `${table} purged`);
      }
      const survivors =
        await sql`SELECT * FROM heroes WHERE owner_id = ${other.data.user.id}`;
      assert.equal(survivors.length, 1);
      assert.equal(survivors[0].campaign_id, null);
      assert.equal(survivors[0].version, 2);
      assert.equal(survivors[0].sheet.name, "Kept hero");
      // 49 stored users, including a banned account, leaves exactly one place.
      await sql`INSERT INTO users (name, email, password_hash, banned_at) SELECT 'Capacity fixture', 'fixture-' || n || '@example.invalid', 'unused', CASE WHEN n = 1 THEN now() ELSE NULL END FROM generate_series(1, 47) n`;
      const concurrent = await Promise.all(
        Array.from({ length: 5 }, (_, n) =>
          signup(`concurrent-${n}@example.invalid`),
        ),
      );
      assert.equal(concurrent.filter((r) => r.status === 200).length, 1);
      assert.equal(
        concurrent.filter(
          (r) => r.status === 409 && r.data.error.includes("50 users"),
        ).length,
        4,
      );
      assert.equal(
        (await sql`SELECT count(*)::int AS total FROM users`)[0].total,
        50,
      );
      assert.equal(
        (
          await request("auth", "POST", {
            action: "login",
            email: "admin@example.invalid",
            password: "TestPassword123",
          })
        ).status,
        200,
      );
      const winner = concurrent.find((r) => r.status === 200).data.user;
      assert.equal(
        (
          await request(
            "admin",
            "POST",
            { id: winner.id, action: "purge", confirmation: winner.email },
            admin.jar,
          )
        ).status,
        200,
      );
      assert.equal((await signup("replacement@example.invalid")).status, 200);
    } finally {
      await raw.query(`DROP SCHEMA ${schema} CASCADE`);
      if (previousAdmin === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = previousAdmin;
    }
  },
);
