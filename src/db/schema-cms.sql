-- The Realm of Patterns - D1 Schema: CMS Content Generation System
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/schema-cms.sql
-- Date: 2026-02-01
-- Purpose: Priority-based content queue, cosmic content storage, analytics, and generation metrics

-- ============================================
-- Content Queue (Priority-based generation)
-- ============================================
-- Manages the content generation pipeline with priority scoring
-- Status flow: pending -> processing -> completed/failed
CREATE TABLE IF NOT EXISTS content_queue (
    id TEXT PRIMARY KEY, -- UUID
    content_type TEXT NOT NULL, -- dimension_guide, archetype_profile, daily_weather, etc.
    language TEXT NOT NULL, -- en, pt-br, pt-pt, es-mx, es-ar, es-es
    params TEXT, -- JSON object with generation parameters
    priority_score INTEGER DEFAULT 50, -- 0-100, higher = more urgent
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    attempts INTEGER DEFAULT 0, -- Number of generation attempts
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME, -- When processing began
    completed_at DATETIME, -- When finished (success or failure)
    error_message TEXT -- Error details if failed
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
CREATE INDEX IF NOT EXISTS idx_content_queue_priority ON content_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_queue_language ON content_queue(language);
CREATE INDEX IF NOT EXISTS idx_content_queue_status_priority ON content_queue(status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_queue_content_type ON content_queue(content_type);

-- ============================================
-- Cosmic Content (All generated CMS pages)
-- ============================================
-- Stores all generated content with multilingual support and SEO metadata
CREATE TABLE IF NOT EXISTS cms_cosmic_content (
    id TEXT PRIMARY KEY, -- UUID
    slug TEXT NOT NULL, -- URL path segment (e.g., "dimension-p-will-power")
    canonical_slug TEXT NOT NULL, -- Base slug without language prefix
    content_type TEXT NOT NULL, -- dimension_guide, archetype_profile, historical_figure, etc.
    language TEXT NOT NULL, -- en, pt-br, pt-pt, es-mx, es-ar, es-es
    title TEXT NOT NULL,
    meta_description TEXT, -- SEO meta description (150-160 chars)
    hero_content TEXT, -- Hero section content/intro
    content_blocks TEXT NOT NULL, -- JSON array of content blocks [{type, content, ...}]
    faqs TEXT, -- JSON array of FAQ objects [{question, answer}]
    schema_markup TEXT, -- JSON-LD structured data for SEO
    hreflang_map TEXT, -- JSON object mapping language codes to URLs
    quality_score REAL DEFAULT 0.0, -- AI-assessed content quality 0.0-1.0
    word_count INTEGER DEFAULT 0,
    published INTEGER DEFAULT 0, -- Boolean: 0=draft, 1=published
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- Optional content expiration
    UNIQUE(slug, language) -- Unique slug per language
);

-- Indexes for efficient content retrieval
CREATE INDEX IF NOT EXISTS idx_cms_content_slug ON cms_cosmic_content(slug);
CREATE INDEX IF NOT EXISTS idx_cms_content_canonical_slug ON cms_cosmic_content(canonical_slug);
CREATE INDEX IF NOT EXISTS idx_cms_content_language ON cms_cosmic_content(language);
CREATE INDEX IF NOT EXISTS idx_cms_content_type ON cms_cosmic_content(content_type);
CREATE INDEX IF NOT EXISTS idx_cms_content_published ON cms_cosmic_content(published);
CREATE INDEX IF NOT EXISTS idx_cms_content_type_lang ON cms_cosmic_content(content_type, language);
CREATE INDEX IF NOT EXISTS idx_cms_content_published_lang ON cms_cosmic_content(published, language);
CREATE INDEX IF NOT EXISTS idx_cms_content_quality ON cms_cosmic_content(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_cms_content_updated ON cms_cosmic_content(updated_at DESC);

-- ============================================
-- Content Analytics (Page view tracking)
-- ============================================
-- Tracks page views and user interactions for analytics
CREATE TABLE IF NOT EXISTS cms_content_analytics (
    id TEXT PRIMARY KEY, -- UUID
    content_id TEXT NOT NULL, -- References cms_cosmic_content.id
    event_type TEXT NOT NULL, -- view, scroll_50, scroll_100, time_30s, cta_click
    language TEXT, -- Language of the viewer (may differ from content language)
    country TEXT, -- ISO country code from CF headers
    referrer TEXT, -- Referring URL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES cms_cosmic_content(id) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_cms_analytics_content ON cms_content_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_cms_analytics_created ON cms_content_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_cms_analytics_content_created ON cms_content_analytics(content_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cms_analytics_event ON cms_content_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_cms_analytics_country ON cms_content_analytics(country);
CREATE INDEX IF NOT EXISTS idx_cms_analytics_language ON cms_content_analytics(language);

-- ============================================
-- Generation Stats (Daily generation metrics)
-- ============================================
-- Tracks daily API usage and generation statistics per API key
CREATE TABLE IF NOT EXISTS generation_stats (
    id TEXT PRIMARY KEY, -- UUID or composite key
    date TEXT NOT NULL, -- YYYY-MM-DD format
    api_key_suffix TEXT NOT NULL, -- Last 8 chars of API key for identification
    tokens_used INTEGER DEFAULT 0, -- Total tokens consumed
    pages_generated INTEGER DEFAULT 0, -- Number of pages successfully generated
    errors INTEGER DEFAULT 0, -- Number of failed generations
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, api_key_suffix)
);

-- Indexes for stats queries
CREATE INDEX IF NOT EXISTS idx_gen_stats_date ON generation_stats(date);
CREATE INDEX IF NOT EXISTS idx_gen_stats_api_key ON generation_stats(api_key_suffix);
CREATE INDEX IF NOT EXISTS idx_gen_stats_date_key ON generation_stats(date, api_key_suffix);

-- ============================================
-- Views for common queries
-- ============================================

-- Pending queue items ordered by priority
CREATE VIEW IF NOT EXISTS pending_content_queue AS
SELECT *
FROM content_queue
WHERE status = 'pending'
ORDER BY priority_score DESC, created_at ASC;

-- Published content with view counts
CREATE VIEW IF NOT EXISTS published_content_stats AS
SELECT
    c.id,
    c.slug,
    c.canonical_slug,
    c.content_type,
    c.language,
    c.title,
    c.quality_score,
    c.word_count,
    c.published,
    c.created_at,
    c.updated_at,
    COUNT(a.id) as view_count
FROM cms_cosmic_content c
LEFT JOIN cms_content_analytics a ON c.id = a.content_id AND a.event_type = 'view'
WHERE c.published = 1
GROUP BY c.id
ORDER BY view_count DESC;

-- Daily generation summary
CREATE VIEW IF NOT EXISTS daily_generation_summary AS
SELECT
    date,
    SUM(tokens_used) as total_tokens,
    SUM(pages_generated) as total_pages,
    SUM(errors) as total_errors,
    COUNT(DISTINCT api_key_suffix) as api_keys_used
FROM generation_stats
GROUP BY date
ORDER BY date DESC;

-- Content by language summary
CREATE VIEW IF NOT EXISTS content_language_summary AS
SELECT
    language,
    content_type,
    COUNT(*) as total_count,
    SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END) as published_count,
    AVG(quality_score) as avg_quality,
    AVG(word_count) as avg_word_count
FROM cms_cosmic_content
GROUP BY language, content_type
ORDER BY language, content_type;

-- ============================================
-- Triggers for automatic timestamp updates
-- ============================================

-- Update updated_at on cms_cosmic_content changes
CREATE TRIGGER IF NOT EXISTS update_cms_content_timestamp
AFTER UPDATE ON cms_cosmic_content
FOR EACH ROW
BEGIN
    UPDATE cms_cosmic_content
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

-- ============================================
-- Sample data for testing (commented out)
-- ============================================
/*
-- Sample queue item
INSERT INTO content_queue (id, content_type, language, params, priority_score, status)
VALUES (
    'queue-001',
    'dimension_guide',
    'en',
    '{"dimension": "P", "depth": "comprehensive"}',
    80,
    'pending'
);

-- Sample content
INSERT INTO cms_cosmic_content (
    id, slug, canonical_slug, content_type, language, title, meta_description,
    hero_content, content_blocks, faqs, schema_markup, hreflang_map,
    quality_score, word_count, published
) VALUES (
    'content-001',
    'dimension-p-will-power',
    'dimension-p-will-power',
    'dimension_guide',
    'en',
    'Dimension P: Will & Pure Power',
    'Explore Dimension P in the 16D FRC framework - understand your will, identity, and personal power.',
    'Dimension P represents pure will and personal power...',
    '[{"type": "section", "title": "Understanding Dimension P", "content": "..."}]',
    '[{"question": "What is Dimension P?", "answer": "Dimension P represents..."}]',
    '{"@context": "https://schema.org", "@type": "Article"}',
    '{"en": "/dimension-p", "pt-br": "/pt-br/dimensao-p", "es": "/es/dimension-p"}',
    0.85,
    2500,
    1
);
*/
