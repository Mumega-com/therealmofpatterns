/**
 * Global middleware for CORS, geo-language detection, and request handling
 */

import type { Env } from '../src/types';
import { detectLanguage, getLocalizedPath } from '../src/lib/geo-language';
import type { CloudflareRequest, SupportedLanguage } from '../src/lib/geo-language';

const ALLOWED_ORIGINS = [
  'https://therealmofpatterns.pages.dev',
  'https://therealmofpatterns.com',
  'http://localhost:8788',
  'http://localhost:3000',
];

// Paths that should NOT be redirected
const SKIP_REDIRECT_PATTERNS = [
  /^\/api\//,           // API endpoints
  /^\/admin/,           // Admin pages
  /^\/sitemap/,         // Sitemaps
  /^\/robots\.txt/,     // Robots
  /^\/_next\//,         // Next.js internals
  /^\/static\//,        // Static assets
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf)$/i, // Files
];

// Language prefixes in URL
const LANG_PREFIX_REGEX = /^\/(en|pt-br|pt-pt|es-mx|es-ar|es-es)(\/|$)/;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';
  const url = new URL(request.url);

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS(origin);
  }

  // Check if we should skip geo-redirect
  const shouldSkip = SKIP_REDIRECT_PATTERNS.some(pattern => pattern.test(url.pathname));
  const hasLangPrefix = LANG_PREFIX_REGEX.test(url.pathname);

  // Geo-language redirect logic (only for GET requests without lang prefix)
  if (request.method === 'GET' && !shouldSkip && !hasLangPrefix && url.pathname !== '/') {
    // Cast request to CloudflareRequest for geo data
    const cfRequest = request as CloudflareRequest;

    // Get language preference from cookie
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const cookieLang = cookies['lang'];

    // Detect best language
    const detectedLang = detectLanguage({
      urlLang: null,
      cookieLang,
      acceptLanguage: request.headers.get('Accept-Language'),
      countryCode: cfRequest.cf?.country || null,
    });

    // If detected language is not English, redirect to localized path
    if (detectedLang !== 'en') {
      const localizedPath = getLocalizedPath(url.pathname, detectedLang);
      const redirectUrl = new URL(localizedPath, url.origin);
      redirectUrl.search = url.search;

      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl.toString(),
          'Set-Cookie': `lang=${detectedLang}; Path=/; Max-Age=31536000; SameSite=Lax`,
          ...getCORSHeaders(origin),
        },
      });
    }
  }

  // For homepage, check if we should suggest a language (don't redirect, just set header)
  if (url.pathname === '/') {
    const cfRequest = request as CloudflareRequest;
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const cookieLang = cookies['lang'];

    if (!cookieLang) {
      const detectedLang = detectLanguage({
        urlLang: null,
        cookieLang: null,
        acceptLanguage: request.headers.get('Accept-Language'),
        countryCode: cfRequest.cf?.country || null,
      });

      // Store suggestion in response header for client-side banner
      const response = await context.next();
      const newResponse = new Response(response.body, response);

      if (detectedLang !== 'en') {
        newResponse.headers.set('X-Suggested-Language', detectedLang);
        newResponse.headers.set('X-User-Country', cfRequest.cf?.country || 'unknown');
      }

      // Add CORS headers
      for (const [key, value] of Object.entries(getCORSHeaders(origin))) {
        newResponse.headers.set(key, value);
      }

      return newResponse;
    }
  }

  // Extract language from URL and store in request context for downstream use
  const langMatch = url.pathname.match(LANG_PREFIX_REGEX);
  if (langMatch) {
    const lang = langMatch[1] as SupportedLanguage;
    // Set language cookie to remember preference
    const response = await context.next();
    const newResponse = new Response(response.body, response);

    // Set lang cookie if different from current
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    if (cookies['lang'] !== lang) {
      newResponse.headers.set('Set-Cookie', `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`);
    }

    // Add CORS headers
    for (const [key, value] of Object.entries(getCORSHeaders(origin))) {
      newResponse.headers.set(key, value);
    }

    return newResponse;
  }

  // Process the request normally
  const response = await context.next();

  // Add CORS and security headers to response
  const corsHeaders = getCORSHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const newResponse = new Response(response.body, response);

  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }

  for (const [key, value] of Object.entries(securityHeaders)) {
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

/**
 * Security headers to protect against common attacks
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com wss://*.therealmofpatterns.com https://*.cloudflare.com",
      "frame-src https://js.stripe.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  };
}

/**
 * Parse cookies from Cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookies[name.trim()] = valueParts.join('=').trim();
    }
  });

  return cookies;
}
