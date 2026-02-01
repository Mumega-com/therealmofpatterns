/**
 * GET /[lang]/figure/[slug]
 * Fetch historical figure from cosmic_content where content_type='historical_figure'
 * Render HTML with proper schema markup, hreflang tags
 * Cache in KV for 1 hour
 */

import { Env, HistoricalFigure, DIMENSION_METADATA } from '../../../src/types';
import {
  fetchContent,
  loadVoice,
  renderPage,
  render404Page,
  renderContentBlocks,
  isValidLanguage,
  getTranslation,
} from '../../../src/lib/content-renderer';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const lang = params.lang as string;
  const slug = params.slug as string;

  // Validate language
  if (!isValidLanguage(lang)) {
    return new Response(render404Page('en', `/${lang}/figure/${slug}`), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const currentPath = `/${lang}/figure/${slug}`;
  const cacheKey = `page:${lang}:figure:${slug}`;

  try {
    // Check KV cache first
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT',
        },
      });
    }

    // Try to fetch from cosmic_content first
    const content = await fetchContent(env, lang, 'historical_figure', slug);

    if (content) {
      // Render from cosmic_content
      const voice = await loadVoice(env, lang);

      const schemaMarkup = buildPersonSchema(content.title, content.meta_description, currentPath);

      const breadcrumbs = [
        { title: getTranslation(lang, 'home'), url: `/${lang}/` },
        { title: getTranslation(lang, 'figures'), url: `/${lang}/figures` },
        { title: content.title, url: currentPath },
      ];

      const renderedContent = `
        <article class="figure-article">
          <h1 class="page-title">${escapeHtml(content.title)}</h1>
          <p class="page-subtitle">${escapeHtml(content.meta_description)}</p>

          <div class="figure-content">
            ${renderContentBlocks(content.content_blocks)}
          </div>

          ${renderRelatedTopics(content.related_topics || [], lang)}
          ${renderCTA(lang)}
        </article>`;

      const html = renderPage({
        title: content.title,
        description: content.meta_description,
        content: renderedContent,
        schemaMarkup,
        currentLang: lang,
        currentPath,
        voice: voice || undefined,
        breadcrumbs,
      });

      await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'MISS',
        },
      });
    }

    // Fallback: Try to fetch from historical_figures table directly
    const figureFromDb = await fetchFigureFromDb(env, slug);

    if (figureFromDb) {
      const html = await generateFigurePage(env, lang, figureFromDb, currentPath);

      await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'DB-FALLBACK',
        },
      });
    }

    return new Response(render404Page(lang, currentPath), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Figure page error:', error);
    return new Response(render404Page(lang, currentPath), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

// ============================================
// Fetch Figure from historical_figures table
// ============================================

async function fetchFigureFromDb(env: Env, slug: string): Promise<HistoricalFigure | null> {
  try {
    // Slug could be id, name slug, or exact name
    const normalizedSlug = slug.toLowerCase().replace(/-/g, ' ');

    // Try by ID first if numeric
    if (/^\d+$/.test(slug)) {
      const result = await env.DB.prepare(`
        SELECT * FROM historical_figures WHERE id = ?
      `).bind(parseInt(slug)).first();

      if (result) return parseFigureResult(result);
    }

    // Try by name (case-insensitive)
    const result = await env.DB.prepare(`
      SELECT * FROM historical_figures WHERE LOWER(name) = ? OR LOWER(REPLACE(name, ' ', '-')) = ?
    `).bind(normalizedSlug, slug.toLowerCase()).first();

    if (result) return parseFigureResult(result);

    // Try partial match
    const partialResult = await env.DB.prepare(`
      SELECT * FROM historical_figures WHERE LOWER(name) LIKE ?
    `).bind(`%${normalizedSlug}%`).first();

    if (partialResult) return parseFigureResult(partialResult);

    return null;
  } catch (error) {
    console.error('Error fetching figure from DB:', error);
    return null;
  }
}

function parseFigureResult(result: Record<string, unknown>): HistoricalFigure {
  return {
    id: result.id as number,
    name: result.name as string,
    era: result.era as string,
    culture: result.culture as string,
    domains: safeParseJSON(result.domains as string, []),
    vector: safeParseJSON(result.vector as string, []),
    quote: result.quote as string,
    bio: result.bio as string,
    image_url: result.image_url as string,
  };
}

// ============================================
// Generate Figure Page
// ============================================

async function generateFigurePage(
  env: Env,
  lang: string,
  figure: HistoricalFigure,
  currentPath: string
): Promise<string> {
  const voice = await loadVoice(env, lang);

  // Find dominant dimension
  const dominantIndex = figure.vector.indexOf(Math.max(...figure.vector));
  const dominantDim = DIMENSION_METADATA[dominantIndex] || DIMENSION_METADATA[0];

  const description = getLocalizedDescription(lang, figure);

  const content = `
    <article class="figure-article">
      <div class="figure-card">
        <div class="figure-name">${escapeHtml(figure.name)}</div>
        <div class="figure-era">${escapeHtml(figure.era)} - ${escapeHtml(figure.culture)}</div>
        ${figure.quote ? `<blockquote class="figure-quote">"${escapeHtml(figure.quote)}"</blockquote>` : ''}
      </div>

      <section class="content-section">
        <h2>${getLocalizedLabel(lang, 'about')}</h2>
        <p>${escapeHtml(figure.bio || description)}</p>
      </section>

      <section class="content-section">
        <h3>${getLocalizedLabel(lang, 'domains')}</h3>
        <div class="domain-tags">
          ${figure.domains.map((d) => `<span class="domain-tag">${escapeHtml(d)}</span>`).join('')}
        </div>
      </section>

      <section class="content-section">
        <h3>${getLocalizedLabel(lang, 'cosmic_signature')}</h3>
        <p>${getLocalizedLabel(lang, 'dominant_dimension')}: <strong>${escapeHtml(dominantDim.symbol)} ${escapeHtml(dominantDim.name)}</strong></p>
        <div class="vector-display">
          ${renderVectorBars(figure.vector)}
        </div>
      </section>

      ${renderCTA(lang)}
    </article>`;

  const schemaMarkup = buildPersonSchema(
    figure.name,
    `${figure.name} (${figure.era}) - ${figure.culture}. Explore their 16D cosmic signature.`,
    currentPath
  );

  return renderPage({
    title: `${figure.name} - Historical Figure`,
    description: `Explore ${figure.name}'s cosmic signature. ${figure.era}, ${figure.culture}. ${figure.domains.join(', ')}.`,
    content,
    schemaMarkup,
    currentLang: lang,
    currentPath,
    voice: voice || undefined,
    breadcrumbs: [
      { title: getTranslation(lang, 'home'), url: `/${lang}/` },
      { title: getTranslation(lang, 'figures'), url: `/${lang}/figures` },
      { title: figure.name, url: currentPath },
    ],
  });
}

// ============================================
// Helper Functions
// ============================================

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeParseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function buildPersonSchema(name: string, description: string, url: string): Record<string, unknown> {
  return {
    '@type': 'Person',
    name,
    description,
    url: `https://therealmofpatterns.com${url}`,
    sameAs: [],
  };
}

function renderVectorBars(vector: number[]): string {
  return DIMENSION_METADATA.map((dim, i) => {
    const value = vector[i] || 0;
    const percentage = Math.round(value * 100);
    return `
      <div class="dimension-item">
        <div class="dim-label">${escapeHtml(dim.symbol)} ${escapeHtml(dim.name)}</div>
        <div class="dim-value">${percentage}%</div>
        <div class="dim-bar">
          <div class="dim-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>`;
  }).join('');
}

function renderRelatedTopics(topics: { title: string; url: string }[], lang: string): string {
  if (!topics || topics.length === 0) return '';

  const items = topics.map((topic) =>
    `<a href="${escapeHtml(topic.url)}" class="related-link">${escapeHtml(topic.title)}</a>`
  ).join('');

  return `
    <section class="related-topics">
      <h3>${getLocalizedLabel(lang, 'related')}</h3>
      <div class="related-links">${items}</div>
    </section>`;
}

function renderCTA(lang: string): string {
  const ctaText: Record<string, string> = {
    en: 'Discover Your Pattern Match',
    'pt-br': 'Descubra Seu Padrao',
    'pt-pt': 'Descubra o Seu Padrao',
    'es-mx': 'Descubre Tu Patron',
    'es-ar': 'Descubri Tu Patron',
    'es-es': 'Descubre Tu Patron',
  };

  return `
    <div class="content-cta">
      <a href="/${escapeHtml(lang)}/" class="cta-button">${escapeHtml(ctaText[lang] || ctaText.en)}</a>
    </div>`;
}

function getLocalizedLabel(lang: string, key: string): string {
  const labels: Record<string, Record<string, string>> = {
    en: {
      about: 'About',
      domains: 'Domains of Excellence',
      cosmic_signature: 'Cosmic Signature',
      dominant_dimension: 'Dominant Dimension',
      related: 'Related Figures',
    },
    'pt-br': {
      about: 'Sobre',
      domains: 'Dominios de Excelencia',
      cosmic_signature: 'Assinatura Cosmica',
      dominant_dimension: 'Dimensao Dominante',
      related: 'Figuras Relacionadas',
    },
    'pt-pt': {
      about: 'Sobre',
      domains: 'Dominios de Excelencia',
      cosmic_signature: 'Assinatura Cosmica',
      dominant_dimension: 'Dimensao Dominante',
      related: 'Figuras Relacionadas',
    },
    'es-mx': {
      about: 'Acerca de',
      domains: 'Dominios de Excelencia',
      cosmic_signature: 'Firma Cosmica',
      dominant_dimension: 'Dimension Dominante',
      related: 'Figuras Relacionadas',
    },
    'es-ar': {
      about: 'Acerca de',
      domains: 'Dominios de Excelencia',
      cosmic_signature: 'Firma Cosmica',
      dominant_dimension: 'Dimension Dominante',
      related: 'Figuras Relacionadas',
    },
    'es-es': {
      about: 'Acerca de',
      domains: 'Dominios de Excelencia',
      cosmic_signature: 'Firma Cosmica',
      dominant_dimension: 'Dimension Dominante',
      related: 'Figuras Relacionadas',
    },
  };

  return labels[lang]?.[key] || labels['en'][key] || key;
}

function getLocalizedDescription(lang: string, figure: HistoricalFigure): string {
  const templates: Record<string, string> = {
    en: `${figure.name} was a ${figure.culture} ${figure.domains.join(', ')} from ${figure.era}. Their cosmic signature reveals a unique pattern in the 16D framework.`,
    'pt-br': `${figure.name} foi um(a) ${figure.domains.join(', ')} ${figure.culture} de ${figure.era}. Sua assinatura cosmica revela um padrao unico no framework 16D.`,
    'pt-pt': `${figure.name} foi um(a) ${figure.domains.join(', ')} ${figure.culture} de ${figure.era}. A sua assinatura cosmica revela um padrao unico no framework 16D.`,
    'es-mx': `${figure.name} fue un(a) ${figure.domains.join(', ')} ${figure.culture} de ${figure.era}. Su firma cosmica revela un patron unico en el framework 16D.`,
    'es-ar': `${figure.name} fue un(a) ${figure.domains.join(', ')} ${figure.culture} de ${figure.era}. Su firma cosmica revela un patron unico en el framework 16D.`,
    'es-es': `${figure.name} fue un(a) ${figure.domains.join(', ')} ${figure.culture} de ${figure.era}. Su firma cosmica revela un patron unico en el framework 16D.`,
  };

  return templates[lang] || templates['en'];
}
