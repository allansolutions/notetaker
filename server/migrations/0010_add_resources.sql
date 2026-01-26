-- Add resources column to tasks table
ALTER TABLE tasks ADD COLUMN resources TEXT DEFAULT '[]';
