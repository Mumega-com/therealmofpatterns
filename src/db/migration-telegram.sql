-- The Realm of Patterns - Telegram Native Business Layer
-- Adds Telegram user bridge, bot state, referrals, and Telegram payments/events.

-- ============================================
-- Telegram Users
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_users (
    telegram_user_id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,

    -- Runtime state
    bot_state TEXT DEFAULT 'new', -- new, awaiting_birth_date, awaiting_birth_time, awaiting_birth_place, free_user, paid_user, awaiting_checkin_state, awaiting_checkin_area, awaiting_checkin_note
    bot_state_data TEXT, -- JSON bag for in-progress values

    -- Identity bridge
    user_hash TEXT, -- optional link to privacy-first user_vault
    email_hash TEXT, -- optional link to user_profiles/orders world

    -- Natal intake cache (Telegram-first)
    birth_date TEXT, -- YYYY-MM-DD
    birth_time TEXT, -- HH:MM or null
    birth_time_unknown INTEGER DEFAULT 0,
    birth_location_name TEXT,
    birth_latitude REAL,
    birth_longitude REAL,
    birth_timezone_offset REAL,

    -- Product state
    free_reading_used INTEGER DEFAULT 0,
    subscription_status TEXT DEFAULT 'free', -- free, premium, founder
    entitlement_source TEXT, -- telegram, stripe, manual

    -- Engagement
    streak_current INTEGER DEFAULT 0,
    streak_longest INTEGER DEFAULT 0,
    checkin_count INTEGER DEFAULT 0,
    last_checkin_at TEXT,
    last_interaction_at TEXT,

    -- Growth
    referral_code TEXT UNIQUE,
    referred_by_telegram_user_id TEXT,
    invite_count INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_hash) REFERENCES user_vault(user_hash),
    FOREIGN KEY (email_hash) REFERENCES user_profiles(email_hash),
    FOREIGN KEY (referred_by_telegram_user_id) REFERENCES telegram_users(telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id ON telegram_users(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_username ON telegram_users(username);
CREATE INDEX IF NOT EXISTS idx_telegram_users_state ON telegram_users(bot_state);
CREATE INDEX IF NOT EXISTS idx_telegram_users_referral_code ON telegram_users(referral_code);
CREATE INDEX IF NOT EXISTS idx_telegram_users_subscription_status ON telegram_users(subscription_status);

-- ============================================
-- Telegram Check-ins
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_checkins (
    id TEXT PRIMARY KEY,
    telegram_user_id TEXT NOT NULL,
    checkin_date TEXT NOT NULL,
    state_label TEXT, -- clear, heavy, restless, open
    area_label TEXT, -- mind, heart, body, relationships
    note_text TEXT,
    response_text TEXT,

    -- Derived metrics
    sky_signature TEXT,
    natal_signature TEXT,
    dominant_dimension TEXT,
    kappa REAL,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (telegram_user_id) REFERENCES telegram_users(telegram_user_id) ON DELETE CASCADE,
    UNIQUE(telegram_user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_telegram_checkins_user ON telegram_checkins(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_checkins_date ON telegram_checkins(checkin_date);

-- ============================================
-- Telegram Referrals
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_referrals (
    id TEXT PRIMARY KEY,
    referrer_telegram_user_id TEXT NOT NULL,
    referred_telegram_user_id TEXT NOT NULL,
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'started', -- started, completed_onboarding, converted_paid, rewarded
    reward_type TEXT,
    reward_value TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (referrer_telegram_user_id) REFERENCES telegram_users(telegram_user_id) ON DELETE CASCADE,
    FOREIGN KEY (referred_telegram_user_id) REFERENCES telegram_users(telegram_user_id) ON DELETE CASCADE,
    UNIQUE(referrer_telegram_user_id, referred_telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_referrals_referrer ON telegram_referrals(referrer_telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_referrals_referred ON telegram_referrals(referred_telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_referrals_status ON telegram_referrals(status);

-- ============================================
-- Telegram Payments / Entitlements
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_payments (
    id TEXT PRIMARY KEY,
    telegram_user_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'telegram', -- telegram, stripe
    payment_type TEXT NOT NULL, -- single_reading, pro_monthly, founder, compare_credit
    provider_payment_id TEXT,
    currency TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
    entitlement_granted TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (telegram_user_id) REFERENCES telegram_users(telegram_user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_payments_user ON telegram_payments(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_payments_status ON telegram_payments(status);
CREATE INDEX IF NOT EXISTS idx_telegram_payments_type ON telegram_payments(payment_type);

-- ============================================
-- Telegram Event Log
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_events (
    id TEXT PRIMARY KEY,
    telegram_user_id TEXT,
    chat_id TEXT,
    update_type TEXT NOT NULL, -- message, callback_query, payment, join, etc.
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (telegram_user_id) REFERENCES telegram_users(telegram_user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_events_user ON telegram_events(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_events_type ON telegram_events(update_type);
CREATE INDEX IF NOT EXISTS idx_telegram_events_created ON telegram_events(created_at);
