-- The Realm of Patterns - D1 Database Schema
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/schema.sql

-- ============================================
-- Historical Figures Table
-- ============================================
CREATE TABLE IF NOT EXISTS historical_figures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    era TEXT,
    culture TEXT,
    domains TEXT, -- JSON array of domains
    vector TEXT NOT NULL, -- JSON array of 8 floats
    quote TEXT,
    bio TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster vector searches (we'll compute similarity in code)
CREATE INDEX IF NOT EXISTS idx_figures_culture ON historical_figures(culture);
CREATE INDEX IF NOT EXISTS idx_figures_era ON historical_figures(era);

-- ============================================
-- Orders Table (Stripe purchases)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, -- Stripe session ID
    email TEXT NOT NULL,
    email_hash TEXT NOT NULL, -- For privacy/lookup
    product_id TEXT NOT NULL,
    amount INTEGER NOT NULL, -- In cents
    status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
    birth_data TEXT NOT NULL, -- JSON
    stripe_customer_id TEXT,
    stripe_payment_intent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_orders_email_hash ON orders(email_hash);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============================================
-- Reports Table (Generated PDFs)
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY, -- UUID
    order_id TEXT NOT NULL,
    email_hash TEXT NOT NULL,
    vector_8d TEXT NOT NULL, -- JSON array
    vector_16d TEXT NOT NULL, -- JSON array (includes shadow)
    historical_matches TEXT NOT NULL, -- JSON array of match objects
    art_url TEXT, -- R2 path to generated art
    pdf_url TEXT, -- R2 path to PDF
    expires_at DATETIME, -- Optional expiration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_email_hash ON reports(email_hash);
CREATE INDEX IF NOT EXISTS idx_reports_order ON reports(order_id);

-- ============================================
-- Ephemeris Cache (Planetary positions)
-- ============================================
CREATE TABLE IF NOT EXISTS ephemeris_cache (
    date TEXT PRIMARY KEY, -- YYYY-MM-DD format
    positions TEXT NOT NULL, -- JSON object with all planet positions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Rate Limits (backup to KV)
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
    ip_hash TEXT PRIMARY KEY,
    request_count INTEGER DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_request DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Daily Weather Cache
-- ============================================
CREATE TABLE IF NOT EXISTS cosmic_weather (
    date TEXT PRIMARY KEY, -- YYYY-MM-DD
    vector TEXT NOT NULL, -- JSON array of 8 floats
    dominant_index INTEGER NOT NULL,
    influences TEXT, -- JSON array of planetary influences
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
