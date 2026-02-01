/**
 * Sitemap Index Generator for The Realm of Patterns
 *
 * Lists all language-specific sitemaps:
 * - /sitemaps/pages-en.xml
 * - /sitemaps/pages-pt-br.xml
 * - /sitemaps/pages-pt-pt.xml
 * - /sitemaps/pages-es-mx.xml
 * - /sitemaps/pages-es-ar.xml
 * - /sitemaps/pages-es-es.xml
 */

import { Env } from '../src/types';

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'];

// Base URL for the site
const BASE_URL = 'https://therealmofpatterns.com';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Check cache first
    const cached = await env.CACHE.get('sitemap-index');
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

    const today = new Date().toISOString().split('T')[0];

    // Get last modification dates for each language from the database
    const langLastMods: Record<string, string> = {};

    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        const result = await env.DB.prepare(`
          SELECT MAX(updated_at) as last_modified
          FROM cms_cosmic_content
          WHERE published = 1 AND language = ?
        `).bind(lang).first<{ last_modified: string | null }>();

        langLastMods[lang] = result?.last_modified?.split('T')[0] || today;
      } catch {
        langLastMods[lang] = today;
      }
    }

    // Generate sitemap index XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add a sitemap entry for each language
    for (const lang of SUPPORTED_LANGUAGES) {
      xml += `  <sitemap>
    <loc>${BASE_URL}/sitemaps/${lang}.xml</loc>
    <lastmod>${langLastMods[lang]}</lastmod>
  </sitemap>
`;
    }

    // Add static pages sitemap (non-CMS pages)
    xml += `  <sitemap>
    <loc>${BASE_URL}/sitemaps/static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
`;

    xml += `</sitemapindex>`;

    // Cache for 1 hour
    await env.CACHE.put('sitemap-index', xml, { expirationTtl: 3600 });

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) {
    console.error('Sitemap index generation error:', error);

    // Return minimal valid sitemap index on error
    const today = new Date().toISOString().split('T')[0];
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
};
