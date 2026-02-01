/**
 * Dynamic robots.txt Generator for The Realm of Patterns
 *
 * Features:
 * - Allows all crawlers
 * - Points to sitemap index
 * - Blocks /api/ endpoints
 * - Blocks admin/internal routes
 * - Respects Cloudflare Pages conventions
 */

import { Env } from '../src/types';

// Base URL for the site
const BASE_URL = 'https://therealmofpatterns.com';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Check cache first (robots.txt doesn't change often)
    const cached = await env.CACHE.get('robots-txt');
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400', // 24 hours
        },
      });
    }

    const robotsTxt = generateRobotsTxt();

    // Cache for 24 hours
    await env.CACHE.put('robots-txt', robotsTxt, { expirationTtl: 86400 });

    return new Response(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('robots.txt generation error:', error);

    // Return basic robots.txt on error
    const fallback = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap-index.xml
`;

    return new Response(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
};

/**
 * Generate robots.txt content
 */
function generateRobotsTxt(): string {
  return `# The Realm of Patterns - robots.txt
# https://therealmofpatterns.com

# Allow all crawlers
User-agent: *
Allow: /

# Block API endpoints (not meant for indexing)
Disallow: /api/
Disallow: /api/*

# Block internal/admin routes
Disallow: /_/
Disallow: /_*
Disallow: /admin/
Disallow: /admin/*
Disallow: /dashboard/
Disallow: /dashboard/*

# Block preview/draft pages
Disallow: /preview/
Disallow: /preview/*
Disallow: /*?preview=*

# Block user-specific pages
Disallow: /report/
Disallow: /report/*
Disallow: /checkout/
Disallow: /checkout/*

# Block search result pages (if any)
Disallow: /search?*
Disallow: /*?search=*

# Block utility files
Disallow: /*.json$
Disallow: /*.xml$

# Allow sitemaps explicitly
Allow: /sitemap.xml
Allow: /sitemap-index.xml
Allow: /sitemaps/*.xml

# Crawl-delay for respectful crawling (optional, not all bots respect this)
Crawl-delay: 1

# ============================================
# Specific bot rules
# ============================================

# Googlebot (no special restrictions)
User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /preview/
Disallow: /report/
Disallow: /checkout/

# Bingbot
User-agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /preview/
Disallow: /report/
Disallow: /checkout/

# GPTBot (OpenAI crawler) - allow for now
User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /report/
Disallow: /checkout/

# CCBot (Common Crawl) - allow for research
User-agent: CCBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /report/
Disallow: /checkout/

# Block aggressive/unwanted bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 10

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

# ============================================
# Sitemaps
# ============================================

# Main sitemap index (lists all language-specific sitemaps)
Sitemap: ${BASE_URL}/sitemap-index.xml

# Primary sitemap (all languages combined)
Sitemap: ${BASE_URL}/sitemap.xml

# Language-specific sitemaps
Sitemap: ${BASE_URL}/sitemaps/en.xml
Sitemap: ${BASE_URL}/sitemaps/pt-br.xml
Sitemap: ${BASE_URL}/sitemaps/pt-pt.xml
Sitemap: ${BASE_URL}/sitemaps/es-mx.xml
Sitemap: ${BASE_URL}/sitemaps/es-ar.xml
Sitemap: ${BASE_URL}/sitemaps/es-es.xml
`;
}
