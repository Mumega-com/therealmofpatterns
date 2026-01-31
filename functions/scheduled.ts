/**
 * Cloudflare Cron Trigger Handler
 * Runs daily at 00:00 UTC
 *
 * Triggers daily UV snapshot updates for all subscribed users
 */

import { Env } from '../src/types';

export const onRequest: PagesFunction<Env, never, { scheduledTime: number }> = async (context) => {
  const { env } = context;

  try {
    console.log('[CRON] Starting daily UV update job...');

    // Call the daily-update API endpoint
    const response = await fetch('https://therealmofpatterns.pages.dev/api/daily-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cf-Cron-Auth': 'internal' // This header authenticates the cron request
      },
      body: JSON.stringify({})
    });

    const result = await response.json();

    console.log('[CRON] Daily update completed:', result);

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily UV update job completed',
      result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CRON] Daily update failed:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Export for Cloudflare Workers cron syntax
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('[CRON] Scheduled event triggered at:', new Date(event.scheduledTime).toISOString());

  try {
    // Call daily-update endpoint
    const updateUrl = `${env.APP_URL}/api/daily-update`;

    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cf-Cron-Auth': 'internal'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    console.log('[CRON] Update result:', result);

    // Process notification queue (send emails/SMS)
    await processNotificationQueue(env);

    console.log('[CRON] Daily job completed successfully');

  } catch (error) {
    console.error('[CRON] Job failed:', error);
    // Could send alert to monitoring service here
  }
}

async function processNotificationQueue(env: Env): Promise<void> {
  // Get pending notifications
  const { results: notifications } = await env.DB.prepare(`
    SELECT * FROM notification_queue
    WHERE status = 'pending'
    AND scheduled_for <= ?
    ORDER BY scheduled_for ASC
    LIMIT 100
  `).bind(new Date().toISOString()).all();

  if (!notifications || notifications.length === 0) {
    console.log('[CRON] No pending notifications');
    return;
  }

  console.log(`[CRON] Processing ${notifications.length} notifications...`);

  for (const notification of notifications) {
    try {
      // Get user email
      const user = await env.DB.prepare(`
        SELECT email FROM user_profiles WHERE email_hash = ?
      `).bind(notification.user_email_hash).first();

      if (!user) {
        console.error(`User not found for hash: ${notification.user_email_hash}`);
        continue;
      }

      // TODO: Send actual email via Resend, SendGrid, or Cloudflare Email Workers
      // For now, just mark as sent
      console.log(`[CRON] Would send email to ${user.email}: ${notification.subject}`);

      // Mark as sent
      await env.DB.prepare(`
        UPDATE notification_queue
        SET status = 'sent', sent_at = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), notification.id).run();

    } catch (error) {
      console.error(`Failed to send notification ${notification.id}:`, error);

      // Mark as failed
      await env.DB.prepare(`
        UPDATE notification_queue
        SET status = 'failed', error_message = ?
        WHERE id = ?
      `).bind(
        error instanceof Error ? error.message : 'Unknown error',
        notification.id
      ).run();
    }
  }

  console.log('[CRON] Notification processing complete');
}

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}
