/**
 * The Realm of Patterns - Content System Types
 *
 * Type definitions for the content generation and publishing pipeline.
 * These types align with the generator.py output and D1 schema.
 */

// ============================================
// Content Types (from generator.py)
// ============================================

export type ContentType =
  | 'daily_weather'
  | 'weekly_forecast'
  | 'dimension_guide'
  | 'archetype_profile'
  | 'historical_figure'
  | 'historical_era'
  | 'jungian_concept'
  | 'vedic_dasha'
  | 'transit_guide'
  | 'compatibility_type'
  | 'blog_post';

export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';

export type LanguageCode = 'en' | 'pt-br' | 'pt-pt' | 'es-mx' | 'es-ar' | 'es-es';

// ============================================
// Mu Dimension Types
// ============================================

export type MuDimension =
  | 'phase'
  | 'existence'
  | 'cognition'
  | 'value'
  | 'expansion'
  | 'action'
  | 'relation'
  | 'field';

export interface DimensionData {
  index: number;
  symbol: string;
  name: string;
  planet: string;
  planet_symbol: string;
  domain: string;
  question: string;
  element: string;
  color: string;
  keywords: string[];
}

// ============================================
// Content Block Types
// ============================================

export interface ContentBlockBase {
  type: string;
  order?: number;
}

export interface TextBlock extends ContentBlockBase {
  type: 'text';
  content: string;
}

export interface HeadingBlock extends ContentBlockBase {
  type: 'heading';
  level: 1 | 2 | 3 | 4;
  content: string;
  anchor?: string;
}

export interface ListBlock extends ContentBlockBase {
  type: 'list';
  style: 'bullet' | 'numbered';
  items: string[];
}

export interface QuoteBlock extends ContentBlockBase {
  type: 'quote';
  content: string;
  attribution?: string;
}

export interface DimensionHighlightBlock extends ContentBlockBase {
  type: 'dimension_highlight';
  dimension: MuDimension;
  value: number;
  guidance: string;
}

export interface FAQBlock extends ContentBlockBase {
  type: 'faq';
  items: FAQ[];
}

export interface ImageBlock extends ContentBlockBase {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
}

export type ContentBlock =
  | TextBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | DimensionHighlightBlock
  | FAQBlock
  | ImageBlock;

// ============================================
// FAQ Type
// ============================================

export interface FAQ {
  question: string;
  answer: string;
}

// ============================================
// Generator Output Types
// ============================================

export interface GeneratorMetadata {
  tokens_used: number;
  generation_time_ms: number;
  generated_at: string;
}

export interface DailyWeatherContent {
  date: string;
  vector: number[];
  dominant: {
    dimension: MuDimension;
    symbol: string;
    name: string;
    value: number;
  };
  planetary_positions: Record<string, number>;
  theme: string;
  overview: string;
  dimension_highlights: DimensionHighlightBlock[];
  morning_focus: string;
  afternoon_energy: string;
  evening_reflection: string;
  daily_question: string;
  practical_suggestions: string[];
  caution: string;
  affirmation: string;
}

export interface DimensionGuideContent {
  dimension: MuDimension;
  title: string;
  subtitle: string;
  overview: string;
  mythology: string;
  psychology: string;
  practical_expression: string;
  shadow_aspects: string;
  integration_path: string;
  related_figures: string[];
  related_concepts: string[];
  faqs: FAQ[];
  meditation: string;
}

export interface HistoricalFigureContent {
  name: string;
  era: string;
  tradition: string;
  birth_date?: string;
  death_date?: string;
  vector: number[];
  dominant_dimensions: MuDimension[];
  biography: string;
  cosmic_significance: string;
  key_teachings: string[];
  famous_quotes: Array<{
    text: string;
    context: string;
  }>;
  legacy: string;
  resonance_with_others: Array<{
    figure: string;
    resonance: number;
    insight: string;
  }>;
  lessons_for_today: string;
}

