-- The Realm of Patterns - Migration: Cron System Support
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/migration-cron-support.sql
-- Date: 2026-02-01
-- Purpose: Add columns needed for cron-based content generation and quality checks

-- ============================================
-- Add attempts column to content_queue
-- ============================================
-- Track retry attempts for failed generations
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-- ============================================
-- Add quality_checked_at to cosmic_content
-- ============================================
-- Track when content was last quality checked
ALTER TABLE cosmic_content ADD COLUMN IF NOT EXISTS quality_checked_at DATETIME;

-- ============================================
-- Add quality_score if not exists
-- ============================================
-- Some tables may not have quality_score yet
ALTER TABLE cosmic_content ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- ============================================
-- Add visitor_hash to content_analytics
-- ============================================
-- For unique visitor tracking
ALTER TABLE content_analytics ADD COLUMN IF NOT EXISTS visitor_hash TEXT;

-- ============================================
-- Create index for quality checks
-- ============================================
CREATE INDEX IF NOT EXISTS idx_content_quality_checked
ON cosmic_content(quality_checked_at);

CREATE INDEX IF NOT EXISTS idx_content_queue_attempts
ON content_queue(attempts);

-- ============================================
-- Update generation_stats to handle upserts
-- ============================================
-- Remove the UNIQUE constraint if it exists and recreate it properly
-- Note: SQLite doesn't support removing constraints, so we just ensure the index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_gen_stats_date_unique
ON generation_stats(date);
