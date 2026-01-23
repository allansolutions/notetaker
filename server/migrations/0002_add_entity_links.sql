-- Entity links table for cross-module relationships
-- Allows any entity (task, contact, company, wiki-page) to link to any other entity

CREATE TABLE IF NOT EXISTS entity_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Index for finding all links from a source entity
CREATE INDEX IF NOT EXISTS idx_entity_links_source ON entity_links(source_type, source_id);

-- Index for finding all links to a target entity (backlinks)
CREATE INDEX IF NOT EXISTS idx_entity_links_target ON entity_links(target_type, target_id);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_entity_links_user ON entity_links(user_id);
