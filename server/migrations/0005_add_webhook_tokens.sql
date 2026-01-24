CREATE TABLE webhook_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  token TEXT NOT NULL,
  webhook_secret TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_webhook_tokens_user_provider ON webhook_tokens(user_id, provider);
CREATE UNIQUE INDEX idx_webhook_tokens_token ON webhook_tokens(token);
