import { neon } from "@neondatabase/serverless";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before migrating.");
const sql = neon(process.env.DATABASE_URL);
await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at timestamptz`,
  sql`CREATE TABLE IF NOT EXISTS password_recoveries (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, code_hash text UNIQUE, reset_token_hash text UNIQUE, expires_at timestamptz NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL)`,
  sql`CREATE TABLE IF NOT EXISTS campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, description text NOT NULL DEFAULT '', clearing text NOT NULL DEFAULT '', invite_code text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS started_at timestamptz`,
  sql`CREATE TABLE IF NOT EXISTS memberships (campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(campaign_id, user_id))`,
  sql`CREATE TABLE IF NOT EXISTS campaign_presence (campaign_id uuid NOT NULL, user_id uuid NOT NULL, last_seen timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(campaign_id, user_id), FOREIGN KEY(campaign_id, user_id) REFERENCES memberships(campaign_id, user_id) ON DELETE CASCADE)`,
  sql`CREATE TABLE IF NOT EXISTS heroes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, owner_id uuid NOT NULL REFERENCES users(id), sheet jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now())`,
  sql`ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_owner_id_fkey`,
  sql`ALTER TABLE campaigns ADD CONSTRAINT campaigns_owner_id_fkey FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE`,
  sql`ALTER TABLE heroes DROP CONSTRAINT IF EXISTS heroes_owner_id_fkey`,
  sql`ALTER TABLE heroes ADD CONSTRAINT heroes_owner_id_fkey FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE`,
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
  // A campaign stays started even when its last character is removed or leaves.
  sql`UPDATE campaigns c SET started_at = (SELECT min(h.updated_at) FROM heroes h WHERE h.campaign_id = c.id) WHERE c.started_at IS NULL AND EXISTS (SELECT 1 FROM heroes h WHERE h.campaign_id = c.id)`,
  sql`CREATE OR REPLACE FUNCTION mark_campaign_started() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.campaign_id IS NOT NULL THEN
        UPDATE campaigns SET started_at = now() WHERE id = NEW.campaign_id AND started_at IS NULL;
      END IF;
      RETURN NEW;
    END $$`,
  sql`DROP TRIGGER IF EXISTS heroes_mark_campaign_started ON heroes`,
  sql`CREATE TRIGGER heroes_mark_campaign_started AFTER INSERT OR UPDATE OF campaign_id, sheet ON heroes FOR EACH ROW EXECUTE FUNCTION mark_campaign_started()`,
  sql`CREATE TABLE IF NOT EXISTS game_activity (
    sequence bigserial PRIMARY KEY,
    id text UNIQUE NOT NULL,
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    player text NOT NULL,
    character text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('change', 'roll')),
    changes jsonb,
    roll jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  sql`CREATE INDEX IF NOT EXISTS game_activity_campaign_sequence_idx ON game_activity(campaign_id, sequence)`,
  // Serialize event insertion per campaign so polling cursors cannot skip an
  // uncommitted event with a lower sequence. Roll writes take the same lock.
  sql`CREATE OR REPLACE FUNCTION log_game_sheet_change() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE changed jsonb;
    BEGIN
      IF NEW.campaign_id IS NULL OR OLD.campaign_id IS DISTINCT FROM NEW.campaign_id OR OLD.sheet = NEW.sheet THEN
        RETURN NEW;
      END IF;
      SELECT jsonb_agg(jsonb_build_object('field', entry.key, 'before', OLD.sheet -> entry.key, 'after', entry.value))
        INTO changed FROM jsonb_each(NEW.sheet) entry WHERE OLD.sheet -> entry.key IS DISTINCT FROM entry.value;
      IF changed IS NOT NULL THEN
        PERFORM id FROM campaigns WHERE id = NEW.campaign_id FOR UPDATE;
        INSERT INTO game_activity (id, campaign_id, player, character, kind, changes)
          SELECT gen_random_uuid()::text, NEW.campaign_id, u.name, COALESCE(NEW.sheet ->> 'name', 'Character'), 'change', changed
          FROM users u WHERE u.id = NEW.owner_id;
      END IF;
      RETURN NEW;
    END $$`,
  sql`DROP TRIGGER IF EXISTS heroes_log_game_change ON heroes`,
  sql`CREATE TRIGGER heroes_log_game_change AFTER UPDATE OF sheet ON heroes FOR EACH ROW EXECUTE FUNCTION log_game_sheet_change()`,
  sql`CREATE INDEX IF NOT EXISTS heroes_campaign_idx ON heroes(campaign_id)`,
  sql`CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id)`,
  sql`CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL)`,
]);
console.log("Root Helper schema is ready.");
