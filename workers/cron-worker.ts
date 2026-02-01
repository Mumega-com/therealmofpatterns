/**
 * Cloudflare Worker - Cron Triggers
 * Multiple scheduled jobs for content generation and maintenance
 *
 * Schedule:
 *   0 0 * * *  (00:00 UTC) - Daily weather generation for all 6 languages
 *   0 6 * * *  (06:00 UTC) - Process content queue (10 items)
 *   0 12 * * * (12:00 UTC) - Quality check + retry failed items
 *   0 18 * * * (18:00 UTC) - Regenerate sitemap + analytics summary
 *
 * Deploy with:
 *   wrangler deploy workers/cron-worker.ts --name therealmofpatterns-cron
 *
 * Required secrets (set via wrangler secret put):
 *   PAGES_URL - e.g., "https://therealmofpatterns.pages.dev"
 *   ADMIN_KEY - Secret key for authenticating requests
 *   DISCORD_WEBHOOK_URL - Optional: for alerting on failures
 */

interface Env {
  PAGES_URL: string; // e.g., "https://therealmofpatterns.pages.dev"
  ADMIN_KEY: string; // Secret for authenticating cron requests
  DISCORD_WEBHOOK_URL?: string; // Optional: for alerting on failures
}

// Cron job types
type CronJob = 'daily-weather' | 'process-queue' | 'quality-check' | 'sitemap-analytics';

// Mapping cron patterns to job types
const CRON_JOB_MAP: Record<string, CronJob> = {
  '0 0 * * *': 'daily-weather',
  '0 6 * * *': 'process-queue',
  '0 12 * * *': 'quality-check',
  '0 18 * * *': 'sitemap-analytics',
};

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

interface BatchResult {
  success: boolean;
  generated: number;
  failed: number;
  tokens_used: number;
  items: Array<{
    id: string;
    status: 'completed' | 'failed';
    error?: string;
  }>;
}

interface QualityCheckResult {
  success: boolean;
  checked: number;
  passed: number;
  failed: number;
  retried: number;
  errors: string[];
}

interface SitemapResult {
  success: boolean;
  pages_indexed: number;
  sitemap_updated: boolean;
  analytics_summary: {
    total_views: number;
    unique_visitors: number;
    top_pages: Array<{ slug: string; views: number }>;
  };
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now();
    console.log('[CRON] Triggered at:', new Date(event.scheduledTime).toISOString());
    console.log('[CRON] Cron pattern:', event.cron);

    // Determine which job to run based on cron pattern
    const jobType = CRON_JOB_MAP[event.cron] || 'daily-weather';
    console.log(`[CRON] Job type: ${jobType}`);

    try {
      switch (jobType) {
        case 'daily-weather':
          await runDailyWeather(env, startTime);
          break;
        case 'process-queue':
          await runProcessQueue(env, startTime);
          break;
        case 'quality-check':
          await runQualityCheck(env, startTime);
          break;
        case 'sitemap-analytics':
          await runSitemapAnalytics(env, startTime);
          break;
        default:
          console.log(`[CRON] Unknown job type: ${jobType}, running daily-weather`);
          await runDailyWeather(env, startTime);
      }
    } catch (error) {
      console.error(`[CRON] Error in ${jobType}:`, error);
      if (env.DISCORD_WEBHOOK_URL) {
        await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, `Cron Job Error: ${jobType}`, {
          job: jobType,
          cron: event.cron,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleFetch(request, env, ctx);
  }
};

// ============================================
// Job Handlers
// ============================================

/**
 * 00:00 UTC - Daily weather generation for all 6 languages
 */
async function runDailyWeather(env: Env, startTime: number): Promise<void> {
  console.log('[CRON] Running daily weather generation...');

  const response = await fetch(`${env.PAGES_URL}/api/daily-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': env.ADMIN_KEY,
      'User-Agent': 'therealmofpatterns-cron-worker'
    },
    body: JSON.stringify({
      skip_users: false, // Also update user snapshots
    })
  });

  const result = await response.json() as DailyUpdateResult;
  const duration = Date.now() - startTime;

  if (response.ok && result.success) {
    console.log('[CRON] Daily weather successful:', {
      duration: `${duration}ms`,
      content_generated: result.content_generated,
      languages: result.languages_completed,
      users_updated: result.users_updated,
      snapshots: result.snapshots_created,
      notifications: result.notifications_queued,
      errors: result.errors
    });
  } else {
    console.error('[CRON] Daily weather failed:', result);
    if (env.DISCORD_WEBHOOK_URL) {
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Daily Weather Failed', {
        job: 'daily-weather',
        duration: `${duration}ms`,
        result
      });
    }
  }
}

/**
 * 06:00 UTC - Process content queue (10 items)
 */
async function runProcessQueue(env: Env, startTime: number): Promise<void> {
  console.log('[CRON] Running content queue processing...');

  const response = await fetch(`${env.PAGES_URL}/api/generate-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': env.ADMIN_KEY,
      'User-Agent': 'therealmofpatterns-cron-worker'
    },
    body: JSON.stringify({
      batch_size: 10,
    })
  });

  const result = await response.json() as BatchResult;
  const duration = Date.now() - startTime;

