-- The Realm of Patterns — Free Archetype Report Storage
-- Run: wrangler d1 execute therealmofpatterns-db --remote --file=src/db/migration-free-reports.sql
-- Date: 2026-04-16
-- Purpose: Store deterministic free archetype reports. Same birth data → same report_id → same permalink.
--          Feeds Phases 2 (landing), 4 (permalink), 5 (email), 6 (referral).

CREATE TABLE IF NOT EXISTS free_reports (
    id TEXT PRIMARY KEY,                    -- deterministic hash of canonical birth data (16 hex)
    birth_canonical TEXT NOT NULL,          -- canonical string used as hash input
    birth_date TEXT NOT NULL,               -- YYYY-MM-DD (denormalized for admin lookup)
    has_birth_time INTEGER NOT NULL DEFAULT 0,
    has_birth_location INTEGER NOT NULL DEFAULT 0,
    email TEXT,                             -- plain email (for delivery — small scale OK)
    email_hash TEXT,                        -- SHA-256 hash (for cross-table lookup)
    language TEXT NOT NULL DEFAULT 'en',

    -- Computed identity
    primary_archetype TEXT NOT NULL,        -- e.g. "The Hero"
    shadow_archetype TEXT NOT NULL,         -- e.g. "The People-Pleaser"
    dominant_dimension TEXT NOT NULL,       -- Identity, Structure, Mind, Heart, ...
    weakest_dimension TEXT NOT NULL,
    journey_stage TEXT NOT NULL,
    oracle_sentence TEXT,

    -- Full report payload (JSON blob — 16D vector, figure matches, prompts, chart)
    report_data TEXT NOT NULL,

    -- Growth loop (Phase 6)
    referral_code TEXT UNIQUE,              -- short public code (e.g. "hero-42ab")
    referrer_report_id TEXT,                -- the report that referred this one
    referral_count INTEGER NOT NULL DEFAULT 0,
    bonus_unlocked INTEGER NOT NULL DEFAULT 0,

    -- Observability
    view_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (referrer_report_id) REFERENCES free_reports(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_free_reports_email_hash ON free_reports(email_hash);
CREATE INDEX IF NOT EXISTS idx_free_reports_referral_code ON free_reports(referral_code);
CREATE INDEX IF NOT EXISTS idx_free_reports_referrer ON free_reports(referrer_report_id);
CREATE INDEX IF NOT EXISTS idx_free_reports_created ON free_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_free_reports_primary ON free_reports(primary_archetype);
