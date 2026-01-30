/**
 * Global middleware for CORS and request handling
 */

import { Env } from '../src/types';

const ALLOWED_ORIGINS = [
  'https://therealmofpatterns.pages.dev',
  'https://therealmofpatterns.com',
  'http://localhost:8788',
  'http://localhost:3000',
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS(origin);
  }

  // Process the request
  const response = await context.next();

  // Add CORS headers to response
  const corsHeaders = getCORSHeaders(origin);
  const newResponse = new Response(response.body, response);

  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }

  return newResponse;
};

function handleCORS(origin: string): Response {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin),
  });
}

function getCORSHeaders(origin: string): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}
