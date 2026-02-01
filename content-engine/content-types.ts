/**
 * The Realm of Patterns - Content Types
 *
 * Cosmic content generation system for programmatic SEO and educational content.
 * Based on the mumega-cms publisher pattern.
 */

// ============================================
// Page Types
// ============================================
export const COSMIC_PAGE_TYPES = [
  'daily_weather',      // /{lang}/cosmic-weather/{date}
  'weekly_forecast',    // /{lang}/forecast/{week}
  'dimension_guide',    // /{lang}/dimension/{dim}
  'archetype_profile',  // /{lang}/archetype/{name}
  'historical_figure',  // /{lang}/resonance/{figure}
  'historical_era',     // /{lang}/history/{era}
  'jungian_concept',    // /{lang}/jung/{concept}
  'vedic_dasha',        // /{lang}/dasha/{name}
  'transit_guide',      // /{lang}/transit/{planet}
  'compatibility_type', // /{lang}/compatibility/{type}
  'blog_post',          // /{lang}/blog/{slug}
] as const

export type CosmicPageType = (typeof COSMIC_PAGE_TYPES)[number]

// ============================================
// Content Block Types
// ============================================
export const COSMIC_CONTENT_BLOCK_TYPES = [
  'text',
  'heading',
  'list',
  'quote',
  'dimension_card',
  'mu_radar',
  'figure_card',
  'transit_table',
  'aspect_grid',
  'compatibility_matrix',
  'faq',
  'cta',
  'image',
  'sacred_geometry',
  'vector_visualization',
  'timeline',
  'poem',
] as const

export type CosmicContentBlockType = (typeof COSMIC_CONTENT_BLOCK_TYPES)[number]

// ============================================
// URL Pattern Definitions
// ============================================
export interface UrlPattern {
  type: CosmicPageType
  pattern: string
  params: string[]
  example: string
}

export const URL_PATTERNS: Record<CosmicPageType, UrlPattern> = {
  daily_weather: {
    type: 'daily_weather',
    pattern: '/{lang}/cosmic-weather/{date}',
    params: ['lang', 'date'],
    example: '/en/cosmic-weather/2025-01-15'
  },
  weekly_forecast: {
    type: 'weekly_forecast',
    pattern: '/{lang}/forecast/{week}',
    params: ['lang', 'week'],
    example: '/en/forecast/2025-w03'
  },
  dimension_guide: {
    type: 'dimension_guide',
    pattern: '/{lang}/dimension/{dim}',
    params: ['lang', 'dim'],
    example: '/en/dimension/phase'
  },
  archetype_profile: {
    type: 'archetype_profile',
    pattern: '/{lang}/archetype/{name}',
    params: ['lang', 'name'],
    example: '/en/archetype/the-seeker'
  },
  historical_figure: {
    type: 'historical_figure',
    pattern: '/{lang}/resonance/{figure}',
    params: ['lang', 'figure'],
    example: '/en/resonance/rumi'
  },
  historical_era: {
    type: 'historical_era',
    pattern: '/{lang}/history/{era}',
    params: ['lang', 'era'],
    example: '/en/history/renaissance'
  },
  jungian_concept: {
    type: 'jungian_concept',
    pattern: '/{lang}/jung/{concept}',
    params: ['lang', 'concept'],
    example: '/en/jung/shadow'
  },
  vedic_dasha: {
    type: 'vedic_dasha',
    pattern: '/{lang}/dasha/{name}',
    params: ['lang', 'name'],
    example: '/en/dasha/saturn'
  },
  transit_guide: {
    type: 'transit_guide',
    pattern: '/{lang}/transit/{planet}',
    params: ['lang', 'planet'],
    example: '/en/transit/jupiter'
  },
  compatibility_type: {
    type: 'compatibility_type',
    pattern: '/{lang}/compatibility/{type}',
    params: ['lang', 'type'],
    example: '/en/compatibility/phase-value'
  },
  blog_post: {
    type: 'blog_post',
    pattern: '/{lang}/blog/{slug}',
    params: ['lang', 'slug'],
    example: '/en/blog/understanding-your-8mu-vector'
  }
}

