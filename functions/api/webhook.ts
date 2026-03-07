/**
 * POST /api/webhook
 * Stripe webhook handler for subscription events.
 *
 * Required secrets (set in Cloudflare dashboard):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *
 * Listens for:
 *   - checkout.session.completed  → activate subscription
 *   - customer.subscription.updated → plan changes
 *   - customer.subscription.deleted → cancellation
 *   - invoice.payment_failed → failed renewal
 */

import type { Env } from '../../src/types';

interface StripeObject {
  id: string;
  customer?: string;
  customer_email?: string;
  customer_details?: { email?: string };
  subscription?: string;
  status?: string;
  mode?: string;
  payment_status?: string;
  metadata?: Record<string, string>;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: StripeObject };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.text();
    const signature = request.headers.get('Stripe-Signature');

    if (!signature) {
      return new Response('Missing Stripe-Signature header', { status: 400 });
    }

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 400 });
    }

    const event: StripeEvent = JSON.parse(body);

    switch (event.type) {
      case 'checkout.session.completed':
        if (event.data.object.metadata?.product === 'dna') {
          await handleDnaPurchase(event, env);
        } else if (event.data.object.metadata?.product === 'founding') {
          await handleFoundingPurchase(event, env);
        } else {
          await handleCheckoutCompleted(event, env);
        }
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, env);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, env);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event, env);
        break;

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
};

// ── Event Handlers ──────────────────────────────────────

