-- CRM tables for contacts and companies

-- Companies table (create first since contacts references it)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  street TEXT,
  city TEXT,
  country TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);

-- Index for searching companies by name
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(user_id, name);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linked_in TEXT,
  instagram TEXT,
  street TEXT,
  city TEXT,
  country TEXT,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);

-- Index for searching contacts by name
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(user_id, last_name, first_name);

-- Index for finding contacts by company
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
