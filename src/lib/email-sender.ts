/**
 * Email Service using Sender.net API
 *
 * Handles transactional emails and daily forecast broadcasts.
 * API docs: https://api.sender.net/
 *
 * Required env vars:
 * - SENDER_API_TOKEN: API token from Sender dashboard
 * - SENDER_GROUP_ID: Subscriber group ID for forecasts (optional)
 */

// ============================================
// Types
// ============================================

export interface EmailRecipient {
  email: string;
  name?: string;
  fields?: Record<string, string>;
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  from?: {
    name: string;
    email: string;
  };
  replyTo?: string;
  tags?: string[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ForecastEmailData {
  userName?: string;
  kappa: number;
  dominantDimension: string;
  dimensionSymbol: string;
  summary: string;
  optimalActivities: string[];
  cautionAreas: string[];
  weekHighlight?: string;
  date: string;
}

// ============================================
// Sender API Client
// ============================================

export class SenderClient {
  private baseUrl = 'https://api.sender.net/v2';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sender API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Send a transactional email
   */
  async sendEmail(options: EmailOptions): Promise<SendResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    try {
      const payload = {
        from: options.from || {
          name: 'The Realm of Patterns',
          email: 'hello@therealmofpatterns.com',
        },
        reply_to: options.replyTo,
        recipients: recipients.map(r => ({
          email: r.email,
          name: r.name,
          fields: r.fields,
        })),
        subject: options.subject,
        html: options.html,
        plain: options.text,
        tags: options.tags,
      };

      const result = await this.request('/emails', 'POST', payload) as { data?: { id: string } };

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error('[Sender] Email send failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Add subscriber to a group
   */
  async addSubscriber(
    email: string,
    groupId: string,
    fields?: Record<string, string>
  ): Promise<{ success: boolean; subscriberId?: string }> {
    try {
      const result = await this.request('/subscribers', 'POST', {
        email,
        groups: [groupId],
        fields,
      }) as { data?: { id: string } };

      return {
        success: true,
        subscriberId: result.data?.id,
      };
    } catch (error) {
      console.error('[Sender] Add subscriber failed:', error);
      return { success: false };
    }
  }

  /**
   * Remove subscriber from a group (unsubscribe)
   */
  async removeSubscriber(email: string, groupId: string): Promise<boolean> {
    try {
      await this.request(`/subscribers/${encodeURIComponent(email)}/groups/${groupId}`, 'DELETE');
      return true;
    } catch (error) {
      console.error('[Sender] Remove subscriber failed:', error);
      return false;
    }
  }

  /**
   * Get subscribers in a group
   */
  async getSubscribers(groupId: string, limit = 100, offset = 0): Promise<EmailRecipient[]> {
    try {
      const result = await this.request(
        `/groups/${groupId}/subscribers?limit=${limit}&offset=${offset}`
      ) as { data?: Array<{ email: string; firstname?: string; fields?: Record<string, string> }> };

      return (result.data || []).map(s => ({
        email: s.email,
        name: s.firstname,
        fields: s.fields,
      }));
    } catch (error) {
      console.error('[Sender] Get subscribers failed:', error);
      return [];
    }
  }
}

// ============================================
// Email Templates
// ============================================

/**
 * Generate daily forecast email HTML (Sol voice)
 */
export function generateForecastEmail(data: ForecastEmailData): string {
  const kappaPercent = Math.round(data.kappa * 100);
  const kappaColor = data.kappa >= 0.7 ? '#22c55e' : data.kappa >= 0.4 ? '#eab308' : '#ef4444';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Forecast</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fffbf5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #fff8e7 0%, #fff5eb 100%); border-radius: 16px;">

        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding-bottom: 30px;">
              <div style="font-size: 28px; margin-bottom: 8px;">
                ${data.dimensionSymbol}
              </div>
              <h1 style="margin: 0; font-size: 24px; color: #1a1a1a; font-weight: 600;">
                ${data.userName ? `Good morning, ${data.userName}` : 'Good morning'}
              </h1>
              <p style="margin: 8px 0 0; color: #666; font-size: 14px;">
                ${data.date}
              </p>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 20px 0;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;">
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 24px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #333;">
                ${data.summary}
              </p>
            </td>
          </tr>
        </table>

        <!-- Kappa Score -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background: white; border-radius: 12px; padding: 20px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                Today's Alignment
              </p>
              <div style="font-size: 48px; font-weight: 700; color: ${kappaColor};">
                ${kappaPercent}%
              </div>
              <p style="margin: 8px 0 0; font-size: 14px; color: #666;">
                Dominant: ${data.dominantDimension}
              </p>
            </td>
          </tr>
        </table>

        <!-- Good For -->
        ${data.optimalActivities.length > 0 ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
          <tr>
            <td style="background: rgba(34, 197, 94, 0.1); border-radius: 8px; padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #22c55e; font-weight: 600;">
                Good energy for:
              </p>
              <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.6;">
                ${data.optimalActivities.join(' • ')}
              </p>
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- Be Mindful Of -->
        ${data.cautionAreas.length > 0 ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="background: rgba(234, 179, 8, 0.1); border-radius: 8px; padding: 16px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #ca8a04; font-weight: 600;">
                Be mindful of:
              </p>
              <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.6;">
                ${data.cautionAreas.join(' • ')}
              </p>
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- Week Highlight -->
        ${data.weekHighlight ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td style="border-left: 3px solid #f59e0b; padding-left: 16px;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #888;">
                Looking ahead
              </p>
              <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.5;">
                ${data.weekHighlight}
              </p>
            </td>
          </tr>
        </table>
        ` : ''}

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding-top: 16px;">
              <a href="https://therealmofpatterns.com/sol"
                 style="display: inline-block; padding: 14px 28px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                See Full Forecast
              </a>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 30px 0 20px;">
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;">
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 16px; font-size: 12px; color: #888;">
                The Realm of Patterns
              </p>
              <p style="margin: 0; font-size: 11px; color: #aaa;">
                <a href="https://therealmofpatterns.com/preferences" style="color: #888; text-decoration: underline;">
                  Email Preferences
                </a>
                &nbsp;•&nbsp;
                <a href="https://therealmofpatterns.com/unsubscribe?email={{email}}" style="color: #888; text-decoration: underline;">
                  Unsubscribe
                </a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of forecast email
 */
export function generateForecastEmailText(data: ForecastEmailData): string {
  const kappaPercent = Math.round(data.kappa * 100);

  return `
${data.userName ? `Good morning, ${data.userName}` : 'Good morning'}
${data.date}

─────────────────────────────────

${data.summary}

─────────────────────────────────

TODAY'S ALIGNMENT: ${kappaPercent}%
Dominant: ${data.dimensionSymbol} ${data.dominantDimension}

${data.optimalActivities.length > 0 ? `
Good energy for:
${data.optimalActivities.map(a => `• ${a}`).join('\n')}
` : ''}
${data.cautionAreas.length > 0 ? `
Be mindful of:
${data.cautionAreas.map(a => `• ${a}`).join('\n')}
` : ''}
${data.weekHighlight ? `
Looking ahead:
${data.weekHighlight}
` : ''}
─────────────────────────────────

See full forecast: https://therealmofpatterns.com/sol

─────────────────────────────────

The Realm of Patterns
Unsubscribe: https://therealmofpatterns.com/unsubscribe?email={{email}}
  `.trim();
}

/**
 * Generate welcome email
 */
export function generateWelcomeEmail(name?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fffbf5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #fff8e7 0%, #fff5eb 100%); border-radius: 16px;">

        <h1 style="margin: 0 0 20px; font-size: 24px; color: #1a1a1a; text-align: center;">
          Welcome to The Realm of Patterns
        </h1>

        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #333;">
          ${name ? `Hi ${name},` : 'Hello,'}
        </p>

        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #333;">
          You've just taken your first step into understanding your cosmic patterns.
          Every day, the sky speaks a different language - and now you have a way to listen.
        </p>

        <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #333;">
          Starting tomorrow, you'll receive a daily forecast tailored to your unique pattern.
          Short. Practical. No mystical fluff - just guidance you can actually use.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center;">
              <a href="https://therealmofpatterns.com/sol/checkin"
                 style="display: inline-block; padding: 14px 28px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Do Your First Check-in
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; font-size: 14px; color: #666; text-align: center;">
          See you in the patterns,<br>
          The Realm Team
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
