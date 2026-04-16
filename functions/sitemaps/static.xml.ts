/**
 * Static Pages Sitemap for The Realm of Patterns
 * All public, non-auth, non-dynamic pages.
 * Served at /sitemaps/static.xml
 */

import type { Env } from '../../src/types';

const BASE_URL = 'https://therealmofpatterns.com';

// Public static pages — auth-gated pages (/dashboard, /profile, /settings, /admin) excluded
const STATIC_PAGES = [
  // Core
  { path: '/',               changefreq: 'daily',   priority: 1.0 },
  { path: '/free-report/',   changefreq: 'weekly',   priority: 0.95 },
  { path: '/discover/',      changefreq: 'weekly',   priority: 0.9 },
  { path: '/sol/today/',     changefreq: 'daily',    priority: 0.9 },
  { path: '/sol/checkin/',   changefreq: 'daily',    priority: 0.8 },
  { path: '/reading/',       changefreq: 'daily',    priority: 0.9 },
  { path: '/sol/',           changefreq: 'daily',    priority: 0.8 },
  { path: '/journey/',       changefreq: 'weekly',   priority: 0.7 },
  { path: '/soul/',          changefreq: 'weekly',   priority: 0.7 },
  { path: '/soul/compare/',  changefreq: 'weekly',   priority: 0.6 },
  { path: '/subscribe/',     changefreq: 'weekly',   priority: 0.8 },

  // Content hubs
  { path: '/blog/',          changefreq: 'weekly',   priority: 0.8 },
  { path: '/traditions/',    changefreq: 'monthly',  priority: 0.7 },
  { path: '/why/',           changefreq: 'monthly',  priority: 0.7 },

  // Why pages (high SEO value — search intent pages)
  { path: '/why/tired/',         changefreq: 'monthly', priority: 0.7 },
  { path: '/why/stuck/',         changefreq: 'monthly', priority: 0.7 },
  { path: '/why/anxious/',       changefreq: 'monthly', priority: 0.7 },
  { path: '/why/unmotivated/',   changefreq: 'monthly', priority: 0.7 },
  { path: '/why/restless/',      changefreq: 'monthly', priority: 0.7 },
  { path: '/why/overwhelmed/',   changefreq: 'monthly', priority: 0.7 },
  { path: '/why/disconnected/',  changefreq: 'monthly', priority: 0.7 },
  { path: '/why/creative-block/',changefreq: 'monthly', priority: 0.7 },

  // Product pages
  { path: '/dna/',           changefreq: 'monthly',  priority: 0.7 },
  { path: '/hidden-gifts/',  changefreq: 'monthly',  priority: 0.7 },
  { path: '/compare/',       changefreq: 'monthly',  priority: 0.6 },

  // Archetype pages (high SEO value — search intent)
  { path: '/archetype/sage/',       changefreq: 'monthly', priority: 0.8 },
  { path: '/archetype/hero/',       changefreq: 'monthly', priority: 0.8 },
  { path: '/archetype/ruler/',      changefreq: 'monthly', priority: 0.8 },
  { path: '/archetype/creator/',    changefreq: 'monthly', priority: 0.8 },
  { path: '/archetype/explorer/',   changefreq: 'monthly', priority: 0.8 },
  { path: '/archetype/warrior/',    changefreq: 'monthly', priority: 0.8 },
  { path: '/archetype/caregiver/',  changefreq: 'monthly', priority: 0.8 },
  { path: '/archetype/mystic/',     changefreq: 'monthly', priority: 0.8 },

  // Tradition pages
  { path: '/traditions/chinese/',   changefreq: 'monthly', priority: 0.6 },
  { path: '/traditions/vedic/',     changefreq: 'monthly', priority: 0.6 },
  { path: '/traditions/mayan/',     changefreq: 'monthly', priority: 0.6 },
  { path: '/traditions/western/',   changefreq: 'monthly', priority: 0.6 },
  { path: '/traditions/celtic/',    changefreq: 'monthly', priority: 0.6 },

  // Stage pages
  { path: '/stage/reset/',          changefreq: 'monthly', priority: 0.6 },
  { path: '/stage/clarity/',        changefreq: 'monthly', priority: 0.6 },
  { path: '/stage/growth/',         changefreq: 'monthly', priority: 0.6 },
  { path: '/stage/flow/',           changefreq: 'monthly', priority: 0.6 },

  // Info pages
  { path: '/about/',         changefreq: 'monthly',  priority: 0.6 },
  { path: '/faq/',           changefreq: 'monthly',  priority: 0.6 },
  { path: '/history/',       changefreq: 'monthly',  priority: 0.5 },
  { path: '/privacy/',       changefreq: 'yearly',   priority: 0.3 },
  { path: '/terms/',         changefreq: 'yearly',   priority: 0.3 },
];

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=86400',
};

export const onRequestGet: PagesFunction<Env> = async () => {
  // Compute date at request time, not module load time (avoids Workers caching epoch zero)
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of STATIC_PAGES) {
    xml += `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, { status: 200, headers: XML_HEADERS });
};
