import { db } from "./db";
import { sheetSchema } from "./sheet";

export async function ownedHeroes(userId: string) {
  const heroes =
    await db()`SELECT h.*, u.name AS player FROM heroes h JOIN users u ON u.id = h.owner_id WHERE h.owner_id = ${userId} ORDER BY h.updated_at`;
  return heroes.map((h) => ({ ...h, sheet: sheetSchema.parse(h.sheet) }));
}

export async function joinedCampaigns(userId: string) {
  return await db()`SELECT c.*, u.name AS master_name,
    (SELECT count(*)::int FROM memberships m WHERE m.campaign_id = c.id) AS members,
    CASE WHEN c.owner_id = ${userId} THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) ORDER BY p.name, p.id), '[]'::jsonb)
      FROM memberships cm JOIN users p ON p.id = cm.user_id WHERE cm.campaign_id = c.id
    ) ELSE NULL END AS member_list
    FROM campaigns c JOIN users u ON u.id = c.owner_id JOIN memberships m ON c.id = m.campaign_id WHERE m.user_id = ${userId} ORDER BY c.created_at`;
}
