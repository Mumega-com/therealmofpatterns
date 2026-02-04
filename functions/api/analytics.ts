/**
 * POST /api/analytics
 *
 * Receives batched analytics events from the frontend
 * and stores them in D1 for internal dashboards.
 */

interface Env {
  DB: D1Database;
}

interface AnalyticsEvent {
  event: string;
  props: Record<string, unknown>;
  timestamp: number;
}

interface AnalyticsPayload {
  session_id: string;
  user_id?: string;
  events: AnalyticsEvent[];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const payload: AnalyticsPayload = await request.json();

    if (!payload.events || !Array.isArray(payload.events)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get client info
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || '';
    const country = request.headers.get('CF-IPCountry') || 'unknown';

    // Insert events in batch
    const stmt = env.DB.prepare(`
      INSERT INTO analytics_events (
        session_id, user_id, event_name, event_props,
        page_url, referrer, user_agent, country, client_ip, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = payload.events.map((event) => {
      const props = event.props || {};
      return stmt.bind(
        payload.session_id,
        payload.user_id || null,
        event.event,
        JSON.stringify(props),
        props.page || null,
        props.referrer || null,
        userAgent,
        country,
        hashIP(clientIP),
        new Date(event.timestamp).toISOString()
      );
    });

    await env.DB.batch(batch);

    return new Response(JSON.stringify({ success: true, count: payload.events.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * GET /api/analytics - Get analytics summary (admin only)
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Simple admin check via query param (should use proper auth in production)
  const adminKey = url.searchParams.get('key');
  if (!adminKey) {
    return new Response('Unauthorized', { status: 401 });
  }

  const days = parseInt(url.searchParams.get('days') || '7');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get event counts
    const eventCounts = await env.DB.prepare(`
      SELECT event_name, COUNT(*) as count
      FROM analytics_events
      WHERE timestamp >= ?
      GROUP BY event_name
      ORDER BY count DESC
    `).bind(since).all();

    // Get daily totals
    const dailyTotals = await env.DB.prepare(`
      SELECT date(timestamp) as date, COUNT(*) as count
      FROM analytics_events
      WHERE timestamp >= ?
      GROUP BY date(timestamp)
      ORDER BY date DESC
    `).bind(since).all();

    // Get funnel metrics
    const funnelEvents = ['page_view', 'quiz_start', 'quiz_complete', 'forecast_view', 'email_capture', 'checkout_start', 'subscription_complete'];
    const funnel: Record<string, number> = {};

    for (const event of funnelEvents) {
      const result = await env.DB.prepare(`
        SELECT COUNT(DISTINCT session_id) as count
        FROM analytics_events
        WHERE event_name = ? AND timestamp >= ?
      `).bind(event, since).first<{ count: number }>();
      funnel[event] = result?.count || 0;
    }

    // Calculate conversion rates
    const conversionRates = {
      quiz_start_rate: funnel.page_view ? ((funnel.quiz_start / funnel.page_view) * 100).toFixed(1) : '0',
      quiz_complete_rate: funnel.quiz_start ? ((funnel.quiz_complete / funnel.quiz_start) * 100).toFixed(1) : '0',
      email_capture_rate: funnel.forecast_view ? ((funnel.email_capture / funnel.forecast_view) * 100).toFixed(1) : '0',
      checkout_rate: funnel.email_capture ? ((funnel.checkout_start / funnel.email_capture) * 100).toFixed(1) : '0',
      subscription_rate: funnel.checkout_start ? ((funnel.subscription_complete / funnel.checkout_start) * 100).toFixed(1) : '0',
      overall_conversion: funnel.page_view ? ((funnel.subscription_complete / funnel.page_view) * 100).toFixed(2) : '0',
    };

    // Top pages
    const topPages = await env.DB.prepare(`
      SELECT page_url, COUNT(*) as views
      FROM analytics_events
      WHERE timestamp >= ? AND page_url IS NOT NULL
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 20
    `).bind(since).all();

    // Traffic sources
    const sources = await env.DB.prepare(`
      SELECT
        CASE
          WHEN referrer LIKE '%google%' THEN 'Google'
          WHEN referrer LIKE '%facebook%' OR referrer LIKE '%fb.%' THEN 'Facebook'
          WHEN referrer LIKE '%twitter%' OR referrer LIKE '%t.co%' THEN 'Twitter'
          WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
          WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
          ELSE 'Other'
        END as source,
        COUNT(*) as count
      FROM analytics_events
      WHERE timestamp >= ? AND event_name = 'page_view'
      GROUP BY source
      ORDER BY count DESC
    `).bind(since).all();

    return new Response(JSON.stringify({
      period: { days, since },
      eventCounts: eventCounts.results,
      dailyTotals: dailyTotals.results,
      funnel,
      conversionRates,
      topPages: topPages.results,
      sources: sources.results,
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Analytics] Summary error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Hash IP for privacy (we only need it for deduplication)
 */
function hashIP(ip: string): string {
  // Simple hash - in production use proper hashing
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
