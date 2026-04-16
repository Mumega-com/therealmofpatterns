/**
 * POST /api/social-image
 *
 * Generates a social-ready image from the stored image_prompt using Workers AI,
 * persists to R2, and updates social_posts.image_url.
 *
 * Body:
 *   {
 *     admin_key: string,
 *     date?: string,        // YYYY-MM-DD, default today
 *     language?: string,    // default 'en'
 *     force?: boolean,      // regenerate even if image_url already set
 *     model?: string,       // Workers AI model, default "@cf/bytedance/stable-diffusion-xl-lightning"
 *   }
 *
 * Returns:
 *   { success, date, language, image_url, prompt_used, cached }
 *
 * Idempotent: if image already exists and !force, returns the cached URL.
 */

import type { Env } from '../../src/types';

interface RequestBody {
  admin_key?: string;
  date?: string;
  language?: string;
  force?: boolean;
  model?: string;
}

const DEFAULT_MODEL = '@cf/bytedance/stable-diffusion-xl-lightning';

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON');
  }

  const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
  if (!env.ADMIN_KEY) return errorResponse('CONFIGURATION_ERROR', 'ADMIN_KEY not configured', 500);
  if (adminKey !== env.ADMIN_KEY) return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);

  const targetDate = body.date || new Date().toISOString().split('T')[0];
  const language = body.language || 'en';
  const model = body.model || DEFAULT_MODEL;

  const post = await env.DB.prepare(`
    SELECT id, image_prompt, image_url
    FROM social_posts
    WHERE date = ? AND language = ?
    LIMIT 1
  `).bind(targetDate, language).first<{ id: string; image_prompt: string; image_url: string | null }>();

  if (!post) {
    return errorResponse('NOT_FOUND', `No social post for ${targetDate}/${language}. Run /api/content-loop first.`, 404);
  }

  // Return cached if present and not forced
  if (post.image_url && !body.force) {
    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      language,
      image_url: post.image_url,
      prompt_used: post.image_prompt,
      cached: true,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Generate via Workers AI
  try {
    const aiResult = await env.AI.run(model as keyof AiModels, {
      prompt: post.image_prompt,
      num_steps: 4,      // lightning model is fast at 4 steps
      width: 1024,
      height: 1024,
    }) as ReadableStream | Uint8Array | ArrayBuffer;

    // Workers AI image models return a binary stream / buffer
    let bytes: Uint8Array;
    if (aiResult instanceof ReadableStream) {
      const reader = aiResult.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const total = chunks.reduce((n, c) => n + c.byteLength, 0);
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.byteLength;
      }
    } else if (aiResult instanceof ArrayBuffer) {
      bytes = new Uint8Array(aiResult);
    } else {
      bytes = aiResult as Uint8Array;
    }

    // Persist to R2
    const r2Key = `social/${targetDate}-${language}.png`;
    await env.STORAGE.put(r2Key, bytes, {
      httpMetadata: { contentType: 'image/png' },
    });

    // Public URL via APP_URL + /r2-proxy or direct R2 public bucket
    const imageUrl = `${env.APP_URL}/api/art/${encodeURIComponent(r2Key)}`;

    // Update social_posts row
    await env.DB.prepare(`
      UPDATE social_posts SET image_url = ?, updated_at = ? WHERE id = ?
    `).bind(imageUrl, new Date().toISOString(), post.id).run();

    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      language,
      image_url: imageUrl,
      prompt_used: post.image_prompt,
      cached: false,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return errorResponse('AI_ERROR', err instanceof Error ? err.message : String(err), 500);
  }
};

// Type helper for Workers AI model name
type AiModels = {
  '@cf/bytedance/stable-diffusion-xl-lightning': unknown;
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': unknown;
  '@cf/lykon/dreamshaper-8-lcm': unknown;
};
