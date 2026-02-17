/**
 * POST /api/subscription-status
 * Bridge between server-side Stripe subscription state and client localStorage.
 *
 * Two modes:
 *   { sessionId: string }  — verify via Stripe checkout session (used by success page)
 *   { email: string }      — verify via D1 subscribers table (used for ongoing status refresh)
 *
 * Returns: { success, tier, isPro, plan, status, email? }
 */

import type { Env } from '../../src/types';

interface StatusRequest {
  sessionId?: string;
  email?: string;
}

interface StripeSession {
  id: string;
  customer_email: string | null;
  payment_status: string;
  mode: string;
  metadata: Record<string, string>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as StatusRequest;

    let email: string | null = null;
    let stripePlan: string | null = null;
    let stripePaid = false;

    if (body.sessionId) {
      // Mode A: Fetch Stripe checkout session
      const session = await fetchStripeSession(body.sessionId, env.STRIPE_SECRET_KEY);
      if (!session || !session.customer_email) {
        return json({ success: false, error: 'Invalid session' }, 400);
      }
      email = session.customer_email;
      stripePlan = session.metadata?.plan || null;
      stripePaid = session.payment_status === 'paid' || session.mode === 'subscription';
    } else if (body.email) {
      email = body.email;
    } else {
      return json({ success: false, error: 'Provide sessionId or email' }, 400);
    }

    // Look up D1 subscribers table
    const emailHash = await hashEmail(email);
    const row = await env.DB.prepare(
      'SELECT plan, status FROM subscribers WHERE email_hash = ?'
    ).bind(emailHash).first<{ plan: string; status: string }>();

    if (row) {
      const { tier, isPro } = mapPlanToTier(row.plan, row.status);
      return json({
        success: true,
        tier,
        isPro,
        plan: row.plan,
        status: row.status,
        ...(body.sessionId ? { email } : {}),
      });
    }

    // D1 row not found — webhook may not have fired yet
    // If we have Stripe session data, use it as fallback
    if (stripePaid && stripePlan) {
      const { tier, isPro } = mapPlanToTier(stripePlan, 'active');
      return json({
        success: true,
        tier,
        isPro,
        plan: stripePlan,
        status: 'active',
        email,
      });
    }

    // No subscription found
    return json({
      success: true,
      tier: 'free' as const,
      isPro: false,
      plan: 'free',
      status: 'none',
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return json({ success: false, error: 'Internal error' }, 500);
  }
};

// ── Helpers ─────────────────────────────────────────────

function mapPlanToTier(plan: string, status: string): { tier: 'free' | 'keeper' | 'circle'; isPro: boolean } {
  if (status === 'canceled') {
    return { tier: 'free', isPro: false };
  }
  // active, past_due, canceling all grant access
  if (plan === 'squad') {
    return { tier: 'circle', isPro: true };
  }
  if (plan === 'individual') {
    return { tier: 'keeper', isPro: true };
  }
  return { tier: 'free', isPro: false };
}

async function fetchStripeSession(sessionId: string, secretKey: string): Promise<StripeSession | null> {
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!res.ok) return null;
    return await res.json() as StripeSession;
  } catch {
    return null;
  }
}

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
