ALTER TABLE tasks ADD COLUMN deleted_at INTEGER;
ALTER TABLE companies ADD COLUMN deleted_at INTEGER;
ALTER TABLE contacts ADD COLUMN deleted_at INTEGER;
ALTER TABLE wiki_pages ADD COLUMN deleted_at INTEGER;
