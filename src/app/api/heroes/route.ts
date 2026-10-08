import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, sameOrigin } from "@/lib/auth";
import { sheetSchema } from "@/lib/sheet";
export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const campaign = new URL(req.url).searchParams.get("campaign");
    const sql = db();
    const heroes = campaign
      ? await sql`SELECT h.*, u.name AS player FROM heroes h JOIN users u ON u.id = h.owner_id JOIN memberships m ON m.campaign_id = h.campaign_id AND m.user_id = ${user.id} WHERE h.campaign_id = ${z.string().uuid().parse(campaign)} ORDER BY h.updated_at`
      : await sql`SELECT h.*, u.name AS player FROM heroes h JOIN users u ON u.id = h.owner_id WHERE h.owner_id = ${user.id} ORDER BY h.updated_at`;
    return NextResponse.json({
      heroes: heroes.map((h) => ({ ...h, sheet: sheetSchema.parse(h.sheet) })),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load characters." },
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
        id: z.string().uuid().optional(),
        campaignId: z.string().uuid().nullable(),
        version: z.number().int().positive().optional(),
        sheet: sheetSchema,
      })
      .parse(await req.json());
    const sql = db();
    const rows = data.id
      ? await sql`UPDATE heroes SET sheet = ${JSON.stringify(data.sheet)}::jsonb, campaign_id = ${data.campaignId}, version = version + 1, updated_at = now() WHERE id = ${data.id} AND owner_id = ${user.id} AND version = ${data.version ?? 0} AND (${data.campaignId}::uuid IS NULL OR EXISTS (SELECT 1 FROM memberships WHERE campaign_id = ${data.campaignId} AND user_id = ${user.id})) RETURNING *`
      : await sql`INSERT INTO heroes (campaign_id, owner_id, sheet) SELECT ${data.campaignId}, ${user.id}, ${JSON.stringify(data.sheet)}::jsonb WHERE ${data.campaignId}::uuid IS NULL OR EXISTS (SELECT 1 FROM memberships WHERE campaign_id = ${data.campaignId} AND user_id = ${user.id}) RETURNING *`;
    if (!rows[0])
      return NextResponse.json(
        {
          error:
            "This sheet changed elsewhere, or you don’t have access. Reopen it to load the latest version.",
        },
        { status: 409 },
      );
    return NextResponse.json({ hero: { ...rows[0], player: user.name } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Check your character fields. Stats must be between −3 and +3."
            : "Could not save your character. Please retry.",
      },
      { status: 400 },
    );
  }
}
