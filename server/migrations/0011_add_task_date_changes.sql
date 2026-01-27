CREATE TABLE task_date_changes (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_due_date INTEGER NOT NULL,
  new_due_date INTEGER NOT NULL,
  changed_at INTEGER NOT NULL
);
