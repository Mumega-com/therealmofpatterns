/**
 * GET /[lang]/dimension/[slug]
 * SEO-optimized dimension guide pages
 * Fetches from cms_cosmic_content, renders with FAQ schema
 */

import type { Env } from '../../../src/types';
import { DIMENSION_METADATA } from '../../../src/types';

interface CMSContent {
  id: string;
  slug: string;
  title: string;
  content_type: string;
  language: string;
  meta_description: string;
  hero_content: string;
  content_blocks: string;
  faqs: string;
  schema_markup: string;
  word_count: number;
  created_at: string;
}

interface ContentBlock {
  type: string;
  content: string;
}

interface FAQ {
  question: string;
  answer: string;
}

const SUPPORTED_LANGS = ['en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const lang = params.lang as string;
  const slug = params.slug as string;

  // Validate language
  if (!SUPPORTED_LANGS.includes(lang)) {
    return new Response(render404(lang), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const currentPath = `/${lang}/dimension/${slug}`;
  const cacheKey = `seo:${lang}:dimension:${slug}:v2`;

  try {
    // Check KV cache first
    const cached = await env.CACHE?.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Cache': 'HIT',
        },
      });
    }

    // Build full slug path
    const fullSlug = `${lang}/dimension/${slug}`;

    // Fetch from CMS
    const content = await env.DB.prepare(`
      SELECT * FROM cms_cosmic_content
      WHERE slug = ? AND published = 1
    `).bind(fullSlug).first<CMSContent>();

    let html: string;

    if (content) {
      html = renderCMSContent(content, lang, currentPath);
    } else {
      // Fallback to metadata-based content
      const fallbackHtml = renderFallbackContent(lang, slug, currentPath);
      if (!fallbackHtml) {
        return new Response(render404(lang), {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      html = fallbackHtml;
    }

    // Cache for 1 hour
    await env.CACHE?.put(cacheKey, html, { expirationTtl: 3600 });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Dimension page error:', error);
    return new Response(render404(lang), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

// ============================================
// Render CMS Content (rich content from database)
// ============================================

function renderCMSContent(content: CMSContent, lang: string, currentPath: string): string {
  const blocks = safeParseJSON<ContentBlock[]>(content.content_blocks, []);
  const faqs = safeParseJSON<FAQ[]>(content.faqs, []);
  const baseUrl = 'https://therealmofpatterns.com';

  // Build content HTML
  let contentHtml = '';
  for (const block of blocks) {
    if (block.type === 'intro') {
      contentHtml += `<div class="intro-text">${formatParagraphs(block.content)}</div>`;
    } else if (block.type === 'body') {
      contentHtml += `<div class="body-content">${formatParagraphs(block.content)}</div>`;
    } else if (block.type === 'guidance') {
      contentHtml += `
        <section class="guidance-section">
          <h2>Integration Practices</h2>
          <div class="guidance-content">${formatMarkdown(block.content)}</div>
        </section>`;
    } else {
      contentHtml += `<div class="content-block">${formatParagraphs(block.content)}</div>`;
    }
  }

  // Build FAQ HTML and schema
  let faqHtml = '';
  let faqSchema = '';
  if (faqs.length > 0) {
    faqHtml = `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">
          ${faqs.map(faq => `
            <details class="faq-item">
              <summary class="faq-question">${escapeHtml(faq.question)}</summary>
              <div class="faq-answer">${escapeHtml(faq.answer)}</div>
            </details>
          `).join('')}
        </div>
      </section>`;

    faqSchema = `{
      "@type": "FAQPage",
      "mainEntity": [
        ${faqs.map(faq => `{
          "@type": "Question",
          "name": "${escapeHtml(faq.question)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${escapeHtml(faq.answer)}"
          }
        }`).join(',')}
      ]
    }`;
  }

  // Build schema markup
  const articleSchema = `{
    "@type": "Article",
    "headline": "${escapeHtml(content.title)}",
    "description": "${escapeHtml(content.meta_description)}",
    "author": {
      "@type": "Organization",
      "name": "The Realm of Patterns",
      "url": "${baseUrl}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Realm of Patterns",
      "logo": {
        "@type": "ImageObject",
        "url": "${baseUrl}/assets/brand/logo.png"
      }
    },
    "datePublished": "${content.created_at}",
    "wordCount": ${content.word_count},
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${baseUrl}${currentPath}"
    }
  }`;

  const breadcrumbSchema = `{
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Home", "item": "${baseUrl}/${lang}/"},
      {"@type": "ListItem", "position": 2, "name": "Dimensions", "item": "${baseUrl}/${lang}/dimensions"},
      {"@type": "ListItem", "position": 3, "name": "${escapeHtml(content.title)}"}
    ]
  }`;

  const schemas = [articleSchema, breadcrumbSchema];
  if (faqSchema) schemas.push(faqSchema);

  return renderFullPage({
    title: content.title,
    description: content.meta_description,
    lang,
    currentPath,
    schemas,
    body: `
      <article class="dimension-article" itemscope itemtype="https://schema.org/Article">
        <header class="article-header">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/${lang}/">Home</a>
            <span>/</span>
            <a href="/${lang}/dimensions">Dimensions</a>
            <span>/</span>
            <span>${escapeHtml(content.title.split(':')[0])}</span>
          </nav>
          <h1 itemprop="headline">${escapeHtml(content.title)}</h1>
          <p class="subtitle" itemprop="description">${escapeHtml(content.meta_description)}</p>
        </header>

        <div class="article-content" itemprop="articleBody">
          ${contentHtml}
        </div>

        ${faqHtml}

        ${renderRelatedDimensions(lang)}
        ${renderCTAs(lang)}
      </article>
    `,
  });
}

// ============================================
// Render Fallback Content (when CMS is empty)
// ============================================

function renderFallbackContent(lang: string, slug: string, currentPath: string): string | null {
  const slugMap: Record<string, number> = {
    'phase': 0, 'existence': 1, 'cognition': 2, 'value': 3,
    'expansion': 4, 'action': 5, 'relation': 6, 'field': 7,
  };

  const dimIndex = slugMap[slug.toLowerCase()];
  if (dimIndex === undefined) return null;

  const dim = DIMENSION_METADATA[dimIndex];
  const baseUrl = 'https://therealmofpatterns.com';

  const descriptions: Record<number, string> = {
    0: 'Phase represents the core of identity and will. It is the Sun principle - the conscious drive to become who you truly are. This dimension governs self-expression, vitality, and the fundamental question of "Who am I?"',
    1: 'Existence embodies structure and form. Ruled by Saturn, it represents the capacity to create lasting order from chaos. This dimension governs discipline, responsibility, and the foundations we build.',
    2: 'Cognition is the realm of mind and communication. Mercury guides this dimension of thought, learning, and understanding. It governs how we process information and express ideas.',
    3: 'Value encompasses beauty and harmony. Venus illuminates our appreciation of aesthetics, love, and connection. This dimension governs what we treasure and find meaningful.',
    4: 'Expansion drives growth and meaning. Jupiter expands our horizons, seeking truth beyond the familiar. This dimension governs our quest for wisdom and broader understanding.',
    5: 'Action embodies force and movement. Mars provides the energy to transform, assert, and change. This dimension governs our drive, ambition, and how we pursue goals.',
    6: 'Relation governs connection and care. The Moon reflects our capacity for emotional bonding and nurturing. This dimension governs our relationships and emotional needs.',
    7: 'Field represents the witness and unity. Neptune and Uranus guide this dimension of cosmic awareness. It governs transcendence, intuition, and connection to something greater.',
  };

  const title = `${dim.name} Dimension: ${dim.domain} in the 16D Framework`;
  const description = `Explore the ${dim.name} dimension (${dim.symbol}) of the FRC 16D framework. Understand how ${dim.ruler} influences ${dim.domain.toLowerCase()} in your cosmic signature.`;

  return renderFullPage({
    title,
    description,
    lang,
    currentPath,
    schemas: [`{
      "@type": "Article",
      "headline": "${escapeHtml(title)}",
      "description": "${escapeHtml(description)}"
    }`],
    body: `
      <article class="dimension-article">
        <header class="article-header">
          <nav class="breadcrumbs">
            <a href="/${lang}/">Home</a>
            <span>/</span>
            <a href="/${lang}/dimensions">Dimensions</a>
            <span>/</span>
            <span>${dim.name}</span>
          </nav>
          <div class="dimension-symbol">${dim.symbol}</div>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">Planetary Ruler: ${dim.ruler}</p>
        </header>

        <div class="article-content">
          <section>
            <h2>Understanding ${dim.name}</h2>
            <p>${descriptions[dimIndex]}</p>
          </section>

          <section>
            <h2>The ${dim.ruler} Influence</h2>
            <p>In the FRC 16D framework, ${dim.name} (${dim.symbol}) is governed by ${dim.ruler}.
            This planetary energy shapes how the themes of ${dim.domain.toLowerCase()} manifest in your cosmic signature.</p>
          </section>
        </div>

        ${renderRelatedDimensions(lang)}
        ${renderCTAs(lang)}
      </article>
    `,
  });
}

// ============================================
// Full Page Renderer
// ============================================

interface PageOptions {
  title: string;
  description: string;
  lang: string;
  currentPath: string;
  schemas: string[];
  body: string;
}

function renderFullPage(opts: PageOptions): string {
  const baseUrl = 'https://therealmofpatterns.com';
  const canonical = `${baseUrl}${opts.currentPath}`;

  const hreflangTags = SUPPORTED_LANGS.map(l => {
    const path = opts.currentPath.replace(`/${opts.lang}/`, `/${l}/`);
    return `<link rel="alternate" hreflang="${l}" href="${baseUrl}${path}">`;
  }).join('\n    ');

  const schemaScript = `<script type="application/ld+json">{
  "@context": "https://schema.org",
  "@graph": [${opts.schemas.join(',')}]
}</script>`;

  return `<!DOCTYPE html>
<html lang="${opts.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(opts.title)} | The Realm of Patterns</title>
    <meta name="description" content="${escapeHtml(opts.description)}">
    <link rel="canonical" href="${canonical}">
    ${hreflangTags}
    <link rel="alternate" hreflang="x-default" href="${baseUrl}/en${opts.currentPath.replace(`/${opts.lang}/`, '/')}">

    <meta property="og:title" content="${escapeHtml(opts.title)}">
    <meta property="og:description" content="${escapeHtml(opts.description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${baseUrl}/assets/brand/hero-cosmic.png">
    <meta property="og:site_name" content="The Realm of Patterns">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(opts.title)}">
    <meta name="twitter:description" content="${escapeHtml(opts.description)}">

    ${schemaScript}

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500&display=swap" rel="stylesheet">

    <style>
      :root {
        --gold: #d4a854;
        --gold-light: rgba(212,168,84,0.1);
        --bg-dark: #0a0908;
        --bg-card: #1a1814;
        --text: #f0e8d8;
        --text-muted: rgba(240,232,216,0.6);
        --purple: #8b5cf6;
      }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Cormorant Garamond', Georgia, serif;
        background: var(--bg-dark);
        color: var(--text);
        line-height: 1.8;
        min-height: 100vh;
      }
      a { color: var(--gold); text-decoration: none; }
      a:hover { text-decoration: underline; }

      /* Header */
      .site-header {
        position: fixed; top: 0; left: 0; right: 0; z-index: 50;
        background: rgba(10,9,8,0.95); backdrop-filter: blur(8px);
        border-bottom: 1px solid var(--gold-light);
      }
      .header-inner {
        max-width: 1200px; margin: 0 auto; padding: 0.75rem 1.5rem;
        display: flex; justify-content: space-between; align-items: center;
      }
      .logo { font-size: 1rem; color: var(--gold); font-weight: 600; letter-spacing: 0.05em; }
      .nav { display: flex; gap: 1.5rem; font-family: 'Inter', sans-serif; font-size: 0.85rem; }
      .nav a { color: var(--text-muted); }
      .nav a:hover { color: var(--gold); text-decoration: none; }

      /* Main */
      main { max-width: 800px; margin: 0 auto; padding: 6rem 1.5rem 4rem; }

      /* Article */
      .article-header { margin-bottom: 3rem; }
      .breadcrumbs { font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.5rem; }
      .breadcrumbs span { margin: 0 0.5rem; opacity: 0.5; }
      .dimension-symbol { font-size: 3rem; color: var(--gold); margin-bottom: 1rem; }
      h1 { font-size: 2.5rem; font-weight: 400; color: var(--gold); line-height: 1.2; margin-bottom: 0.75rem; }
      .subtitle { font-size: 1.1rem; color: var(--purple); font-style: italic; }

      .article-content { font-size: 1.1rem; }
      .article-content h2 { font-size: 1.5rem; color: var(--gold); margin: 2.5rem 0 1rem; font-weight: 400; }
      .article-content p { margin-bottom: 1.5rem; color: var(--text); }
      .intro-text { font-size: 1.15rem; margin-bottom: 2rem; }
      .body-content { margin-bottom: 2rem; }
      .guidance-section { background: var(--gold-light); padding: 2rem; border-radius: 8px; margin: 2rem 0; }
      .guidance-content ul { padding-left: 1.5rem; }
      .guidance-content li { margin-bottom: 0.75rem; }

      /* FAQ */
      .faq-section { margin: 3rem 0; }
      .faq-section h2 { margin-bottom: 1.5rem; }
      .faq-item { border-bottom: 1px solid var(--gold-light); }
      .faq-question {
        padding: 1rem 0; cursor: pointer; font-size: 1.1rem;
        list-style: none; display: flex; justify-content: space-between; align-items: center;
      }
      .faq-question::after { content: '+'; color: var(--gold); font-size: 1.5rem; }
      details[open] .faq-question::after { content: '-'; }
      .faq-answer { padding: 0 0 1.5rem; color: var(--text-muted); }

      /* Related */
      .related-section { margin: 3rem 0; }
      .related-section h3 { font-size: 1.2rem; color: var(--gold); margin-bottom: 1rem; }
      .related-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
      .related-card {
        padding: 1rem; border: 1px solid var(--gold-light); border-radius: 8px;
        text-align: center; transition: border-color 0.3s;
      }
      .related-card:hover { border-color: var(--gold); text-decoration: none; }
      .related-card .symbol { font-size: 1.5rem; color: var(--gold); }
      .related-card .name { font-size: 0.9rem; color: var(--text); margin-top: 0.5rem; }

      /* CTA */
      .cta-section { margin: 3rem 0; padding: 2rem; background: var(--bg-card); border-radius: 12px; text-align: center; }
      .cta-section h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      .cta-section p { color: var(--text-muted); margin-bottom: 1.5rem; }
      .cta-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
      .btn {
        padding: 0.75rem 1.5rem; border-radius: 8px; font-family: 'Inter', sans-serif;
        font-size: 0.9rem; transition: all 0.3s;
      }
      .btn-primary { background: var(--gold); color: var(--bg-dark); }
      .btn-primary:hover { transform: translateY(-2px); text-decoration: none; }
      .btn-secondary { border: 1px solid var(--gold); color: var(--gold); }
      .btn-secondary:hover { background: var(--gold-light); text-decoration: none; }

      /* Footer */
      .site-footer {
        border-top: 1px solid var(--gold-light); padding: 2rem 1.5rem;
        text-align: center; color: var(--text-muted); font-size: 0.85rem;
      }

      @media (max-width: 640px) {
        h1 { font-size: 1.8rem; }
        .nav { gap: 1rem; font-size: 0.8rem; }
      }
    </style>
</head>
<body>
    <header class="site-header">
      <div class="header-inner">
        <a href="/" class="logo">THE REALM OF PATTERNS</a>
        <nav class="nav">
          <a href="/theater">Theater</a>
          <a href="/learn">Learn</a>
          <a href="/squad">Squad</a>
          <a href="/subscribe">Subscribe</a>
        </nav>
      </div>
    </header>

    <main>
      ${opts.body}
    </main>

    <footer class="site-footer">
      <p>The Realm of Patterns - FRC 16D Universal Vector Framework</p>
      <p style="margin-top: 0.5rem;">
        <a href="/${opts.lang}/">Home</a> ·
        <a href="/${opts.lang}/dimensions">Dimensions</a> ·
        <a href="/subscribe">Subscribe</a>
      </p>
    </footer>
</body>
</html>`;
}

// ============================================
// Helper Functions
// ============================================

function renderRelatedDimensions(lang: string): string {
  const dims = DIMENSION_METADATA.slice(0, 8);
  return `
    <section class="related-section">
      <h3>Explore All Dimensions</h3>
      <div class="related-grid">
        ${dims.map(d => `
          <a href="/${lang}/dimension/${d.name.toLowerCase()}" class="related-card">
            <div class="symbol">${d.symbol}</div>
            <div class="name">${d.name}</div>
          </a>
        `).join('')}
      </div>
    </section>`;
}

function renderCTAs(lang: string): string {
  const texts: Record<string, { heading: string; sub: string; primary: string; secondary: string }> = {
    en: {
      heading: 'Discover Your Cosmic Signature',
      sub: 'Take a check-in to see how these dimensions manifest in your life today.',
      primary: 'Start Check-in',
      secondary: 'Learn More',
    },
    'pt-br': {
      heading: 'Descubra Sua Assinatura Cosmica',
      sub: 'Faca um check-in para ver como essas dimensoes se manifestam em sua vida hoje.',
      primary: 'Iniciar Check-in',
      secondary: 'Saiba Mais',
    },
    'es-mx': {
      heading: 'Descubre Tu Firma Cosmica',
      sub: 'Haz un check-in para ver como estas dimensiones se manifiestan en tu vida hoy.',
      primary: 'Iniciar Check-in',
      secondary: 'Saber Mas',
    },
  };
  const t = texts[lang] || texts.en;

  return `
    <section class="cta-section">
      <h3>${t.heading}</h3>
      <p>${t.sub}</p>
      <div class="cta-buttons">
        <a href="/sol/checkin" class="btn btn-primary">${t.primary}</a>
        <a href="/squad" class="btn btn-secondary">${t.secondary}</a>
      </div>
    </section>`;
}

function render404(lang: string): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>Page Not Found | The Realm of Patterns</title>
  <style>body{font-family:Georgia,serif;background:#0a0908;color:#f0e8d8;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}a{color:#d4a854}</style>
</head>
<body>
  <div>
    <h1>Page Not Found</h1>
    <p>The dimension you seek does not exist.</p>
    <p><a href="/${lang}/">Return Home</a></p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeParseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatParagraphs(text: string): string {
  return text.split('\n\n').map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
}

function formatMarkdown(text: string): string {
  // Simple markdown: **bold**, *italic*, bullet lists
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert bullet points
  const lines = html.split('\n');
  let inList = false;
  let result = '';

  for (const line of lines) {
    if (line.trim().startsWith('*   ') || line.trim().startsWith('- ')) {
      if (!inList) { result += '<ul>'; inList = true; }
      result += `<li>${line.replace(/^[\s]*[\*\-]\s+/, '')}</li>`;
    } else {
      if (inList) { result += '</ul>'; inList = false; }
      if (line.trim()) result += `<p>${line}</p>`;
    }
  }
  if (inList) result += '</ul>';

  return result;
}
