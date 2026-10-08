import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
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
    if (data.action === "signup") {
      if (!data.name)
        return NextResponse.json(
          { error: "Please enter your name." },
          { status: 400 },
        );
      const hash = await hashPassword(data.password);
      const rows =
        await sql`INSERT INTO users (name, email, password_hash) VALUES (${data.name}, ${data.email}, ${hash}) ON CONFLICT (email) DO NOTHING RETURNING id, name, email`;
      user = rows[0];
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
      if (!found || !valid)
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
      user = { id: found.id, name: found.name, email: found.email };
    }
    await startSession(user.id);
    return NextResponse.json({ user });
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
