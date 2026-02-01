/**
 * POST /api/sitemap-analytics
 * Regenerate sitemap and aggregate analytics summary
 *
 * Called by:
 * 1. Cloudflare Cron at 18:00 UTC
 * 2. Manual trigger from admin dashboard
 *
 * Features:
 * - Generates dynamic sitemap.xml from published content
 * - Stores sitemap to R2 for CDN serving
 * - Aggregates daily analytics (views, visitors, top pages)
 * - Updates sitemap index with all language variants
 */

import { Env } from '../../src/types';

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface RequestBody {
  regenerate_sitemap?: boolean;
  include_analytics?: boolean;
  admin_key?: string;
}

interface SitemapResult {
  success: boolean;
  pages_indexed: number;
  sitemap_updated: boolean;
  sitemaps_generated: string[];
  analytics_summary: {
    total_views: number;
    unique_visitors: number;
    top_pages: Array<{ slug: string; views: number }>;
    views_by_language: Record<string, number>;
    views_by_content_type: Record<string, number>;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface ContentPage {
  slug: string;
  language_code: string;
  content_type: string;
  updated_at: string;
  view_count: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: RequestBody = await request.json();

    // Check authorization - ADMIN_KEY must be configured in environment
    const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
    if (!env.ADMIN_KEY) {
      console.error('[SITEMAP] ADMIN_KEY not configured in environment');
      return errorResponse('CONFIGURATION_ERROR', 'Admin key not configured', 500);
    }

    if (adminKey !== env.ADMIN_KEY) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
    }

    const regenerateSitemap = body.regenerate_sitemap !== false;
    const includeAnalytics = body.include_analytics !== false;

    console.log('[SITEMAP] Running sitemap regeneration and analytics...');

    let pagesIndexed = 0;
    let sitemapUpdated = false;
    const sitemapsGenerated: string[] = [];

    // ============================================
    // Part 1: Generate Sitemap
    // ============================================
    if (regenerateSitemap) {
      // APP_URL is required for sitemap generation
      if (!env.APP_URL) {
        console.error('[SITEMAP] APP_URL not configured in environment');
        return errorResponse('CONFIGURATION_ERROR', 'APP_URL not configured', 500);
      }

      console.log('[SITEMAP] Fetching published content...');

      const allPages = await getAllPublishedPages(env.DB);
      pagesIndexed = allPages.length;

      console.log(`[SITEMAP] Found ${pagesIndexed} published pages`);

      // Generate sitemap XML
      const sitemapXml = generateSitemapXml(allPages, env.APP_URL);

      // Store to R2 (or KV as backup)
      try {
        await env.STORAGE.put('sitemap.xml', sitemapXml, {
          httpMetadata: {
            contentType: 'application/xml',
            cacheControl: 'public, max-age=3600',
          },
        });
        sitemapsGenerated.push('sitemap.xml');
        sitemapUpdated = true;
        console.log('[SITEMAP] Stored sitemap.xml to R2');
      } catch (error) {
        console.error('[SITEMAP] Failed to store to R2:', error);
        // Fallback to KV
        await env.CACHE.put('sitemap.xml', sitemapXml, { expirationTtl: 86400 });
        sitemapsGenerated.push('sitemap.xml (KV fallback)');
        sitemapUpdated = true;
      }

      // Generate language-specific sitemaps
      for (const lang of SUPPORTED_LANGUAGES) {
        const langPages = allPages.filter(p => p.language_code === lang);
        if (langPages.length > 0) {
          const langSitemap = generateSitemapXml(langPages, env.APP_URL);
          try {
            await env.STORAGE.put(`sitemap-${lang}.xml`, langSitemap, {
              httpMetadata: {
                contentType: 'application/xml',
                cacheControl: 'public, max-age=3600',
              },
            });
            sitemapsGenerated.push(`sitemap-${lang}.xml`);
          } catch (error) {
            console.error(`[SITEMAP] Failed to store sitemap-${lang}.xml:`, error);
          }
        }
      }

      // Generate sitemap index
      const sitemapIndex = generateSitemapIndex(sitemapsGenerated, env.APP_URL);
      try {
        await env.STORAGE.put('sitemap-index.xml', sitemapIndex, {
          httpMetadata: {
            contentType: 'application/xml',
            cacheControl: 'public, max-age=3600',
          },
        });
        sitemapsGenerated.push('sitemap-index.xml');
      } catch (error) {
        console.error('[SITEMAP] Failed to store sitemap-index.xml:', error);
      }
    }

    // ============================================
    // Part 2: Aggregate Analytics
    // ============================================
    let analyticsSummary = {
      total_views: 0,
      unique_visitors: 0,
      top_pages: [] as Array<{ slug: string; views: number }>,
      views_by_language: {} as Record<string, number>,
      views_by_content_type: {} as Record<string, number>,
    };

    if (includeAnalytics) {
      console.log('[SITEMAP] Aggregating analytics...');
      analyticsSummary = await aggregateAnalytics(env.DB);
      console.log(`[SITEMAP] Total views: ${analyticsSummary.total_views}, Unique visitors: ${analyticsSummary.unique_visitors}`);
    }

    const result: SitemapResult = {
      success: true,
      pages_indexed: pagesIndexed,
      sitemap_updated: sitemapUpdated,
      sitemaps_generated: sitemapsGenerated,
      analytics_summary: analyticsSummary,
    };

    console.log(`[SITEMAP] Completed: ${pagesIndexed} pages indexed, ${sitemapsGenerated.length} sitemaps generated`);

    return jsonResponse(result);

  } catch (error) {
    console.error('Sitemap/analytics error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to generate sitemap/analytics', 500);
  }
};

