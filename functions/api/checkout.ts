/**
 * POST /api/checkout
 * Create a Stripe checkout session for premium report
 */

import type { Env, CheckoutRequest, CheckoutResponse, ErrorResponse, ProductId } from '../../src/types';
import { PRODUCTS } from '../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Parse request body
    const body: CheckoutRequest = await request.json();
    const { product_id, birth_data, name, email } = body;

    // Validate product
    if (!product_id || !PRODUCTS[product_id as ProductId]) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid product ID.',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    if (!birth_data || !email) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Birth data and email are required.',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const product = PRODUCTS[product_id as ProductId];
    const orderId = crypto.randomUUID();

    // Create Stripe Checkout Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': `${env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${env.APP_URL}/?canceled=true`,
        'customer_email': email,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': product.name,
        'line_items[0][price_data][product_data][description]': product.description,
        'line_items[0][price_data][unit_amount]': product.price_cents.toString(),
        'line_items[0][quantity]': '1',
        'metadata[order_id]': orderId,
        'metadata[product_id]': product_id,
        'metadata[birth_data]': JSON.stringify(birth_data),
        'metadata[customer_name]': name || '',
      }),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      console.error('Stripe error:', error);
      throw new Error('Failed to create checkout session');
    }

    const session = await stripeResponse.json() as { id: string; url: string };

    // Store pending order in D1
    const emailHash = await hashEmail(email);
    await env.DB.prepare(`
      INSERT INTO orders (id, email, email_hash, product_id, amount, status, birth_data)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      orderId,
      email,
      emailHash,
      product_id,
      product.price_cents,
      JSON.stringify(birth_data)
    ).run();

    const response: CheckoutResponse = {
      session_id: session.id,
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
        code: 'INTERNAL_ERROR',
        message: 'Failed to create checkout session. Please try again.',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ============================================
// Helper Functions
// ============================================

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
