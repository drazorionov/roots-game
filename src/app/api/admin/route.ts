import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser, sameOrigin } from "@/lib/auth";
import { isAdminEmail, MAX_USERS } from "@/lib/admin";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { sendRecoveryCode } from "@/lib/password-recovery";

export async function GET() {
  try {
    const user = await getUser();
    if (!user?.isAdmin)
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    // Select account fields explicitly: password hashes and session tokens must
    // never be returned, even to the administrator.
    const users = await db()`
      SELECT u.id, u.name, u.email, u.created_at, u.banned_at,
        (SELECT count(*)::int FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()) AS active_sessions,
        COALESCE((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.updated_at DESC) FROM heroes h WHERE h.owner_id = u.id), '[]'::jsonb) AS heroes,
        COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at) FROM campaigns c WHERE c.owner_id = u.id), '[]'::jsonb) AS campaigns,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('campaign_id', m.campaign_id, 'name', c.name, 'last_seen', p.last_seen))
          FROM memberships m JOIN campaigns c ON c.id = m.campaign_id
          LEFT JOIN campaign_presence p ON p.campaign_id = m.campaign_id AND p.user_id = m.user_id
          WHERE m.user_id = u.id), '[]'::jsonb) AS memberships
      FROM users u ORDER BY u.created_at, u.id`;
    return NextResponse.json(
      {
        users: users.map((u) => ({ ...u, isAdmin: isAdminEmail(u.email) })),
        maxUsers: MAX_USERS,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load users." },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await getUser();
    if (!user?.isAdmin)
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 },
      );
    const data = z
      .object({
        id: z.string().uuid(),
        action: z.enum(["ban", "unban", "purge", "recover"]),
        confirmation: z.string().optional(),
      })
      .parse(await req.json());
    const sql = db();
    const targets =
      await sql`SELECT id, email FROM users WHERE id = ${data.id}`;
    const target = targets[0];
    if (!target)
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (data.action === "recover") {
      if (!(await rateLimit(`admin-recovery:${user.id}`, 20)))
        return NextResponse.json(
          { error: "Too many attempts. Try again in 15 minutes." },
          { status: 429 },
        );
      await sendRecoveryCode(target.email);
      return NextResponse.json({ ok: true });
    }
    if (target.id === user.id || isAdminEmail(target.email))
      return NextResponse.json(
        { error: "The administrator account cannot be banned or purged." },
        { status: 403 },
      );
    if (data.action === "purge") {
      if (data.confirmation !== target.email)
        return NextResponse.json(
          { error: "Enter the user's email to confirm deletion." },
          { status: 400 },
        );
      await sql.transaction([
        sql`SELECT id FROM users WHERE id = ${data.id} FOR UPDATE`,
        // Match ordinary campaign deletion: other players keep their sheets,
        // with a new version so stale writes cannot restore an assignment.
        sql`SELECT id FROM campaigns WHERE owner_id = ${data.id} FOR UPDATE`,
        sql`UPDATE heroes SET campaign_id = NULL, version = version + 1, updated_at = now() WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_id = ${data.id}) AND owner_id <> ${data.id}`,
        sql`DELETE FROM users WHERE id = ${data.id}`,
      ]);
    } else {
      await sql.transaction([
        sql`UPDATE users SET banned_at = CASE WHEN ${data.action} = 'ban' THEN now() ELSE NULL END WHERE id = ${data.id}`,
        // Revoke every session on both ban and unban; old cookies stay invalid.
        sql`DELETE FROM sessions WHERE user_id = ${data.id}`,
        sql`DELETE FROM password_recoveries WHERE user_id = ${data.id}`,
        sql`DELETE FROM campaign_presence WHERE user_id = ${data.id}`,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "Password recovery email is not configured. Please contact the administrator.",
        "Recovery email could not be sent. Please try again later.",
      ].includes(error.message)
    )
      return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json(
      { error: "Could not update user." },
      { status: 400 },
    );
  }
}
