/**
 * Alerting System
 *
 * Sends notifications when critical issues are detected.
 * Supports multiple channels: Slack, Discord, Email, Webhooks.
 *
 * Configuration via environment variables:
 * - ALERT_SLACK_WEBHOOK: Slack incoming webhook URL
 * - ALERT_DISCORD_WEBHOOK: Discord webhook URL
 * - ALERT_EMAIL: Destination email for alerts
 * - ALERT_WEBHOOK: Generic webhook URL
 */

// ============================================
// Types
// ============================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  title: string;
  message: string;
  severity: AlertSeverity;
  source?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export interface AlertChannel {
  type: 'slack' | 'discord' | 'email' | 'webhook';
  url?: string;
  email?: string;
  enabled: boolean;
}

interface AlertConfig {
  channels: AlertChannel[];
  throttleMinutes?: number;
  minSeverity?: AlertSeverity;
}

// ============================================
// Severity Helpers
// ============================================

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: '#3b82f6',     // blue
  warning: '#eab308',  // yellow
  error: '#ef4444',    // red
  critical: '#dc2626', // dark red
};

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  info: 'information_source',
  warning: 'warning',
  error: 'x',
  critical: 'rotating_light',
};

// ============================================
// Alert Throttling
// ============================================

const alertHistory: Map<string, number> = new Map();

function shouldThrottle(alert: Alert, throttleMinutes: number): boolean {
  const key = `${alert.source}:${alert.title}`;
  const lastSent = alertHistory.get(key);

  if (!lastSent) return false;

  const minutesSinceLast = (Date.now() - lastSent) / (1000 * 60);
  return minutesSinceLast < throttleMinutes;
}

function recordAlertSent(alert: Alert): void {
  const key = `${alert.source}:${alert.title}`;
  alertHistory.set(key, Date.now());
}

// ============================================
// Channel Formatters
// ============================================

