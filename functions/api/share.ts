/**
 * POST /api/share
 * Share results to social media (Twitter, Telegram, Discord)
 */

import { Env, ErrorResponse } from '../../src/types';

interface ShareRequest {
  platform: 'twitter' | 'telegram' | 'discord';
  message: string;
  include_image?: boolean;
  image_url?: string;
}

interface ShareResponse {
  success: boolean;
  post_url?: string;
  message?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse('Missing authorization token');
    }

    const token = authHeader.split(' ')[1];

    // Verify session token
    const sessionData = await env.CACHE.get(`session:${token}`);
    if (!sessionData) {
      return unauthorizedResponse('Invalid or expired session');
    }

    // Parse request
    const body: ShareRequest = await request.json();
    const { platform, message, include_image, image_url } = body;

    if (!platform || !message) {
      return badRequestResponse('Platform and message are required');
    }

    let result: ShareResponse;

    switch (platform) {
      case 'twitter':
        result = await shareToTwitter(env, message, include_image ? image_url : undefined);
        break;
      case 'telegram':
        result = await shareToTelegram(env, message, include_image ? image_url : undefined);
        break;
      case 'discord':
        result = await shareToDiscord(env, message, include_image ? image_url : undefined);
        break;
      default:
        return badRequestResponse('Invalid platform. Use twitter, telegram, or discord.');
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Share error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to share to social media.',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ============================================
// Platform Handlers
// ============================================

async function shareToTwitter(
  env: Env,
  message: string,
  imageUrl?: string
): Promise<ShareResponse> {
  if (!env.TWITTER_BEARER_TOKEN) {
    return {
      success: false,
      message: 'Twitter integration not configured',
    };
  }

  try {
    // Twitter API v2 - Create Tweet
    // Note: For posting, you need OAuth 1.0a user context or OAuth 2.0 with user authentication
    // This is a simplified example - production would need proper OAuth flow

    const tweetData: Record<string, string> = {
      text: message,
    };

    // If we have an image, we'd need to upload it first via media endpoint
    // For now, just include the URL in the text
    if (imageUrl) {
      tweetData.text = `${message}\n\n${imageUrl}`;
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twitter API error:', error);
      return {
        success: false,
        message: 'Failed to post to Twitter',
      };
    }

    const result = await response.json() as { data?: { id: string } };

    return {
      success: true,
      post_url: result.data ? `https://twitter.com/i/status/${result.data.id}` : undefined,
    };
  } catch (error) {
    console.error('Twitter share error:', error);
    return {
      success: false,
      message: 'Twitter API error',
    };
  }
}

async function shareToTelegram(
  env: Env,
  message: string,
  imageUrl?: string
): Promise<ShareResponse> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return {
      success: false,
      message: 'Telegram integration not configured',
    };
  }

  try {
    // For Telegram, we'd typically send to a channel or chat
    // This example sends to a predefined channel (would need TELEGRAM_CHANNEL_ID)
    const channelId = '@therealmofpatterns'; // Example channel

    let endpoint: string;
    let body: Record<string, string>;

    if (imageUrl) {
      endpoint = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
      body = {
        chat_id: channelId,
        photo: imageUrl,
        caption: message,
        parse_mode: 'HTML',
      };
    } else {
      endpoint = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      body = {
        chat_id: channelId,
        text: message,
        parse_mode: 'HTML',
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
      return {
        success: false,
        message: 'Failed to post to Telegram',
      };
    }

    const result = await response.json() as { ok: boolean; result?: { message_id: number } };

    return {
      success: result.ok,
      post_url: result.result ? `https://t.me/therealmofpatterns/${result.result.message_id}` : undefined,
    };
  } catch (error) {
    console.error('Telegram share error:', error);
    return {
      success: false,
      message: 'Telegram API error',
    };
  }
}

async function shareToDiscord(
  env: Env,
  message: string,
  imageUrl?: string
): Promise<ShareResponse> {
  if (!env.DISCORD_WEBHOOK_URL) {
    return {
      success: false,
      message: 'Discord integration not configured',
    };
  }

  try {
    const webhookPayload: Record<string, unknown> = {
      content: message,
      username: 'The Realm of Patterns',
    };

    if (imageUrl) {
      webhookPayload.embeds = [
        {
          image: { url: imageUrl },
          color: 13145395, // Gold color
        },
      ];
    }

    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Discord webhook error:', error);
      return {
        success: false,
        message: 'Failed to post to Discord',
      };
    }

    return {
      success: true,
      message: 'Posted to Discord successfully',
    };
  } catch (error) {
    console.error('Discord share error:', error);
    return {
      success: false,
      message: 'Discord webhook error',
    };
  }
}

// ============================================
// Error Helpers
// ============================================

function unauthorizedResponse(message: string): Response {
  const error: ErrorResponse = {
    success: false,
    error: { code: 'UNAUTHORIZED', message },
  };
  return new Response(JSON.stringify(error), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequestResponse(message: string): Response {
  const error: ErrorResponse = {
    success: false,
    error: { code: 'INVALID_INPUT', message },
  };
  return new Response(JSON.stringify(error), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