// ============================================
// 8 Mu Dimension Metadata
// ============================================
export const MU_DIMENSIONS = {
  phase: {
    index: 0,
    symbol: 'P',
    greek: 'mu_1',
    subscript: 'mu1',
    name: 'Phase',
    planet: 'Sun',
    planetSymbol: '\u2609',
    domain: 'Identity, Will, Direction',
    question: 'Who am I becoming?',
    element: 'Fire',
    color: '#FFD700',
    keywords: ['identity', 'will', 'self', 'purpose', 'direction']
  },
  existence: {
    index: 1,
    symbol: 'E',
    greek: 'mu_2',
    subscript: 'mu2',
    name: 'Existence',
    planet: 'Saturn',
    planetSymbol: '\u2644',
    domain: 'Structure, Stability, Form',
    question: 'What grounds me?',
    element: 'Earth',
    color: '#228B22',
    keywords: ['structure', 'stability', 'foundation', 'discipline', 'reality']
  },
  cognition: {
    index: 2,
    symbol: 'mu',
    greek: 'mu_3',
    subscript: 'mu3',
    name: 'Cognition',
    planet: 'Mercury',
    planetSymbol: '\u263F',
    domain: 'Thought, Communication, Perception',
    question: 'How do I understand?',
    element: 'Air',
    color: '#C0C0C0',
    keywords: ['thought', 'communication', 'learning', 'perception', 'analysis']
  },
  value: {
    index: 3,
    symbol: 'V',
    greek: 'mu_4',
    subscript: 'mu4',
    name: 'Value',
    planet: 'Venus',
    planetSymbol: '\u2640',
    domain: 'Beauty, Worth, Harmony',
    question: 'What do I treasure?',
    element: 'Water',
    color: '#FFB6C1',
    keywords: ['beauty', 'harmony', 'aesthetics', 'values', 'attraction']
  },
  expansion: {
    index: 4,
    symbol: 'N',
    greek: 'mu_5',
    subscript: 'mu5',
    name: 'Expansion',
    planet: 'Jupiter',
    planetSymbol: '\u2643',
    domain: 'Growth, Meaning, Possibility',
    question: 'Where am I growing?',
    element: 'Ether',
    color: '#9370DB',
    keywords: ['growth', 'expansion', 'optimism', 'meaning', 'wisdom']
  },
  action: {
    index: 5,
    symbol: 'Delta',
    greek: 'mu_6',
    subscript: 'mu6',
    name: 'Delta/Action',
    planet: 'Mars',
    planetSymbol: '\u2642',
    domain: 'Will, Drive, Transformation',
    question: 'What am I doing?',
    element: 'Fire',
    color: '#FF4500',
    keywords: ['action', 'drive', 'energy', 'courage', 'transformation']
  },
  relation: {
    index: 6,
    symbol: 'R',
    greek: 'mu_7',
    subscript: 'mu7',
    name: 'Relation',
    planet: 'Moon',
    planetSymbol: '\u263D',
    domain: 'Connection, Emotion, Attunement',
    question: 'Who do I love?',
    element: 'Water',
    color: '#FF69B4',
    keywords: ['connection', 'emotion', 'nurture', 'care', 'empathy']
  },
  field: {
    index: 7,
    symbol: 'Phi',
    greek: 'mu_8',
    subscript: 'mu8',
    name: 'Field',
    planet: 'Neptune',
    planetSymbol: '\u2646',
    domain: 'Presence, Transcendence, Unity',
    question: 'What witnesses?',
    element: 'Void',
    color: '#4B0082',
    keywords: ['transcendence', 'unity', 'witness', 'spirituality', 'presence']
  }
} as const

export type MuDimensionKey = keyof typeof MU_DIMENSIONS

// ============================================
// Voice Configuration
// ============================================
export interface VoiceConfig {
  name: string
  personality: string
  tone: string[]
  avoid: string[]
  signature_phrases: string[]
  writing_style: {
    sentence_length: 'short' | 'medium' | 'long' | 'varied'
    paragraph_structure: string
    use_metaphors: boolean
    use_questions: boolean
    formality: 'casual' | 'balanced' | 'formal' | 'scholarly'
  }
}

