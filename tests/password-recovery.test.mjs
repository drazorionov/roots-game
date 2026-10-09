import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
import { loadRoutes, jars, cookieJar } from "./load-routes.mjs";
nextEnv.loadEnvConfig(process.cwd());

test(
  "single-use recovery codes, restricted sessions, expiry, bans, mail failure and admin delivery",
  { timeout: 120000 },
  async () => {
    const raw = neon(process.env.DATABASE_URL);
    const schema = `recovery_test_${randomUUID().replaceAll("-", "")}`;
    const keys = ["ADMIN_EMAIL", "RESEND_API_KEY", "RECOVERY_FROM_EMAIL"];
    const saved = keys.map((key) => process.env[key]);
    Object.assign(process.env, {
      ADMIN_EMAIL: "admin@example.invalid",
      RESEND_API_KEY: "test-key",
      RECOVERY_FROM_EMAIL: "Root Helper <sender@example.invalid>",
    });
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
      const AsyncFunction = Object.getPrototypeOf(
        async function () {},
      ).constructor;
      await new AsyncFunction(
        "sql",
        migration.slice(
          migration.indexOf("await sql.transaction("),
          migration.indexOf("console.log("),
        ),
      )(sql);
      const mail = [];
      let mailFails = false;
      const routes = loadRoutes(sql, async (url, options) => {
        assert.equal(url, "https://api.resend.com/emails");
        assert.equal(options.headers.Authorization, "Bearer test-key");
        assert.ok(options.headers["Idempotency-Key"]);
        const body = JSON.parse(options.body);
        assert.equal(body.from, "Root Helper <sender@example.invalid>");
        mail.push(body);
        return new Response("{}", { status: mailFails ? 500 : 200 });
      });
      let ip = 0;
      const base = "https://root-helper.example";
      async function request(
        route,
        data,
        jar = cookieJar(),
        origin = base,
        method = "POST",
      ) {
        const response = await jars.run(jar, () =>
          routes[route][method](
            new Request(`${base}/api/${route}`, {
              method,
              headers: {
                origin,
                "content-type": "application/json",
                "x-forwarded-for": `test-${ip++}`,
              },
              ...(data ? { body: JSON.stringify(data) } : {}),
            }),
          ),
        );
        return { status: response.status, data: await response.json(), jar };
      }
      const signup = (email) =>
        request("auth", {
          action: "signup",
          email,
          name: "Recovery tester",
          password: "OriginalPassword123",
        });
      const login = (email, password) =>
        request("auth", { action: "login", email, password });
      const email = "player@example.invalid";
      const admin = await signup("admin@example.invalid");
      const player = await signup(email);
      const originalSession = cookieJar(player.jar.get("root-session").value);
      const send = () => request("recovery", { action: "request", email });
      const code = () =>
        mail.at(-1).text.match(/[A-F0-9]{4}(?:-[A-F0-9]{4}){3}/)[0];
      assert.equal(
        (
          await request(
            "recovery",
            { action: "request", email },
            undefined,
            "https://evil.invalid",
          )
        ).status,
        400,
      );
      const sent = await send();
      assert.equal(sent.status, 200);
      const unknown = await request("recovery", {
        action: "request",
        email: "unknown@example.invalid",
      });
      assert.deepEqual(unknown.data, sent.data);
      assert.equal(mail.length, 1);
      assert.deepEqual(mail[0].to, [email]);
      assert.ok(!JSON.stringify(sent.data).includes(code()));
      const record = (await sql`SELECT * FROM password_recoveries`)[0];
      assert.equal(
        record.code_hash,
        createHash("sha256").update(code().replaceAll("-", "")).digest("hex"),
      );
      assert.equal((await login(email, "OriginalPassword123")).status, 200);
      assert.equal(
        (
          await request("recovery", {
            action: "verify",
            email,
            code: "BADCODE",
          })
        ).status,
        400,
      );
      const firstCode = code();
      const attempts = await Promise.all(
        [1, 2].map(() =>
          request("recovery", { action: "verify", email, code: firstCode }),
        ),
      );
      assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 400]);
      const verified = attempts.find((r) => r.status === 200);
      assert.equal(verified.data.requiresPasswordChange, true);
      assert.equal(verified.jar.get("root-session"), undefined);
      assert.ok(verified.jar.get("root-recovery"));
      assert.equal(
        (await request("heroes", undefined, verified.jar, base, "GET")).status,
        401,
      );
      assert.equal(
        (await request("admin", undefined, verified.jar, base, "GET")).status,
        403,
      );
      assert.equal(
        (
          await request("recovery", {
            action: "complete",
            password: "NewPassword123",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request(
            "recovery",
            { action: "complete", password: "short" },
            verified.jar,
          )
        ).status,
        400,
      );
      const replay = cookieJar();
      replay.set("root-recovery", verified.jar.get("root-recovery").value);
      assert.equal(
        (
          await request(
            "recovery",
            { action: "complete", password: "NewPassword123" },
            verified.jar,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "recovery",
            { action: "complete", password: "StolenPassword123" },
            replay,
          )
        ).status,
        400,
      );
      assert.equal(
        (await request("auth", undefined, originalSession, base, "GET")).data
          .user,
        null,
      );
      assert.equal((await login(email, "OriginalPassword123")).status, 401);
      assert.equal((await login(email, "NewPassword123")).status, 200);
      assert.equal((await sql`SELECT * FROM password_recoveries`).length, 0);
      // Admin sends to the account's saved email; the code also works in normal login.
      assert.equal(
        (
          await request(
            "admin",
            { action: "recover", id: player.data.user.id },
            player.jar,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            "admin",
            { action: "recover", id: player.data.user.id },
            admin.jar,
          )
        ).status,
        200,
      );
      const tempLogin = await login(email, code());
      assert.equal(tempLogin.data.requiresPasswordChange, true);
      assert.equal(tempLogin.data.user, undefined);
      await sql`UPDATE password_recoveries SET expires_at = now() - interval '1 second'`;
      assert.equal(
        (
          await request(
            "recovery",
            { action: "complete", password: "ExpiredPassword123" },
            tempLogin.jar,
          )
        ).status,
        400,
      );
      await send();
      const latest = code();
      assert.equal(
        (
          await request("recovery", {
            action: "verify",
            email,
            code: firstCode,
          })
        ).status,
        400,
      );
      const verifiedAgain = await request("recovery", {
        action: "verify",
        email,
        code: latest,
      });
      assert.equal(verifiedAgain.status, 200);
      assert.equal(
        (
          await request(
            "admin",
            { action: "ban", id: player.data.user.id },
            admin.jar,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "recovery",
            { action: "complete", password: "BannedPassword123" },
            verifiedAgain.jar,
          )
        ).status,
        400,
      );
      const before = mail.length;
      assert.equal((await send()).status, 200);
      assert.equal(mail.length, before);
      const expiring = await signup("expiry@example.invalid");
      await request("recovery", {
        action: "request",
        email: expiring.data.user.email,
      });
      const expiredCode = code();
      await sql`UPDATE password_recoveries SET expires_at = now() - interval '1 second'`;
      assert.equal(
        (
          await request("recovery", {
            action: "verify",
            email: expiring.data.user.email,
            code: expiredCode,
          })
        ).status,
        400,
      );
      mailFails = true;
      assert.equal(
        (
          await request("recovery", {
            action: "request",
            email: expiring.data.user.email,
          })
        ).status,
        503,
      );
      assert.equal(
        (
          await sql`SELECT * FROM password_recoveries WHERE user_id = ${expiring.data.user.id}`
        ).length,
        0,
      );
      mailFails = false;
      delete process.env.RESEND_API_KEY;
      assert.equal(
        (
          await request("recovery", {
            action: "request",
            email: "unknown@example.invalid",
          })
        ).status,
        503,
      );
      assert.equal(
        (
          await request(
            "admin",
            { action: "recover", id: admin.data.user.id },
            admin.jar,
          )
        ).status,
        503,
      );
    } finally {
      await raw.query(`DROP SCHEMA ${schema} CASCADE`);
      keys.forEach((key, index) => {
        if (saved[index] === undefined) delete process.env[key];
        else process.env[key] = saved[index];
      });
    }
  },
);
