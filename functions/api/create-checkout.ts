/**
 * POST /api/create-checkout
 * DEPRECATED: Forwards to /api/create-subscription-checkout
 * Kept for backwards compatibility with any old client code.
 */

import type { Env } from '../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { email?: string; priceId?: string };

    // Forward to the canonical endpoint
    const forwardUrl = new URL('/api/create-subscription-checkout', request.url);
    const forwardRes = await fetch(forwardUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'individual',
        email: body.email || '',
        billingPeriod: 'monthly',
      }),
    });

    return new Response(forwardRes.body, {
      status: forwardRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return Response.json(
      { success: false, error: 'Failed to create checkout. Please try again.' },
      { status: 500 },
    );
  }
};
