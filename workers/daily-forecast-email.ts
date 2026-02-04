/**
 * Daily Forecast Email Worker
 *
 * Sends personalized daily forecasts to subscribed users.
 * Schedule: 6:00 AM UTC (cron: 0 6 * * *)
 *
 * Required environment variables:
 * - SENDER_API_TOKEN: Sender.net API token
 * - SENDER_FORECAST_GROUP_ID: Group ID for forecast subscribers
 */

import {
  SenderClient,
  generateForecastEmail,
  generateForecastEmailText,
  type ForecastEmailData,
} from '../src/lib/email-sender';

// ============================================
// Types
// ============================================

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  SENDER_API_TOKEN: string;
  SENDER_FORECAST_GROUP_ID: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  birth_date: string;
  birth_time: string | null;
  birth_location: string | null;
  timezone: string;
  email_notifications: number;
}

interface DailySnapshot {
  kappa: number;
  dominant_dimension: string;
  dimension_symbol: string;
}

// Dimension metadata
const DIMENSIONS: Record<string, { name: string; symbol: string }> = {
  '0': { name: 'Origin', symbol: '◯' },
  '1': { name: 'Desire', symbol: '△' },
  '2': { name: 'Power', symbol: '□' },
  '3': { name: 'Love', symbol: '♡' },
  '4': { name: 'Expression', symbol: '☆' },
  '5': { name: 'Mind', symbol: '◇' },
  '6': { name: 'Harmony', symbol: '⬡' },
  '7': { name: 'Depth', symbol: '◈' },
  '8': { name: 'Expansion', symbol: '✧' },
  '9': { name: 'Structure', symbol: '▣' },
  '10': { name: 'Innovation', symbol: '⚡' },
  '11': { name: 'Transcendence', symbol: '∞' },
  '12': { name: 'Intuition', symbol: '☽' },
  '13': { name: 'Warrior', symbol: '♂' },
  '14': { name: 'Fortune', symbol: '♃' },
  '15': { name: 'Discipline', symbol: '♄' },
};

// ============================================
// Main Handler
// ============================================

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[DAILY-FORECAST] Starting daily forecast email job...');

    try {
      const result = await sendDailyForecasts(env);
      console.log(`[DAILY-FORECAST] Complete: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`);
    } catch (error) {
      console.error('[DAILY-FORECAST] Job failed:', error);
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    // Manual trigger endpoint
    const url = new URL(request.url);

    if (url.pathname === '/trigger' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
      }

      const result = await sendDailyForecasts(env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'daily-forecast-email',
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Daily Forecast Email Worker', { status: 200 });
  },
};

// ============================================
// Core Logic
// ============================================

