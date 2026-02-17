-- Migration: Add Stripe subscription columns to subscribers + circles table
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/migration-stripe.sql

-- Add subscription fields to existing subscribers table
ALTER TABLE subscribers ADD COLUMN plan TEXT DEFAULT 'free';
ALTER TABLE subscribers ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE subscribers ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE subscribers ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscribers ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_subs_stripe_customer ON subscribers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_plan ON subscribers(plan);

-- Circles (Team/Squad subscriptions)
CREATE TABLE IF NOT EXISTS circles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_email_hash TEXT NOT NULL,
    max_seats INTEGER DEFAULT 3,
    stripe_subscription_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_email_hash) REFERENCES subscribers(email_hash)
);

CREATE INDEX IF NOT EXISTS idx_circles_owner ON circles(owner_email_hash);

-- Circle members
CREATE TABLE IF NOT EXISTS circle_members (
    id TEXT PRIMARY KEY,
    circle_id TEXT NOT NULL,
    user_email_hash TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- owner, facilitator, member
    status TEXT DEFAULT 'invited', -- invited, active, removed
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (circle_id) REFERENCES circles(id),
    UNIQUE(circle_id, user_email_hash)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_email_hash);
