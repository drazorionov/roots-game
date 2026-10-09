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
  sql`CREATE TABLE IF NOT EXISTS campaign_presence (campaign_id uuid NOT NULL, user_id uuid NOT NULL, last_seen timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(campaign_id, user_id), FOREIGN KEY(campaign_id, user_id) REFERENCES memberships(campaign_id, user_id) ON DELETE CASCADE)`,
  sql`CREATE TABLE IF NOT EXISTS heroes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, owner_id uuid NOT NULL REFERENCES users(id), sheet jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())`,
  sql`ALTER TABLE heroes ALTER COLUMN campaign_id DROP NOT NULL`,
  sql`ALTER TABLE heroes DROP CONSTRAINT IF EXISTS heroes_campaign_id_fkey`,
  sql`ALTER TABLE heroes ADD CONSTRAINT heroes_campaign_id_fkey FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL`,
  // Split legacy assigned sheets once; later runs must not recreate deleted bases.
  sql`DO $$
    DECLARE hero record; base_id uuid;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'heroes' AND column_name = 'source_hero_id') THEN
        ALTER TABLE heroes ADD COLUMN source_hero_id uuid REFERENCES heroes(id) ON DELETE SET NULL;
        FOR hero IN SELECT * FROM heroes WHERE campaign_id IS NOT NULL LOOP
          INSERT INTO heroes (owner_id, sheet) VALUES (hero.owner_id, hero.sheet) RETURNING id INTO base_id;
          UPDATE heroes SET source_hero_id = base_id WHERE id = hero.id;
        END LOOP;
      END IF;
    END $$`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS heroes_campaign_source_idx ON heroes(campaign_id, source_hero_id)`,
  sql`CREATE INDEX IF NOT EXISTS heroes_campaign_idx ON heroes(campaign_id)`,
  sql`CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id)`,
  sql`CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL)`,
]);
console.log("Root Helper schema is ready.");
