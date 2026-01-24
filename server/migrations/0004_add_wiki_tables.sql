-- Wiki tables for hierarchical knowledge base

CREATE TABLE IF NOT EXISTS wiki_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  parent_id TEXT REFERENCES wiki_pages(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  type TEXT,
  category TEXT,
  blocks TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slug)
);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_wiki_pages_user ON wiki_pages(user_id);

-- Index for parent-based queries (tree traversal)
CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent ON wiki_pages(parent_id);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(user_id, slug);

-- Index for ordering within parent
CREATE INDEX IF NOT EXISTS idx_wiki_pages_order ON wiki_pages(parent_id, "order");