export interface JungianConceptContent {
  concept: string;
  title: string;
  definition: string;
  jung_original: string;
  modern_understanding: string;
  '8mu_mapping': {
    primary_dimensions: MuDimension[];
    explanation: string;
  };
  examples: string[];
  integration_practices: string[];
  related_concepts: string[];
  faqs: FAQ[];
}

export interface HistoricalEraContent {
  era: string;
  slug: string;
  timespan: string;
  title: string;
  overview: string;
  collective_vector: number[];
  dominant_dimensions: MuDimension[];
  cosmic_signature: string;
  key_figures: Array<{
    name: string;
    contribution: string;
  }>;
  major_developments: string[];
  cultural_expressions: string[];
  shadow_aspects: string;
  lessons_for_today: string;
  related_eras: string[];
  faqs: FAQ[];
}

export interface BlogPostContent {
  slug: string;
  title: string;
  meta_description: string;
  excerpt: string;
  content: string;
  headings: string[];
  related_dimensions: MuDimension[];
  tags: string[];
  faqs: FAQ[];
  cta: {
    text: string;
    description: string;
  };
}

// Union type for all content types
export type GeneratedContent =
  | DailyWeatherContent
  | DimensionGuideContent
  | HistoricalFigureContent
  | JungianConceptContent
  | HistoricalEraContent
  | BlogPostContent;

// ============================================
// Generator Output Wrapper
// ============================================

export interface GeneratorOutput {
  success: boolean;
  type: ContentType;
  language: LanguageCode;
  content: GeneratedContent;
  metadata: GeneratorMetadata;
  image?: {
    generated: boolean;
    mime_type: string;
    data?: string; // Base64
    saved_to?: string;
  };
}

// ============================================
// Publish Request/Response
// ============================================

export interface PublishRequest {
  // Content identification
  content_type: ContentType;
  language: LanguageCode;

  // Content data
  title: string;
  meta_description?: string;
  content_blocks: ContentBlock[];
  faqs?: FAQ[];
  schema_markup?: Record<string, unknown>;
  related_topics?: string[];

  // Generation params (for slug generation)
  params?: Record<string, string | number | boolean>;

  // Optional metadata
  status?: ContentStatus;
  expires_at?: string;

  // Optional image
  image_data?: string; // Base64
  image_mime_type?: string;

  // Optional raw content (for backup)
  raw_content?: GeneratedContent;
}

export interface PublishResponse {
  success: boolean;
  id: string;
  slug: string;
  quality_score: number;
  r2_backup_key?: string;
  created_at: string;
  message?: string;
}

export interface PublishError {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'STORAGE_ERROR' | 'INTERNAL_ERROR';
    message: string;
    details?: Record<string, string[]>;
  };
}

// ============================================
// Quality Score Components
// ============================================

export interface QualityScore {
  total: number; // 0-100
  components: {
    word_count: number; // 0-25
    has_faqs: number; // 0-20
    has_schema: number; // 0-15
    has_meta: number; // 0-10
    has_related: number; // 0-10
    content_depth: number; // 0-20
  };
}

// ============================================
// Database Models
// ============================================

