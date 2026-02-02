/**
 * Language-Specific Sitemap Generator for The Realm of Patterns
 *
 * Dynamic route: /sitemaps/[lang].xml
 * Example: /sitemaps/en.xml, /sitemaps/pt-br.xml, /sitemaps/es-mx.xml
 *
 * Features:
 * - Queries cosmic_content for all published pages in the specified language
 * - Generates XML sitemap with proper hreflang alternates
 * - Priority based on content_type (dimension_guide=0.8, figure=0.7, weather=0.5)
 * - Change frequency based on content_type (daily for weather, weekly for guides)
 * - Limited to 50,000 URLs per sitemap (Google limit)
 */

import { Env } from '../../src/types';

interface ContentRow {
  id: string;
  slug: string;
  canonical_slug: string | null;
  content_type: string;
  language: string;
  title: string;
  updated_at: string | null;
  hreflang_map: string | null;
}

// Supported languages with their hreflang codes
const SUPPORTED_LANGUAGES: Record<string, string> = {
  'en': 'en',
  'pt-br': 'pt-BR',
  'pt-pt': 'pt-PT',
  'es-mx': 'es-MX',
  'es-ar': 'es-AR',
  'es-es': 'es-ES',
};

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

// Base URL for the site
const BASE_URL = 'https://therealmofpatterns.com';

