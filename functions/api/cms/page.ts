/**
 * CMS Page API - Fetch content from D1
 * GET /api/cms/page?slug=en/dimension/phase
 */

interface Env {
  DB: D1Database;
}

interface CMSContent {
  id: string;
  slug: string;
  canonical_slug: string;
  content_type: string;
  language: string;
  title: string;
  meta_description: string;
  hero_content: string;
  content_blocks: string;
  faqs: string;
  schema_markup: string;
  hreflang_map: string;
  quality_score: number;
  word_count: number;
  published: number;
  created_at: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Query the database for the content
    const result = await env.DB.prepare(`
      SELECT *
      FROM cms_cosmic_content
      WHERE slug = ?
      AND published = 1
      LIMIT 1
    `).bind(slug).first<CMSContent>();

    if (!result) {
      return new Response(JSON.stringify({ error: 'Page not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Track page view (async, don't await)
    trackPageView(env.DB, result.id, request);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });

  } catch (error) {
    console.error('CMS page fetch error:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Track page view in analytics table
async function trackPageView(db: D1Database, contentId: string, request: Request) {
  try {
    const id = crypto.randomUUID();
    const country = request.headers.get('cf-ipcountry') || 'unknown';
    const language = request.headers.get('accept-language')?.split(',')[0] || 'en';
    const referrer = request.headers.get('referer') || null;

    await db.prepare(`
      INSERT INTO cms_content_analytics (id, content_id, event_type, language, country, referrer)
      VALUES (?, ?, 'view', ?, ?, ?)
    `).bind(id, contentId, language, country, referrer).run();
  } catch (e) {
    // Don't fail the request if analytics fails
    console.error('Analytics tracking error:', e);
  }
}
