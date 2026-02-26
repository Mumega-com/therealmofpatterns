/**
 * POST /api/create-dna-checkout
 * Create a Stripe Checkout session for the one-time $27 Cosmic DNA Profile.
 *
 * Body: { email: string, name: string, dob: string }
 * Returns: { success: true, url: string }
 */

import type { Env } from '../../src/types';

interface DnaCheckoutRequest {
  email: string;
  name: string;
  dob: string; // YYYY-MM-DD
}

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
    const body = await request.json() as DnaCheckoutRequest;
    const { email, name, dob } = body;

    // Validate
    if (!email || !email.includes('@')) {
      return Response.json({ success: false, error: 'Valid email required.' }, { status: 400, headers: CORS });
    }
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return Response.json({ success: false, error: 'Valid date of birth required (YYYY-MM-DD).' }, { status: 400, headers: CORS });
    }

    const priceId = env.STRIPE_DNA_PRICE_ID;
    if (!priceId) {
      console.error('[DNA] STRIPE_DNA_PRICE_ID not configured');
      return Response.json(
        { success: false, error: 'Product not configured. Please try again later.' },
        { status: 503, headers: CORS }
      );
    }

    const appUrl = env.APP_URL || 'https://therealmofpatterns.com';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('customer_email', email.toLowerCase().trim());
    params.append('allow_promotion_codes', 'true');

    // Metadata — passed through to webhook and success page
    params.append('metadata[product]', 'dna');
    params.append('metadata[name]', (name || '').trim().slice(0, 100));
    params.append('metadata[dob]', dob);

    params.append('success_url', `${appUrl}/dna-success?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${appUrl}/dna`);

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
      console.error('[DNA] Stripe error:', session.error?.message);
      return Response.json(
        { success: false, error: 'Failed to create checkout. Please try again.' },
        { status: 502, headers: CORS }
      );
    }

    return Response.json({ success: true, url: session.url }, { headers: CORS });
  } catch (err) {
    console.error('[DNA] Checkout error:', err);
    return Response.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500, headers: CORS }
    );
  }
};
