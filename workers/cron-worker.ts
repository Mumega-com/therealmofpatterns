/**
 * Cloudflare Worker - Cron Trigger
 * Runs daily at 00:00 UTC
 *
 * Triggers the /api/daily-update endpoint on the Pages deployment
 *
 * Deploy with:
 * wrangler deploy workers/cron-worker.ts --name therealmofpatterns-cron
 */

interface Env {
  PAGES_URL: string; // e.g., "https://therealmofpatterns.pages.dev"
  ADMIN_KEY: string; // Secret for authenticating cron requests
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[CRON] Triggered at:', new Date(event.scheduledTime).toISOString());

    try {
      const response = await fetch(`${env.PAGES_URL}/api/daily-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': env.ADMIN_KEY,
          'User-Agent': 'therealmofpatterns-cron-worker'
        },
        body: JSON.stringify({})
      });

      const result = await response.json() as any;

      if (response.ok) {
        console.log('[CRON] Daily update successful:', result);
      } else {
        console.error('[CRON] Daily update failed:', result);
        // Could send alert to monitoring service here
      }
    } catch (error) {
      console.error('[CRON] Error calling daily-update:', error);
      // Could send alert to monitoring service here
    }
  },

  // Optional: Handle direct HTTP requests to the worker
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response(JSON.stringify({
      message: 'Cron worker for The Realm of Patterns',
      schedule: 'Daily at 00:00 UTC',
      endpoint: `${env.PAGES_URL}/api/daily-update`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}
