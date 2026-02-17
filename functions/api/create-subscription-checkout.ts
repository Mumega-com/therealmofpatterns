/**
 * POST /api/create-subscription-checkout
 * Create a Stripe Checkout session for Pro or Team subscription.
 *
 * Expects JSON body:
 *   { plan: 'individual' | 'squad', email: string, billingPeriod?: 'monthly' | 'annual',
 *     seats?: number, circleName?: string }
 *
 * Returns: { success: true, sessionId: string, url: string }
 */

import type { Env } from '../../src/types';

interface CheckoutRequest {
  plan: 'individual' | 'squad';
  email: string;
  billingPeriod?: 'monthly' | 'annual';
  circleName?: string;
  seats?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as CheckoutRequest;
    const { plan, email, billingPeriod = 'monthly', circleName, seats = 3 } = body;

    // Validate
    if (!email || !email.includes('@')) {
      return jsonError('Please provide a valid email address.', 400);
    }
    if (!['individual', 'squad'].includes(plan)) {
      return jsonError('Invalid plan. Choose "individual" or "squad".', 400);
    }

    // Resolve the correct Stripe Price ID
    const priceId = getPriceId(env, plan, billingPeriod);
    if (!priceId) {
      return jsonError(
        'Pricing is not configured yet. Please try again later or contact support.',
        503,
      );
    }

    const quantity = plan === 'squad' ? Math.max(3, Math.min(50, seats)) : 1;
    const trialDays = plan === 'squad' ? 14 : 7;

    // Build Stripe Checkout params
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', quantity.toString());
    params.append('customer_email', email);
    params.append('allow_promotion_codes', 'true');

    // Trial
    params.append('subscription_data[trial_period_days]', trialDays.toString());

    // Metadata (available in webhooks)
    params.append('metadata[plan]', plan);
    params.append('metadata[billing_period]', billingPeriod);
    params.append('subscription_data[metadata][plan]', plan);
    params.append('subscription_data[metadata][billing_period]', billingPeriod);

    if (plan === 'squad') {
      params.append('metadata[seats]', quantity.toString());
      params.append('subscription_data[metadata][seats]', quantity.toString());
      if (circleName) {
        params.append('metadata[circle_name]', circleName);
        params.append('subscription_data[metadata][circle_name]', circleName);
      }
    }

    // URLs
    const appUrl = env.APP_URL || 'https://therealmofpatterns.com';
    params.append(
      'success_url',
      `${appUrl}/success/?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
    );
    params.append(
      'cancel_url',
      `${appUrl}/subscribe/?canceled=true`,
    );

    // Call Stripe
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = (await stripeRes.json()) as {
      id?: string;
      url?: string;
      error?: { message: string };
    };

    if (!stripeRes.ok || session.error) {
      console.error('Stripe error:', session.error?.message);
      return jsonError('Failed to create checkout session. Please try again.', 502);
    }

    return Response.json({ success: true, sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return jsonError('Something went wrong. Please try again.', 500);
  }
};

// CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// ── helpers ──────────────────────────────────────────────

function getPriceId(env: Env, plan: string, period: string): string | null {
  if (plan === 'individual') {
    return period === 'annual'
      ? env.STRIPE_PRO_ANNUAL_PRICE_ID
      : env.STRIPE_PRO_MONTHLY_PRICE_ID || env.STRIPE_PRO_PRICE_ID || null;
  }
  // squad / team
  return period === 'annual'
    ? env.STRIPE_TEAM_ANNUAL_PRICE_ID
    : env.STRIPE_TEAM_MONTHLY_PRICE_ID || null;
}

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}