// Maximum URLs per sitemap (Google limit)
const MAX_URLS = 50000;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;

  // Extract language from URL parameter
  // The param comes as "en.xml" or "pt-br.xml", so we need to strip ".xml"
  let langParam = params.lang as string;
  if (langParam.endsWith('.xml')) {
    langParam = langParam.slice(0, -4);
  }

  // Validate language
  if (!SUPPORTED_LANGUAGES[langParam]) {
    return new Response('Not Found', { status: 404 });
  }

  const lang = langParam;

  try {
    // Check cache first
    const cacheKey = `sitemap:lang:${lang}`;
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

    // Query all published content for this language from cms_cosmic_content
    const { results } = await env.DB.prepare(`
      SELECT id, slug, canonical_slug, content_type, language, title, updated_at, hreflang_map
      FROM cms_cosmic_content
      WHERE published = 1 AND language = ?
      ORDER BY
        CASE content_type
          WHEN 'landing' THEN 1
          WHEN 'dimension_guide' THEN 2
          WHEN 'jungian_concept' THEN 3
          WHEN 'historical_figure' THEN 4
          WHEN 'figure' THEN 4
          WHEN 'compatibility' THEN 5
          WHEN 'daily_weather' THEN 6
          ELSE 7
        END,
        updated_at DESC
      LIMIT ?
    `).bind(lang, MAX_URLS).all<ContentRow>();

    // Generate XML sitemap
    const xml = generateLanguageSitemapXml(results || [], lang);

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
    console.error(`Sitemap generation error for ${lang}:`, error);

    // Return minimal valid sitemap on error
    const today = new Date().toISOString().split('T')[0];
    const langPrefix = lang === 'en' ? '' : `/${lang}`;
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${BASE_URL}${langPrefix}/</loc>
    <lastmod>${today}</lastmod>
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
 * Generate language-specific XML sitemap
 */
function generateLanguageSitemapXml(
  rows: ContentRow[],
  lang: string
): string {
  const today = new Date().toISOString().split('T')[0];
  const langPrefix = lang === 'en' ? '' : `/${lang}`;

  // Start with XML declaration and urlset
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

  // Add homepage for this language
  xml += `  <url>
    <loc>${BASE_URL}${langPrefix}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
${generateHreflangAlternates('')}
  </url>
`;

  // Track processed slugs to avoid duplicates
  const processedSlugs = new Set<string>();

  // Add each content page
  for (const row of rows) {
    // Skip if we've already processed this slug
    if (processedSlugs.has(row.slug)) {
      continue;
    }
    processedSlugs.add(row.slug);

    const priority = PRIORITY_MAP[row.content_type] || 0.5;
    const changefreq = CHANGEFREQ_MAP[row.content_type] || 'weekly';
    const lastmod = row.updated_at
      ? row.updated_at.split('T')[0]
      : today;

    // Build full URL
    const fullUrl = `${BASE_URL}/${row.slug}`;

    // Generate hreflang alternates
    let hreflangXml = '';
    if (row.hreflang_map) {
      try {
        const hreflangMap = JSON.parse(row.hreflang_map) as Record<string, string>;
        hreflangXml = generateHreflangFromMap(hreflangMap, row.slug, lang);
      } catch {
        hreflangXml = generateHreflangAlternates(row.canonical_slug || extractPathFromSlug(row.slug));
      }
    } else if (row.canonical_slug) {
      // Use canonical_slug to generate alternates
      hreflangXml = generateHreflangAlternates(row.canonical_slug);
    } else {
      // Extract path portion and generate alternates
      hreflangXml = generateHreflangAlternates(extractPathFromSlug(row.slug));
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
 * Extract the path portion from a localized slug
 * e.g., "pt-br/dimensao/fase" -> "dimensao/fase"
 * e.g., "en/dimension/phase" -> "dimension/phase"
 */
function extractPathFromSlug(slug: string): string {
  const langPrefixes = Object.keys(SUPPORTED_LANGUAGES);
  for (const prefix of langPrefixes) {
    if (slug.startsWith(`${prefix}/`)) {
      return slug.slice(prefix.length + 1);
    }
  }
  return slug;
}

/**
 * Generate hreflang alternates for all supported languages
 * Uses the canonical_slug to build URLs for each language
 */
function generateHreflangAlternates(canonicalPath: string): string {
  let links = '';

  // Localized slug patterns based on content path
  const localizedPaths = getLocalizedPaths(canonicalPath);

  for (const [lang, hreflangCode] of Object.entries(SUPPORTED_LANGUAGES)) {
    const langPrefix = lang === 'en' ? '' : `/${lang}`;
    const localizedPath = localizedPaths[lang] || canonicalPath;
    const href = canonicalPath
      ? `${BASE_URL}${langPrefix}/${localizedPath}`
      : `${BASE_URL}${langPrefix}/`;

    links += `    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${escapeXml(href)}" />\n`;
  }

  // Add x-default (points to English version)
  const defaultHref = canonicalPath
    ? `${BASE_URL}/${localizedPaths['en'] || canonicalPath}`
    : `${BASE_URL}/`;
  links += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(defaultHref)}" />`;

  return links;
}

/**
 * Get localized paths for all languages based on content type patterns
 */
function getLocalizedPaths(canonicalPath: string): Record<string, string> {
  const paths: Record<string, string> = {};

  // Slug localization map from CONTENT-ENGINE-PLAN.md
  const SLUG_MAP: Record<string, Record<string, string>> = {
    'dimension': {
      'en': 'dimension', 'pt-br': 'dimensao', 'pt-pt': 'dimensao',
      'es-mx': 'dimension', 'es-ar': 'dimension', 'es-es': 'dimension'
    },
    'cosmic-weather': {
      'en': 'cosmic-weather', 'pt-br': 'clima-cosmico', 'pt-pt': 'clima-cosmico',
      'es-mx': 'clima-cosmico', 'es-ar': 'clima-cosmico', 'es-es': 'clima-cosmico'
    },
    'figure': {
      'en': 'figure', 'pt-br': 'figura', 'pt-pt': 'figura',
      'es-mx': 'figura', 'es-ar': 'figura', 'es-es': 'figura'
    },
    'jungian': {
      'en': 'jungian', 'pt-br': 'junguiano', 'pt-pt': 'junguiano',
      'es-mx': 'junguiano', 'es-ar': 'junguiano', 'es-es': 'junguiano'
    },
    'era': {
      'en': 'era', 'pt-br': 'era', 'pt-pt': 'era',
      'es-mx': 'era', 'es-ar': 'era', 'es-es': 'era'
    },
    'dasha': {
      'en': 'dasha', 'pt-br': 'dasha', 'pt-pt': 'dasha',
      'es-mx': 'dasha', 'es-ar': 'dasha', 'es-es': 'dasha'
    },
    'transit': {
      'en': 'transit', 'pt-br': 'transito', 'pt-pt': 'transito',
      'es-mx': 'transito', 'es-ar': 'transito', 'es-es': 'transito'
    },
    'resonance': {
      'en': 'resonance', 'pt-br': 'ressonancia', 'pt-pt': 'ressonancia',
      'es-mx': 'resonancia', 'es-ar': 'resonancia', 'es-es': 'resonancia'
    },
  };

  // Parse the canonical path to find content type
  const parts = canonicalPath.split('/');
  if (parts.length === 0) {
    return { 'en': canonicalPath };
  }

  const contentType = parts[0];
  const restOfPath = parts.slice(1).join('/');

  for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
    if (SLUG_MAP[contentType] && SLUG_MAP[contentType][lang]) {
      paths[lang] = restOfPath
        ? `${SLUG_MAP[contentType][lang]}/${restOfPath}`
        : SLUG_MAP[contentType][lang];
    } else {
      paths[lang] = canonicalPath;
    }
  }

  return paths;
}

/**
 * Generate hreflang links from a pre-computed hreflang map
 */
function generateHreflangFromMap(
  hreflangMap: Record<string, string>,
  currentSlug: string,
  currentLang: string
): string {
  let links = '';

  // Ensure we have the current language in the map
  const fullMap = { ...hreflangMap };
  if (!fullMap[SUPPORTED_LANGUAGES[currentLang]]) {
    fullMap[SUPPORTED_LANGUAGES[currentLang]] = `/${currentSlug}`;
  }

  for (const [hreflangCode, href] of Object.entries(fullMap)) {
    const fullHref = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    links += `    <xhtml:link rel="alternate" hreflang="${hreflangCode}" href="${escapeXml(fullHref)}" />\n`;
  }

  // Add x-default if not present (use English or first entry)
  if (!fullMap['x-default']) {
    const defaultHref = fullMap['en'] || Object.values(fullMap)[0] || `/${currentSlug}`;
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
