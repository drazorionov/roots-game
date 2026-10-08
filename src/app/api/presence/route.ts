import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, sameOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await getUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { campaignId } = z
      .object({ campaignId: z.string().uuid() })
      .parse(await req.json());
    const sql = db();
    const membership =
      await sql`SELECT 1 FROM memberships WHERE campaign_id = ${campaignId} AND user_id = ${user.id}`;
    if (!membership.length)
      return NextResponse.json(
        { error: "Join this campaign first." },
        { status: 403 },
      );
    // One row per user/campaign prevents duplicate tabs from inflating the count.
    const [, players] = await sql.transaction([
      sql`INSERT INTO campaign_presence (campaign_id, user_id, last_seen) VALUES (${campaignId}, ${user.id}, now()) ON CONFLICT (campaign_id, user_id) DO UPDATE SET last_seen = now()`,
      sql`SELECT u.id, u.name FROM campaign_presence p JOIN users u ON u.id = p.user_id JOIN memberships m ON m.campaign_id = p.campaign_id AND m.user_id = p.user_id WHERE p.campaign_id = ${campaignId} AND p.last_seen > now() - interval '75 seconds' ORDER BY u.name, u.id`,
    ]);
    return NextResponse.json(
      { players },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Online status unavailable." },
      { status: 400 },
    );
  }
}