function formatSlackMessage(alert: Alert): unknown {
  return {
    attachments: [
      {
        color: SEVERITY_COLORS[alert.severity],
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `:${SEVERITY_EMOJI[alert.severity]}: ${alert.title}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: alert.message,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Source:* ${alert.source || 'unknown'} | *Time:* ${alert.timestamp || new Date().toISOString()}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

function formatDiscordMessage(alert: Alert): unknown {
  return {
    embeds: [
      {
        title: alert.title,
        description: alert.message,
        color: parseInt(SEVERITY_COLORS[alert.severity].replace('#', ''), 16),
        timestamp: alert.timestamp || new Date().toISOString(),
        footer: {
          text: `Source: ${alert.source || 'unknown'}`,
        },
        fields: alert.data
          ? Object.entries(alert.data).map(([name, value]) => ({
              name,
              value: String(value),
              inline: true,
            }))
          : undefined,
      },
    ],
  };
}

function formatWebhookMessage(alert: Alert): unknown {
  return {
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString(),
  };
}

// ============================================
// Send Functions
// ============================================

async function sendToSlack(url: string, alert: Alert): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatSlackMessage(alert)),
    });
    return response.ok;
  } catch (error) {
    console.error('[Alerting] Slack send failed:', error);
    return false;
  }
}

async function sendToDiscord(url: string, alert: Alert): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatDiscordMessage(alert)),
    });
    return response.ok;
  } catch (error) {
    console.error('[Alerting] Discord send failed:', error);
    return false;
  }
}

async function sendToWebhook(url: string, alert: Alert): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatWebhookMessage(alert)),
    });
    return response.ok;
  } catch (error) {
    console.error('[Alerting] Webhook send failed:', error);
    return false;
  }
}

async function sendEmail(
  to: string,
  alert: Alert,
  mailEnv?: { DKIM_DOMAIN?: string; DKIM_SELECTOR?: string; DKIM_PRIVATE_KEY?: string }
): Promise<boolean> {
  // Using Cloudflare MailChannels (free for Workers)
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'alerts@therealmofpatterns.com', name: 'RoP Alerts' },
    subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    content: [
      {
        type: 'text/plain',
        value: `${alert.message}\n\nSource: ${alert.source || 'unknown'}\nTime: ${alert.timestamp || new Date().toISOString()}\n\n${
          alert.data ? JSON.stringify(alert.data, null, 2) : ''
        }`,
      },
    ],
  };

  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(mailEnv?.DKIM_DOMAIN && {
          'X-DKIM-Domain': mailEnv.DKIM_DOMAIN,
          'X-DKIM-Selector': mailEnv.DKIM_SELECTOR || 'mailchannels',
          'X-DKIM-Private-Key': mailEnv.DKIM_PRIVATE_KEY || '',
        }),
      },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch (error) {
    console.error('[Alerting] Email send failed:', error);
    return false;
  }
}

// ============================================
// Main Alert Function
// ============================================

/**
 * Send an alert to all configured channels
 */
export async function sendAlert(
  alert: Alert,
  config: AlertConfig
): Promise<{ success: boolean; sent: string[]; failed: string[] }> {
  const results = {
    success: true,
    sent: [] as string[],
    failed: [] as string[],
  };

  // Apply defaults
  alert.timestamp = alert.timestamp || new Date().toISOString();

  // Check minimum severity
  if (config.minSeverity) {
    if (SEVERITY_ORDER[alert.severity] < SEVERITY_ORDER[config.minSeverity]) {
      return results; // Skip low-severity alerts
    }
  }

  // Check throttling
  if (config.throttleMinutes && shouldThrottle(alert, config.throttleMinutes)) {
    console.log('[Alerting] Throttled:', alert.title);
    return results;
  }

  // Send to each channel
  for (const channel of config.channels) {
    if (!channel.enabled) continue;

    let success = false;

    switch (channel.type) {
      case 'slack':
        if (channel.url) success = await sendToSlack(channel.url, alert);
        break;
      case 'discord':
        if (channel.url) success = await sendToDiscord(channel.url, alert);
        break;
      case 'webhook':
        if (channel.url) success = await sendToWebhook(channel.url, alert);
        break;
      case 'email':
        if (channel.email) success = await sendEmail(channel.email, alert);
        break;
    }

    if (success) {
      results.sent.push(channel.type);
    } else {
      results.failed.push(channel.type);
      results.success = false;
    }
  }

  // Record sent time for throttling
  if (results.sent.length > 0) {
    recordAlertSent(alert);
  }

  return results;
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Create config from environment variables
 */
export function configFromEnv(env: Record<string, string | undefined>): AlertConfig {
  const channels: AlertChannel[] = [];

  if (env.ALERT_SLACK_WEBHOOK) {
    channels.push({ type: 'slack', url: env.ALERT_SLACK_WEBHOOK, enabled: true });
  }

  if (env.ALERT_DISCORD_WEBHOOK) {
    channels.push({ type: 'discord', url: env.ALERT_DISCORD_WEBHOOK, enabled: true });
  }

  if (env.ALERT_EMAIL) {
    channels.push({ type: 'email', email: env.ALERT_EMAIL, enabled: true });
  }

  if (env.ALERT_WEBHOOK) {
    channels.push({ type: 'webhook', url: env.ALERT_WEBHOOK, enabled: true });
  }

  return {
    channels,
    throttleMinutes: parseInt(env.ALERT_THROTTLE_MINUTES || '5'),
    minSeverity: (env.ALERT_MIN_SEVERITY as AlertSeverity) || 'warning',
  };
}

/**
 * Quick alert helpers
 */
export const alerts = {
  info: (title: string, message: string, source?: string) =>
    ({ title, message, severity: 'info' as const, source }),

  warning: (title: string, message: string, source?: string) =>
    ({ title, message, severity: 'warning' as const, source }),

  error: (title: string, message: string, source?: string) =>
    ({ title, message, severity: 'error' as const, source }),

  critical: (title: string, message: string, source?: string) =>
    ({ title, message, severity: 'critical' as const, source }),

  // Pre-built alerts for common scenarios
  healthCheckFailed: (checks: string[]) => ({
    title: 'Health Check Failed',
    message: `The following checks failed: ${checks.join(', ')}`,
    severity: 'error' as const,
    source: 'health-check',
    data: { failedChecks: checks },
  }),

  highErrorRate: (rate: number, threshold: number) => ({
    title: 'High Error Rate',
    message: `Error rate ${rate.toFixed(1)}% exceeds threshold ${threshold}%`,
    severity: 'critical' as const,
    source: 'monitoring',
    data: { rate, threshold },
  }),

  databaseError: (error: string) => ({
    title: 'Database Error',
    message: `D1 database error: ${error}`,
    severity: 'critical' as const,
    source: 'database',
    data: { error },
  }),

  paymentFailed: (userId: string, amount: number) => ({
    title: 'Payment Failed',
    message: `Payment of $${amount} failed for user ${userId}`,
    severity: 'warning' as const,
    source: 'stripe',
    data: { userId, amount },
  }),

  subscriptionCancelled: (userId: string, tier: string) => ({
    title: 'Subscription Cancelled',
    message: `User ${userId} cancelled their ${tier} subscription`,
    severity: 'info' as const,
    source: 'stripe',
    data: { userId, tier },
  }),

  newSignup: (userId: string, source: string) => ({
    title: 'New User Signup',
    message: `New user ${userId} signed up via ${source}`,
    severity: 'info' as const,
    source: 'auth',
    data: { userId, acquisitionSource: source },
  }),
};
