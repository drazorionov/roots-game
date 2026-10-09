import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, sameOrigin } from "@/lib/auth";
import { activityRollSchema } from "@/lib/game-activity";

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const params = new URL(req.url).searchParams;
    const campaignId = z.string().uuid().parse(params.get("campaign"));
    const after = z
      .string()
      .regex(/^\d{1,19}$/)
      .nullable()
      .parse(params.get("after"));
    const sql = db();
    const membership =
      await sql`SELECT 1 FROM memberships WHERE campaign_id = ${campaignId} AND user_id = ${user.id}`;
    if (!membership.length)
      return NextResponse.json(
        { error: "Join this campaign first." },
        { status: 403 },
      );
    if (after === null) {
      const [row] =
        await sql`SELECT COALESCE(MAX(sequence), 0)::text AS cursor FROM game_activity WHERE campaign_id = ${campaignId}`;
      return NextResponse.json(
        { events: [], cursor: row.cursor },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const events =
      await sql`SELECT id, sequence::text, player, character, portrait, kind, changes, roll, created_at FROM game_activity WHERE campaign_id = ${campaignId} AND sequence > ${after}::bigint ORDER BY sequence LIMIT 100`;
    return NextResponse.json(
      { events, cursor: events.at(-1)?.sequence ?? after },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Activity unavailable. Retrying…" },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await getUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const data = z
      .object({
        id: z.string().uuid(),
        campaignId: z.string().uuid(),
        heroId: z.string().uuid(),
        roll: activityRollSchema,
      })
      .parse(await req.json());
    const sql = db();
    const [, events] = await sql.transaction([
      sql`SELECT c.id FROM campaigns c JOIN memberships m ON m.campaign_id = c.id WHERE c.id = ${data.campaignId} AND m.user_id = ${user.id} FOR UPDATE OF c`,
      sql`INSERT INTO game_activity (id, campaign_id, player, character, portrait, kind, roll)
        SELECT ${data.id}, h.campaign_id, ${user.name}, h.sheet ->> 'name', jsonb_build_object('species', h.sheet ->> 'species', 'playbook', h.sheet ->> 'playbook'), 'roll', ${JSON.stringify(data.roll)}::jsonb
        FROM heroes h JOIN memberships m ON m.campaign_id = h.campaign_id AND m.user_id = ${user.id}
        WHERE h.id = ${data.heroId} AND h.owner_id = ${user.id} AND h.campaign_id = ${data.campaignId}
        ON CONFLICT (id) DO NOTHING RETURNING id`,
    ]);
    if (!events.length) {
      // A retry is successful only for this player's original event.
      const existing =
        await sql`SELECT a.id FROM game_activity a JOIN heroes h ON h.id = ${data.heroId} AND h.owner_id = ${user.id} AND h.campaign_id = a.campaign_id JOIN memberships m ON m.campaign_id = a.campaign_id AND m.user_id = ${user.id} WHERE a.id = ${data.id} AND a.campaign_id = ${data.campaignId} AND a.player = ${user.name} AND a.roll = ${JSON.stringify(data.roll)}::jsonb`;
      if (!existing.length)
        return NextResponse.json(
          { error: "Join this campaign first." },
          { status: 403 },
        );
    }
    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json(
      { error: "Roll not shared. Retry to notify the party." },
      { status: 400 },
    );
  }
}
