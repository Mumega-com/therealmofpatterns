/**
 * Sitemap Index Generator for The Realm of Patterns
 * Lists: content sitemap (DB) + static pages sitemap
 */

import type { Env } from '../src/types';

const BASE_URL = 'https://therealmofpatterns.com';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const cached = await env.CACHE.get('sitemap-index');
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get last content modification date
    let contentLastMod = today;
    try {
      const result = await env.DB.prepare(`
        SELECT MAX(updated_at) as last_modified FROM cms_cosmic_content WHERE published = 1
      `).first<{ last_modified: string | null }>();
      contentLastMod = result?.last_modified?.split('T')[0] || today;
    } catch { /* table may not exist yet */ }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${contentLastMod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemaps/static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

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