export interface CosmicContentRow {
  id: string;
  language_code: LanguageCode;
  content_type: ContentType;
  slug: string;
  title: string;
  meta_description: string | null;
  content_blocks: string; // JSON string
  schema_markup: string | null; // JSON string
  related_topics: string | null; // JSON string
  status: ContentStatus;
  published_at: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface GenerationStatsRow {
  id: string;
  content_type: ContentType;
  language_code: LanguageCode;
  slug: string;
  tokens_used: number;
  generation_time_ms: number;
  quality_score: number;
  publish_status: 'pending' | 'published' | 'failed';
  error_message: string | null;
  created_at: string;
  published_at: string | null;
}

// ============================================
// Utility Types
// ============================================

export interface SlugParams {
  content_type: ContentType;
  language: LanguageCode;
  params: Record<string, string | number | boolean>;
}

export function generateSlug(input: SlugParams): string {
  const { content_type, params } = input;

  const parts: string[] = [];

  // Add primary identifiers based on content type
  switch (content_type) {
    case 'daily_weather':
      parts.push(params.date as string || new Date().toISOString().split('T')[0]);
      break;
    case 'dimension_guide':
      parts.push('dimension', params.dimension as string);
      break;
    case 'historical_figure':
    case 'archetype_profile':
      parts.push('figure', slugify(params.name as string || 'unknown'));
      break;
    case 'historical_era':
      parts.push('era', slugify(params.era as string || 'unknown'));
      break;
    case 'jungian_concept':
      parts.push('concept', slugify(params.concept as string || 'unknown'));
      break;
    case 'vedic_dasha':
      parts.push('dasha', slugify(params.planet as string || 'unknown'));
      break;
    case 'transit_guide':
      parts.push('transit', slugify(params.planet as string || 'unknown'));
      break;
    case 'compatibility_type':
      parts.push('compatibility', params.dimension1 as string, params.dimension2 as string);
      break;
    case 'blog_post':
      parts.push('blog', slugify(params.topic as string || 'post'));
      break;
    default:
      parts.push(slugify(params.slug as string || 'content'));
  }

  return parts.join('-');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '') // Trim hyphens
    .substring(0, 50); // Limit length
}

// ============================================
// Quality Score Calculator
// ============================================

export function calculateQualityScore(
  content: PublishRequest
): QualityScore {
  const components = {
    word_count: 0,
    has_faqs: 0,
    has_schema: 0,
    has_meta: 0,
    has_related: 0,
    content_depth: 0,
  };

  // Word count (0-25 points)
  const wordCount = countWords(content.content_blocks);
  if (wordCount >= 2000) components.word_count = 25;
  else if (wordCount >= 1500) components.word_count = 20;
  else if (wordCount >= 1000) components.word_count = 15;
  else if (wordCount >= 500) components.word_count = 10;
  else if (wordCount >= 250) components.word_count = 5;

  // FAQs (0-20 points)
  if (content.faqs && content.faqs.length > 0) {
    if (content.faqs.length >= 5) components.has_faqs = 20;
    else if (content.faqs.length >= 3) components.has_faqs = 15;
    else components.has_faqs = 10;
  }

  // Schema markup (0-15 points)
  if (content.schema_markup && Object.keys(content.schema_markup).length > 0) {
    components.has_schema = 15;
  }

  // Meta description (0-10 points)
  if (content.meta_description) {
    const metaLen = content.meta_description.length;
    if (metaLen >= 120 && metaLen <= 160) components.has_meta = 10;
    else if (metaLen >= 80) components.has_meta = 5;
  }

  // Related topics (0-10 points)
  if (content.related_topics && content.related_topics.length > 0) {
    if (content.related_topics.length >= 3) components.has_related = 10;
    else components.has_related = 5;
  }

  // Content depth - variety of block types (0-20 points)
  const blockTypes = new Set(content.content_blocks.map(b => b.type));
  if (blockTypes.size >= 5) components.content_depth = 20;
  else if (blockTypes.size >= 4) components.content_depth = 15;
  else if (blockTypes.size >= 3) components.content_depth = 10;
  else if (blockTypes.size >= 2) components.content_depth = 5;

  const total = Object.values(components).reduce((a, b) => a + b, 0);

  return { total, components };
}

function countWords(blocks: ContentBlock[]): number {
  let count = 0;

  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        count += (block as TextBlock).content.split(/\s+/).length;
        break;
      case 'heading':
        count += (block as HeadingBlock).content.split(/\s+/).length;
        break;
      case 'list':
        count += (block as ListBlock).items.join(' ').split(/\s+/).length;
        break;
      case 'quote':
        count += (block as QuoteBlock).content.split(/\s+/).length;
        break;
      case 'dimension_highlight':
        count += (block as DimensionHighlightBlock).guidance.split(/\s+/).length;
        break;
      case 'faq':
        for (const item of (block as FAQBlock).items) {
          count += item.question.split(/\s+/).length;
          count += item.answer.split(/\s+/).length;
        }
        break;
    }
  }

  return count;
}
