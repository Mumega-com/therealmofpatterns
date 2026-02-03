/**
 * CMS Content List API - List all content
 * GET /api/cms/list?type=dimension_guide&lang=en
 */

interface Env {
  DB: D1Database;
}

interface ContentItem {
  slug: string;
  title: string;
  content_type: string;
  language: string;
  meta_description: string;
  word_count: number;
  created_at: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const contentType = url.searchParams.get('type');
  const language = url.searchParams.get('lang');
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50'));

  try {
    let query = `
      SELECT slug, title, content_type, language, meta_description, word_count, created_at
      FROM cms_cosmic_content
      WHERE published = 1
    `;
    const params: any[] = [];

    if (contentType) {
      query += ` AND content_type = ?`;
      params.push(contentType);
    }

    if (language) {
      query += ` AND language = ?`;
      params.push(language);
    }

    query += ` ORDER BY content_type, title LIMIT ?`;
    params.push(limit);

    const result = await env.DB.prepare(query).bind(...params).all<ContentItem>();

    // Group by content type
    const grouped: Record<string, ContentItem[]> = {};
    for (const item of result.results || []) {
      const type = item.content_type;
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(item);
    }

    return new Response(JSON.stringify({
      total: result.results?.length || 0,
      items: result.results || [],
      grouped,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    console.error('CMS list error:', error);
    return new Response(JSON.stringify({ error: 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
