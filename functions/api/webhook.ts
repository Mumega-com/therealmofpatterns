/**
 * POST /api/webhook
 * Stripe webhook handler
 */

import { Env, BirthData, FigureMatch } from '../../src/types';
import { compute16DFromBirthData, cosineResonance, analyzeDimensions } from '../../src/lib/16d-engine';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer_email: string;
      metadata: {
        order_id: string;
        product_id: string;
        birth_data: string;
        customer_name: string;
      };
      payment_status: string;
    };
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('Stripe-Signature');

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 400 });
    }

    const event: StripeEvent = JSON.parse(body);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event, env);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event, env);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
};

// ============================================
// Event Handlers
// ============================================

async function handleCheckoutCompleted(event: StripeEvent, env: Env): Promise<void> {
  const session = event.data.object;
  const { order_id, product_id, birth_data: birthDataStr, customer_name } = session.metadata;

  // Update order status
  await env.DB.prepare(`
    UPDATE orders
    SET status = 'completed',
        stripe_customer_id = ?,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(session.customer_email, order_id).run();

  // Parse birth data
  const birthData: BirthData = JSON.parse(birthDataStr);

  // Generate full report
  await generateReport(env, order_id, birthData, session.customer_email);
}

async function handlePaymentFailed(event: StripeEvent, env: Env): Promise<void> {
  const session = event.data.object;
  const { order_id } = session.metadata;

  // Update order status
  await env.DB.prepare(`
    UPDATE orders SET status = 'failed' WHERE id = ?
  `).bind(order_id).run();
}

// ============================================
// Report Generation
// ============================================

async function generateReport(
  env: Env,
  orderId: string,
  birthData: BirthData,
  email: string
): Promise<void> {
  const reportId = crypto.randomUUID();
  const emailHash = await hashEmail(email);

  // Compute 16D vector
  const vector16d = compute16DFromBirthData(birthData);
  const vector8d = vector16d.slice(0, 8);

  // Get dimension analysis
  const dimensions = analyzeDimensions(vector8d);

  // Find top 10 historical matches
  const matches = await findTopMatches(env.DB, vector8d, 10);

  // Generate sacred art using Workers AI
  let artUrl: string | undefined;
  try {
    artUrl = await generateSacredArt(env, vector8d, dimensions[0], reportId);
  } catch (error) {
    console.error('Art generation failed:', error);
  }

  // Store report metadata in D1
  await env.DB.prepare(`
    INSERT INTO reports (id, order_id, email_hash, vector_8d, vector_16d, historical_matches, art_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    reportId,
    orderId,
    emailHash,
    JSON.stringify(vector8d),
    JSON.stringify(vector16d),
    JSON.stringify(matches),
    artUrl || null
  ).run();

  // Store session token in KV for report access
  const sessionToken = crypto.randomUUID();
  await env.CACHE.put(
    `session:${sessionToken}`,
    JSON.stringify({ reportId, emailHash }),
    { expirationTtl: 86400 * 30 } // 30 days
  );

  // TODO: Send email with report access link
  console.log(`Report ${reportId} generated for order ${orderId}`);
}

async function findTopMatches(
  db: D1Database,
  userVector: number[],
  limit: number
): Promise<FigureMatch[]> {
  const { results } = await db.prepare('SELECT * FROM historical_figures').all();

  if (!results || results.length === 0) {
    return [];
  }

  const matches: FigureMatch[] = [];

  for (const figure of results) {
    const figureVector = typeof figure.vector === 'string'
      ? JSON.parse(figure.vector as string)
      : figure.vector;
    const domains = typeof figure.domains === 'string'
      ? JSON.parse(figure.domains as string)
      : figure.domains;

    const resonance = cosineResonance(userVector, figureVector);

    matches.push({
      id: figure.id as number,
      name: figure.name as string,
      era: figure.era as string,
      culture: figure.culture as string,
      domains,
      vector: figureVector,
      quote: figure.quote as string,
      bio: figure.bio as string,
      resonance: Math.round(resonance * 100) / 100,
    });
  }

  // Sort by resonance and return top N
  matches.sort((a, b) => b.resonance - a.resonance);
  return matches.slice(0, limit);
}

async function generateSacredArt(
  env: Env,
  vector: number[],
  dominant: { symbol: string; name: string },
  reportId: string
): Promise<string> {
  // Create prompt based on vector and dominant dimension
  const prompt = buildArtPrompt(vector, dominant);

  // Generate image using Workers AI
  const response = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
    prompt,
    num_steps: 20,
  });

  // Store in R2
  const key = `art/${reportId}.png`;
  await env.STORAGE.put(key, response, {
    httpMetadata: { contentType: 'image/png' },
  });

  return `${env.APP_URL}/api/art/${reportId}`;
}

function buildArtPrompt(vector: number[], dominant: { symbol: string; name: string }): string {
  const dimensionPrompts: Record<string, string> = {
    'P': 'radiant golden sun, spiritual awakening, phoenix rising, sacred geometry mandala',
    'E': 'ancient temple foundations, crystalline structures, mountain peaks, geometric precision',
    'μ': 'flowing scrolls and books, neural networks, constellation maps, mercury symbol',
    'V': 'rose garden, venus symbol, harmonic waves, golden ratio spirals, beauty incarnate',
    'N': 'expanding universe, jupiter symbol, growth fractals, abundance imagery',
    'Δ': 'dynamic fire, mars symbol, warrior energy, bold action, movement trails',
    'R': 'silver moon over water, maternal embrace, heart chakra, connection threads',
    'Φ': 'cosmic eye, unity field, transcendence, void and light, witness presence',
  };

  const base = dimensionPrompts[dominant.symbol] || 'sacred geometry, cosmic pattern';

  // Add color hints based on vector values
  const colors = vector[3] > 0.7 ? 'warm gold and rose' : vector[7] > 0.7 ? 'deep purple and silver' : 'cosmic blue and gold';

  return `Sacred digital art, ${base}, ${colors} color palette, ethereal glow, intricate details, 8k resolution, mystical atmosphere, high fantasy illustration style`;
}

// ============================================
// Helper Functions
// ============================================

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Parse the signature header
    const parts = signature.split(',');
    const timestamps: string[] = [];
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamps.push(value);
      if (key === 'v1') signatures.push(value);
    }

    if (timestamps.length === 0 || signatures.length === 0) {
      return false;
    }

    const timestamp = timestamps[0];
    const expectedSignature = signatures[0];

    // Check timestamp is within tolerance (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp);
    if (Math.abs(now - ts) > 300) {
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
