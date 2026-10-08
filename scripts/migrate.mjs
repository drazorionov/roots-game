import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before migrating.");
const sql = neon(process.env.DATABASE_URL);
await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  sql`CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, description text NOT NULL DEFAULT '', clearing text NOT NULL DEFAULT '', invite_code text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  sql`CREATE TABLE IF NOT EXISTS memberships (campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(campaign_id, user_id))`,
  sql`CREATE TABLE IF NOT EXISTS heroes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, owner_id uuid NOT NULL REFERENCES users(id), sheet jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())`,
  sql`ALTER TABLE heroes ALTER COLUMN campaign_id DROP NOT NULL`,
  sql`CREATE INDEX IF NOT EXISTS heroes_campaign_idx ON heroes(campaign_id)`,
  sql`CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id)`,
  sql`CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL)`,
]);
console.log("Root Helper schema is ready.");
