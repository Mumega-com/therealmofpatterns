/**
 * Content Sitemap for The Realm of Patterns
 * Dynamically generated from cms_cosmic_content (English, published only).
 * Static shell pages are in /sitemaps/static.xml.
 */

import type { Env } from '../src/types';

interface ContentRow {
  id: string;
  slug: string;
  content_type: string;
  language: string;
  updated_at: string | null;
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

const BASE_URL = 'https://therealmofpatterns.com';
const MAX_URLS = 50000;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // 1. Try R2 (uploaded by cron)
    try {
      const r2Object = await env.STORAGE.get('sitemap.xml');
      if (r2Object) {
        return new Response(await r2Object.text(), {
          headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Sitemap-Source': 'r2' },
        });
      }
    } catch { /* fallthrough */ }

    // 2. KV cache
    const cached = await env.CACHE.get('sitemap:en');
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Sitemap-Source': 'kv-cache',
        },
      });
    }

    // 3. Dynamically generate from cms_cosmic_content (English only)
    const query = `
      SELECT id, slug, content_type, language, updated_at
      FROM cms_cosmic_content
      WHERE published = 1 AND language = 'en'
      ORDER BY updated_at DESC LIMIT ${MAX_URLS}
    `;

    const stmt = env.DB.prepare(query);

    const { results } = await stmt.all<ContentRow>();

    // Generate XML sitemap
    const xml = generateSitemapXml(results || []);

    await env.CACHE.put('sitemap:en', xml, { expirationTtl: 3600 });

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Sitemap-Source': 'dynamic',
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
        'X-Sitemap-Source': 'fallback',
      },
    });
  }
};

function generateSitemapXml(rows: ContentRow[]): string {
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const row of rows) {
    const priority = PRIORITY_MAP[row.content_type] || 0.5;
    const changefreq = CHANGEFREQ_MAP[row.content_type] || 'weekly';
    const lastmod = row.updated_at ? row.updated_at.split('T')[0] : today;

    xml += `  <url>
    <loc>${escapeXml(`${BASE_URL}/${row.slug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(2)}</priority>
  </url>
`;
  }

  xml += `</urlset>`;
  return xml;
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
