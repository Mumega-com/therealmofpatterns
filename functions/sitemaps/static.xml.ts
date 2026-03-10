/**
 * Static Pages Sitemap for The Realm of Patterns
 * All public, non-auth, non-dynamic pages.
 * Served at /sitemaps/static.xml
 */

import type { Env } from '../../src/types';

const BASE_URL = 'https://therealmofpatterns.com';
const TODAY = new Date().toISOString().split('T')[0];

// Public static pages — auth-gated pages (/sol, /dashboard, /profile, /settings, /admin) excluded
const STATIC_PAGES = [
  { path: '/',               changefreq: 'daily',   priority: 1.0 },
  { path: '/about/',         changefreq: 'monthly',  priority: 0.7 },
  { path: '/blog/',          changefreq: 'weekly',   priority: 0.8 },
  { path: '/discover/',      changefreq: 'weekly',   priority: 0.8 },
  { path: '/dna/',           changefreq: 'monthly',  priority: 0.7 },
  { path: '/faq/',           changefreq: 'monthly',  priority: 0.6 },
  { path: '/hidden-gifts/',  changefreq: 'monthly',  priority: 0.6 },
  { path: '/history/',       changefreq: 'monthly',  priority: 0.6 },
  { path: '/privacy/',       changefreq: 'yearly',   priority: 0.3 },
  { path: '/reading/',       changefreq: 'daily',    priority: 0.9 },
  { path: '/soul/',          changefreq: 'weekly',   priority: 0.7 },
  { path: '/soul/compare/',  changefreq: 'weekly',   priority: 0.6 },
  { path: '/subscribe/',     changefreq: 'weekly',   priority: 0.8 },
  { path: '/terms/',         changefreq: 'yearly',   priority: 0.3 },
  { path: '/traditions/',    changefreq: 'monthly',  priority: 0.7 },
  { path: '/why/',           changefreq: 'monthly',  priority: 0.7 },
  { path: '/sol/today/',     changefreq: 'daily',    priority: 0.8 },
];

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=86400',
};

export const onRequestGet: PagesFunction<Env> = async () => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of STATIC_PAGES) {
    xml += `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, { status: 200, headers: XML_HEADERS });
};
