/**
 * POST /api/publish
 *
 * Publishing pipeline endpoint that connects the content generator to D1 and R2.
 * Accepts generated content, validates structure, calculates quality score,
 * stores in D1 cosmic_content table, and optionally backs up to R2.
 */

import type { Env } from '../../src/types';
import type {
  ContentType,
  LanguageCode,
  ContentStatus,
  PublishRequest,
  PublishResponse,
  PublishError,
} from '../../src/types/content';
import { generateSlug, calculateQualityScore } from '../../src/types/content';

// ============================================
// Request Handler
// ============================================

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Validate content type
    const contentType = request.headers.get('Content-Type');
    if (!contentType?.includes('application/json')) {
      return errorResponse('VALIDATION_ERROR', 'Content-Type must be application/json', 400);
    }

    // Parse request body
    let body: PublishRequest;
    try {
      body = await request.json();
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }

    // Validate required fields
    const validationErrors = validatePublishRequest(body);
    if (validationErrors.length > 0) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, {
        fields: validationErrors,
      });
    }

    // Generate slug
    const slug = generateSlug({
      content_type: body.content_type,
      language: body.language,
      params: body.params || {},
    });

    // Calculate quality score
    const qualityScore = calculateQualityScore(body);

    // Generate unique ID
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Prepare content blocks JSON
    const contentBlocksJson = JSON.stringify(body.content_blocks);
    const schemaMarkupJson = body.schema_markup ? JSON.stringify(body.schema_markup) : null;
    const relatedTopicsJson = body.related_topics ? JSON.stringify(body.related_topics) : null;

    // Insert or update in D1
    try {
      await env.DB.prepare(`
        INSERT INTO cosmic_content (
          id, language_code, content_type, slug, title, meta_description,
          content_blocks, schema_markup, related_topics, status,
          published_at, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(language_code, content_type, slug) DO UPDATE SET
          title = excluded.title,
          meta_description = excluded.meta_description,
          content_blocks = excluded.content_blocks,
          schema_markup = excluded.schema_markup,
          related_topics = excluded.related_topics,
          status = excluded.status,
          published_at = excluded.published_at,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `).bind(
        id,
        body.language,
        body.content_type,
        slug,
        body.title,
        body.meta_description || null,
        contentBlocksJson,
        schemaMarkupJson,
        relatedTopicsJson,
        body.status || 'draft',
        body.status === 'published' ? now : null,
        body.expires_at || null,
        now,
        now
      ).run();
    } catch (dbError) {
      console.error('D1 insert error:', dbError);
      return errorResponse('DATABASE_ERROR', 'Failed to store content in database', 500);
    }

    // Optionally upload JSON backup to R2
    let r2BackupKey: string | undefined;
    if (body.raw_content) {
      try {
        r2BackupKey = `content-backups/${body.content_type}/${body.language}/${slug}-${Date.now()}.json`;

        const backupData = {
          id,
          slug,
          content_type: body.content_type,
          language: body.language,
          title: body.title,
          content: body.raw_content,
          quality_score: qualityScore.total,
          created_at: now,
        };

        await env.STORAGE.put(r2BackupKey, JSON.stringify(backupData, null, 2), {
          httpMetadata: {
            contentType: 'application/json',
          },
          customMetadata: {
            content_type: body.content_type,
            language: body.language,
            quality_score: String(qualityScore.total),
          },
        });
      } catch (r2Error) {
        console.error('R2 backup error:', r2Error);
        // Non-fatal - content is already in D1
      }
    }

    // Optionally upload image to R2
    let imageKey: string | undefined;
    if (body.image_data) {
      try {
        const mimeType = body.image_mime_type || 'image/png';
        const extension = mimeType.split('/')[1] || 'png';
        imageKey = `content-images/${body.content_type}/${body.language}/${slug}.${extension}`;

        const imageBytes = base64ToUint8Array(body.image_data);
        await env.STORAGE.put(imageKey, imageBytes, {
          httpMetadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000',
          },
          customMetadata: {
            content_id: id,
            slug,
          },
        });
      } catch (imageError) {
        console.error('Image upload error:', imageError);
        // Non-fatal
      }
    }

    // Log to generation_stats (if table exists)
    try {
      await env.DB.prepare(`
        INSERT INTO generation_stats (
          id, content_type, language_code, slug,
          tokens_used, generation_time_ms, quality_score,
          publish_status, created_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        body.content_type,
        body.language,
        slug,
        0, // tokens_used - would come from metadata
        0, // generation_time_ms - would come from metadata
        qualityScore.total,
        body.status === 'published' ? 'published' : 'pending',
        now,
        body.status === 'published' ? now : null
      ).run();
    } catch {
      // Table may not exist yet - non-fatal
    }

    // Return success response
    const response: PublishResponse = {
      success: true,
      id,
      slug,
      quality_score: qualityScore.total,
      r2_backup_key: r2BackupKey,
      created_at: now,
      message: `Content published successfully with quality score ${qualityScore.total}/100`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Publish error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
};

// ============================================
// Validation
// ============================================

const VALID_CONTENT_TYPES: ContentType[] = [
  'daily_weather',
  'weekly_forecast',
  'dimension_guide',
  'archetype_profile',
  'historical_figure',
  'historical_era',
  'jungian_concept',
  'vedic_dasha',
  'transit_guide',
  'compatibility_type',
  'blog_post',
];

const VALID_LANGUAGES: LanguageCode[] = [
  'en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'
];

const VALID_STATUSES: ContentStatus[] = [
  'draft', 'review', 'published', 'archived'
];

function validatePublishRequest(body: PublishRequest): string[] {
  const errors: string[] = [];

  // Required fields
  if (!body.content_type) {
    errors.push('content_type is required');
  } else if (!VALID_CONTENT_TYPES.includes(body.content_type)) {
    errors.push(`content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
  }

  if (!body.language) {
    errors.push('language is required');
  } else if (!VALID_LANGUAGES.includes(body.language)) {
    errors.push(`language must be one of: ${VALID_LANGUAGES.join(', ')}`);
  }

  if (!body.title || typeof body.title !== 'string') {
    errors.push('title is required and must be a string');
  } else if (body.title.length < 5 || body.title.length > 200) {
    errors.push('title must be between 5 and 200 characters');
  }

  if (!body.content_blocks || !Array.isArray(body.content_blocks)) {
    errors.push('content_blocks is required and must be an array');
  } else if (body.content_blocks.length === 0) {
    errors.push('content_blocks cannot be empty');
  } else {
    // Validate each content block
    for (let i = 0; i < body.content_blocks.length; i++) {
      const block = body.content_blocks[i];
      if (!block.type) {
        errors.push(`content_blocks[${i}].type is required`);
      }
    }
  }

  // Optional field validation
  if (body.faqs !== undefined) {
    if (!Array.isArray(body.faqs)) {
      errors.push('faqs must be an array');
    } else {
      for (let i = 0; i < body.faqs.length; i++) {
        const faq = body.faqs[i];
        if (!faq.question || !faq.answer) {
          errors.push(`faqs[${i}] must have both question and answer`);
        }
      }
    }
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (body.meta_description !== undefined) {
    if (typeof body.meta_description !== 'string') {
      errors.push('meta_description must be a string');
    } else if (body.meta_description.length > 300) {
      errors.push('meta_description must be 300 characters or less');
    }
  }

  if (body.expires_at !== undefined) {
    const expiresDate = new Date(body.expires_at);
    if (isNaN(expiresDate.getTime())) {
      errors.push('expires_at must be a valid ISO date string');
    }
  }

  return errors;
}

// ============================================
// Helper Functions
// ============================================

function errorResponse(
  code: PublishError['error']['code'],
  message: string,
  status: number,
  details?: Record<string, string[]>
): Response {
  const errorBody: PublishError = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  return new Response(JSON.stringify(errorBody), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ============================================
// GET endpoint for retrieving content
// ============================================

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const contentType = url.searchParams.get('type');
  const language = url.searchParams.get('lang') || 'en';
  const slug = url.searchParams.get('slug');
  const status = url.searchParams.get('status') || 'published';

  try {
    let query: string;
    let params: unknown[];

    if (slug && contentType) {
      // Fetch specific content
      query = `
        SELECT * FROM cosmic_content
        WHERE content_type = ? AND language_code = ? AND slug = ?
        LIMIT 1
      `;
      params = [contentType, language, slug];
    } else if (contentType) {
      // Fetch list by type
      query = `
        SELECT id, slug, title, meta_description, status, published_at, view_count, created_at
        FROM cosmic_content
        WHERE content_type = ? AND language_code = ? AND status = ?
        ORDER BY published_at DESC
        LIMIT 50
      `;
      params = [contentType, language, status];
    } else {
      // Fetch recent content
      query = `
        SELECT id, content_type, slug, title, meta_description, status, published_at, view_count
        FROM cosmic_content
        WHERE language_code = ? AND status = ?
        ORDER BY published_at DESC
        LIMIT 50
      `;
      params = [language, status];
    }

    const result = await env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      count: result.results?.length || 0,
      data: result.results || [],
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return errorResponse('DATABASE_ERROR', 'Failed to fetch content', 500);
  }
};