async function sendDailyForecasts(env: Env): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  if (!env.SENDER_API_TOKEN) {
    result.errors.push('SENDER_API_TOKEN not configured');
    return result;
  }

  const sender = new SenderClient(env.SENDER_API_TOKEN);
  const today = new Date().toISOString().split('T')[0];

  // Get users who have email notifications enabled
  const users = await env.DB.prepare(`
    SELECT id, email, name, birth_date, birth_time, birth_location, timezone, email_notifications
    FROM users
    WHERE email_notifications = 1
    AND email IS NOT NULL
    AND email != ''
    LIMIT 1000
  `).all<UserProfile>();

  if (!users.results || users.results.length === 0) {
    console.log('[DAILY-FORECAST] No users with email notifications enabled');
    return result;
  }

  console.log(`[DAILY-FORECAST] Processing ${users.results.length} users...`);

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < users.results.length; i += batchSize) {
    const batch = users.results.slice(i, i + batchSize);

    await Promise.all(batch.map(async (user) => {
      try {
        // Check if already sent today
        const sentKey = `forecast_sent:${user.id}:${today}`;
        const alreadySent = await env.CACHE.get(sentKey);
        if (alreadySent) {
          result.skipped++;
          return;
        }

        // Get user's daily snapshot
        const snapshot = await env.DB.prepare(`
          SELECT kappa, dominant_dimension, dimension_symbol
          FROM user_snapshots
          WHERE user_id = ?
          AND date = ?
        `).bind(user.id, today).first<DailySnapshot>();

        // Generate forecast data
        const forecastData = generateForecastData(user, snapshot, today);

        // Generate email content
        const html = generateForecastEmail(forecastData);
        const text = generateForecastEmailText(forecastData);

        // Send email
        const sendResult = await sender.sendEmail({
          to: { email: user.email, name: user.name || undefined },
          subject: `Your forecast for ${formatDate(today)}`,
          html,
          text,
          tags: ['daily-forecast', today],
        });

        if (sendResult.success) {
          result.sent++;
          // Mark as sent
          await env.CACHE.put(sentKey, '1', { expirationTtl: 86400 }); // 24 hours
        } else {
          result.failed++;
          result.errors.push(`${user.email}: ${sendResult.error}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`${user.email}: ${(error as Error).message}`);
      }
    }));

    // Small delay between batches to avoid rate limits
    if (i + batchSize < users.results.length) {
      await sleep(1000);
    }
  }

  return result;
}

// ============================================
// Helpers
// ============================================

function generateForecastData(
  user: UserProfile,
  snapshot: DailySnapshot | null,
  date: string
): ForecastEmailData {
  // Default values if no snapshot
  const kappa = snapshot?.kappa ?? 0.5 + Math.random() * 0.3;
  const dominantIndex = snapshot?.dominant_dimension ?? String(Math.floor(Math.random() * 16));
  const dimension = DIMENSIONS[dominantIndex] || DIMENSIONS['0'];

  // Generate contextual content based on dimension and kappa
  const { summary, optimal, caution, weekHighlight } = generateDynamicContent(
    dimension.name,
    kappa,
    date
  );

  return {
    userName: user.name || undefined,
    kappa,
    dominantDimension: dimension.name,
    dimensionSymbol: dimension.symbol,
    summary,
    optimalActivities: optimal,
    cautionAreas: caution,
    weekHighlight,
    date: formatDate(date),
  };
}

function generateDynamicContent(
  dimension: string,
  kappa: number,
  date: string
): {
  summary: string;
  optimal: string[];
  caution: string[];
  weekHighlight?: string;
} {
  // Content library based on dimension
  const content: Record<string, {
    high: { summary: string; optimal: string[]; caution: string[] };
    medium: { summary: string; optimal: string[]; caution: string[] };
    low: { summary: string; optimal: string[]; caution: string[] };
  }> = {
    Origin: {
      high: {
        summary: "Something wants to begin today. There's fresh energy available for new starts and clean slates. Trust what emerges.",
        optimal: ['Starting projects', 'Fresh perspectives', 'Setting intentions'],
        caution: ['Holding onto the past', 'Overthinking beginnings'],
      },
      medium: {
        summary: "Steady ground today. Good for continuing what you've already started rather than launching anything new.",
        optimal: ['Maintenance tasks', 'Reflection time', 'Simple routines'],
        caution: ['Major decisions', 'Rushing new ideas'],
      },
      low: {
        summary: "Energy is low for new beginnings. This is a day for rest and processing, not launching forward.",
        optimal: ['Rest', 'Completion tasks', 'Letting go'],
        caution: ['Starting new projects', 'Making commitments'],
      },
    },
    Expression: {
      high: {
        summary: "Your voice carries weight today. Speak up, share ideas, put yourself out there. Others are ready to hear you.",
        optimal: ['Presentations', 'Creative work', 'Difficult conversations'],
        caution: ['Holding back', 'Staying quiet'],
      },
      medium: {
        summary: "Moderate creative energy. Good for refining work rather than producing from scratch.",
        optimal: ['Editing', 'Collaboration', 'Light brainstorming'],
        caution: ['Demanding perfection', 'Solo creative sprints'],
      },
      low: {
        summary: "Not the day to pitch or perform. Better to absorb and observe than express.",
        optimal: ['Listening', 'Research', 'Taking notes'],
        caution: ['Public speaking', 'Creative deadlines'],
      },
    },
    Mind: {
      high: {
        summary: "Mental clarity is strong. Analysis, planning, and complex problem-solving come easier today.",
        optimal: ['Strategic planning', 'Learning', 'Detail work'],
        caution: ['Ignoring logic', 'Purely emotional decisions'],
      },
      medium: {
        summary: "Moderate mental energy. Handle routine intellectual tasks, save complex analysis for another day.",
        optimal: ['Routine admin', 'Light reading', 'Simple decisions'],
        caution: ['Complex calculations', 'Major strategic shifts'],
      },
      low: {
        summary: "The mind wants rest. Don't force complex thinking - trust your gut over your head today.",
        optimal: ['Physical activities', 'Intuitive choices', 'Simple tasks'],
        caution: ['Analytical work', 'Learning new systems'],
      },
    },
    // Add more dimensions as needed - using defaults for others
    default: {
      high: {
        summary: "Strong alignment today. Your energy flows smoothly, and you're likely to feel in sync with what matters.",
        optimal: ['Important tasks', 'Meaningful conversations', 'Taking action'],
        caution: ['Procrastinating', 'Second-guessing yourself'],
      },
      medium: {
        summary: "Moderate day ahead. Not particularly high or low - good for steady progress without major pushes.",
        optimal: ['Routine work', 'Maintenance', 'Small wins'],
        caution: ['High-stakes decisions', 'Overcommitting'],
      },
      low: {
        summary: "Take it easy today. Energy is lower than usual - be gentle with expectations.",
        optimal: ['Rest', 'Light tasks', 'Self-care'],
        caution: ['Demanding schedules', 'Important meetings'],
      },
    },
  };

  const dimContent = content[dimension] || content.default;
  const level = kappa >= 0.7 ? 'high' : kappa >= 0.4 ? 'medium' : 'low';

  // Check for weekend highlight
  const dayOfWeek = new Date(date).getDay();
  let weekHighlight: string | undefined;

  if (dayOfWeek === 1) { // Monday
    weekHighlight = "This week carries momentum. Thursday looks particularly good for important conversations.";
  } else if (dayOfWeek === 5) { // Friday
    weekHighlight = "The weekend ahead favors reflection. Consider what worked this week and what didn't.";
  }

  return {
    ...dimContent[level],
    weekHighlight,
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
