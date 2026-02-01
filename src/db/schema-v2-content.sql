-- The Realm of Patterns - D1 Schema V2: Content System
-- Run: wrangler d1 execute therealmofpatterns-db --file=src/db/schema-v2-content.sql
-- Date: 2026-02-01

-- ============================================
-- Content Voices (Language Configurations)
-- ============================================
CREATE TABLE IF NOT EXISTS content_voices (
    language_code TEXT PRIMARY KEY, -- pt-br, pt-pt, es-mx, es-ar, es-es, en
    voice_name TEXT NOT NULL,
    tone TEXT,
    style TEXT,
    cultural_references TEXT, -- JSON array
    unique_concepts TEXT, -- JSON object
    example_phrases TEXT, -- JSON array
    seo_keywords TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Cosmic Content (Generated Pages)
-- ============================================
CREATE TABLE IF NOT EXISTS cosmic_content (
    id TEXT PRIMARY KEY, -- UUID
    language_code TEXT NOT NULL,
    content_type TEXT NOT NULL, -- daily_weather, dimension_guide, archetype_profile, etc.
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    meta_description TEXT,
    content_blocks TEXT NOT NULL, -- JSON array of content blocks
    schema_markup TEXT, -- JSON-LD for SEO
    related_topics TEXT, -- JSON array of internal links
    status TEXT DEFAULT 'draft', -- draft, review, published, archived
    published_at DATETIME,
    expires_at DATETIME,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language_code, content_type, slug)
);

CREATE INDEX IF NOT EXISTS idx_content_lang ON cosmic_content(language_code);
CREATE INDEX IF NOT EXISTS idx_content_type ON cosmic_content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_status ON cosmic_content(status);
CREATE INDEX IF NOT EXISTS idx_content_published ON cosmic_content(published_at);

-- ============================================
-- Jungian Archetypes
-- ============================================
CREATE TABLE IF NOT EXISTS jungian_archetypes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    dimension TEXT NOT NULL, -- P, E, μ, V, N, Δ, R, Φ
    shadow_name TEXT NOT NULL,
    description_en TEXT,
    description_pt TEXT,
    description_es TEXT,
    quotes TEXT, -- JSON array of Jung quotes
    embodying_figures TEXT, -- JSON array of figure IDs
    integration_practices TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Historical Eras
-- ============================================
CREATE TABLE IF NOT EXISTS historical_eras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    era_code TEXT NOT NULL UNIQUE, -- ancient, classical, islamic, renaissance, modern
    era_name_en TEXT NOT NULL,
    era_name_pt TEXT,
    era_name_es TEXT,
    start_year INTEGER,
    end_year INTEGER,
    description_en TEXT,
    description_pt TEXT,
    description_es TEXT,
    key_concepts TEXT, -- JSON array
    key_figures TEXT, -- JSON array of figure IDs
    cultural_centers TEXT, -- JSON array of locations
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Jungian Concepts (for content generation)
-- ============================================
CREATE TABLE IF NOT EXISTS jungian_concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concept_name TEXT NOT NULL UNIQUE,
    frc_mapping TEXT, -- How it maps to 16D
    description_en TEXT,
    description_pt TEXT,
    description_es TEXT,
    related_dimensions TEXT, -- JSON array of dimensions
    seo_keywords TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Email Subscribers (Lead Capture)
-- ============================================
CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY, -- UUID
    email TEXT NOT NULL,
    email_hash TEXT NOT NULL UNIQUE,
    language_code TEXT DEFAULT 'en',
    source TEXT, -- preview, quiz, newsletter, etc.
    preview_data TEXT, -- JSON of their 8D preview if they did one
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    unsubscribed_at DATETIME,
    tags TEXT, -- JSON array of tags
    nurture_stage INTEGER DEFAULT 0 -- 0-7 for email sequence
);

CREATE INDEX IF NOT EXISTS idx_subs_email_hash ON subscribers(email_hash);
CREATE INDEX IF NOT EXISTS idx_subs_language ON subscribers(language_code);
CREATE INDEX IF NOT EXISTS idx_subs_stage ON subscribers(nurture_stage);

