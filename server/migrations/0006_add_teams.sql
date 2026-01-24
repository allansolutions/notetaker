-- Teams table
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Team members table
CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE UNIQUE INDEX idx_team_members_team_user ON team_members(team_id, user_id);

-- Team invites table
CREATE TABLE team_invites (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_team_invites_team ON team_invites(team_id);
CREATE UNIQUE INDEX idx_team_invites_token ON team_invites(token);

-- Add team columns to tasks
ALTER TABLE tasks ADD COLUMN team_id TEXT REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_team ON tasks(team_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);

-- Add active team to user settings
ALTER TABLE user_settings ADD COLUMN active_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL;