export const DEFAULT_VOICE: VoiceConfig = {
  name: 'River',
  personality: 'Wise yet approachable guide through cosmic patterns. Blends ancient wisdom with modern insight.',
  tone: [
    'warm',
    'insightful',
    'poetic without being flowery',
    'grounded mysticism',
    'invitational not prescriptive'
  ],
  avoid: [
    'new age cliches',
    'fortune-telling language',
    'deterministic predictions',
    'fear-based messaging',
    'cultural appropriation'
  ],
  signature_phrases: [
    'The field speaks...',
    'Notice where...',
    'The pattern reveals...',
    'Consider how...',
    'The witness awakens to...'
  ],
  writing_style: {
    sentence_length: 'varied',
    paragraph_structure: 'Start with hook, develop insight, land with actionable wisdom',
    use_metaphors: true,
    use_questions: true,
    formality: 'balanced'
  }
}

// ============================================
// Content Schemas
// ============================================
export interface ContentBlock {
  type: CosmicContentBlockType
  content: unknown
}

export interface TextBlock extends ContentBlock {
  type: 'text'
  content: string
}

export interface HeadingBlock extends ContentBlock {
  type: 'heading'
  content: {
    level: 1 | 2 | 3 | 4
    text: string
  }
}

export interface ListBlock extends ContentBlock {
  type: 'list'
  content: {
    style: 'bullet' | 'numbered' | 'icon'
    items: string[]
  }
}

export interface QuoteBlock extends ContentBlock {
  type: 'quote'
  content: {
    text: string
    attribution?: string
    source?: string
  }
}

export interface DimensionCardBlock extends ContentBlock {
  type: 'dimension_card'
  content: {
    dimension: MuDimensionKey
    value?: number
    description: string
    guidance?: string
  }
}

export interface MuRadarBlock extends ContentBlock {
  type: 'mu_radar'
  content: {
    vector: number[]
    labels: string[]
    title?: string
  }
}

export interface FigureCardBlock extends ContentBlock {
  type: 'figure_card'
  content: {
    name: string
    era: string
    tradition: string
    vector: number[]
    resonance?: number
    quote?: string
    description: string
  }
}

export interface FaqBlock extends ContentBlock {
  type: 'faq'
  content: {
    question: string
    answer: string
  }[]
}

export interface CtaBlock extends ContentBlock {
  type: 'cta'
  content: {
    headline: string
    description: string
    button_text: string
    button_url: string
    style: 'primary' | 'secondary' | 'minimal'
  }
}

export interface PoemBlock extends ContentBlock {
  type: 'poem'
  content: {
    lines: string[]
    title?: string
    attribution?: string
  }
}

// ============================================
// Page Records
// ============================================
export interface CosmicPageRecord {
  id: string
  type: CosmicPageType
  canonical_slug: string
  language: string
  title: string
  meta_description: string
  content_blocks: ContentBlock[]
  schema_markup?: Record<string, unknown>
  created_at: string
  updated_at: string
  generated_by: string
  generation_params?: Record<string, unknown>
}

// ============================================
// Daily Weather Content
// ============================================
export interface DailyWeatherContent {
  date: string
  vector: number[]
  dominant: {
    dimension: MuDimensionKey
    symbol: string
    name: string
    value: number
  }
  planetary_positions: Record<string, number>
  theme: string
  overview: string
  dimension_highlights: {
    dimension: MuDimensionKey
    value: number
    guidance: string
  }[]
  morning_focus: string
  afternoon_energy: string
  evening_reflection: string
  daily_question: string
  practical_suggestions: string[]
  caution: string
  affirmation: string
}

// ============================================
// Dimension Guide Content
// ============================================
export interface DimensionGuideContent {
  dimension: MuDimensionKey
  title: string
  subtitle: string
  overview: string
  mythology: string
  psychology: string
  practical_expression: string
  shadow_aspects: string
  integration_path: string
  related_figures: string[]
  related_concepts: string[]
  faqs: { question: string; answer: string }[]
  meditation: string
}

