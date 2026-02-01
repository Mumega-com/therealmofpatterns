/**
 * Dynamic Sitemap Generator for The Realm of Patterns
 *
 * Queries cosmic_content for all published pages and generates
 * a standard XML sitemap with:
 * - loc (full URL)
 * - lastmod (updated_at)
 * - changefreq (based on content_type)
 * - priority (based on content_type)
 * - hreflang alternates for multilingual content
 *
 * Supports up to 50,000 URLs per sitemap (Google limit)
 */

import { Env } from '../src/types';

interface ContentRow {
  id: string;
  slug: string;
  content_type: string;
  language: string;
  updated_at: string | null;
  hreflang_map: string | null;
}

// Priority mapping based on content type
const PRIORITY_MAP: Record<string, number> = {
  'dimension_guide': 0.8,
  'jungian_concept': 0.8,
  'historical_figure': 0.7,
  'figure': 0.7,
  'compatibility': 0.7,
  'resonance': 0.7,
  'transit_guide': 0.6,
  'vedic_dasha': 0.6,
  'historical_era': 0.6,
  'era': 0.6,
  'archetype_profile': 0.6,
  'daily_weather': 0.5,
  'cosmic_weather': 0.5,
  'blog_post': 0.5,
  'landing': 1.0,
  'home': 1.0,
};

// Change frequency based on content type
const CHANGEFREQ_MAP: Record<string, string> = {
  'dimension_guide': 'weekly',
  'jungian_concept': 'weekly',
  'historical_figure': 'monthly',
  'figure': 'monthly',
  'compatibility': 'weekly',
  'resonance': 'weekly',
  'transit_guide': 'weekly',
  'vedic_dasha': 'monthly',
  'historical_era': 'monthly',
  'era': 'monthly',
  'archetype_profile': 'weekly',
  'daily_weather': 'daily',
  'cosmic_weather': 'daily',
  'blog_post': 'monthly',
  'landing': 'weekly',
  'home': 'daily',
};

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'];

// Base URL for the site
const BASE_URL = 'https://therealmofpatterns.com';

// Maximum URLs per sitemap (Google limit)
const MAX_URLS = 50000;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);

  // Check for lang query parameter to serve language-specific sitemap
  const langParam = url.searchParams.get('lang');

  try {
    // Check cache first
    const cacheKey = langParam ? `sitemap:${langParam}` : 'sitemap:all';
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Robots-Tag': 'noindex',
        },
      });
    }

    // Query all published content from cosmic_content
    let query = `
      SELECT id, slug, content_type, language, updated_at, hreflang_map
      FROM cosmic_content
      WHERE published = 1
    `;

    // Filter by language if specified
    if (langParam && SUPPORTED_LANGUAGES.includes(langParam)) {
      query += ` AND language = ?`;
    }

    query += ` ORDER BY updated_at DESC LIMIT ${MAX_URLS}`;

    const stmt = langParam && SUPPORTED_LANGUAGES.includes(langParam)
      ? env.DB.prepare(query).bind(langParam)
      : env.DB.prepare(query);

    const { results } = await stmt.all<ContentRow>();

    // Generate XML sitemap
    const xml = generateSitemapXml(results || []);

    // Cache for 1 hour
    await env.CACHE.put(cacheKey, xml, { expirationTtl: 3600 });

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);

    // Return a minimal valid sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
};

/**
 * Generate XML sitemap from content rows
 */
function generateSitemapXml(rows: ContentRow[]): string {
  const today = new Date().toISOString().split('T')[0];

  // Start with XML declaration and urlset
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // Add homepage for each language
  for (const lang of SUPPORTED_LANGUAGES) {
    const langPrefix = lang === 'en' ? '' : `/${lang}`;
    xml += `  <url>
    <loc>${BASE_URL}${langPrefix}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
${generateHreflangLinks('')}
  </url>
`;
  }

  // Add each content page
  for (const row of rows) {
    const priority = PRIORITY_MAP[row.content_type] || 0.5;
    const changefreq = CHANGEFREQ_MAP[row.content_type] || 'weekly';
    const lastmod = row.updated_at
      ? row.updated_at.split('T')[0]
      : today;

    // Build full URL
    const fullUrl = `${BASE_URL}/${row.slug}`;

    // Parse hreflang map if available
    let hreflangXml = '';
    if (row.hreflang_map) {
      try {
        const hreflangMap = JSON.parse(row.hreflang_map) as Record<string, string>;
        hreflangXml = generateHreflangFromMap(hreflangMap);
      } catch {
        // Fallback to default hreflang generation
        hreflangXml = generateHreflangLinks(row.slug);
      }
    }

    xml += `  <url>
    <loc>${escapeXml(fullUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(2)}</priority>
${hreflangXml}
  </url>
`;
  }

  xml += `</urlset>`;

  return xml;
}

/**
 * Generate hreflang links for a given slug
 * Assumes URL pattern: /{lang}/path or /path for English
 */
function generateHreflangLinks(slug: string): string {
  let links = '';

  for (const lang of SUPPORTED_LANGUAGES) {
    const langPrefix = lang === 'en' ? '' : `/${lang}`;
    const hreflang = lang === 'en' ? 'en' : lang;
    const href = slug
      ? `${BASE_URL}${langPrefix}/${slug}`
      : `${BASE_URL}${langPrefix}/`;

    links += `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}" />\n`;
  }

  // Add x-default (points to English)
  const defaultHref = slug ? `${BASE_URL}/${slug}` : `${BASE_URL}/`;
  links += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(defaultHref)}" />`;

  return links;
}

/**
 * Generate hreflang links from a pre-computed hreflang map
 */
function generateHreflangFromMap(hreflangMap: Record<string, string>): string {
  let links = '';

  for (const [lang, href] of Object.entries(hreflangMap)) {
    const fullHref = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    links += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(fullHref)}" />\n`;
  }

  // Add x-default if not present (use English or first entry)
  if (!hreflangMap['x-default']) {
    const defaultHref = hreflangMap['en'] || Object.values(hreflangMap)[0] || '/';
    const fullHref = defaultHref.startsWith('http') ? defaultHref : `${BASE_URL}${defaultHref}`;
    links += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(fullHref)}" />`;
  }

  return links;
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