-- ============================================
-- Content Publish Queue
-- ============================================
CREATE TABLE IF NOT EXISTS publish_queue (
    id TEXT PRIMARY KEY, -- UUID
    content_id TEXT,
    language_code TEXT NOT NULL,
    content_type TEXT NOT NULL,
    priority INTEGER DEFAULT 50, -- 0-100, higher = more urgent
    status TEXT DEFAULT 'queued', -- queued, processing, completed, failed
    destination TEXT, -- cloudflare_kv, cloudflare_r2, filesystem
    result TEXT, -- JSON with publish result
    attempts INTEGER DEFAULT 0,
    last_attempt DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (content_id) REFERENCES cosmic_content(id)
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON publish_queue(priority DESC);

-- ============================================
-- Daily Weather (Extended with multi-language)
-- ============================================
-- Note: cosmic_weather table already exists, adding language-specific content
CREATE TABLE IF NOT EXISTS cosmic_weather_content (
    id TEXT PRIMARY KEY, -- date + language_code
    date TEXT NOT NULL,
    language_code TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    detailed_content TEXT, -- JSON content blocks
    vedic_insights TEXT,
    western_insights TEXT,
    practical_guidance TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, language_code)
);

CREATE INDEX IF NOT EXISTS idx_weather_content_date ON cosmic_weather_content(date);

