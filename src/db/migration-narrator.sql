-- Narrator Reflections: stores AI-generated daily narratives per user
CREATE TABLE IF NOT EXISTS narrator_reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_hash TEXT NOT NULL,
  date TEXT NOT NULL,
  context_tier TEXT NOT NULL,
  narrative TEXT NOT NULL,
  model TEXT NOT NULL,
  context_snapshot TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_hash, date)
);

CREATE INDEX IF NOT EXISTS idx_reflections_user ON narrator_reflections(user_hash, date DESC);
