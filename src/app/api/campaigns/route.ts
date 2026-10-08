import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, rateLimit, sameOrigin } from "@/lib/auth";
export async function GET() {
  try {
    const user = await getUser();
    if (!user)
      return NextResponse.json(
        { error: "Sign in to view campaigns." },
        { status: 401 },
      );
    const campaigns =
      await db()`SELECT c.*, (SELECT count(*)::int FROM memberships m WHERE m.campaign_id = c.id) as members FROM campaigns c JOIN memberships m ON c.id = m.campaign_id WHERE m.user_id = ${user.id} ORDER BY c.created_at`;
    return NextResponse.json({ campaigns });
  } catch {
    return NextResponse.json(
      { error: "Could not load campaigns." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await getUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (!(await rateLimit(`campaigns:${user.id}`, 30)))
      return NextResponse.json(
        { error: "Please try again in 15 minutes." },
        { status: 429 },
      );
    const data = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("create"),
          name: z.string().trim().min(1).max(100),
          description: z.string().max(500),
          clearing: z.string().max(80),
        }),
        z.object({
          action: z.literal("join"),
          code: z
            .string()
            .trim()
            .regex(/^[a-fA-F0-9]{16}$/)
            .transform((v) => v.toLowerCase()),
        }),
      ])
      .parse(await req.json());
    const sql = db();
    let id;
    if (data.action === "join") {
      const rows =
        await sql`SELECT id FROM campaigns WHERE invite_code = ${data.code}`;
      if (!rows[0])
        return NextResponse.json(
          { error: "That invite code was not found." },
          { status: 404 },
        );
      id = rows[0].id;
      await sql`INSERT INTO memberships (campaign_id, user_id) VALUES (${id}, ${user.id}) ON CONFLICT DO NOTHING`;
    } else {
      id = randomUUID();
      await sql.transaction([
        sql`INSERT INTO campaigns (id, owner_id, name, description, clearing, invite_code) VALUES (${id}, ${user.id}, ${data.name}, ${data.description}, ${data.clearing}, ${randomBytes(8).toString("hex")})`,
        sql`INSERT INTO memberships (campaign_id, user_id) VALUES (${id}, ${user.id})`,
      ]);
    }
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Check the campaign details or 16-character invite code."
            : "Could not save campaign.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const user = await getUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { id } = z.object({ id: z.string().uuid() }).parse(await req.json());
    const sql = db();
    const [, , deleted] = await sql.transaction([
      sql`SELECT id FROM campaigns WHERE id = ${id} AND owner_id = ${user.id} FOR UPDATE`,
      sql`UPDATE heroes SET campaign_id = NULL, version = version + 1, updated_at = now() WHERE campaign_id = ${id} AND EXISTS (SELECT 1 FROM campaigns WHERE id = ${id} AND owner_id = ${user.id})`,
      sql`DELETE FROM campaigns WHERE id = ${id} AND owner_id = ${user.id} RETURNING id`,
    ]);
    if (!deleted.length)
      return NextResponse.json(
        { error: "Only the campaign creator can delete it." },
        { status: 403 },
      );
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json(
      { error: "Could not delete campaign." },
      { status: 400 },
    );
  }
}
