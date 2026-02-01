/**
 * The Realm of Patterns - Gemini Prompt Templates
 *
 * Structured prompts for generating cosmic content using Gemini 2.5 Flash.
 * Each prompt template accepts voice configuration and returns structured content.
 */

import type {
  VoiceConfig,
  MuDimensionKey,
  DailyWeatherContent,
  DimensionGuideContent,
  HistoricalFigureContent,
  JungianConceptContent,
  CompatibilityContent,
  MU_DIMENSIONS,
  DEFAULT_VOICE
} from './content-types'

// ============================================
// Voice Configuration Serializer
// ============================================
export function serializeVoice(voice: VoiceConfig): string {
  return `
## Writing Voice: ${voice.name}

**Personality:** ${voice.personality}

**Tone:** ${voice.tone.join(', ')}

**Avoid:** ${voice.avoid.join(', ')}

**Writing Style:**
- Sentence length: ${voice.writing_style.sentence_length}
- Paragraph structure: ${voice.writing_style.paragraph_structure}
- Use metaphors: ${voice.writing_style.use_metaphors ? 'Yes' : 'No'}
- Use questions: ${voice.writing_style.use_questions ? 'Yes' : 'No'}
- Formality: ${voice.writing_style.formality}

**Signature phrases to naturally incorporate:** ${voice.signature_phrases.join(' | ')}
`.trim()
}

// ============================================
// System Context
// ============================================
export const SYSTEM_CONTEXT = `
You are a content generator for "The Realm of Patterns," a platform that bridges ancient wisdom traditions with modern psychology through the FRC 16D framework.

## Core Concepts

### The 8 Mu Dimensions (Inner Octave)
The 8 Mu system maps planetary influences to eight fundamental dimensions of human experience:

1. **Phase (mu_1, P)** - Sun - Identity, Will, Direction - "Who am I becoming?"
2. **Existence (mu_2, E)** - Saturn - Structure, Stability, Form - "What grounds me?"
3. **Cognition (mu_3, mu)** - Mercury - Thought, Communication, Perception - "How do I understand?"
4. **Value (mu_4, V)** - Venus - Beauty, Worth, Harmony - "What do I treasure?"
5. **Expansion (mu_5, N)** - Jupiter - Growth, Meaning, Possibility - "Where am I growing?"
6. **Delta/Action (mu_6, Delta)** - Mars - Will, Drive, Transformation - "What am I doing?"
7. **Relation (mu_7, R)** - Moon - Connection, Emotion, Attunement - "Who do I love?"
8. **Field (mu_8, Phi)** - Neptune - Presence, Transcendence, Unity - "What witnesses?"

### The 16D Framework
The full 16D vector includes:
- Inner Octave (1-8): Personal/Natal configuration
- Outer Octave (9-16): Collective/Transit field
- Coupling (kappa): Resonance between inner and outer

### Key Principles
- We describe patterns, not predictions
- We empower self-understanding, not dependency
- We honor all wisdom traditions without appropriation
- We integrate psychology (Jung) with cosmology (astrology)
- We use "resonance" not "compatibility"
- We speak of "tendencies" not "destinies"

## Output Format
Always return valid JSON matching the requested schema. Be precise with structure.
`.trim()

// ============================================
// Daily Weather Prompt
// ============================================
export interface DailyWeatherPromptParams {
  date: string
  vector: number[]
  dominant: {
    dimension: MuDimensionKey
    symbol: string
    name: string
    value: number
  }
  planetary_positions: Record<string, number>
  language: string
  voice: VoiceConfig
}

