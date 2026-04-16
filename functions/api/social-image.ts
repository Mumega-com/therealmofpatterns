/**
 * POST /api/social-image
 *
 * Generates a social-ready image from the stored image_prompt via Google Imagen 4 Fast
 * (~$0.02/image at 1024×1024 — cheapest stable Imagen tier), persists to R2,
 * updates social_posts.image_url.
 *
 * Body:
 *   {
 *     admin_key: string,
 *     date?: string,            // YYYY-MM-DD, default today
 *     language?: string,        // default 'en'
 *     force?: boolean,          // regenerate even if image_url already set
 *     aspect?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4',  // default '1:1'
 *     negative?: string,        // optional negative prompt
 *   }
 *
 * Returns:
 *   { success, date, language, image_url, prompt_used, cached, model }
 *
 * Idempotent: if image already exists and !force, returns the cached URL.
 */

import type { Env } from '../../src/types';

interface RequestBody {
  admin_key?: string;
  date?: string;
  language?: string;
  force?: boolean;
  aspect?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  negative?: string;
}

interface ImagenPrediction {
  bytesBase64Encoded?: string;
  mimeType?: string;
}

interface ImagenResponse {
  predictions?: ImagenPrediction[];
  error?: { code: number; message: string; status: string };
}

const IMAGEN_MODEL = 'imagen-4.0-fast-generate-001';

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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
  if (!env.GEMINI_API_KEY) return errorResponse('CONFIGURATION_ERROR', 'GEMINI_API_KEY not configured', 500);

  const targetDate = body.date || new Date().toISOString().split('T')[0];
  const language = body.language || 'en';
  const aspect = body.aspect || '1:1';

  const post = await env.DB.prepare(`
    SELECT id, image_prompt, image_url
    FROM social_posts
    WHERE date = ? AND language = ?
    LIMIT 1
  `).bind(targetDate, language).first<{ id: string; image_prompt: string; image_url: string | null }>();

  if (!post) {
    return errorResponse('NOT_FOUND', `No social post for ${targetDate}/${language}. Run /api/content-loop first.`, 404);
  }

  if (post.image_url && !body.force) {
    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      language,
      image_url: post.image_url,
      prompt_used: post.image_prompt,
      cached: true,
      model: IMAGEN_MODEL,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Call Imagen 4 Fast via Google AI Studio REST
  const instances: Array<Record<string, unknown>> = [{ prompt: post.image_prompt }];
  if (body.negative) instances[0].negativePrompt = body.negative;

  let imagenResult: ImagenResponse;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances,
          parameters: { sampleCount: 1, aspectRatio: aspect },
        }),
      }
    );
    imagenResult = await res.json();
    if (!res.ok || imagenResult.error) {
      return errorResponse(
        'IMAGEN_ERROR',
        imagenResult.error?.message ?? `HTTP ${res.status}`,
        500,
      );
    }
  } catch (err) {
    return errorResponse('IMAGEN_FETCH_FAILED', err instanceof Error ? err.message : String(err), 500);
  }

  const prediction = imagenResult.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    return errorResponse('IMAGEN_NO_DATA', 'Imagen returned no image data', 500);
  }

  // Decode + store to R2
  const bytes = base64ToBytes(prediction.bytesBase64Encoded);
  const mime = prediction.mimeType || 'image/png';
  const ext = mime.split('/')[1] ?? 'png';
  const r2Key = `social/${targetDate}-${language}.${ext}`;

  await env.STORAGE.put(r2Key, bytes, {
    httpMetadata: { contentType: mime },
  });

  const imageUrl = `${env.APP_URL}/api/art/${encodeURIComponent(r2Key)}`;

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
    model: IMAGEN_MODEL,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
