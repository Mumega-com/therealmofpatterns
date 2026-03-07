/**
 * POST /api/auth/logout
 * Deletes session and clears cookie.
 */
import type { Env } from '../../../src/types';
import { getSessionId, clearSessionCookie } from '../../../src/lib/auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const sessionId = getSessionId(request);

  if (sessionId) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`)
      .bind(sessionId).run().catch(() => {});
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      ...CORS,
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