export function buildDailyWeatherPrompt(params: DailyWeatherPromptParams): string {
  const { date, vector, dominant, planetary_positions, language, voice } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Daily Cosmic Weather

**Date:** ${date}
**Language:** ${language}

**Current 8 Mu Vector:** [${vector.map(v => v.toFixed(4)).join(', ')}]

**Dominant Dimension:** ${dominant.name} (${dominant.symbol}) at ${(dominant.value * 100).toFixed(1)}%

**Planetary Positions (degrees):**
${Object.entries(planetary_positions).map(([planet, deg]) => `- ${planet}: ${deg.toFixed(2)}deg`).join('\n')}

## Generate JSON matching this TypeScript interface:

\`\`\`typescript
interface DailyWeatherContent {
  date: string                    // ISO date
  vector: number[]                // Copy from input
  dominant: {
    dimension: string             // e.g., "phase"
    symbol: string                // e.g., "P"
    name: string                  // e.g., "Phase"
    value: number                 // 0-1
  }
  planetary_positions: Record<string, number>  // Copy from input
  theme: string                   // 2-4 word theme for the day
  overview: string                // 2-3 paragraph overview (150-200 words)
  dimension_highlights: {         // Top 3 dimensions
    dimension: string
    value: number
    guidance: string              // 1-2 sentences
  }[]
  morning_focus: string           // 2-3 sentences
  afternoon_energy: string        // 2-3 sentences
  evening_reflection: string      // 2-3 sentences
  daily_question: string          // One contemplative question
  practical_suggestions: string[] // 3-5 actionable items
  caution: string                 // What to watch for (1-2 sentences)
  affirmation: string             // Daily affirmation aligned with energy
}
\`\`\`

## Requirements:
1. Theme should capture the day's essence poetically but concisely
2. Overview should weave together the dominant dimension with supporting energies
3. Dimension highlights should include the top 3 active dimensions
4. Time-based guidance should flow naturally through the day's rhythm
5. Practical suggestions should be specific and actionable
6. Affirmation should feel empowering, not prescriptive
7. If language is not English, translate all content naturally (not literally)

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Dimension Guide Prompt
// ============================================
export interface DimensionGuidePromptParams {
  dimension: MuDimensionKey
  dimensionData: typeof MU_DIMENSIONS[MuDimensionKey]
  language: string
  voice: VoiceConfig
  wordCountTarget?: number
}

export function buildDimensionGuidePrompt(params: DimensionGuidePromptParams): string {
  const { dimension, dimensionData, language, voice, wordCountTarget = 2000 } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Dimension Guide Article

**Dimension:** ${dimension}
**Symbol:** ${dimensionData.symbol}
**Name:** ${dimensionData.name}
**Planet:** ${dimensionData.planet} (${dimensionData.planetSymbol})
**Domain:** ${dimensionData.domain}
**Core Question:** ${dimensionData.question}
**Element:** ${dimensionData.element}
**Keywords:** ${dimensionData.keywords.join(', ')}

**Language:** ${language}
**Target Word Count:** ~${wordCountTarget} words

## Generate JSON matching this TypeScript interface:

\`\`\`typescript
interface DimensionGuideContent {
  dimension: string              // Dimension key (e.g., "phase")
  title: string                  // SEO-friendly title
  subtitle: string               // Evocative subtitle
  overview: string               // 2-3 paragraphs introducing the dimension (300-400 words)
  mythology: string              // Cross-cultural mythological connections (200-300 words)
  psychology: string             // Jungian/depth psychology perspective (200-300 words)
  practical_expression: string   // How this manifests in daily life (200-300 words)
  shadow_aspects: string         // The shadow side and challenges (150-200 words)
  integration_path: string       // How to work with this dimension (200-300 words)
  related_figures: string[]      // 3-5 historical figures who embody this dimension
  related_concepts: string[]     // 3-5 related Jungian/philosophical concepts
  faqs: {
    question: string
    answer: string               // 2-3 sentences each
  }[]                            // 5-7 FAQs
  meditation: string             // A short guided meditation/contemplation (100-150 words)
}
\`\`\`

## Requirements:
1. Title should be search-friendly yet evocative (e.g., "Phase: The Sun's Path to Identity")
2. Mythology should reference at least 3 different cultural traditions
3. Psychology section must accurately represent Jungian concepts
4. Practical expression should include concrete examples
5. Shadow aspects should be handled with compassion, not fear
6. FAQs should address real questions someone exploring this dimension would have
7. Meditation should be simple enough to follow from text
8. If language is not English, translate all content naturally

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Historical Figure Profile Prompt
// ============================================
export interface HistoricalFigurePromptParams {
  name: string
  era: string
  tradition: string
  vector: number[]
  language: string
  voice: VoiceConfig
  knownFacts?: {
    birth_date?: string
    death_date?: string
    key_works?: string[]
    famous_quotes?: string[]
  }
}

export function buildHistoricalFigurePrompt(params: HistoricalFigurePromptParams): string {
  const { name, era, tradition, vector, language, voice, knownFacts } = params

  // Determine dominant dimensions
  const dimKeys: MuDimensionKey[] = ['phase', 'existence', 'cognition', 'value', 'expansion', 'action', 'relation', 'field']
  const sortedDims = dimKeys
    .map((dim, i) => ({ dim, value: vector[i] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map(d => d.dim)

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Historical Figure Profile

**Figure:** ${name}
**Era:** ${era}
**Tradition:** ${tradition}
**Estimated 8 Mu Vector:** [${vector.map(v => v.toFixed(2)).join(', ')}]
**Dominant Dimensions:** ${sortedDims.join(', ')}

${knownFacts ? `
**Known Facts:**
${knownFacts.birth_date ? `- Birth: ${knownFacts.birth_date}` : ''}
${knownFacts.death_date ? `- Death: ${knownFacts.death_date}` : ''}
${knownFacts.key_works ? `- Key Works: ${knownFacts.key_works.join(', ')}` : ''}
${knownFacts.famous_quotes ? `- Famous Quotes: ${knownFacts.famous_quotes.map(q => `"${q}"`).join('; ')}` : ''}
` : ''}

**Language:** ${language}

## Generate JSON matching this TypeScript interface:

\`\`\`typescript
interface HistoricalFigureContent {
  name: string
  era: string
  tradition: string
  birth_date?: string
  death_date?: string
  vector: number[]               // Copy from input
  dominant_dimensions: string[]  // Top 3 dimension keys
  biography: string              // 3-4 paragraphs (400-500 words)
  cosmic_significance: string    // How their vector manifested in their work (200-300 words)
  key_teachings: string[]        // 5-7 core teachings/contributions
  famous_quotes: {
    text: string
    context?: string             // Brief context for the quote
  }[]                            // 3-5 verified or well-attributed quotes
  legacy: string                 // Their lasting impact (150-200 words)
  resonance_with_others: {
    figure: string               // Another historical figure
    resonance: number            // 0-1 estimated resonance
    insight: string              // What their connection teaches us
  }[]                            // 2-3 connections
  lessons_for_today: string      // How their wisdom applies now (150-200 words)
}
\`\`\`

## Requirements:
1. Biography should be factually accurate and well-sourced
2. Cosmic significance should connect their 8 Mu vector to their life's work
3. Only use quotes that are verifiable or widely attributed
4. Resonance connections should be meaningful, not just famous pairings
5. Lessons for today should be practical and relevant
6. Maintain respect and avoid hagiography or excessive criticism
7. If language is not English, translate all content naturally

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Jungian Concept Explainer Prompt
// ============================================
export interface JungianConceptPromptParams {
  concept: string
  language: string
  voice: VoiceConfig
}

export function buildJungianConceptPrompt(params: JungianConceptPromptParams): string {
  const { concept, language, voice } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Jungian Concept Explainer

**Concept:** ${concept}
**Language:** ${language}

## Generate JSON matching this TypeScript interface:

\`\`\`typescript
interface JungianConceptContent {
  concept: string                // URL-safe slug
  title: string                  // Full title with concept name
  definition: string             // Clear 2-3 sentence definition
  jung_original: string          // Jung's original formulation (200-300 words)
  modern_understanding: string   // Contemporary interpretation (200-300 words)
  8mu_mapping: {
    primary_dimensions: string[] // Which dimensions relate most (1-3)
    explanation: string          // How this concept maps to 8 Mu (150-200 words)
  }
  examples: string[]             // 4-6 concrete examples from life, art, culture
  integration_practices: string[] // 3-5 ways to work with this concept
  related_concepts: string[]     // 4-6 related Jungian concepts
  faqs: {
    question: string
    answer: string
  }[]                            // 5-7 common questions
}
\`\`\`

## Key Jungian Concepts Reference:
- **Shadow**: Repressed aspects of personality
- **Anima/Animus**: Contrasexual aspects of psyche
- **Persona**: Social mask we present
- **Self**: Center of total psyche, goal of individuation
- **Individuation**: Process of becoming whole
- **Collective Unconscious**: Shared psychic inheritance
- **Archetypes**: Universal patterns (Hero, Mother, Wise Old Man, etc.)
- **Complex**: Emotionally charged clusters
- **Projection**: Seeing inner contents in outer world
- **Synchronicity**: Meaningful coincidences
- **Active Imagination**: Dialogue with unconscious
- **Dreams**: Messages from the unconscious

## Requirements:
1. Jung's original formulation must be accurate to his writings
2. Modern understanding should include post-Jungian developments
3. 8 Mu mapping should be insightful and defensible
4. Examples should span personal life, art, literature, and culture
5. Integration practices should be safe and accessible
6. FAQs should address common misconceptions
7. If language is not English, translate all content naturally

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Compatibility Guide Prompt
// ============================================
export interface CompatibilityPromptParams {
  dimension1: MuDimensionKey
  dimension2: MuDimensionKey
  dim1Data: typeof MU_DIMENSIONS[MuDimensionKey]
  dim2Data: typeof MU_DIMENSIONS[MuDimensionKey]
  language: string
  voice: VoiceConfig
}

export function buildCompatibilityPrompt(params: CompatibilityPromptParams): string {
  const { dimension1, dimension2, dim1Data, dim2Data, language, voice } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Compatibility Guide

**Dimension 1:** ${dimension1}
- Symbol: ${dim1Data.symbol}
- Name: ${dim1Data.name}
- Planet: ${dim1Data.planet}
- Domain: ${dim1Data.domain}

**Dimension 2:** ${dimension2}
- Symbol: ${dim2Data.symbol}
- Name: ${dim2Data.name}
- Planet: ${dim2Data.planet}
- Domain: ${dim2Data.domain}

**Language:** ${language}

## Generate JSON matching this TypeScript interface:

\`\`\`typescript
interface CompatibilityContent {
  type: string                   // URL-safe slug (e.g., "phase-value")
  dimension_pair: [string, string] // The two dimension keys
  title: string                  // SEO-friendly title
  overview: string               // 2-3 paragraphs on the dynamic (300-400 words)
  strengths: string[]            // 5-7 strengths of this pairing
  challenges: string[]           // 4-6 challenges to navigate
  growth_edges: string[]         // 3-5 opportunities for mutual growth
  famous_examples: {
    pair: string                 // "Einstein & Mileva" or "Rumi & Shams"
    insight: string              // What their dynamic teaches (2-3 sentences)
  }[]                            // 2-3 real or historical examples
  advice: string                 // Core guidance for this pairing (150-200 words)
  communication_tips: string[]   // 5-7 specific communication strategies
}
\`\`\`

## Requirements:
1. This is about dimension resonance, not sun sign compatibility
2. Focus on how someone strong in Dim1 relates to someone strong in Dim2
3. Strengths should be genuine, not forced positivity
4. Challenges should be honest but constructive
5. Famous examples should be well-known and illustrative
6. Communication tips should be specific and actionable
7. Use "resonance" language, not "compatibility"
8. If language is not English, translate all content naturally

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Weekly Forecast Prompt
// ============================================
export interface WeeklyForecastPromptParams {
  weekStart: string
  weekEnd: string
  dailyVectors: { date: string; vector: number[]; dominant: MuDimensionKey }[]
  majorTransits: { planet: string; event: string; date: string }[]
  language: string
  voice: VoiceConfig
}

export function buildWeeklyForecastPrompt(params: WeeklyForecastPromptParams): string {
  const { weekStart, weekEnd, dailyVectors, majorTransits, language, voice } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Weekly Forecast

**Week:** ${weekStart} to ${weekEnd}
**Language:** ${language}

**Daily Vectors:**
${dailyVectors.map(d => `- ${d.date}: Dominant ${d.dominant} [${d.vector.slice(0, 4).map(v => v.toFixed(2)).join(', ')}...]`).join('\n')}

**Major Transits This Week:**
${majorTransits.map(t => `- ${t.date}: ${t.planet} ${t.event}`).join('\n')}

## Generate JSON matching this structure:

\`\`\`typescript
interface WeeklyForecastContent {
  week_start: string
  week_end: string
  theme: string                  // 3-5 word theme
  overview: string               // 3-4 paragraphs (400-500 words)
  dominant_dimensions: string[]  // Top 3 dimensions for the week
  daily_snapshots: {
    date: string
    theme: string                // 2-3 words
    focus: string                // 1-2 sentences
  }[]
  key_transits: {
    date: string
    event: string
    meaning: string              // 2-3 sentences
  }[]
  opportunities: string[]        // 4-6 opportunities this week
  challenges: string[]           // 3-5 challenges to navigate
  focus_areas: {
    career: string               // 2-3 sentences
    relationships: string        // 2-3 sentences
    personal_growth: string      // 2-3 sentences
    health: string               // 2-3 sentences
  }
  weekly_intention: string       // Suggested intention for the week
  closing_reflection: string     // Poetic closing (2-3 sentences)
}
\`\`\`

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Vedic Dasha Guide Prompt
// ============================================
export interface VedicDashaPromptParams {
  planet: string
  language: string
  voice: VoiceConfig
}

export function buildVedicDashaPrompt(params: VedicDashaPromptParams): string {
  const { planet, language, voice } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Vedic Dasha Guide

**Planetary Period:** ${planet} Mahadasha
**Language:** ${language}

## Generate JSON matching this structure:

\`\`\`typescript
interface VedicDashaContent {
  planet: string
  sanskrit_name: string          // Original Sanskrit name
  duration: string               // Standard duration (e.g., "19 years")
  title: string                  // SEO-friendly title
  overview: string               // 3-4 paragraphs (400-500 words)
  8mu_alignment: {
    primary_dimension: string    // Which mu dimension aligns
    explanation: string          // How this dasha relates to 8 Mu (150-200 words)
  }
  themes: string[]               // 6-8 major themes
  opportunities: string[]        // 5-7 opportunities
  challenges: string[]           // 4-6 challenges
  remedies: {
    mantras: string[]            // 2-3 traditional mantras
    gemstones: string[]          // Associated gemstones
    practices: string[]          // 3-5 spiritual practices
    lifestyle: string[]          // 3-5 lifestyle suggestions
  }
  sub_periods: {
    planet: string
    duration: string
    theme: string                // 1-2 sentences
  }[]                            // Major sub-periods (antardashas)
  famous_examples: string[]      // 3-5 people who thrived/struggled in this dasha
  faqs: {
    question: string
    answer: string
  }[]                            // 5-7 FAQs
}
\`\`\`

## Requirements:
1. Respect Vedic tradition while making it accessible
2. Connect to 8 Mu framework naturally
3. Remedies should be traditional but adaptable
4. Avoid fear-based language about challenging dashas
5. If language is not English, translate all content naturally

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Transit Guide Prompt
// ============================================
export interface TransitGuidePromptParams {
  planet: string
  language: string
  voice: VoiceConfig
}

export function buildTransitGuidePrompt(params: TransitGuidePromptParams): string {
  const { planet, language, voice } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Transit Guide

**Planet:** ${planet}
**Language:** ${language}

## Generate JSON matching this structure:

\`\`\`typescript
interface TransitGuideContent {
  planet: string
  symbol: string                 // Astrological symbol
  title: string                  // SEO-friendly title
  overview: string               // 3-4 paragraphs on this planet's transits (400-500 words)
  8mu_dimension: string          // Primary associated dimension
  orbit_period: string           // How long to transit zodiac
  sign_duration: string          // Average time in each sign
  transit_themes: string[]       // 6-8 common themes when this planet transits
  house_meanings: {
    house: number
    theme: string                // 2-3 sentences
  }[]                            // All 12 houses
  aspects: {
    type: string                 // Conjunction, square, trine, etc.
    effect: string               // 2-3 sentences
  }[]                            // Major aspect meanings
  retrograde: {
    frequency: string
    duration: string
    themes: string[]             // 4-6 retrograde themes
    guidance: string             // 150-200 words
  }
  working_with: string[]         // 5-7 ways to work with this transit
  faqs: {
    question: string
    answer: string
  }[]                            // 5-7 FAQs
}
\`\`\`

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Blog Post Prompt
// ============================================
export interface BlogPostPromptParams {
  topic: string
  keywords: string[]
  language: string
  voice: VoiceConfig
  wordCountTarget?: number
}

export function buildBlogPostPrompt(params: BlogPostPromptParams): string {
  const { topic, keywords, language, voice, wordCountTarget = 1500 } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Blog Post

**Topic:** ${topic}
**Keywords:** ${keywords.join(', ')}
**Language:** ${language}
**Target Word Count:** ~${wordCountTarget} words

## Generate JSON matching this structure:

\`\`\`typescript
interface BlogPostContent {
  slug: string                   // URL-safe slug
  title: string                  // SEO-optimized title
  meta_description: string       // 150-160 characters
  excerpt: string                // 2-3 sentence excerpt for previews
  content: string                // Full markdown content
  headings: string[]             // H2 headings used (for TOC)
  related_dimensions: string[]   // Which 8 Mu dimensions relate
  tags: string[]                 // 5-8 tags
  faqs: {
    question: string
    answer: string
  }[]                            // 3-5 FAQs for schema markup
  cta: {
    text: string
    description: string
  }                              // Call to action
}
\`\`\`

## Requirements:
1. Content should be in markdown format with proper headings
2. Include at least 3 H2 sections
3. Naturally incorporate keywords without stuffing
4. Connect topic to 8 Mu framework where relevant
5. Include actionable insights
6. End with clear call to action
7. If language is not English, translate all content naturally

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Historical Era Prompt
// ============================================
export interface HistoricalEraPromptParams {
  era: string
  timespan: string
  language: string
  voice: VoiceConfig
}

export function buildHistoricalEraPrompt(params: HistoricalEraPromptParams): string {
  const { era, timespan, language, voice } = params

  return `
${SYSTEM_CONTEXT}

${serializeVoice(voice)}

## Task: Generate Historical Era Profile

**Era:** ${era}
**Timespan:** ${timespan}
**Language:** ${language}

## Generate JSON matching this structure:

\`\`\`typescript
interface HistoricalEraContent {
  era: string
  slug: string
  timespan: string
  title: string
  overview: string               // 3-4 paragraphs (400-500 words)
  collective_vector: number[]    // Estimated 8 Mu vector for the era
  dominant_dimensions: string[]  // Top 3 dimensions
  cosmic_signature: string       // 200-300 words on the era's cosmic character
  key_figures: {
    name: string
    contribution: string         // 1-2 sentences
  }[]                            // 5-8 key figures
  major_developments: string[]   // 6-10 major developments
  cultural_expressions: string[] // 5-7 how the vector expressed culturally
  shadow_aspects: string         // 150-200 words on the era's shadow
  lessons_for_today: string      // 200-300 words
  related_eras: string[]         // 2-3 related eras
  faqs: {
    question: string
    answer: string
  }[]                            // 4-6 FAQs
}
\`\`\`

Return ONLY valid JSON, no markdown code blocks or explanations.
`.trim()
}

// ============================================
// Prompt Registry
// ============================================
export type PromptBuilder =
  | typeof buildDailyWeatherPrompt
  | typeof buildDimensionGuidePrompt
  | typeof buildHistoricalFigurePrompt
  | typeof buildJungianConceptPrompt
  | typeof buildCompatibilityPrompt
  | typeof buildWeeklyForecastPrompt
  | typeof buildVedicDashaPrompt
  | typeof buildTransitGuidePrompt
  | typeof buildBlogPostPrompt
  | typeof buildHistoricalEraPrompt

export const PROMPT_REGISTRY = {
  daily_weather: buildDailyWeatherPrompt,
  weekly_forecast: buildWeeklyForecastPrompt,
  dimension_guide: buildDimensionGuidePrompt,
  archetype_profile: buildHistoricalFigurePrompt, // Alias
  historical_figure: buildHistoricalFigurePrompt,
  historical_era: buildHistoricalEraPrompt,
  jungian_concept: buildJungianConceptPrompt,
  vedic_dasha: buildVedicDashaPrompt,
  transit_guide: buildTransitGuidePrompt,
  compatibility_type: buildCompatibilityPrompt,
  blog_post: buildBlogPostPrompt,
} as const
