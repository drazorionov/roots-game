import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { digest, hashPassword, rateLimit } from "./auth";

export const recoveryCookie = "root-recovery";
export function recoveryAvailable() {
  return !!(process.env.RESEND_API_KEY && process.env.RECOVERY_FROM_EMAIL);
}

export async function sendRecoveryCode(email: string) {
  if (!recoveryAvailable())
    throw new Error(
      "Password recovery email is not configured. Please contact the administrator.",
    );
  if (!(await rateLimit(`recovery-send:${email}`, 3))) return;
  const sql = db();
  const users =
    await sql`SELECT id, email FROM users WHERE email = ${email} AND banned_at IS NULL`;
  if (!users[0]) return;
  const code = randomBytes(8).toString("hex").toUpperCase();
  const hash = digest(code);
  const rows =
    await sql`INSERT INTO password_recoveries (user_id, code_hash, expires_at)
    SELECT id, ${hash}, now() + interval '15 minutes' FROM users WHERE id = ${users[0].id} AND banned_at IS NULL
    ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash, reset_token_hash = NULL, expires_at = EXCLUDED.expires_at RETURNING user_id`;
  if (!rows.length) return;
  try {
    // Never derive the login URL from request headers or include secrets in logs.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `root-recovery-${randomUUID()}`,
      },
      body: JSON.stringify({
        from: process.env.RECOVERY_FROM_EMAIL,
        to: [users[0].email],
        subject: "Root Helper — temporary sign-in code",
        text: `Your temporary Root Helper code is: ${code.match(/.{4}/g)!.join("-")}\n\nThis code expires in 15 minutes and can be used once. Open Root Helper, choose Sign in, and enter your email and this code instead of your password, or choose Use a temporary code. You must choose a new password before you can access your account.\n\nIf you did not request this, ignore this email. Your existing password has not changed.`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Delivery failed");
  } catch {
    await sql`DELETE FROM password_recoveries WHERE user_id = ${users[0].id} AND code_hash = ${hash}`;
    throw new Error(
      "Recovery email could not be sent. Please try again later.",
    );
  }
}

export async function verifyRecoveryCode(email: string, supplied: string) {
  const code = supplied.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{16}$/.test(code)) return false;
  const token = randomBytes(32).toString("hex");
  // Atomic consumption prevents replay, including simultaneous verification.
  const rows =
    await db()`UPDATE password_recoveries r SET code_hash = NULL, reset_token_hash = ${digest(token)}, expires_at = now() + interval '10 minutes'
    FROM users u WHERE r.user_id = u.id AND u.email = ${email} AND u.banned_at IS NULL AND r.code_hash = ${digest(code)} AND r.expires_at > now() RETURNING r.user_id`;
  if (!rows.length) return false;
  const jar = await cookies();
  jar.delete("root-session");
  jar.set(recoveryCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return true;
}

export async function completeRecovery(password: string) {
  const jar = await cookies();
  const token = jar.get(recoveryCookie)?.value;
  if (!token) return false;
  const hash = await hashPassword(password);
  const sql = db();
  const [, rows] = await sql.transaction([
    sql`SELECT u.id FROM users u JOIN password_recoveries r ON r.user_id = u.id WHERE r.reset_token_hash = ${digest(token)} FOR UPDATE OF u`,
    sql`WITH consumed AS (
    DELETE FROM password_recoveries r USING users u WHERE r.user_id = u.id AND u.banned_at IS NULL AND r.reset_token_hash = ${digest(token)} AND r.expires_at > now() RETURNING r.user_id
  ), changed AS (
    UPDATE users SET password_hash = ${hash} WHERE id IN (SELECT user_id FROM consumed) AND banned_at IS NULL RETURNING id
  ), revoked AS (
    DELETE FROM sessions WHERE user_id IN (SELECT id FROM changed)
  ) SELECT id FROM changed`,
  ]);
  jar.delete(recoveryCookie);
  if (!rows.length) return false;
  jar.delete("root-session");
  return true;
}
