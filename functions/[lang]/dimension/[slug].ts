/**
 * GET /[lang]/dimension/[slug]
 * Fetch dimension guide from cosmic_content where content_type='dimension_guide'
 * Render HTML with proper schema markup, hreflang tags
 * Cache in KV for 1 hour
 */

import { Env } from '../../../src/types';
import {
  fetchContent,
  loadVoice,
  renderPage,
  render404Page,
  renderContentBlocks,
  isValidLanguage,
  getTranslation,
} from '../../../src/lib/content-renderer';
import { DIMENSION_METADATA } from '../../../src/types';

// DimensionData interface kept for documentation purposes but not currently used
// interface DimensionData {
//   symbol: string;
//   name: string;
//   domain: string;
//   ruler: string;
//   description: string;
//   shadow_aspects: string[];
//   integration_practices: string[];
//   associated_archetypes: string[];
//   historical_figures: { name: string; resonance: number }[];
// }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const lang = params.lang as string;
  const slug = params.slug as string;

  // Validate language
  if (!isValidLanguage(lang)) {
    return new Response(render404Page('en', `/${lang}/dimension/${slug}`), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const currentPath = `/${lang}/dimension/${slug}`;
  const cacheKey = `page:${lang}:dimension:${slug}`;

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

    // Fetch content from D1
    const content = await fetchContent(env, lang, 'dimension_guide', slug);

    if (!content) {
      // Try to generate fallback from dimension metadata
      const dimensionPage = await generateDimensionFallback(env, lang, slug);
      if (dimensionPage) {
        // Cache fallback for 1 hour
        await env.CACHE.put(cacheKey, dimensionPage, { expirationTtl: 3600 });
        return new Response(dimensionPage, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'FALLBACK',
          },
        });
      }

      return new Response(render404Page(lang, currentPath), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Load voice for cultural styling
    const voice = await loadVoice(env, lang);

    // Build schema markup for dimension guide
    const schemaMarkup = {
      '@type': 'Article',
      headline: content.title,
      description: content.meta_description,
      author: {
        '@type': 'Organization',
        name: 'The Realm of Patterns',
      },
      datePublished: content.published_at,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://therealmofpatterns.com${currentPath}`,
      },
      about: {
        '@type': 'Thing',
        name: content.title,
        description: content.meta_description,
      },
    };

    // Build breadcrumbs
    const breadcrumbs = [
      { title: getTranslation(lang, 'home'), url: `/${lang}/` },
      { title: getTranslation(lang, 'dimensions'), url: `/${lang}/dimensions` },
      { title: content.title, url: currentPath },
    ];

    // Render content blocks
    const renderedContent = `
      <article class="dimension-article">
        <h1 class="page-title">${escapeHtml(content.title)}</h1>
        <p class="page-subtitle">${escapeHtml(content.meta_description)}</p>

        <div class="dimension-content">
          ${renderContentBlocks(content.content_blocks)}
        </div>

        ${renderRelatedTopics(content.related_topics || [], lang)}
        ${renderCTA(lang)}
      </article>`;

    // Render full page
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

    // Cache for 1 hour
    await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Dimension page error:', error);
    return new Response(render404Page(lang, currentPath), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

// ============================================
// Fallback Generator
// ============================================

async function generateDimensionFallback(
  env: Env,
  lang: string,
  slug: string
): Promise<string | null> {
  // Map slug to dimension
  const slugToDimension: Record<string, number> = {
    'phase': 0, 'p': 0, 'identity': 0,
    'existence': 1, 'e': 1, 'structure': 1,
    'cognition': 2, 'mu': 2, 'mind': 2,
    'value': 3, 'v': 3, 'beauty': 3,
    'expansion': 4, 'n': 4, 'growth': 4,
    'action': 5, 'delta': 5, 'force': 5,
    'relation': 6, 'r': 6, 'connection': 6,
    'field': 7, 'phi': 7, 'unity': 7, 'witness': 7,
  };

  const dimIndex = slugToDimension[slug.toLowerCase()];
  if (dimIndex === undefined) return null;

  const dim = DIMENSION_METADATA[dimIndex];
  const currentPath = `/${lang}/dimension/${slug}`;

  const descriptions: Record<string, Record<number, string>> = {
    en: {
      0: 'Phase represents the core of identity and will. It is the Sun principle - the conscious drive to become who you truly are.',
      1: 'Existence embodies structure and form. Ruled by Saturn, it represents the capacity to create lasting order from chaos.',
      2: 'Cognition is the realm of mind and communication. Mercury guides this dimension of thought, learning, and understanding.',
      3: 'Value encompasses beauty and harmony. Venus illuminates our appreciation of aesthetics, love, and connection.',
      4: 'Expansion drives growth and meaning. Jupiter expands our horizons, seeking truth beyond the familiar.',
      5: 'Action embodies force and movement. Mars provides the energy to transform, assert, and change.',
      6: 'Relation governs connection and care. The Moon reflects our capacity for emotional bonding and nurturing.',
      7: 'Field represents the witness and unity. Neptune and Uranus guide this dimension of cosmic awareness.',
    },
    'pt-br': {
      0: 'Fase representa o nucleo da identidade e vontade. E o principio Solar - o impulso consciente de se tornar quem voce realmente e.',
      1: 'Existencia incorpora estrutura e forma. Regido por Saturno, representa a capacidade de criar ordem duradoura a partir do caos.',
      2: 'Cognicao e o reino da mente e comunicacao. Mercurio guia esta dimensao do pensamento, aprendizado e compreensao.',
      3: 'Valor abrange beleza e harmonia. Venus ilumina nossa apreciacao da estetica, amor e conexao.',
      4: 'Expansao impulsiona crescimento e significado. Jupiter expande nossos horizontes, buscando verdade alem do familiar.',
      5: 'Acao incorpora forca e movimento. Marte fornece a energia para transformar, afirmar e mudar.',
      6: 'Relacao governa conexao e cuidado. A Lua reflete nossa capacidade de vinculo emocional e nutricao.',
      7: 'Campo representa o testemunho e a unidade. Netuno e Urano guiam esta dimensao da consciencia cosmica.',
    },
    'es-mx': {
      0: 'Fase representa el nucleo de la identidad y la voluntad. Es el principio Solar - el impulso consciente de convertirte en quien realmente eres.',
      1: 'Existencia encarna estructura y forma. Regido por Saturno, representa la capacidad de crear orden duradero a partir del caos.',
      2: 'Cognicion es el reino de la mente y la comunicacion. Mercurio guia esta dimension del pensamiento, aprendizaje y comprension.',
      3: 'Valor abarca belleza y armonia. Venus ilumina nuestra apreciacion de la estetica, el amor y la conexion.',
      4: 'Expansion impulsa el crecimiento y el significado. Jupiter expande nuestros horizontes, buscando verdad mas alla de lo familiar.',
      5: 'Accion encarna fuerza y movimiento. Marte proporciona la energia para transformar, afirmar y cambiar.',
      6: 'Relacion gobierna la conexion y el cuidado. La Luna refleja nuestra capacidad de vinculo emocional y crianza.',
      7: 'Campo representa el testigo y la unidad. Neptuno y Urano guian esta dimension de conciencia cosmica.',
    },
  };

  const description = descriptions[lang]?.[dimIndex] || descriptions['en'][dimIndex];

  const content = `
    <article class="dimension-article">
      <div class="dimension-card">
        <div class="dim-symbol">${escapeHtml(dim.symbol)}</div>
        <h1 class="dim-name">${escapeHtml(dim.name)}</h1>
        <p class="dim-description">${escapeHtml(dim.domain)}</p>
      </div>

      <section class="content-section">
        <h2>Understanding ${escapeHtml(dim.name)}</h2>
        <p>${escapeHtml(description)}</p>
      </section>

      <section class="content-section">
        <h3>Planetary Ruler: ${escapeHtml(dim.ruler)}</h3>
        <p>The ${escapeHtml(dim.name)} dimension is governed by ${escapeHtml(dim.ruler)}, which influences how this energy manifests in your cosmic signature.</p>
      </section>

      <section class="content-section">
        <h3>Domain: ${escapeHtml(dim.domain)}</h3>
        <p>This dimension encompasses themes of ${escapeHtml(dim.domain.toLowerCase())}. When strong in your vector, it indicates natural gifts in these areas.</p>
      </section>

      ${renderCTA(lang)}
    </article>`;

  const voice = await loadVoice(env, lang);

  return renderPage({
    title: `${dim.symbol} ${dim.name} - Dimension Guide`,
    description: `Explore the ${dim.name} dimension (${dim.symbol}) of the 16D framework. ${dim.domain}.`,
    content,
    schemaMarkup: {
      '@type': 'Article',
      headline: `${dim.name} Dimension Guide`,
      description: dim.domain,
    },
    currentLang: lang,
    currentPath,
    voice: voice || undefined,
    breadcrumbs: [
      { title: getTranslation(lang, 'home'), url: `/${lang}/` },
      { title: getTranslation(lang, 'dimensions'), url: `/${lang}/dimensions` },
      { title: dim.name, url: currentPath },
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

function renderRelatedTopics(topics: { title: string; url: string }[], _lang: string): string {
  if (!topics || topics.length === 0) return '';

  const items = topics.map((topic) =>
    `<a href="${escapeHtml(topic.url)}" class="related-link">${escapeHtml(topic.title)}</a>`
  ).join('');

  return `
    <section class="related-topics">
      <h3>Related Topics</h3>
      <div class="related-links">
        ${items}
      </div>
    </section>`;
}

function renderCTA(lang: string): string {
  const ctaText: Record<string, string> = {
    en: 'Discover Your 16D Pattern',
    'pt-br': 'Descubra Seu Padrao 16D',
    'pt-pt': 'Descubra o Seu Padrao 16D',
    'es-mx': 'Descubre Tu Patron 16D',
    'es-ar': 'Descubri Tu Patron 16D',
    'es-es': 'Descubre Tu Patron 16D',
  };

  return `
    <div class="content-cta">
      <a href="/${escapeHtml(lang)}/" class="cta-button">${escapeHtml(ctaText[lang] || ctaText.en)}</a>
    </div>`;
}
