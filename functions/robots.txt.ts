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

import type { Env } from '../src/types';

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

User-agent: *
Allow: /

# API endpoints
Disallow: /api/

# Auth-gated pages (no public content)
Disallow: /admin/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /settings/
Disallow: /sol/checkin/
Disallow: /sol/chart/
Disallow: /journey/
Disallow: /kasra/
Disallow: /river/

# Post-conversion pages
Disallow: /success/
Disallow: /dna-success/
Disallow: /remind/

# Internal
Disallow: /_/
Disallow: /preview/

# Allow sitemaps
Allow: /sitemap.xml
Allow: /sitemap-index.xml
Allow: /sitemaps/static.xml

# LLM-friendly context
# Full machine-readable context: ${BASE_URL}/llms.txt

# AI crawlers — allowed on public content
User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /settings/
Disallow: /sol/checkin/
Disallow: /sol/chart/

User-agent: ClaudeBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /settings/
Disallow: /sol/checkin/
Disallow: /sol/chart/

User-agent: CCBot
Allow: /

# Aggressive SEO bots — throttle
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 10

# Spam bots — block
User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

# Sitemaps
Sitemap: ${BASE_URL}/sitemap-index.xml
Sitemap: ${BASE_URL}/sitemap.xml
Sitemap: ${BASE_URL}/sitemaps/static.xml
`;
}
