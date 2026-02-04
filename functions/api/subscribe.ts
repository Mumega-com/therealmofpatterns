/**
 * POST /api/subscribe
 * Add email to Resend contact list
 */

import type { Env, ErrorResponse } from '../../src/types';

interface SubscribeRequest {
  email: string;
}

interface SubscribeResponse {
  success: boolean;
  message: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: SubscribeRequest = await request.json();
    const { email } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address.',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if RESEND_API_KEY is configured
    if (!env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, storing email locally');
      // Fallback: store in KV if Resend not configured
      await env.CACHE.put(`email:${email}`, JSON.stringify({
        email,
        subscribed_at: new Date().toISOString(),
      }));

      const response: SubscribeResponse = {
        success: true,
        message: 'Subscribed successfully',
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add to Resend audience
    const resendResponse = await fetch('https://api.resend.com/audiences/78261eea-8f8b-44a5-b79b-8893759b058f/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.json() as { message?: string };
      // Don't fail if already subscribed
      if (error.message?.includes('already exists')) {
        const response: SubscribeResponse = {
          success: true,
          message: 'Already subscribed',
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(error.message || 'Failed to subscribe');
    }

    const response: SubscribeResponse = {
      success: true,
      message: 'Subscribed successfully',
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'SUBSCRIBE_ERROR',
        message: 'Failed to subscribe. Please try again.',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
