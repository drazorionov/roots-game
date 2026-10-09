import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { isAdminEmail } from "./admin";
const scrypt = promisify(scryptCb);
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(hex, "hex"));
}
export async function getUser() {
  const token = (await cookies()).get("root-session")?.value;
  if (!token) return null;
  const rows =
    await db()`SELECT u.id, u.name, u.email FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ${digest(token)} AND s.expires_at > now() AND u.banned_at IS NULL`;
  const user = rows[0];
  return user
    ? {
        id: user.id as string,
        name: user.name as string,
        email: user.email as string,
        isAdmin: isAdminEmail(user.email),
      }
    : null;
}
export async function startSession(id: string, expectedPasswordHash: string) {
  const token = randomBytes(32).toString("hex");
  const sql = db();
  const [, rows] = await sql.transaction([
    sql`SELECT id FROM users WHERE id = ${id} FOR UPDATE`,
    sql`INSERT INTO sessions (token_hash, user_id, expires_at) SELECT ${digest(token)}, id, now() + interval '30 days' FROM users WHERE id = ${id} AND banned_at IS NULL AND password_hash = ${expectedPasswordHash} RETURNING user_id`,
  ]);
  if (!rows.length) throw new Error("Account unavailable");
  (await cookies()).set("root-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const target = new URL(req.url);
  const host = req.headers.get("host") || target.host;
  if (
    !origin ||
    new URL(origin).host !== host ||
    new URL(origin).protocol !== target.protocol
  )
    throw new Error("Invalid request origin");
}
export async function rateLimit(key: string, max: number) {
  const rows =
    await db()`INSERT INTO rate_limits (key, attempts, reset_at) VALUES (${digest(key)}, 1, now() + interval '15 minutes') ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.attempts + 1 END, reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + interval '15 minutes' ELSE rate_limits.reset_at END RETURNING attempts`;
  return rows[0].attempts <= max;
}
