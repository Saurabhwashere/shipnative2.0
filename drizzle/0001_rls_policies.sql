-- =============================================================================
-- RLS (Row Level Security) Policies — Defense-in-depth
-- =============================================================================
-- The application uses supabaseAdmin (service_role key) which BYPASSES RLS,
-- so existing functionality is completely unaffected by these policies.
--
-- These policies protect against:
--   1. Direct DB connections using the anon key
--   2. Future features accidentally using the anon client
--   3. A compromised service_role key used outside the app
--
-- HOW TO APPLY: Run this SQL manually in the Supabase SQL editor.
-- Do NOT run via drizzle-kit — Drizzle does not manage RLS.
--
-- NOTE: Policies reference a session variable `app.clerk_user_id` that would
-- be set per-transaction if a user-facing Supabase client is ever introduced.
-- Until then, these policies simply block all non-service-role access.
-- =============================================================================

-- ── Enable RLS on all tables ──────────────────────────────────────────────────
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_files ENABLE ROW LEVEL SECURITY;

-- ── Force RLS even for the postgres superuser (psql sessions) ─────────────────
ALTER TABLE users          FORCE ROW LEVEL SECURITY;
ALTER TABLE projects       FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations  FORCE ROW LEVEL SECURITY;
ALTER TABLE messages       FORCE ROW LEVEL SECURITY;
ALTER TABLE project_files  FORCE ROW LEVEL SECURITY;
ALTER TABLE snapshots      FORCE ROW LEVEL SECURITY;
ALTER TABLE snapshot_files FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- users
-- =============================================================================
CREATE POLICY "users: own row select"
  ON users FOR SELECT
  USING (clerk_id = current_setting('app.clerk_user_id', true));

CREATE POLICY "users: own row update"
  ON users FOR UPDATE
  USING (clerk_id = current_setting('app.clerk_user_id', true));

-- INSERT / DELETE remain blocked at the DB level (service_role only).

-- =============================================================================
-- projects
-- =============================================================================
CREATE POLICY "projects: owner select"
  ON projects FOR SELECT
  USING (
    -- Own projects
    user_id = (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.clerk_user_id', true)
    )
    -- Public projects visible to anyone (share URLs)
    OR (is_public = true AND deleted_at IS NULL)
  );

CREATE POLICY "projects: owner insert"
  ON projects FOR INSERT
  WITH CHECK (
    user_id = (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

CREATE POLICY "projects: owner update"
  ON projects FOR UPDATE
  USING (
    user_id = (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

CREATE POLICY "projects: owner delete"
  ON projects FOR DELETE
  USING (
    user_id = (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- =============================================================================
-- conversations
-- =============================================================================
CREATE POLICY "conversations: via project ownership"
  ON conversations FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON u.id = p.user_id
      WHERE u.clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- =============================================================================
-- messages
-- =============================================================================
CREATE POLICY "messages: via conversation ownership"
  ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN projects p ON p.id = c.project_id
      JOIN users u ON u.id = p.user_id
      WHERE u.clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- =============================================================================
-- project_files
-- =============================================================================
CREATE POLICY "project_files: via project ownership"
  ON project_files FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON u.id = p.user_id
      WHERE u.clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- =============================================================================
-- snapshots
-- =============================================================================
CREATE POLICY "snapshots: via project ownership"
  ON snapshots FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON u.id = p.user_id
      WHERE u.clerk_id = current_setting('app.clerk_user_id', true)
    )
  );

-- =============================================================================
-- snapshot_files
-- =============================================================================
CREATE POLICY "snapshot_files: via snapshot ownership"
  ON snapshot_files FOR ALL
  USING (
    snapshot_id IN (
      SELECT s.id FROM snapshots s
      JOIN projects p ON p.id = s.project_id
      JOIN users u ON u.id = p.user_id
      WHERE u.clerk_id = current_setting('app.clerk_user_id', true)
    )
  );