// ============================================
// Historical Figure Content
// ============================================
export interface HistoricalFigureContent {
  name: string
  era: string
  tradition: string
  birth_date?: string
  death_date?: string
  vector: number[]
  dominant_dimensions: MuDimensionKey[]
  biography: string
  cosmic_significance: string
  key_teachings: string[]
  famous_quotes: { text: string; context?: string }[]
  legacy: string
  resonance_with_others: { figure: string; resonance: number; insight: string }[]
  lessons_for_today: string
}

// ============================================
// Jungian Concept Content
// ============================================
export interface JungianConceptContent {
  concept: string
  title: string
  definition: string
  jung_original: string
  modern_understanding: string
  eightMuMapping: {
    primaryDimensions: MuDimensionKey[]
    explanation: string
  }
  examples: string[]
  integration_practices: string[]
  related_concepts: string[]
  faqs: { question: string; answer: string }[]
}

// ============================================
// Compatibility Content
// ============================================
export interface CompatibilityContent {
  type: string
  dimension_pair: [MuDimensionKey, MuDimensionKey]
  title: string
  overview: string
  strengths: string[]
  challenges: string[]
  growth_edges: string[]
  famous_examples: { pair: string; insight: string }[]
  advice: string
  communication_tips: string[]
}

// ============================================
// Site Configuration
// ============================================
export interface CosmicSiteConfig {
  baseUrl: string
  defaultLanguage: string
  supportedLanguages: string[]
  siteName: string
  url: {
    prefixDefaultLanguage: boolean
    trailingSlash: boolean
  }
  voice: VoiceConfig
}

export const DEFAULT_SITE_CONFIG: CosmicSiteConfig = {
  baseUrl: 'https://therealmofpatterns.com',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'fa', 'es', 'de', 'fr'],
  siteName: 'The Realm of Patterns',
  url: {
    prefixDefaultLanguage: false,
    trailingSlash: false
  },
  voice: DEFAULT_VOICE
}

// ============================================
// Generation Request/Response
// ============================================
export interface GenerationRequest {
  type: CosmicPageType
  language: string
  params: Record<string, string>
  voice?: Partial<VoiceConfig>
  options?: {
    include_faqs?: boolean
    include_related?: boolean
    word_count_target?: number
  }
}

export interface GenerationResponse {
  success: boolean
  page: CosmicPageRecord
  tokens_used?: number
  generation_time_ms?: number
  error?: string
}

// ============================================
// Path Utilities
// ============================================
export function buildCosmicPath(
  type: CosmicPageType,
  params: Record<string, string>,
  config: CosmicSiteConfig = DEFAULT_SITE_CONFIG
): string {
  const pattern = URL_PATTERNS[type]
  let path = pattern.pattern

  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`{${key}}`, encodeURIComponent(value))
  }

  // Handle language prefix
  const lang = params.lang || config.defaultLanguage
  const shouldPrefix = config.url.prefixDefaultLanguage || lang !== config.defaultLanguage

  if (!shouldPrefix && lang === config.defaultLanguage) {
    path = path.replace(`/${lang}`, '')
  }

  // Handle trailing slash
  if (config.url.trailingSlash && !path.endsWith('/')) {
    path = `${path}/`
  } else if (!config.url.trailingSlash && path.endsWith('/') && path !== '/') {
    path = path.slice(0, -1)
  }

  return path || '/'
}

export function parseCosmicPath(
  path: string,
  config: CosmicSiteConfig = DEFAULT_SITE_CONFIG
): { type: CosmicPageType; params: Record<string, string> } | null {
  // Normalize path
  let normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (config.url.trailingSlash) {
    normalizedPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`
  } else {
    normalizedPath = normalizedPath.endsWith('/') && normalizedPath !== '/'
      ? normalizedPath.slice(0, -1)
      : normalizedPath
  }

  // Try each pattern
  for (const [type, pattern] of Object.entries(URL_PATTERNS)) {
    const regexPattern = pattern.pattern
      .replace(/\{(\w+)\}/g, '(?<$1>[^/]+)')
      .replace(/\//g, '\\/')

    const regex = new RegExp(`^${regexPattern}$`)
    const match = normalizedPath.match(regex)

    if (match && match.groups) {
      return {
        type: type as CosmicPageType,
        params: match.groups as Record<string, string>
      }
    }
  }

  return null
}
