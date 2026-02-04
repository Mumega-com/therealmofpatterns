-- Privacy-First Data Architecture Schema
-- GDPR Compliant: Separates PII from analytics data
-- Created: 2024

-- ============================================
-- Table 1: Encrypted User Vault
-- Contains all PII, encrypted with user's key
-- System cannot read this data
-- ============================================

CREATE TABLE IF NOT EXISTS user_vault (
  user_hash TEXT PRIMARY KEY,           -- SHA-256(device_id + pepper)
  birth_data_enc TEXT NOT NULL,         -- AES-256-GCM encrypted birth data
  email_enc TEXT,                       -- AES-256-GCM encrypted email (optional)
  key_salt TEXT NOT NULL,               -- Unique salt for key derivation
  sync_code TEXT UNIQUE,                -- Human-readable code for cross-device
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT,
  deletion_requested_at TEXT,           -- GDPR Art. 17 tracking
  deletion_completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_vault_sync_code ON user_vault(sync_code);
CREATE INDEX IF NOT EXISTS idx_user_vault_deletion ON user_vault(deletion_requested_at);

-- ============================================
-- Table 2: Astrology Profiles
-- No PII - safe for analytics
-- Links to vault only by hash
-- ============================================

CREATE TABLE IF NOT EXISTS astrology_profiles (
  user_hash TEXT PRIMARY KEY,
  dominant_dimension INTEGER,           -- 0-7 (Phase, Existence, etc.)
  secondary_dimension INTEGER,
  tertiary_dimension INTEGER,
  current_stage TEXT,                   -- nigredo/albedo/citrinitas/rubedo
  kappa_average REAL DEFAULT 0,         -- Average field coherence
  kappa_trend TEXT,                     -- improving/stable/declining
  checkin_count INTEGER DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  last_checkin_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_hash) REFERENCES user_vault(user_hash) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_astrology_dominant ON astrology_profiles(dominant_dimension);
CREATE INDEX IF NOT EXISTS idx_astrology_stage ON astrology_profiles(current_stage);

-- ============================================
-- Table 3: Check-in History
-- No PII - linked by hash only
-- ============================================

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  checkin_date TEXT NOT NULL,           -- ISO date
  vector TEXT NOT NULL,                 -- JSON array of 8 floats
  stage TEXT,                           -- Alchemical stage
  kappa REAL,                           -- Field coherence 0-1
  mood_score INTEGER,                   -- Optional 1-10
  dominant_today INTEGER,               -- Which dimension dominated
  notes_enc TEXT,                       -- Encrypted personal notes (optional)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_hash) REFERENCES user_vault(user_hash) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_hash);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checkin_date);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_hash, checkin_date);

-- ============================================
-- Table 4: User Consents (GDPR Compliance)
-- Tracks what user consented to and when
-- ============================================

CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  consent_type TEXT NOT NULL,           -- data_processing, marketing, analytics, cookies
  consent_version TEXT,                 -- Version of privacy policy
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  withdrawn_at TEXT,
  ip_country TEXT,                      -- For geo-compliance (EU vs non-EU)
  user_agent TEXT,                      -- Browser/device info
  FOREIGN KEY (user_hash) REFERENCES user_vault(user_hash) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON user_consents(user_hash);
CREATE INDEX IF NOT EXISTS idx_consents_type ON user_consents(consent_type);

-- ============================================
-- Table 5: Data Deletion Requests
-- GDPR Article 17: Right to Erasure
-- ============================================

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  email_hash TEXT,                      -- For verification without storing email
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  scheduled_for TEXT,                   -- When deletion will occur
  completed_at TEXT,
  status TEXT DEFAULT 'pending',        -- pending, processing, completed, failed
  notes TEXT,
  FOREIGN KEY (user_hash) REFERENCES user_vault(user_hash) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deletion_status ON data_deletion_requests(status);

-- ============================================
-- Table 6: Data Export Requests
-- GDPR Article 20: Data Portability
-- ============================================

CREATE TABLE IF NOT EXISTS data_export_requests (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  download_url TEXT,                    -- Temporary signed URL
  expires_at TEXT,                      -- URL expiration
  status TEXT DEFAULT 'pending',        -- pending, processing, ready, expired
  FOREIGN KEY (user_hash) REFERENCES user_vault(user_hash) ON DELETE CASCADE
);

-- ============================================
-- Table 7: Anonymous Analytics Events
-- Aggregated, no user identification possible
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,             -- checkin, pageview, signup, purchase
  event_date TEXT NOT NULL,
  dimension_distribution TEXT,          -- JSON: counts per dimension
  stage_distribution TEXT,              -- JSON: counts per stage
  country_code TEXT,                    -- Aggregated by country
  device_type TEXT,                     -- mobile/desktop/tablet
  event_count INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(event_date);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);

-- ============================================
-- Views for Analytics (No PII exposed)
-- ============================================

-- Daily active users by stage
CREATE VIEW IF NOT EXISTS v_daily_stage_distribution AS
SELECT
  date(checkin_date) as day,
  stage,
  COUNT(DISTINCT user_hash) as user_count,
  AVG(kappa) as avg_kappa
FROM checkins
WHERE checkin_date >= date('now', '-30 days')
GROUP BY date(checkin_date), stage;

-- Dimension popularity (all time)
CREATE VIEW IF NOT EXISTS v_dimension_popularity AS
SELECT
  dominant_dimension,
  COUNT(*) as user_count,
  AVG(kappa_average) as avg_kappa,
  AVG(streak_longest) as avg_streak
FROM astrology_profiles
GROUP BY dominant_dimension
ORDER BY user_count DESC;

-- Weekly retention by cohort
CREATE VIEW IF NOT EXISTS v_weekly_cohorts AS
SELECT
  strftime('%Y-%W', created_at) as cohort_week,
  COUNT(*) as total_users,
  SUM(CASE WHEN checkin_count >= 7 THEN 1 ELSE 0 END) as retained_7d,
  SUM(CASE WHEN checkin_count >= 30 THEN 1 ELSE 0 END) as retained_30d
FROM astrology_profiles
GROUP BY cohort_week;
