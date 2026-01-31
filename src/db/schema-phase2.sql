-- The Realm of Patterns - Phase 2 Schema Extensions
-- Full 16D Time-Series Storage
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/schema-phase2.sql

-- ============================================
-- UV Snapshots (Time-Series 16D Data)
-- ============================================
CREATE TABLE IF NOT EXISTS uv_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email_hash TEXT NOT NULL,
    timestamp TEXT NOT NULL, -- ISO 8601 format

    -- Inner Octave (Karma - 8D)
    inner_8d TEXT NOT NULL, -- JSON array [P, E, μ, V, N, Δ, R, Φ]

    -- Outer Octave (Dharma - 8D)
    outer_8d TEXT NOT NULL, -- JSON array [Pₜ, Eₜ, μₜ, Vₜ, Nₜ, Δₜ, Rₜ, Φₜ]

    -- Full 16D Vector
    u_16 TEXT NOT NULL, -- JSON array (inner + outer)

    -- Metrics
    kappa_bar REAL NOT NULL, -- Global coupling [-1, 1]
    kappa_dims TEXT, -- JSON array of per-dimension kappa values
    RU REAL NOT NULL, -- Resonance Units [0, 100+]
    W REAL NOT NULL, -- Witness magnitude
    C REAL NOT NULL, -- Coherence [0, 1]

    -- Diagnostics
    failure_mode TEXT NOT NULL, -- Collapse|Inversion|Dissociation|Dispersion|Healthy
    elder_progress REAL NOT NULL, -- Progress to Elder [0, 1]

    -- Dominant dimension
    dominant_index INTEGER NOT NULL,
    dominant_symbol TEXT NOT NULL,
    dominant_value REAL NOT NULL,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Composite unique constraint: one snapshot per user per day
    UNIQUE(user_email_hash, timestamp)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_snapshots_user_time ON uv_snapshots(user_email_hash, timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON uv_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_failure_mode ON uv_snapshots(failure_mode);

-- ============================================
-- User Profiles (For subscription tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    email_hash TEXT NOT NULL UNIQUE,

    -- Birth data
    birth_datetime TEXT NOT NULL, -- ISO 8601
    birth_latitude REAL NOT NULL,
    birth_longitude REAL NOT NULL,
    birth_timezone_offset REAL NOT NULL,
    birth_location_name TEXT, -- e.g., "Tehran, Iran"

    -- Natal chart (cached)
    natal_inner_8d TEXT NOT NULL, -- JSON array
    natal_longitudes TEXT NOT NULL, -- JSON array of 10 planet longitudes
    natal_signs TEXT NOT NULL, -- JSON array of 10 signs
    natal_houses TEXT NOT NULL, -- JSON array of 10 houses

    -- Subscription status
    subscription_status TEXT DEFAULT 'free', -- free, premium, living_vector
    subscription_tier TEXT, -- preview, premium, bundle, monthly
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_started_at DATETIME,
    subscription_ends_at DATETIME,

    -- Notification preferences
    email_notifications BOOLEAN DEFAULT 1,
    sms_notifications BOOLEAN DEFAULT 0,
    phone_number TEXT,

    -- Preferences
    timezone TEXT DEFAULT 'UTC',
    preferred_language TEXT DEFAULT 'en',

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_snapshot_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON user_profiles(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON user_profiles(subscription_status);

-- ============================================
-- Notification Queue (For daily updates)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email_hash TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- daily_update, threshold_alert, elder_milestone

    -- Content
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT, -- JSON metadata

    -- Delivery
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    scheduled_for DATETIME NOT NULL,
    sent_at DATETIME,
    error_message TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_email_hash) REFERENCES user_profiles(email_hash)
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification_queue(user_email_hash);

-- ============================================
-- Threshold Alerts (User-defined triggers)
-- ============================================
CREATE TABLE IF NOT EXISTS threshold_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email_hash TEXT NOT NULL,

    -- Alert conditions
    metric TEXT NOT NULL, -- kappa_bar, RU, W, elder_progress
    condition TEXT NOT NULL, -- gt, lt, gte, lte, eq
    threshold_value REAL NOT NULL,

    -- Alert settings
    enabled BOOLEAN DEFAULT 1,
    alert_message TEXT,
    last_triggered_at DATETIME,
    trigger_count INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_email_hash) REFERENCES user_profiles(email_hash)
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON threshold_alerts(user_email_hash);
CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON threshold_alerts(enabled);

-- ============================================
-- Daily Transit Cache (For efficiency)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_transits (
    date TEXT PRIMARY KEY, -- YYYY-MM-DD

    -- Transit longitudes
    transit_longitudes TEXT NOT NULL, -- JSON array of 10 planet longitudes

    -- Pre-computed outer octave (without Vedic component)
    outer_base TEXT NOT NULL, -- JSON array [Pₜ, Eₜ, μₜ, Vₜ, Nₜ, Δₜ, Rₜ, Φₜ]

    -- Metadata
    computed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Elder Milestone Achievements
-- ============================================
CREATE TABLE IF NOT EXISTS elder_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email_hash TEXT NOT NULL,

    -- Milestone details
    milestone_type TEXT NOT NULL, -- first_healthy, kappa_85, ru_45, w_25, elder_48h
    achieved_at DATETIME NOT NULL,

    -- Snapshot reference
    snapshot_id INTEGER,

    -- Metrics at achievement
    kappa_bar REAL,
    RU REAL,
    W REAL,
    elder_progress REAL,

    -- Notification sent
    notification_sent BOOLEAN DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_email_hash) REFERENCES user_profiles(email_hash),
    FOREIGN KEY (snapshot_id) REFERENCES uv_snapshots(id)
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON elder_milestones(user_email_hash);
CREATE INDEX IF NOT EXISTS idx_milestones_type ON elder_milestones(milestone_type);

-- ============================================
-- Analytics / Aggregations (For dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS user_analytics (
    user_email_hash TEXT PRIMARY KEY,

    -- Summary stats
    total_snapshots INTEGER DEFAULT 0,
    days_tracked INTEGER DEFAULT 0,

    -- Averages (last 30 days)
    avg_kappa_30d REAL,
    avg_ru_30d REAL,
    avg_w_30d REAL,
    avg_elder_progress_30d REAL,

    -- Peak values (all time)
    max_kappa REAL,
    max_kappa_date TEXT,
    max_ru REAL,
    max_ru_date TEXT,

    -- Failure mode distribution (counts)
    collapse_count INTEGER DEFAULT 0,
    inversion_count INTEGER DEFAULT 0,
    dissociation_count INTEGER DEFAULT 0,
    dispersion_count INTEGER DEFAULT 0,
    healthy_count INTEGER DEFAULT 0,

    -- Last updated
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_email_hash) REFERENCES user_profiles(email_hash)
);

-- ============================================
-- Triggers for automatic analytics updates
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_analytics_on_snapshot
AFTER INSERT ON uv_snapshots
BEGIN
    -- Update or insert analytics
    INSERT INTO user_analytics (user_email_hash, total_snapshots, days_tracked, updated_at)
    VALUES (NEW.user_email_hash, 1, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(user_email_hash) DO UPDATE SET
        total_snapshots = total_snapshots + 1,
        days_tracked = (
            SELECT COUNT(DISTINCT DATE(timestamp))
            FROM uv_snapshots
            WHERE user_email_hash = NEW.user_email_hash
        ),
        updated_at = CURRENT_TIMESTAMP;

    -- Update failure mode counts
    UPDATE user_analytics
    SET
        collapse_count = CASE WHEN NEW.failure_mode = 'Collapse' THEN collapse_count + 1 ELSE collapse_count END,
        inversion_count = CASE WHEN NEW.failure_mode = 'Inversion' THEN inversion_count + 1 ELSE inversion_count END,
        dissociation_count = CASE WHEN NEW.failure_mode = 'Dissociation' THEN dissociation_count + 1 ELSE dissociation_count END,
        dispersion_count = CASE WHEN NEW.failure_mode = 'Dispersion' THEN dispersion_count + 1 ELSE dispersion_count END,
        healthy_count = CASE WHEN NEW.failure_mode = 'Healthy' THEN healthy_count + 1 ELSE healthy_count END
    WHERE user_email_hash = NEW.user_email_hash;
END;

-- ============================================
-- Views for common queries
-- ============================================

-- Recent snapshots view (last 30 days)
CREATE VIEW IF NOT EXISTS recent_snapshots AS
SELECT *
FROM uv_snapshots
WHERE timestamp >= DATE('now', '-30 days')
ORDER BY timestamp DESC;

-- User dashboard summary
CREATE VIEW IF NOT EXISTS user_dashboard_summary AS
SELECT
    up.email_hash,
    up.subscription_status,
    ua.total_snapshots,
    ua.days_tracked,
    ua.avg_kappa_30d,
    ua.avg_ru_30d,
    ua.avg_elder_progress_30d,
    (
        SELECT failure_mode
        FROM uv_snapshots
        WHERE user_email_hash = up.email_hash
        ORDER BY timestamp DESC
        LIMIT 1
    ) as current_failure_mode,
    up.last_snapshot_at
FROM user_profiles up
LEFT JOIN user_analytics ua ON up.email_hash = ua.user_email_hash;
