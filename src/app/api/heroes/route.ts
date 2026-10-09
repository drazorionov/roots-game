import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser, sameOrigin } from "@/lib/auth";
import { sheetSchema, sameCharacterSetup } from "@/lib/sheet";
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
    let copying = false;
    if (data.id) {
      const existing =
        await sql`SELECT sheet, campaign_id FROM heroes WHERE id = ${data.id} AND owner_id = ${user.id} AND version = ${data.version ?? 0}`;
      if (!existing[0])
        return NextResponse.json(
          {
            error:
              "This sheet changed elsewhere, or you don’t have access. Reopen it to load the latest version.",
          },
          { status: 409 },
        );
      copying = !existing[0].campaign_id && !!data.campaignId;
      if (
        existing[0].campaign_id &&
        (data.campaignId !== existing[0].campaign_id ||
          !sameCharacterSetup(sheetSchema.parse(existing[0].sheet), data.sheet))
      )
        return NextResponse.json(
          {
            error:
              "This campaign copy has locked setup. Your base character stays editable in My characters. You can still track harm, rolls, equipment, and session progress.",
          },
          { status: 403 },
        );
    }
    // Campaign sheets are snapshots. Never assign or update the base in place.
    const baseId = !data.id && data.campaignId ? randomUUID() : null;
    const save = copying
      ? sql`INSERT INTO heroes (campaign_id, owner_id, sheet, source_hero_id) SELECT ${data.campaignId}, owner_id, sheet, id FROM heroes WHERE id = ${data.id} AND owner_id = ${user.id} AND campaign_id IS NULL AND version = ${data.version ?? 0} AND EXISTS (SELECT 1 FROM memberships WHERE campaign_id = ${data.campaignId} AND user_id = ${user.id}) ON CONFLICT (campaign_id, source_hero_id) DO UPDATE SET source_hero_id = EXCLUDED.source_hero_id RETURNING *`
      : data.id
        ? sql`UPDATE heroes SET sheet = ${JSON.stringify(data.sheet)}::jsonb, version = version + 1, updated_at = now() WHERE id = ${data.id} AND owner_id = ${user.id} AND version = ${data.version ?? 0} AND campaign_id IS NOT DISTINCT FROM ${data.campaignId}::uuid AND (${data.campaignId}::uuid IS NULL OR EXISTS (SELECT 1 FROM memberships WHERE campaign_id = ${data.campaignId} AND user_id = ${user.id})) RETURNING *`
        : baseId
          ? sql`WITH base AS (INSERT INTO heroes (id, owner_id, sheet) SELECT ${baseId}, ${user.id}, ${JSON.stringify(data.sheet)}::jsonb WHERE EXISTS (SELECT 1 FROM memberships WHERE campaign_id = ${data.campaignId} AND user_id = ${user.id}) RETURNING *) INSERT INTO heroes (campaign_id, owner_id, sheet, source_hero_id) SELECT ${data.campaignId}, owner_id, sheet, id FROM base RETURNING *`
          : sql`INSERT INTO heroes (owner_id, sheet) VALUES (${user.id}, ${JSON.stringify(data.sheet)}::jsonb) RETURNING *`;
    // Serialize campaign saves with departure; creating a base and copy is atomic.
    const results = data.campaignId
      ? await sql.transaction([
          sql`SELECT campaign_id FROM memberships WHERE campaign_id = ${data.campaignId} AND user_id = ${user.id} FOR KEY SHARE`,
          save,
          sql`SELECT * FROM heroes WHERE id = ${baseId} AND owner_id = ${user.id}`,
        ])
      : null;
    const rows = results ? results[1] : await save;
    if (!rows[0])
      return NextResponse.json(
        {
          error:
            "This sheet changed elsewhere, or you don’t have access. Reopen it to load the latest version.",
        },
        { status: 409 },
      );
    return NextResponse.json({
      hero: { ...rows[0], player: user.name },
      ...(results?.[2][0]
        ? { baseHero: { ...results[2][0], player: user.name } }
        : {}),
    });
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

export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const user = await getUser();
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const { id, version } = z
      .object({ id: z.string().uuid(), version: z.number().int().positive() })
      .parse(await req.json());
    const rows =
      await db()`DELETE FROM heroes WHERE id = ${id} AND owner_id = ${user.id} AND version = ${version} RETURNING id`;
    if (!rows.length)
      return NextResponse.json(
        {
          error:
            "This character changed or is not yours. Reopen it and try again.",
        },
        { status: 409 },
      );
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json(
      { error: "Could not delete character." },
      { status: 400 },
    );
  }
}
