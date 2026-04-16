-- The Realm of Patterns — Social Posts Storage
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/migration-social-posts.sql
-- Date: 2026-04-16
-- Purpose: Persist deterministic daily social content for history, publishing pipeline,
--          and GHL/Telegram distribution. Complements KV cache which is 24h only.

CREATE TABLE IF NOT EXISTS social_posts (
    id TEXT PRIMARY KEY,                    -- `${date}-${lang}`
    date TEXT NOT NULL,                     -- YYYY-MM-DD
    language TEXT NOT NULL DEFAULT 'en',    -- en, pt-br, pt-pt, es-mx, es-ar, es-es
    dimension TEXT NOT NULL,                -- Identity, Structure, Mind, Heart, Growth, Drive, Connection, Awareness
    planet TEXT NOT NULL,                   -- Sun, Moon, Mercury, etc.
    moon_phase TEXT NOT NULL,               -- New Moon, Waxing Crescent, etc.
    is_yang_day INTEGER NOT NULL,           -- 0 or 1
    cosmic_events TEXT,                     -- JSON array of {type, name, description, icon}
    caption_ig TEXT NOT NULL,               -- Instagram caption
    caption_x TEXT NOT NULL,                -- Twitter/X caption
    image_prompt TEXT NOT NULL,             -- DALL-E/Midjourney style prompt
    hashtags TEXT NOT NULL,                 -- JSON array of hashtag strings
    cta TEXT NOT NULL,                      -- Call-to-action line
    image_url TEXT,                         -- R2 URL after image generation (nullable)
    published_platforms TEXT,               -- JSON: { instagram: ts, twitter: ts, telegram: ts, facebook: ts }
    source TEXT DEFAULT 'content-loop',     -- content-loop, manual, admin
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_posts_date_lang ON social_posts(date, language);
CREATE INDEX IF NOT EXISTS idx_social_posts_date ON social_posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_dimension ON social_posts(dimension);
