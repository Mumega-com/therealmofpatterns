/**
 * GET /api/dna-verify?session_id=xxx
 *
 * Called by the success page after Stripe redirects back.
 * Verifies payment with Stripe API, stores order in D1, and returns
 * profile data so the client can generate the PDF.
 */

import type { Env } from '../../src/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return Response.json({ success: false, error: 'Missing session_id.' }, { status: 400, headers: CORS });
  }

  try {
    // Retrieve session from Stripe to verify payment
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      }
    );

    if (!stripeRes.ok) {
      console.error('[DNA-VERIFY] Stripe fetch failed:', stripeRes.status);
      return Response.json(
        { success: false, error: 'Could not verify payment. Please contact support.' },
        { status: 502, headers: CORS }
      );
    }

    const session = await stripeRes.json() as {
      payment_status: string;
      status: string;
      metadata: Record<string, string>;
      customer_email?: string;
      customer_details?: { email?: string };
    };

    // Must be paid
    if (session.payment_status !== 'paid') {
      return Response.json(
        { success: false, error: 'Payment not completed.' },
        { status: 402, headers: CORS }
      );
    }

    // Must be a DNA product
    if (session.metadata?.product !== 'dna') {
      return Response.json(
        { success: false, error: 'Invalid product.' },
        { status: 400, headers: CORS }
      );
    }

    const name = session.metadata.name || 'Explorer';
    const dob  = session.metadata.dob;
    const email = session.customer_email || session.customer_details?.email || '';

    if (!dob) {
      return Response.json(
        { success: false, error: 'Profile data missing. Please contact support.' },
        { status: 400, headers: CORS }
      );
    }

    // Persist order in D1 (idempotent — webhook may have already done this)
    if (env.DB) {
      const emailHash = await hashString(email);
      await env.DB.prepare(`
        INSERT INTO orders (id, email, email_hash, product_id, amount, status, birth_data, completed_at)
        VALUES (?, ?, ?, 'dna_profile', 900, 'completed', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      `).bind(sessionId, email, emailHash, JSON.stringify({ dob, name })).run()
        .catch((e: Error) => console.warn('[DNA-VERIFY] D1 upsert warn:', e.message));
    }

    return Response.json({
      success: true,
      name,
      dob,
      email,
      sessionId,
    }, { headers: CORS });

  } catch (err) {
    console.error('[DNA-VERIFY] Error:', err);
    return Response.json(
      { success: false, error: 'Verification failed. Please contact support.' },
      { status: 500, headers: CORS }
    );
  }
};

async function hashString(s: string): Promise<string> {
  const data = new TextEncoder().encode(s.toLowerCase().trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