async function handleCheckoutCompleted(event: StripeEvent, env: Env) {
  const session = event.data.object;
  const email = session.customer_email;
  const plan = session.metadata?.plan || 'individual';
  const subscriptionId = session.subscription;
  const customerId = session.customer;

  if (!email) {
    console.error('No customer_email in checkout session');
    return;
  }

  const emailHash = await hashEmail(email);

  // Upsert subscriber record
  await env.DB.prepare(`
    INSERT INTO subscribers (email_hash, email, plan, status, stripe_customer_id, stripe_subscription_id, created_at)
    VALUES (?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(email_hash) DO UPDATE SET
      plan = excluded.plan,
      status = 'active',
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id
  `).bind(emailHash, email, plan, customerId, subscriptionId).run();

  // Store session in KV for quick auth lookups
  if (customerId) {
    await env.CACHE.put(
      `stripe:customer:${customerId}`,
      JSON.stringify({ emailHash, plan, status: 'active' }),
      { expirationTtl: 86400 * 365 },
    );
  }

  // Handle team/squad plan: create circle
  if (plan === 'squad' && session.metadata?.circle_name) {
    const circleId = crypto.randomUUID();
    const seats = parseInt(session.metadata.seats || '3');
    await env.DB.prepare(`
      INSERT OR IGNORE INTO circles (id, name, owner_email_hash, max_seats, stripe_subscription_id, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(circleId, session.metadata.circle_name, emailHash, seats, subscriptionId).run();
  }

  console.log(`Subscription activated: ${plan} for ${emailHash}`);
}

async function handleSubscriptionUpdated(event: StripeEvent, env: Env) {
  const sub = event.data.object;
  const customerId = sub.customer;
  const status = sub.status; // active, past_due, canceled, etc.
  const cancelAtEnd = sub.cancel_at_period_end;

  if (!customerId) return;

  // Look up customer in KV
  const cached = await env.CACHE.get(`stripe:customer:${customerId}`);
  if (!cached) {
    console.log(`Unknown customer ${customerId}, skipping update`);
    return;
  }

  const { emailHash } = JSON.parse(cached);

  // Map Stripe status to our status
  const ourStatus = status === 'active' && !cancelAtEnd
    ? 'active'
    : status === 'past_due'
    ? 'past_due'
    : cancelAtEnd
    ? 'canceling'
    : status || 'unknown';

  await env.DB.prepare(`
    UPDATE subscribers SET status = ? WHERE email_hash = ?
  `).bind(ourStatus, emailHash).run();

  // Update KV cache
  const data = JSON.parse(cached);
  data.status = ourStatus;
  await env.CACHE.put(`stripe:customer:${customerId}`, JSON.stringify(data), {
    expirationTtl: 86400 * 365,
  });

  console.log(`Subscription updated: ${emailHash} → ${ourStatus}`);
}

async function handleSubscriptionDeleted(event: StripeEvent, env: Env) {
  const sub = event.data.object;
  const customerId = sub.customer;

  if (!customerId) return;

  const cached = await env.CACHE.get(`stripe:customer:${customerId}`);
  if (!cached) return;

  const { emailHash } = JSON.parse(cached);

  await env.DB.prepare(`
    UPDATE subscribers SET status = 'canceled', plan = 'free' WHERE email_hash = ?
  `).bind(emailHash).run();

  // Update KV
  const data = JSON.parse(cached);
  data.status = 'canceled';
  data.plan = 'free';
  await env.CACHE.put(`stripe:customer:${customerId}`, JSON.stringify(data), {
    expirationTtl: 86400 * 30, // Keep for 30 days after cancel
  });

  console.log(`Subscription canceled: ${emailHash}`);
}

async function handlePaymentFailed(event: StripeEvent, env: Env) {
  const invoice = event.data.object;
  const customerId = invoice.customer;

  if (!customerId) return;

  const cached = await env.CACHE.get(`stripe:customer:${customerId}`);
  if (!cached) return;

  const { emailHash } = JSON.parse(cached);

  await env.DB.prepare(`
    UPDATE subscribers SET status = 'past_due' WHERE email_hash = ?
  `).bind(emailHash).run();

  console.log(`Payment failed for: ${emailHash}`);
}

async function handleFoundingPurchase(event: StripeEvent, env: Env) {
  const session = event.data.object;
  const email = session.customer_email || session.customer_details?.email || '';
  const customerId = session.customer;

  if (!email) {
    console.error('[Founding] No email in checkout session');
    return;
  }

  const emailHash = await hashEmail(email);

  // Upsert subscriber with plan 'founding' — permanent Pro access
  await env.DB.prepare(`
    INSERT INTO subscribers (email_hash, email, plan, status, stripe_customer_id, created_at)
    VALUES (?, ?, 'founding', 'active', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(email_hash) DO UPDATE SET
      plan = 'founding',
      status = 'active',
      stripe_customer_id = excluded.stripe_customer_id
  `).bind(emailHash, email, customerId || null).run()
    .catch((e: Error) => console.warn('[Founding] D1 warn:', e.message));

  // Cache for quick auth lookup
  if (customerId) {
    await env.CACHE.put(
      `stripe:customer:${customerId}`,
      JSON.stringify({ emailHash, plan: 'founding', status: 'active' }),
      { expirationTtl: 86400 * 365 * 10 }, // 10 years
    );
  }

  console.log(`[Founding] Member activated: ${emailHash}`);
}

async function handleDnaPurchase(event: StripeEvent, env: Env) {
  const session = event.data.object;
  const email = session.customer_email || session.customer_details?.email || '';
  const name = session.metadata?.name || '';
  const dob  = session.metadata?.dob  || '';

  if (!email) {
    console.error('[DNA] No email in checkout session');
    return;
  }

  const emailHash = await hashEmail(email);

  await env.DB.prepare(`
    INSERT INTO orders (id, email, email_hash, product_id, amount, status, birth_data, completed_at)
    VALUES (?, ?, ?, 'dna_profile', 2700, 'completed', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET status = 'completed', completed_at = CURRENT_TIMESTAMP
  `).bind(session.id, email, emailHash, JSON.stringify({ dob, name })).run()
    .catch((e: Error) => console.warn('[DNA] D1 insert warn:', e.message));

  console.log(`[DNA] Purchase recorded for ${emailHash}`);
}

// ── Helpers ─────────────────────────────────────────────

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = signature.split(',');
    let timestamp = '';
    let sig = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') sig = value;
    }

    if (!timestamp || !sig) return false;

    // Check timestamp tolerance (5 min)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    // Compute HMAC-SHA256
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computed = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computed === sig;
  } catch {
    return false;
  }
}

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
