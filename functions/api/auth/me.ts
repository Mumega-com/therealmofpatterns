/**
 * GET /api/auth/me
 * Returns current session info.
 */
import type { Env } from '../../../src/types';
import { getSession } from '../../../src/lib/auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(request, env);

  if (!session) {
    return Response.json({ authenticated: false }, { headers: CORS });
  }

  // Get subscription tier
  const sub = await env.DB.prepare(
    `SELECT plan, status FROM subscribers WHERE email_hash = ?`,
  ).bind(session.email_hash).first<{ plan: string; status: string }>();

  const isPro = !!sub && (sub.plan === 'individual' || sub.plan === 'founding' || sub.plan === 'squad') && sub.status !== 'canceled';

  return Response.json({
    authenticated: true,
    email_hash: session.email_hash,
    isPro,
    plan: sub?.plan ?? 'free',
  }, {
    headers: {
      ...CORS,
      'Cache-Control': 'private, max-age=60',
    },
  });
};
