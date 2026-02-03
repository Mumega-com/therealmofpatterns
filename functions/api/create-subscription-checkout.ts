/**
 * Create subscription checkout session
 * Handles both individual and squad (team) plans
 */

interface Env {
  STRIPE_SECRET_KEY: string;
  APP_URL: string;
  STRIPE_INDIVIDUAL_PRICE_ID?: string;
  STRIPE_SQUAD_PRICE_ID?: string;
}

interface CheckoutRequest {
  plan: 'individual' | 'squad';
  email: string;
  circleName?: string;
  seats?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as CheckoutRequest;
    const { plan, email, circleName, seats = 1 } = body;

    // Validate input
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['individual', 'squad'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Price IDs - these should be set in Cloudflare environment
    // For now, use placeholder IDs that will be configured in Stripe
    const priceIds = {
      individual: env.STRIPE_INDIVIDUAL_PRICE_ID || 'price_individual_placeholder',
      squad: env.STRIPE_SQUAD_PRICE_ID || 'price_squad_placeholder',
    };

    const priceId = priceIds[plan];
    const quantity = plan === 'squad' ? Math.max(3, Math.min(50, seats)) : 1;

    // Build Stripe checkout params
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', quantity.toString());
    params.append('success_url', `${env.APP_URL || 'https://therealmofpatterns.com'}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`);
    params.append('cancel_url', `${env.APP_URL || 'https://therealmofpatterns.com'}/subscribe?canceled=true`);
    params.append('customer_email', email);
    params.append('allow_promotion_codes', 'true');

    // Add metadata
    params.append('metadata[plan]', plan);
    if (plan === 'squad') {
      params.append('metadata[seats]', quantity.toString());
      if (circleName) {
        params.append('metadata[circle_name]', circleName);
      }
    }

    // Subscription-specific settings
    params.append('subscription_data[metadata][plan]', plan);
    if (plan === 'squad') {
      params.append('subscription_data[metadata][seats]', quantity.toString());
      if (circleName) {
        params.append('subscription_data[metadata][circle_name]', circleName);
      }
    }

    // Create Stripe session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await response.json() as { id?: string; url?: string; error?: { message: string } };

    if (session.error) {
      console.error('Stripe error:', session.error);
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      sessionId: session.id,
      url: session.url,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
