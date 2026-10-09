import { db } from "./db";
import { sheetSchema } from "./sheet";

export async function ownedHeroes(userId: string) {
  const heroes =
    await db()`SELECT h.*, u.name AS player FROM heroes h JOIN users u ON u.id = h.owner_id WHERE h.owner_id = ${userId} ORDER BY h.updated_at`;
  return heroes.map((h) => ({ ...h, sheet: sheetSchema.parse(h.sheet) }));
}

export async function joinedCampaigns(userId: string) {
  return await db()`SELECT c.*, u.name AS master_name, (SELECT count(*)::int FROM memberships m WHERE m.campaign_id = c.id) as members FROM campaigns c JOIN users u ON u.id = c.owner_id JOIN memberships m ON c.id = m.campaign_id WHERE m.user_id = ${userId} ORDER BY c.created_at`;
}
