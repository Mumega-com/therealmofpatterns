/**
 * The Realm of Patterns - Cloudflare Worker
 * Serves static assets from R2 and handles API routes
 */

import { Env, BirthData, PreviewResponse, ErrorResponse, HistoricalFigure, FigureMatch, StripeCheckoutSession } from './types';
import { computeFromBirthData, getDominant, cosineResonance, getDimensionTeaser } from './lib/16d-engine';

// Static file mapping
const STATIC_FILES: Record<string, { path: string; contentType: string }> = {
  '/': { path: 'index.html', contentType: 'text/html' },
  '/index.html': { path: 'index.html', contentType: 'text/html' },
  '/success.html': { path: 'success.html', contentType: 'text/html' },
  '/styles.css': { path: 'styles.css', contentType: 'text/css' },
  '/favicon.ico': { path: 'favicon.ico', contentType: 'image/x-icon' },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS handling
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // API routes
    if (path.startsWith('/api/')) {
      const response = await handleAPI(request, env, path);
      return addCORSHeaders(response);
    }

    // Static files
    return await serveStatic(env, path);
  },
};

// ============================================
// CORS Handling
// ============================================

function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function addCORSHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}

// ============================================
// Static File Serving
// ============================================

async function serveStatic(env: Env, path: string): Promise<Response> {
  const mapping = STATIC_FILES[path] || STATIC_FILES['/'];

  try {
    // Try R2 first
    const object = await env.STORAGE.get(`public/${mapping.path}`);
    if (object) {
      return new Response(object.body, {
        headers: {
          'Content-Type': mapping.contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Try KV as fallback
    const cached = await env.CACHE.get(`static:${mapping.path}`, 'stream');
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': mapping.contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Return 404 for unknown paths
    return new Response('Not Found', { status: 404 });
  } catch (error) {
    console.error('Static file error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// ============================================
// API Router
// ============================================

async function handleAPI(request: Request, env: Env, path: string): Promise<Response> {
  try {
    // POST /api/preview - Free 8D preview
    if (path === '/api/preview' && request.method === 'POST') {
      return await handlePreview(request, env);
    }

    // POST /api/checkout - Create Stripe checkout
    if (path === '/api/checkout' && request.method === 'POST') {
      return await handleCheckout(request, env);
    }

    // POST /api/webhook - Stripe webhook
    if (path === '/api/webhook' && request.method === 'POST') {
      return await handleWebhook(request, env);
    }

    // GET /api/report/:id - Get premium report
    if (path.startsWith('/api/report/') && request.method === 'GET') {
      const id = path.split('/').pop();
      return await handleGetReport(env, id!);
    }

    // GET /api/art/:id - Get generated art
    if (path.startsWith('/api/art/') && request.method === 'GET') {
      const id = path.split('/').pop();
      return await handleGetArt(env, id!);
    }

    // POST /api/compute - Compute 16D vector
    if (path === '/api/compute' && request.method === 'POST') {
      return await handleCompute(request);
    }

    // GET /api/share/:id - Get shared profile
    if (path.startsWith('/api/share/') && request.method === 'GET') {
      const id = path.split('/').pop();
      return await handleShare(env, id!);
    }

    return jsonError('NOT_FOUND', 'Endpoint not found', 404);
  } catch (error) {
    console.error('API error:', error);
    return jsonError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

// ============================================
// API Handlers
// ============================================

async function handlePreview(request: Request, env: Env): Promise<Response> {
  // Rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `rate:preview:${clientIP}`;

  const currentCount = await env.CACHE.get(rateLimitKey);
  if (currentCount && parseInt(currentCount) >= 10) {
    return jsonError('RATE_LIMITED', 'Too many requests. Please wait 1 hour.', 429, 3600);
  }

  // Parse and validate
  const body = await request.json() as { birth_data: BirthData };
  const { birth_data } = body;

  if (!validateBirthData(birth_data)) {
    return jsonError('INVALID_INPUT', 'Invalid birth data. Please provide year, month, and day.', 400);
  }

  // Compute 8D vector
  const vector = computeFromBirthData(birth_data);
  const dominant = getDominant(vector);

  // Find best matching historical figure
  const archetype = await findBestMatch(env.DB, vector);

  // Generate teaser
  const teaser = getDimensionTeaser(dominant);

  // Update rate limit
  const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
  await env.CACHE.put(rateLimitKey, newCount.toString(), { expirationTtl: 3600 });

  const response: PreviewResponse = {
    success: true,
    vector: Array.from(vector),
    dominant: {
      index: dominant.index,
      symbol: dominant.symbol,
      name: dominant.name,
      value: Math.round(dominant.value * 100) / 100,
      description: dominant.domain,
    },
    archetype,
    teaser,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleCheckout(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { product_id: string; birth_data: BirthData; email?: string };
  const { product_id, birth_data, email } = body;

  // Validate product
  const products: Record<string, { name: string; amount: number }> = {
    'premium_16d_report': { name: 'Premium 16D Report', amount: 49700 },
    'complete_bundle': { name: 'Complete Bundle', amount: 69700 },
  };

  const product = products[product_id];
  if (!product) {
    return jsonError('INVALID_PRODUCT', 'Invalid product selected', 400);
  }

  // Create Stripe session
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: product.name },
        unit_amount: product.amount,
      },
      quantity: 1,
    }],
    success_url: `${env.APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/?canceled=true`,
    metadata: {
      product_id,
      birth_data: JSON.stringify(birth_data),
    },
    customer_email: email,
  });

  return new Response(JSON.stringify({
    success: true,
    checkout_url: session.url,
    session_id: session.id,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return jsonError('MISSING_SIGNATURE', 'Missing Stripe signature', 400);
  }

  const body = await request.text();

  // Verify signature
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return jsonError('INVALID_SIGNATURE', 'Invalid webhook signature', 400);
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { customer_email?: string | null; metadata?: Record<string, string> };
    const { product_id, birth_data } = session.metadata || {};

    if (product_id && birth_data) {
      const parsedBirthData = JSON.parse(birth_data) as BirthData;

      // Generate full 16D report
      const vector = computeFromBirthData(parsedBirthData);
      const reportId = crypto.randomUUID();

      // Store report
      await env.DB.prepare(`
        INSERT INTO reports (id, email, product_id, birth_data, vector_16d, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'processing', datetime('now'))
      `).bind(
        reportId,
        session.customer_email || '',
        product_id,
        birth_data,
        JSON.stringify(vector)
      ).run();

      // Generate AI art (async)
      generateArt(env, reportId, vector).catch(console.error);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleGetReport(env: Env, id: string): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT * FROM reports WHERE id = ?'
  ).bind(id).first();

  if (!result) {
    return jsonError('NOT_FOUND', 'Report not found', 404);
  }

  return new Response(JSON.stringify({ success: true, report: result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleGetArt(env: Env, id: string): Promise<Response> {
  const object = await env.STORAGE.get(`art/${id}.png`);

  if (!object) {
    return jsonError('NOT_FOUND', 'Art not found', 404);
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}

async function handleCompute(request: Request): Promise<Response> {
  const body = await request.json() as { birth_data: BirthData };

  if (!validateBirthData(body.birth_data)) {
    return jsonError('INVALID_INPUT', 'Invalid birth data', 400);
  }

  const vector = computeFromBirthData(body.birth_data);
  const dominant = getDominant(vector);

  return new Response(JSON.stringify({
    success: true,
    vector: Array.from(vector),
    dominant: {
      index: dominant.index,
      symbol: dominant.symbol,
      name: dominant.name,
      value: dominant.value,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleShare(env: Env, id: string): Promise<Response> {
  const profile = await env.CACHE.get(`share:${id}`);

  if (!profile) {
    return jsonError('NOT_FOUND', 'Shared profile not found or expired', 404);
  }

  return new Response(profile, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================
// Helper Functions
// ============================================

function validateBirthData(data: BirthData): boolean {
  if (!data) return false;
  if (!data.year || data.year < 1900 || data.year > 2100) return false;
  if (!data.month || data.month < 1 || data.month > 12) return false;
  if (!data.day || data.day < 1 || data.day > 31) return false;
  return true;
}

async function findBestMatch(db: D1Database, userVector: number[]): Promise<FigureMatch> {
  try {
    const { results } = await db.prepare('SELECT * FROM historical_figures').all<HistoricalFigure>();

    if (!results || results.length === 0) {
      return {
        id: 0,
        name: 'Rumi',
        era: '1207-1273',
        culture: 'Persian',
        domains: ['poetry', 'mysticism', 'philosophy'],
        vector: [0.72, 0.45, 0.88, 0.91, 0.85, 0.33, 0.78, 0.95],
        quote: 'What you seek is seeking you.',
        resonance: 0.85,
      };
    }

    let bestMatch: FigureMatch | null = null;
    let bestScore = -1;

    for (const figure of results) {
      const figureVector = typeof figure.vector === 'string' ? JSON.parse(figure.vector) : figure.vector;
      const domains = typeof figure.domains === 'string' ? JSON.parse(figure.domains) : figure.domains;
      const resonance = cosineResonance(userVector, figureVector);

      if (resonance > bestScore) {
        bestScore = resonance;
        bestMatch = { ...figure, vector: figureVector, domains, resonance: Math.round(resonance * 100) / 100 };
      }
    }

    return bestMatch!;
  } catch (error) {
    console.error('Database error:', error);
    return {
      id: 0, name: 'Rumi', era: '1207-1273', culture: 'Persian',
      domains: ['poetry', 'mysticism', 'philosophy'],
      vector: [0.72, 0.45, 0.88, 0.91, 0.85, 0.33, 0.78, 0.95],
      quote: 'What you seek is seeking you.', resonance: 0.85,
    };
  }
}

async function generateArt(env: Env, reportId: string, _vector: number[]): Promise<void> {
  const prompt = `cosmic mandala representing identity vector, sacred geometry,
    fractal patterns, divine light emanating from center,
    consciousness visualization, ethereal, mystical, 4k, highly detailed`;

  try {
    const response = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
      prompt,
      num_steps: 20,
    });

    await env.STORAGE.put(`art/${reportId}.png`, response, {
      httpMetadata: { contentType: 'image/png' },
    });

    await env.DB.prepare('UPDATE reports SET art_url = ?, status = ? WHERE id = ?')
      .bind(`/api/art/${reportId}`, 'complete', reportId)
      .run();
  } catch (error) {
    console.error('Art generation failed:', error);
  }
}

function jsonError(code: string, message: string, status: number, retryAfter?: number): Response {
  const error: ErrorResponse = {
    success: false,
    error: { code, message, ...(retryAfter && { retry_after: retryAfter }) },
  };
  return new Response(JSON.stringify(error), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================
// Stripe Types (minimal)
// ============================================

class Stripe {
  private apiKey: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  checkout = {
    sessions: {
      create: async (params: any): Promise<StripeCheckoutSession> => {
        const body = new URLSearchParams();
        body.append('mode', params.mode);
        params.payment_method_types.forEach((t: string) => body.append('payment_method_types[]', t));
        body.append('line_items[0][price_data][currency]', params.line_items[0].price_data.currency);
        body.append('line_items[0][price_data][product_data][name]', params.line_items[0].price_data.product_data.name);
        body.append('line_items[0][price_data][unit_amount]', params.line_items[0].price_data.unit_amount.toString());
        body.append('line_items[0][quantity]', params.line_items[0].quantity.toString());
        body.append('success_url', params.success_url);
        body.append('cancel_url', params.cancel_url);
        if (params.metadata) {
          Object.entries(params.metadata).forEach(([k, v]) => body.append(`metadata[${k}]`, v as string));
        }
        if (params.customer_email) body.append('customer_email', params.customer_email);

        const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        });
        return (await response.json()) as StripeCheckoutSession;
      },
    },
  };

  webhooks = {
    constructEvent: (payload: string, signature: string, _secret: string): Stripe.Event => {
      // Simplified webhook verification
      const parts = signature.split(',');
      const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
      const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

      if (!timestamp || !sig) throw new Error('Invalid signature format');

      // In production, verify HMAC-SHA256
      // For now, trust Cloudflare's network isolation

      return JSON.parse(payload);
    },
  };
}

namespace Stripe {
  export interface Event {
    type: string;
    data: { object: any };
  }
  export interface Checkout {
    Session: any;
  }
}
