/**
 * Cloudflare Worker - Cron Trigger
 * Runs daily at 00:00 UTC
 *
 * Triggers the /api/daily-update endpoint on the Pages deployment
 * This generates:
 * - Cosmic weather content for 6 languages (en, pt-br, pt-pt, es-mx, es-ar, es-es)
 * - UV snapshots for subscribed users
 *
 * Deploy with:
 *   wrangler deploy workers/cron-worker.ts --name therealmofpatterns-cron
 *
 * Configure cron in Cloudflare Dashboard:
 *   Workers > therealmofpatterns-cron > Triggers > Cron Triggers
 *   Add: "0 0 * * *" (Daily at 00:00 UTC)
 *
 * Required secrets (set via wrangler secret put):
 *   PAGES_URL - e.g., "https://therealmofpatterns.pages.dev"
 *   ADMIN_KEY - Secret key for authenticating requests
 */

interface Env {
  PAGES_URL: string; // e.g., "https://therealmofpatterns.pages.dev"
  ADMIN_KEY: string; // Secret for authenticating cron requests
  DISCORD_WEBHOOK_URL?: string; // Optional: for alerting on failures
}

interface DailyUpdateResult {
  success: boolean;
  users_updated: number;
  snapshots_created: number;
  notifications_queued: number;
  content_generated: number;
  languages_completed: string[];
  errors: number;
  error?: { code: string; message: string };
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now();
    console.log('[CRON] Triggered at:', new Date(event.scheduledTime).toISOString());
    console.log('[CRON] Cron pattern:', event.cron);

    try {
      const response = await fetch(`${env.PAGES_URL}/api/daily-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': env.ADMIN_KEY,
          'User-Agent': 'therealmofpatterns-cron-worker'
        },
        body: JSON.stringify({
          // Generate content for all languages and update all users
        })
      });

      const result = await response.json() as DailyUpdateResult;
      const duration = Date.now() - startTime;

      if (response.ok && result.success) {
        console.log('[CRON] Daily update successful:', {
          duration: `${duration}ms`,
          content_generated: result.content_generated,
          languages: result.languages_completed,
          users_updated: result.users_updated,
          snapshots: result.snapshots_created,
          notifications: result.notifications_queued,
          errors: result.errors
        });
      } else {
        console.error('[CRON] Daily update failed:', result);
        // Send alert if Discord webhook is configured
        if (env.DISCORD_WEBHOOK_URL) {
          await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Daily Update Failed', result);
        }
      }
    } catch (error) {
      console.error('[CRON] Error calling daily-update:', error);
      // Send alert if Discord webhook is configured
      if (env.DISCORD_WEBHOOK_URL) {
        await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Cron Job Error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  },

  // Handle direct HTTP requests to the worker (for testing/status)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Manual trigger endpoint
    if (url.pathname === '/trigger' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.ADMIN_KEY}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Trigger the daily update
      try {
        const response = await fetch(`${env.PAGES_URL}/api/daily-update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': env.ADMIN_KEY
          },
          body: JSON.stringify({})
        });
        const result = await response.json();
        return new Response(JSON.stringify({
          triggered: true,
          result
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          triggered: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Status endpoint
    return new Response(JSON.stringify({
      name: 'The Realm of Patterns - Cron Worker',
      description: 'Daily cosmic weather content generation and user snapshot updates',
      schedule: 'Daily at 00:00 UTC (0 0 * * *)',
      endpoint: `${env.PAGES_URL}/api/daily-update`,
      features: [
        'Cosmic weather content for 6 languages',
        'UV snapshots for subscribed users',
        'Threshold alerts',
        'Elder milestone tracking'
      ],
      manual_trigger: 'POST /trigger with Authorization: Bearer <ADMIN_KEY>'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function sendDiscordAlert(webhookUrl: string, title: string, data: any): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `[Realm of Patterns] ${title}`,
          description: '```json\n' + JSON.stringify(data, null, 2) + '\n```',
          color: 0xff0000, // Red
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (error) {
    console.error('[DISCORD] Failed to send alert:', error);
  }
}

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}
