/**
 * AI Narrator Endpoint
 *
 * POST /api/narrator — generates a personalized daily narrative.
 * Model chain: Gemini 2.0 Flash (Pro) → OpenAI (Pro fallback) → Workers AI (Free)
 * Caches in KV (24h) and stores in D1 narrator_reflections.
 */

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  GEMINI_API_KEY: string;
  GEMINI_API_KEY_2?: string;
  GEMINI_API_KEY_3?: string;
  GEMINI_API_KEY_4?: string;
  GEMINI_API_KEY_5?: string;
  GEMINI_API_KEY_6?: string;
  OPENAI_API_KEY?: string;
}

interface NarratorRequest {
  userHash: string;
  context?: Record<string, unknown>;
  tier: string;
  systemPrompt: string;
  userPrompt: string;
  isPro?: boolean;
  checkinId?: string | null;
  type?: 'daily' | 'weekly';
  weekStart?: string;
}

interface NarratorResponse {
  narrative: string;
  tier: string;
  model: string;
  cached: boolean;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Handle CORS preflight
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(
  context: { request: Request; env: Env }
): Promise<Response> {
  const { request, env } = context;

  try {
    const body = await request.json() as NarratorRequest;
    const { userHash, tier, systemPrompt, userPrompt, isPro, checkinId, type, weekStart } = body;

    if (!userHash || !systemPrompt || !userPrompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    // For weekly: key by week start. For daily: key by date + checkin ID so new check-ins bust the cache.
    const isWeekly = type === 'weekly';
    const cacheKey = isWeekly
      ? `narrator:weekly:${userHash}:${weekStart || today}`
      : `narrator:${userHash}:${today}${checkinId ? ':' + checkinId : ''}`;

    // 1. Check KV cache
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as NarratorResponse;
      return new Response(
        JSON.stringify({ ...parsed, cached: true }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 2. Check D1 for today's reflection
    const existing = await env.DB.prepare(
      'SELECT narrative, context_tier, model FROM narrator_reflections WHERE user_hash = ? AND date = ?'
    ).bind(userHash, today).first<{ narrative: string; context_tier: string; model: string }>();

    if (existing) {
      const result: NarratorResponse = {
        narrative: existing.narrative,
        tier: existing.context_tier,
        model: existing.model,
        cached: false,
      };
      // Re-cache in KV
      await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 });
      return new Response(
        JSON.stringify({ ...result, cached: true }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 3. Fetch last 3 narratives for anti-repetition context
    const previousNarratives = await env.DB.prepare(
      'SELECT narrative, date FROM narrator_reflections WHERE user_hash = ? ORDER BY date DESC LIMIT 3'
    ).bind(userHash).all<{ narrative: string; date: string }>();

    let historyContext = '';
    if (previousNarratives.results && previousNarratives.results.length > 0) {
      historyContext = '\n\nPREVIOUS NARRATIVES (acknowledge what has already been said — build forward from it, do not repeat themes or phrasing):\n' +
        previousNarratives.results.map(n => `[${n.date}]: ${n.narrative.slice(0, 400)}...`).join('\n');
    }

    const fullUserPrompt = userPrompt + historyContext;

    // 4. Generate narrative with model chain
    let narrative: string | null = null;
    let modelUsed = '';

    if (isPro) {
      // Weekly synthesis: use most capable model
      // Daily Pro: Gemini 3 Flash
      const geminiModel = isWeekly ? 'gemini-3-flash-preview' : 'gemini-3-flash-preview';
      narrative = await callGemini(env, systemPrompt, fullUserPrompt, geminiModel);
      if (narrative) {
        modelUsed = geminiModel;
      }

      // Pro fallback: OpenAI
      if (!narrative && env.OPENAI_API_KEY) {
        narrative = await callOpenAI(env.OPENAI_API_KEY, systemPrompt, fullUserPrompt);
        if (narrative) {
          modelUsed = 'openai-gpt-5-mini';
        }
      }
    }

    // Free users or all-Pro-models-failed: Gemini 2.5 Flash (better than Workers AI)
    if (!narrative) {
      narrative = await callGemini(env, systemPrompt, fullUserPrompt, 'gemini-2.5-flash');
      if (narrative) {
        modelUsed = 'gemini-2.5-flash';
      }
    }

    // Last resort: Workers AI
    if (!narrative) {
      narrative = await callWorkersAI(env.AI, systemPrompt, fullUserPrompt);
      if (narrative) {
        modelUsed = 'workers-ai-gemma-3-12b';
      }
    }

    if (!narrative) {
      return new Response(
        JSON.stringify({ error: 'All models failed to generate narrative' }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    // 5. Store in D1
    try {
      await env.DB.prepare(
        'INSERT INTO narrator_reflections (user_hash, date, context_tier, narrative, model, context_snapshot) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        userHash, today, tier || 'intro', narrative, modelUsed,
        JSON.stringify(body.context || {})
      ).run();
    } catch (e) {
      // UNIQUE constraint = already stored (race condition); ignore
      console.warn('[NARRATOR] D1 insert failed (likely duplicate):', (e as Error).message);
    }

    // 6. Cache in KV
    const result: NarratorResponse = { narrative, tier: tier || 'intro', model: modelUsed, cached: false };
    await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[NARRATOR] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─── Model Calls ───────────────────────────────────────────

/**
 * Call Gemini with key rotation. Model is caller-specified.
 */
async function callGemini(env: Env, system: string, user: string, model: string): Promise<string | null> {
  const keys: string[] = [];
  if (env.GEMINI_API_KEY) keys.push(env.GEMINI_API_KEY);
  if (env.GEMINI_API_KEY_2) keys.push(env.GEMINI_API_KEY_2);
  if (env.GEMINI_API_KEY_3) keys.push(env.GEMINI_API_KEY_3);
  if (env.GEMINI_API_KEY_4) keys.push(env.GEMINI_API_KEY_4);
  if (env.GEMINI_API_KEY_5) keys.push(env.GEMINI_API_KEY_5);
  if (env.GEMINI_API_KEY_6) keys.push(env.GEMINI_API_KEY_6);

  if (keys.length === 0) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  for (let i = 0; i < Math.min(keys.length, 3); i++) {
    try {
      const response = await fetch(`${url}?key=${keys[i]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${system}\n\n---\n\n${user}` }] },
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        console.warn(`[NARRATOR] Gemini key ${i} returned ${response.status}`);
        continue;
      }

      const result = await response.json() as any;
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.length > 50) return text.trim();
    } catch (e) {
      console.warn(`[NARRATOR] Gemini key ${i} error:`, (e as Error).message);
    }
  }

  return null;
}

/**
 * Call OpenAI GPT-5-mini as fallback for Pro users.
 */
async function callOpenAI(apiKey: string, system: string, user: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.85,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      console.warn(`[NARRATOR] OpenAI returned ${response.status}`);
      return null;
    }

    const result = await response.json() as any;
    const text = result?.choices?.[0]?.message?.content;
    if (text && text.length > 50) return text.trim();
    return null;
  } catch (e) {
    console.warn('[NARRATOR] OpenAI error:', (e as Error).message);
    return null;
  }
}

/**
 * Call Workers AI (Llama 3.1 8B) for free users.
 */
async function callWorkersAI(ai: Ai, system: string, user: string): Promise<string | null> {
  try {
    const result = await ai.run('@cf/google/gemma-3-12b-it' as any, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.85,
      max_tokens: 1024,
    }) as any;

    const text = result?.response;
    if (text && text.length > 50) return text.trim();
    return null;
  } catch (e) {
    console.warn('[NARRATOR] Workers AI error:', (e as Error).message);
    return null;
  }
}