// ============================================
// Sitemap Generation
// ============================================

async function getAllPublishedPages(db: D1Database): Promise<ContentPage[]> {
  // Get all published content
  const { results: contentResults } = await db.prepare(`
    SELECT slug, language_code, content_type, updated_at, view_count
    FROM cosmic_content
    WHERE status = 'published'
    ORDER BY updated_at DESC
  `).all();

  // Get all cosmic weather content
  const { results: weatherResults } = await db.prepare(`
    SELECT
      id as slug,
      language_code,
      'daily_weather' as content_type,
      created_at as updated_at,
      0 as view_count
    FROM cosmic_weather_content
    WHERE date >= date('now', '-30 days')
    ORDER BY date DESC
  `).all();

  const allPages = [
    ...(contentResults || []),
    ...(weatherResults || []),
  ] as ContentPage[];

  return allPages;
}

function generateSitemapXml(pages: ContentPage[], baseUrl: string): string {
  const urlEntries = pages.map(page => {
    const loc = `${baseUrl}/${page.slug}`;
    const lastmod = page.updated_at ? new Date(page.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Priority based on content type
    let priority = '0.5';
    if (page.content_type === 'dimension_guide') priority = '0.9';
    else if (page.content_type === 'daily_weather') priority = '0.7';
    else if (page.content_type === 'historical_figure') priority = '0.8';
    else if (page.content_type === 'jungian_concept') priority = '0.8';

    // Change frequency
    let changefreq = 'monthly';
    if (page.content_type === 'daily_weather') changefreq = 'daily';

    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
}

function generateSitemapIndex(sitemaps: string[], baseUrl: string): string {
  const sitemapEntries = sitemaps
    .filter(s => s.endsWith('.xml') && !s.includes('index'))
    .map(sitemap => {
      return `  <sitemap>
    <loc>${baseUrl}/${sitemap}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`;
    }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================
// Analytics Aggregation
// ============================================

async function aggregateAnalytics(db: D1Database): Promise<SitemapResult['analytics_summary']> {
  // Total views today
  const { results: viewsResult } = await db.prepare(`
    SELECT COUNT(*) as total
    FROM content_analytics
    WHERE event_type = 'view'
    AND created_at >= date('now', '-1 day')
  `).all();
  const totalViews = (viewsResult?.[0] as any)?.total || 0;

  // Unique visitors today
  const { results: visitorsResult } = await db.prepare(`
    SELECT COUNT(DISTINCT visitor_hash) as unique_count
    FROM content_analytics
    WHERE event_type = 'view'
    AND created_at >= date('now', '-1 day')
  `).all();
  const uniqueVisitors = (visitorsResult?.[0] as any)?.unique_count || 0;

  // Top pages by views (from cosmic_content view_count)
  const { results: topPagesResult } = await db.prepare(`
    SELECT slug, view_count as views
    FROM cosmic_content
    WHERE status = 'published'
    ORDER BY view_count DESC
    LIMIT 10
  `).all();
  const topPages = (topPagesResult || []).map((p: any) => ({
    slug: p.slug,
    views: p.views || 0,
  }));

  // Views by language
  const { results: langResult } = await db.prepare(`
    SELECT language_code, SUM(view_count) as views
    FROM cosmic_content
    WHERE status = 'published'
    GROUP BY language_code
  `).all();
  const viewsByLanguage: Record<string, number> = {};
  for (const row of langResult || []) {
    viewsByLanguage[(row as any).language_code] = (row as any).views || 0;
  }

  // Views by content type
  const { results: typeResult } = await db.prepare(`
    SELECT content_type, SUM(view_count) as views
    FROM cosmic_content
    WHERE status = 'published'
    GROUP BY content_type
  `).all();
  const viewsByContentType: Record<string, number> = {};
  for (const row of typeResult || []) {
    viewsByContentType[(row as any).content_type] = (row as any).views || 0;
  }

  return {
    total_views: totalViews,
    unique_visitors: uniqueVisitors,
    top_pages: topPages,
    views_by_language: viewsByLanguage,
    views_by_content_type: viewsByContentType,
  };
}

// ============================================
// Response Helpers
// ============================================

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    pages_indexed: 0,
    sitemap_updated: false,
    sitemaps_generated: [],
    analytics_summary: {
      total_views: 0,
      unique_visitors: 0,
      top_pages: [],
      views_by_language: {},
      views_by_content_type: {},
    },
    error: { code, message },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
