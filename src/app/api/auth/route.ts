import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminEmail, MAX_USERS } from "@/lib/admin";
import { verifyRecoveryCode } from "@/lib/password-recovery";
import {
  digest,
  getUser,
  hashPassword,
  rateLimit,
  sameOrigin,
  startSession,
  verifyPassword,
} from "@/lib/auth";
export async function GET() {
  try {
    return NextResponse.json({ user: await getUser() });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect. Please try again." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const data = z
      .object({
        action: z.enum(["login", "signup"]),
        email: z
          .string()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password: z.string().min(8).max(128),
        name: z.string().trim().min(1).max(60).optional(),
      })
      .parse(await req.json());
    const ip =
      req.headers.get("x-vercel-forwarded-for") ??
      req.headers.get("x-forwarded-for") ??
      "local";
    if (
      !(await rateLimit(`auth:${ip}`, 30)) ||
      !(await rateLimit(`email:${data.email}`, 12))
    )
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    const sql = db();
    let user;
    let passwordHash: string;
    if (data.action === "signup") {
      if (!data.name)
        return NextResponse.json(
          { error: "Please enter your name." },
          { status: 400 },
        );
      const hash = await hashPassword(data.password);
      passwordHash = hash;
      // Serialize signups; the next statement sees the previous signup's commit.
      // Banned users and the administrator also occupy a slot.
      const [, rows, counts] = await sql.transaction([
        sql`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`,
        sql`INSERT INTO users (name, email, password_hash) SELECT ${data.name}, ${data.email}, ${hash} WHERE (SELECT count(*) FROM users) < ${MAX_USERS} ON CONFLICT (email) DO NOTHING RETURNING id, name, email`,
        sql`SELECT count(*)::int AS total FROM users`,
      ]);
      user = rows[0];
      if (!user && counts[0].total >= MAX_USERS)
        return NextResponse.json(
          {
            error:
              "The app has reached its limit of 50 users. Please contact the administrator.",
          },
          { status: 409 },
        );
      if (!user)
        return NextResponse.json(
          { error: "Unable to create this account. Try signing in." },
          { status: 409 },
        );
    } else {
      const rows = await sql`SELECT * FROM users WHERE email = ${data.email}`;
      const found = rows[0];
      const valid = await verifyPassword(
        data.password,
        found?.password_hash ??
          "00000000000000000000000000000000:" + "00".repeat(64),
      );
      if (
        !valid &&
        found &&
        !found.banned_at &&
        (await verifyRecoveryCode(data.email, data.password))
      )
        return NextResponse.json({ requiresPasswordChange: true });
      if (!found || !valid)
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
      if (found.banned_at)
        return NextResponse.json(
          {
            error: "This account is banned. Please contact the administrator.",
          },
          { status: 403 },
        );
      user = { id: found.id, name: found.name, email: found.email };
      passwordHash = found.password_hash;
    }
    await startSession(user.id, passwordHash);
    return NextResponse.json({
      user: { ...user, isAdmin: isAdminEmail(user.email) },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Enter a valid email and a password of at least 8 characters."
            : "Unable to sign in. Please try again.",
      },
      { status: 400 },
    );
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const jar = await cookies();
    const token = jar.get("root-session")?.value;
    if (token)
      await db()`DELETE FROM sessions WHERE token_hash = ${digest(token)}`;
    jar.delete("root-session");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to sign out." }, { status: 400 });
  }
}
