/**
 * POST /api/create-founding-checkout
 * Creates a Stripe Checkout session for the one-time Founding Member purchase.
 *
 * Body: { email: string }
 * Returns: { success: true, url: string }
 *
 * Required secret: STRIPE_FOUNDING_PRICE_ID (one-time price, e.g. $49)
 */

import type { Env } from '../../src/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { email?: string };
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return Response.json(
        { success: false, error: 'Valid email required.' },
        { status: 400, headers: CORS },
      );
    }

    const priceId = env.STRIPE_FOUNDING_PRICE_ID;
    if (!priceId) {
      console.error('[Founding] STRIPE_FOUNDING_PRICE_ID not configured');
      return Response.json(
        { success: false, error: 'Not available yet. Please try again later.' },
        { status: 503, headers: CORS },
      );
    }

    const appUrl = env.APP_URL || 'https://therealmofpatterns.com';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('customer_email', email);
    params.append('allow_promotion_codes', 'true');
    params.append('metadata[product]', 'founding');

    params.append('success_url', `${appUrl}/success?product=founding&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${appUrl}/subscribe`);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await stripeRes.json() as { id?: string; url?: string; error?: { message: string } };

    if (!stripeRes.ok || session.error) {
      console.error('[Founding] Stripe error:', session.error?.message);
      return Response.json(
        { success: false, error: 'Failed to create checkout. Please try again.' },
        { status: 502, headers: CORS },
      );
    }

    return Response.json({ success: true, url: session.url }, { headers: CORS });
  } catch (err) {
    console.error('[Founding] Checkout error:', err);
    return Response.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500, headers: CORS },
    );
  }
};
