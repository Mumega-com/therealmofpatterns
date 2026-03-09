-- Natal charts table
-- Stores computed natal chart for each authenticated user

CREATE TABLE IF NOT EXISTS natal_charts (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email_hash   TEXT UNIQUE NOT NULL,
  birth_date   TEXT NOT NULL,        -- YYYY-MM-DD
  birth_time   TEXT,                 -- HH:MM (optional)
  birth_location TEXT,               -- city/country label
  birth_lat    REAL,                 -- latitude (optional)
  birth_lon    REAL,                 -- longitude (optional)
  birth_tz     REAL DEFAULT 0,       -- timezone offset hours
  chart_json   TEXT NOT NULL,        -- full NatalChart JSON
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_natal_charts_email ON natal_charts(email_hash);
