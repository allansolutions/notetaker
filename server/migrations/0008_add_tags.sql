-- Add tags column to tasks table
ALTER TABLE tasks ADD COLUMN blocked_reason TEXT;
ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '[]';

-- Add tags column to wiki_pages table
ALTER TABLE wiki_pages ADD COLUMN tags TEXT DEFAULT '[]';