  if (response.ok && result.success) {
    console.log('[CRON] Queue processing successful:', {
      duration: `${duration}ms`,
      generated: result.generated,
      failed: result.failed,
      tokens_used: result.tokens_used
    });
  } else {
    console.error('[CRON] Queue processing failed:', result);
    if (env.DISCORD_WEBHOOK_URL) {
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Queue Processing Failed', {
        job: 'process-queue',
        duration: `${duration}ms`,
        result
      });
    }
  }
}

/**
 * 12:00 UTC - Quality check + retry failed items
 */
async function runQualityCheck(env: Env, startTime: number): Promise<void> {
  console.log('[CRON] Running quality check...');

  const response = await fetch(`${env.PAGES_URL}/api/quality-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': env.ADMIN_KEY,
      'User-Agent': 'therealmofpatterns-cron-worker'
    },
    body: JSON.stringify({
      retry_failed: true,
      max_retries: 3,
    })
  });

  const result = await response.json() as QualityCheckResult;
  const duration = Date.now() - startTime;

  if (response.ok && result.success) {
    console.log('[CRON] Quality check successful:', {
      duration: `${duration}ms`,
      checked: result.checked,
      passed: result.passed,
      failed: result.failed,
      retried: result.retried
    });
  } else {
    console.error('[CRON] Quality check failed:', result);
    if (env.DISCORD_WEBHOOK_URL) {
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Quality Check Failed', {
        job: 'quality-check',
        duration: `${duration}ms`,
        result
      });
    }
  }
}

/**
 * 18:00 UTC - Regenerate sitemap + analytics summary
 */
async function runSitemapAnalytics(env: Env, startTime: number): Promise<void> {
  console.log('[CRON] Running sitemap regeneration and analytics...');

  const response = await fetch(`${env.PAGES_URL}/api/sitemap-analytics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': env.ADMIN_KEY,
      'User-Agent': 'therealmofpatterns-cron-worker'
    },
    body: JSON.stringify({
      regenerate_sitemap: true,
      include_analytics: true,
    })
  });

  const result = await response.json() as SitemapResult;
  const duration = Date.now() - startTime;

  if (response.ok && result.success) {
    console.log('[CRON] Sitemap/analytics successful:', {
      duration: `${duration}ms`,
      pages_indexed: result.pages_indexed,
      sitemap_updated: result.sitemap_updated,
      total_views: result.analytics_summary?.total_views,
      unique_visitors: result.analytics_summary?.unique_visitors
    });
  } else {
    console.error('[CRON] Sitemap/analytics failed:', result);
    if (env.DISCORD_WEBHOOK_URL) {
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Sitemap/Analytics Failed', {
        job: 'sitemap-analytics',
        duration: `${duration}ms`,
        result
      });
    }
  }
}

// ============================================
// HTTP Request Handler (for testing/status)
// ============================================

// Handle direct HTTP requests to the worker (for testing/status)
async function handleFetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  // Manual trigger endpoint - supports triggering specific jobs
  if (url.pathname === '/trigger' && request.method === 'POST') {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${env.ADMIN_KEY}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get job type from request body or query param
    let jobType: CronJob = 'daily-weather';
    try {
      const body = await request.json() as { job?: CronJob };
      if (body.job) jobType = body.job;
    } catch {
      const jobParam = url.searchParams.get('job');
      if (jobParam) jobType = jobParam as CronJob;
    }

    const startTime = Date.now();

    try {
      switch (jobType) {
        case 'daily-weather':
          await runDailyWeather(env, startTime);
          break;
        case 'process-queue':
          await runProcessQueue(env, startTime);
          break;
        case 'quality-check':
          await runQualityCheck(env, startTime);
          break;
        case 'sitemap-analytics':
          await runSitemapAnalytics(env, startTime);
          break;
      }

      return new Response(JSON.stringify({
        triggered: true,
        job: jobType,
        duration: `${Date.now() - startTime}ms`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        triggered: false,
        job: jobType,
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
    description: 'Scheduled content generation, quality checks, and analytics',
    schedules: [
      { cron: '0 0 * * *', job: 'daily-weather', description: 'Daily weather for 6 languages + UV snapshots' },
      { cron: '0 6 * * *', job: 'process-queue', description: 'Process 10 items from content queue' },
      { cron: '0 12 * * *', job: 'quality-check', description: 'Quality validation + retry failed items' },
      { cron: '0 18 * * *', job: 'sitemap-analytics', description: 'Regenerate sitemap + analytics summary' },
    ],
    endpoints: {
      daily_update: `${env.PAGES_URL}/api/daily-update`,
      generate_batch: `${env.PAGES_URL}/api/generate-batch`,
      quality_check: `${env.PAGES_URL}/api/quality-check`,
      sitemap_analytics: `${env.PAGES_URL}/api/sitemap-analytics`,
    },
    features: [
      'Cosmic weather content for 6 languages',
      'Priority queue batch processing',
      'Quality validation with retry logic',
      'Dynamic sitemap generation',
      'Analytics aggregation',
      'Discord alerts on failures',
      'UV snapshots for subscribed users',
      'Threshold alerts and Elder milestones'
    ],
    manual_trigger: 'POST /trigger with Authorization: Bearer <ADMIN_KEY> and body { "job": "daily-weather"|"process-queue"|"quality-check"|"sitemap-analytics" }'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

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
