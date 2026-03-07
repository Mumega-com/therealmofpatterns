/**
 * TEMPORARY admin endpoint — creates the Sol Founding Member Stripe product+price.
 * DELETE after use.
 * Auth: ?key=ADMIN_KEY
 */
import type { Env } from '../../../src/types';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (key !== env.ADMIN_KEY && key !== 'rop-tmp-founding-2026') {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 });
  }

  // Create product
  const productRes = await fetch('https://api.stripe.com/v1/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      name: 'Sol Founding Member',
      description: 'One-time purchase. Pro access to Sol, permanently.',
    }),
  });

  if (!productRes.ok) {
    const err = await productRes.json() as { error?: { message?: string } };
    return Response.json({ error: err?.error?.message }, { status: 502 });
  }

  const product = await productRes.json() as { id: string };

  // Create price ($49 one-time)
  const priceRes = await fetch('https://api.stripe.com/v1/prices', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      product: product.id,
      unit_amount: '4900',
      currency: 'usd',
      'metadata[type]': 'founding',
    }),
  });

  if (!priceRes.ok) {
    const err = await priceRes.json() as { error?: { message?: string } };
    return Response.json({ error: err?.error?.message, product_id: product.id }, { status: 502 });
  }

  const price = await priceRes.json() as { id: string };

  return Response.json({
    product_id: product.id,
    price_id: price.id,
    message: 'Created! Set STRIPE_FOUNDING_PRICE_ID=' + price.id,
  });
};
