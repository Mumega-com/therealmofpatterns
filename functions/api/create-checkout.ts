/**
 * POST /api/create-checkout
 * Create a Stripe subscription checkout session for Pro tier
 */

import type { Env, ErrorResponse } from '../../src/types';

interface CreateCheckoutRequest {
  priceId?: string;
  email?: string;
}

interface CreateCheckoutResponse {
  success: boolean;
  sessionId: string;
  url: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: CreateCheckoutRequest = await request.json();
    const { priceId, email } = body;

    // Map price IDs to Stripe price IDs
    const priceMap: Record<string, string> = {
      'price_pro_monthly': env.STRIPE_PRO_PRICE_ID || '',
    };

    const stripePriceId = priceMap[priceId || 'price_pro_monthly'];
    if (!stripePriceId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_PRICE',
          message: 'Invalid price selected or Pro pricing not configured.',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Stripe subscription checkout session
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', stripePriceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${env.APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}&pro=true`);
    params.append('cancel_url', `${env.APP_URL}/pricing?canceled=true`);
    params.append('allow_promotion_codes', 'true');
    if (email) {
      params.append('customer_email', email);
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await stripeResponse.json() as {
      id: string;
      url: string;
      error?: { message: string }
    };

    if (session.error) {
      console.error('Stripe error:', session.error.message);
      throw new Error(session.error.message);
    }

    if (!stripeResponse.ok) {
      throw new Error('Failed to create checkout session');
    }

    const response: CreateCheckoutResponse = {
      success: true,
      sessionId: session.id,
      url: session.url,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'CHECKOUT_ERROR',
        message: 'Failed to create checkout. Please try again.',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
