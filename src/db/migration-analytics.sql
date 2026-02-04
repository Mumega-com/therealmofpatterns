-- Analytics Events Table
-- Stores all tracked funnel events for internal dashboards

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT,
  event_name TEXT NOT NULL,
  event_props TEXT, -- JSON
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  client_ip TEXT, -- Hashed for privacy
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics_events(page_url);

-- Daily aggregates for faster dashboard queries
CREATE TABLE IF NOT EXISTS analytics_daily (
  date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  unique_sessions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, event_name)
);

-- Funnel snapshots (computed daily via cron)
CREATE TABLE IF NOT EXISTS analytics_funnel (
  date TEXT NOT NULL PRIMARY KEY,
  page_views INTEGER DEFAULT 0,
  quiz_starts INTEGER DEFAULT 0,
  quiz_completes INTEGER DEFAULT 0,
  forecast_views INTEGER DEFAULT 0,
  email_captures INTEGER DEFAULT 0,
  checkout_starts INTEGER DEFAULT 0,
  subscriptions INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0
);