-- ============================================
-- Content Analytics
-- ============================================
CREATE TABLE IF NOT EXISTS content_analytics (
    id TEXT PRIMARY KEY, -- UUID
    content_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- view, scroll_depth, time_on_page, cta_click
    event_data TEXT, -- JSON
    visitor_hash TEXT, -- Hashed IP for unique visitors
    referrer TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES cosmic_content(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_content ON content_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON content_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON content_analytics(created_at);

-- ============================================
-- Seed Data: Voice Configurations
-- ============================================
INSERT OR REPLACE INTO content_voices (language_code, voice_name, tone, style, cultural_references, unique_concepts) VALUES
('en', 'Pattern Guide', 'accessible, wise, integrative', 'clear, poetic but grounded, universal',
 '["Carl Jung", "Joseph Campbell", "sacred geometry", "modern psychology"]',
 '{"individuation": "Elder Attractor journey", "shadow": "suppressed dimensions", "self": "balanced 16D vector"}'),

('pt-br', 'Luz', 'warm, spiritual, connected', 'poetic, intuitive, heart-centered',
 '["Candomblé", "Umbanda", "Kardec spiritism", "Carnival transformation"]',
 '{"orixa": "dimensional archetype", "axe": "resonance units", "caminho": "Elder Attractor path"}'),

('pt-pt', 'Sophia', 'classical, refined, scholarly', 'elegant, precise, contemplative',
 '["Fado", "saudade", "maritime exploration", "Moorish astronomy"]',
 '{"saudade": "dimensional longing", "descobrimentos": "exploration archetype"}'),

('es-mx', 'Citlali', 'mystical, grounded, ancestral', 'warm, storytelling, wisdom-keeper',
 '["Mayan calendar", "Aztec cosmology", "Day of Dead", "Curanderismo"]',
 '{"nahual": "shadow self", "tonalli": "vital force", "quinto_sol": "cosmic age"}'),

('es-ar', 'Valentina', 'intellectual, passionate, analytical', 'sophisticated, conversational, philosophical',
 '["Psychoanalysis culture", "Lacan", "Jung", "Tango intensity", "Southern Cross"]',
 '{"inconsciente": "collective field", "sombra": "shadow work", "individuacion": "Elder path"}'),

('es-es', 'Isabel', 'classical, cultured, Mediterranean', 'formal, literary, historically grounded',
 '["Al-Andalus astronomy", "Toledo translation school", "Flamenco duende", "Teresa of Ávila"]',
 '{"duende": "resonance spirit", "mezquita": "cosmic architecture", "convivencia": "integration"}');

-- ============================================
-- Seed Data: Jungian Archetypes
-- ============================================
INSERT OR REPLACE INTO jungian_archetypes (name, dimension, shadow_name, description_en, quotes) VALUES
('The Hero', 'P', 'The Tyrant', 'Pure will and identity. The drive to become, to assert oneself in the world.',
 '["The privilege of a lifetime is to become who you truly are.", "Where there is a will, there is a way."]'),

('The Ruler', 'E', 'The Dictator', 'Structure and form. The capacity to create order from chaos.',
 '["Order is the first law of heaven.", "Without structure, there is no freedom."]'),

('The Sage', 'μ', 'The Trickster', 'Mind and understanding. The quest for truth through knowledge.',
 '["The meeting of two personalities is like the contact of two chemical substances.", "Thinking is difficult, thats why most people judge."]'),

('The Lover', 'V', 'The Addict', 'Beauty and harmony. The appreciation of value and connection.',
 '["Where love rules, there is no will to power; where power predominates, love is lacking."]'),

('The Explorer', 'N', 'The Escapist', 'Growth and expansion. The drive to discover and transcend limits.',
 '["We cannot change anything unless we accept it.", "Life really does begin at forty."]'),

('The Warrior', 'Δ', 'The Destroyer', 'Force and action. The capacity to assert and transform.',
 '["There is no coming to consciousness without pain.", "Knowing your own darkness is the best method for dealing with the darknesses of other people."]'),

('The Caregiver', 'R', 'The Martyr', 'Connection and care. The capacity for relationship and nurturing.',
 '["The greatest tragedy of the family is the unlived lives of the parents.", "Children are educated by what the grown-up is and not by his talk."]'),

('The Self', 'Φ', 'The Persona', 'Unity and witness. The integrating center of the psyche.',
 '["Your vision will become clear only when you can look into your own heart.", "The Self is not only the centre, but also the whole circumference."]');

-- ============================================
-- Seed Data: Historical Eras
-- ============================================
INSERT OR REPLACE INTO historical_eras (era_code, era_name_en, era_name_pt, era_name_es, start_year, end_year, key_concepts) VALUES
('ancient', 'Ancient Origins', 'Origens Antigas', 'Orígenes Antiguos', -3000, -500,
 '["Mesopotamian star catalogs", "Egyptian decans", "Babylonian omens", "Vedic Jyotish origins"]'),

('classical', 'Classical Period', 'Período Clássico', 'Período Clásico', -500, 500,
 '["Greek philosophical astrology", "Ptolemy Tetrabiblos", "Hellenistic techniques", "Roman imperial astrology"]'),

('islamic', 'Islamic Golden Age', 'Era de Ouro Islâmica', 'Edad de Oro Islámica', 700, 1200,
 '["Al-Khwarizmi tables", "Arabic translation movement", "House systems", "Algebra meets astrology"]'),

('renaissance', 'Renaissance Revival', 'Renascimento', 'Renacimiento', 1400, 1700,
 '["Ficino astrological magic", "John Dee mysticism", "Kepler celestial physics", "Nostradamus predictions"]'),

('modern', 'Modern Rebirth', 'Renascimento Moderno', 'Renacimiento Moderno', 1900, 2026,
 '["Jung astrological research", "Dane Rudhyar humanistic astrology", "Psychological astrology", "16D FRC synthesis"]');

-- ============================================
-- Seed Data: Jungian Concepts
-- ============================================
INSERT OR REPLACE INTO jungian_concepts (concept_name, frc_mapping, description_en, related_dimensions) VALUES
('Ego', 'Inner Octave dominant dimension', 'The conscious identity, the center of awareness', '["P", "E", "μ"]'),
('Shadow', 'Suppressed/lowest dimensions', 'The unconscious aspects of personality we reject', '["all"]'),
('Anima', 'Inner-Outer octave feminine tension', 'The feminine aspect in men, bridge to the unconscious', '["V", "R", "Φ"]'),
('Animus', 'Inner-Outer octave masculine tension', 'The masculine aspect in women, bridge to action', '["P", "Δ", "N"]'),
('Collective Unconscious', 'The Field dimension (Φ)', 'The shared psychic substrate of humanity', '["Φ"]'),
('Individuation', 'Elder Attractor progression', 'The process of becoming whole, integrating all aspects', '["all"]'),
('Persona', 'Over-expressed outer octave', 'The mask we present to the world', '["outer"]'),
('Self', 'Balanced 16D vector (κ > 0.85)', 'The archetype of wholeness and the regulating center', '["all"]'),
('Synchronicity', 'Vedic-Western temporal alignment', 'Meaningful coincidences, acausal connecting principle', '["Φ", "N"]'),
('Active Imagination', 'Dimensional dialogue technique', 'Conscious engagement with unconscious contents', '["μ", "Φ"]');

-- ============================================
-- Generation Statistics
-- ============================================
CREATE TABLE IF NOT EXISTS generation_stats (
    id TEXT PRIMARY KEY, -- UUID
    content_type TEXT NOT NULL,
    language_code TEXT NOT NULL,
    slug TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    generation_time_ms INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 0,
    publish_status TEXT DEFAULT 'pending', -- pending, published, failed
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_gen_stats_type ON generation_stats(content_type);
CREATE INDEX IF NOT EXISTS idx_gen_stats_status ON generation_stats(publish_status);
CREATE INDEX IF NOT EXISTS idx_gen_stats_date ON generation_stats(created_at);
