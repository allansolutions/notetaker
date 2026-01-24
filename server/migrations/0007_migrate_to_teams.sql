-- Migration to create initial team and migrate existing data
-- Run AFTER 0006_add_teams.sql schema migration

-- 1. Create the "Root Innovation" team
INSERT OR IGNORE INTO teams (id, name, created_at, updated_at)
VALUES ('root-innovation', 'Root Innovation', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

-- 2. Add all existing users to the team
-- First user alphabetically by email becomes admin, rest are members
-- You may want to customize this based on actual admin email
INSERT OR IGNORE INTO team_members (id, team_id, user_id, role, created_at)
SELECT
  'member-' || lower(hex(randomblob(8))),
  'root-innovation',
  id,
  CASE
    WHEN id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1) THEN 'admin'
    ELSE 'member'
  END,
  strftime('%s', 'now') * 1000
FROM users;

-- 3. Migrate all tasks to the team with self-assignment
UPDATE tasks
SET
  team_id = 'root-innovation',
  assignee_id = user_id,
  updated_at = strftime('%s', 'now') * 1000
WHERE team_id IS NULL;

-- 4. Update user settings to set active team
UPDATE user_settings
SET
  active_team_id = 'root-innovation',
  updated_at = strftime('%s', 'now') * 1000
WHERE active_team_id IS NULL;

-- 5. Create settings for users who don't have any
INSERT OR IGNORE INTO user_settings (user_id, active_team_id, updated_at)
SELECT
  id,
  'root-innovation',
  strftime('%s', 'now') * 1000
FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings);
