/**
 * GET /[lang]/jungian/[slug]
 * Fetch Jungian concept from cosmic_content where content_type='jungian_concept'
 * Render HTML with proper schema markup, hreflang tags
 * Cache in KV for 1 hour
 */

import type { Env } from '../../../src/types';
import { DIMENSION_METADATA } from '../../../src/types';
import {
  fetchContent,
  loadVoice,
  renderPage,
  render404Page,
  renderContentBlocks,
  isValidLanguage,
  getTranslation,
} from '../../../src/lib/content-renderer';

interface JungianArchetype {
  id: number;
  name: string;
  dimension: string;
  shadow_name: string;
  description_en: string;
  description_pt?: string;
  description_es?: string;
  quotes: string[];
  embodying_figures: number[];
  integration_practices: string[];
}

interface JungianConcept {
  id: number;
  concept_name: string;
  frc_mapping: string;
  description_en: string;
  description_pt?: string;
  description_es?: string;
  related_dimensions: string[];
  seo_keywords: string[];
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const lang = params.lang as string;
  const slug = params.slug as string;

  // Validate language
  if (!isValidLanguage(lang)) {
    return new Response(render404Page('en', `/${lang}/jungian/${slug}`), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const currentPath = `/${lang}/jungian/${slug}`;
  const cacheKey = `page:${lang}:jungian:${slug}`;

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

    // Try to fetch from cosmic_content
    const content = await fetchContent(env, lang, 'jungian_concept', slug);

    if (content) {
      const html = await renderJungianFromContent(env, lang, content, currentPath);
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

    // Try to fetch archetype from jungian_archetypes table
    const archetype = await fetchArchetype(env, slug);
    if (archetype) {
      const html = await renderArchetypePage(env, lang, archetype, currentPath);
      await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'ARCHETYPE',
        },
      });
    }

    // Try to fetch concept from jungian_concepts table
    const concept = await fetchConcept(env, slug);
    if (concept) {
      const html = await renderConceptPage(env, lang, concept, currentPath);
      await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'CONCEPT',
        },
      });
    }

    return new Response(render404Page(lang, currentPath), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Jungian page error:', error);
    return new Response(render404Page(lang, currentPath), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

// ============================================
// Fetch from Database
// ============================================

async function fetchArchetype(env: Env, slug: string): Promise<JungianArchetype | null> {
  try {
    const normalizedSlug = slug.toLowerCase().replace(/-/g, ' ');

    // Try exact match
    let result = await env.DB.prepare(`
      SELECT * FROM jungian_archetypes
      WHERE LOWER(name) = ? OR LOWER(REPLACE(name, ' ', '-')) = ?
    `).bind(normalizedSlug, slug.toLowerCase()).first();

    if (!result) {
      // Try partial match
      result = await env.DB.prepare(`
        SELECT * FROM jungian_archetypes
        WHERE LOWER(name) LIKE ?
      `).bind(`%${normalizedSlug}%`).first();
    }

    if (!result) return null;

    return {
      id: result.id as number,
      name: result.name as string,
      dimension: result.dimension as string,
      shadow_name: result.shadow_name as string,
      description_en: result.description_en as string || '',
      description_pt: result.description_pt as string,
      description_es: result.description_es as string,
      quotes: safeParseJSON(result.quotes as string, []),
      embodying_figures: safeParseJSON(result.embodying_figures as string, []),
      integration_practices: safeParseJSON(result.integration_practices as string, []),
    };
  } catch (error) {
    console.error('Error fetching archetype:', error);
    return null;
  }
}

async function fetchConcept(env: Env, slug: string): Promise<JungianConcept | null> {
  try {
    const normalizedSlug = slug.toLowerCase().replace(/-/g, ' ');

    let result = await env.DB.prepare(`
      SELECT * FROM jungian_concepts
      WHERE LOWER(concept_name) = ? OR LOWER(REPLACE(concept_name, ' ', '-')) = ?
    `).bind(normalizedSlug, slug.toLowerCase()).first();

    if (!result) {
      result = await env.DB.prepare(`
        SELECT * FROM jungian_concepts
        WHERE LOWER(concept_name) LIKE ?
      `).bind(`%${normalizedSlug}%`).first();
    }

    if (!result) return null;

    return {
      id: result.id as number,
      concept_name: result.concept_name as string,
      frc_mapping: result.frc_mapping as string || '',
      description_en: result.description_en as string || '',
      description_pt: result.description_pt as string,
      description_es: result.description_es as string,
      related_dimensions: safeParseJSON(result.related_dimensions as string, []),
      seo_keywords: safeParseJSON(result.seo_keywords as string, []),
    };
  } catch (error) {
    console.error('Error fetching concept:', error);
    return null;
  }
}

// ============================================
// Render from Content
// ============================================

async function renderJungianFromContent(
  env: Env,
  lang: string,
  content: { title: string; meta_description: string; content_blocks: import('../../../src/lib/content-renderer').ContentBlock[]; related_topics?: { title: string; url: string }[] },
  currentPath: string
): Promise<string> {
  const voice = await loadVoice(env, lang);

  const schemaMarkup = buildConceptSchema(content.title, content.meta_description, currentPath);

  const breadcrumbs = [
    { title: getTranslation(lang, 'home'), url: `/${lang}/` },
    { title: getTranslation(lang, 'jungian'), url: `/${lang}/jungian` },
    { title: content.title, url: currentPath },
  ];

  const renderedContent = `
    <article class="jungian-article">
      <h1 class="page-title">${escapeHtml(content.title)}</h1>
      <p class="page-subtitle">${escapeHtml(content.meta_description)}</p>

      <div class="jungian-content">
        ${renderContentBlocks(content.content_blocks)}
      </div>

      ${renderRelatedTopics(content.related_topics || [], lang)}
      ${renderCTA(lang)}
    </article>`;

  return renderPage({
    title: content.title,
    description: content.meta_description,
    content: renderedContent,
    schemaMarkup,
    currentLang: lang,
    currentPath,
    voice: voice || undefined,
    breadcrumbs,
  });
}

// ============================================
// Render Archetype Page
// ============================================

async function renderArchetypePage(
  env: Env,
  lang: string,
  archetype: JungianArchetype,
  currentPath: string
): Promise<string> {
  const voice = await loadVoice(env, lang);

  // Get dimension info
  const dimIndex = DIMENSION_METADATA.findIndex((d) => d.symbol === archetype.dimension);
  const dimension = dimIndex >= 0 ? DIMENSION_METADATA[dimIndex] : null;

  const description = getLocalizedDescription(lang, archetype);
  const title = `${archetype.name} - ${getLocalizedLabel(lang, 'jungian_archetype')}`;

  const schemaMarkup = buildConceptSchema(title, description, currentPath);

  const breadcrumbs = [
    { title: getTranslation(lang, 'home'), url: `/${lang}/` },
    { title: getTranslation(lang, 'jungian'), url: `/${lang}/jungian` },
    { title: archetype.name, url: currentPath },
  ];

  const quotes = archetype.quotes
    .map((q) => `<blockquote class="content-quote">"${escapeHtml(q)}"<cite>- Carl Jung</cite></blockquote>`)
    .join('');

  const renderedContent = `
    <article class="jungian-article archetype-page">
      <header class="archetype-header">
        <h1 class="page-title">${escapeHtml(archetype.name)}</h1>
        <p class="page-subtitle">${escapeHtml(getLocalizedLabel(lang, 'jungian_archetype'))}</p>
      </header>

      ${dimension ? `
      <section class="dimension-link">
        <p>
          ${getLocalizedLabel(lang, 'associated_dimension')}:
          <a href="/${escapeHtml(lang)}/dimension/${escapeHtml(dimension.name.toLowerCase())}">
            ${escapeHtml(dimension.symbol)} ${escapeHtml(dimension.name)}
          </a>
        </p>
      </section>` : ''}

      <section class="content-section">
        <h2>${getLocalizedLabel(lang, 'about_archetype')}</h2>
        <p>${escapeHtml(description)}</p>
      </section>

      <section class="content-section shadow-section">
        <h3>${getLocalizedLabel(lang, 'shadow_aspect')}: ${escapeHtml(archetype.shadow_name)}</h3>
        <p>${escapeHtml(getShadowDescription(lang, archetype.name, archetype.shadow_name))}</p>
      </section>

      ${archetype.quotes.length > 0 ? `
      <section class="content-section quotes-section">
        <h3>${getLocalizedLabel(lang, 'jung_quotes')}</h3>
        ${quotes}
      </section>` : ''}

      ${archetype.integration_practices.length > 0 ? `
      <section class="content-section practices-section">
        <h3>${getLocalizedLabel(lang, 'integration_practices')}</h3>
        <ul class="content-list">
          ${archetype.integration_practices.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>
      </section>` : ''}

      ${renderCTA(lang)}
    </article>`;

  return renderPage({
    title,
    description,
    content: renderedContent,
    schemaMarkup,
    currentLang: lang,
    currentPath,
    voice: voice || undefined,
    breadcrumbs,
  });
}

// ============================================
// Render Concept Page
// ============================================

async function renderConceptPage(
  env: Env,
  lang: string,
  concept: JungianConcept,
  currentPath: string
): Promise<string> {
  const voice = await loadVoice(env, lang);

  const description = getLocalizedConceptDescription(lang, concept);
  const title = `${concept.concept_name} - ${getLocalizedLabel(lang, 'jungian_concept')}`;

  const schemaMarkup = buildConceptSchema(title, description, currentPath);

  const breadcrumbs = [
    { title: getTranslation(lang, 'home'), url: `/${lang}/` },
    { title: getTranslation(lang, 'jungian'), url: `/${lang}/jungian` },
    { title: concept.concept_name, url: currentPath },
  ];

  // Build dimension links
  const dimensionLinks = concept.related_dimensions
    .filter((d) => d !== 'all' && d !== 'outer')
    .map((dimSymbol) => {
      const dim = DIMENSION_METADATA.find((m) => m.symbol === dimSymbol);
      if (!dim) return '';
      return `<a href="/${escapeHtml(lang)}/dimension/${escapeHtml(dim.name.toLowerCase())}" class="dim-link">${escapeHtml(dim.symbol)} ${escapeHtml(dim.name)}</a>`;
    })
    .filter(Boolean)
    .join(' ');

  const renderedContent = `
    <article class="jungian-article concept-page">
      <header class="concept-header">
        <h1 class="page-title">${escapeHtml(concept.concept_name)}</h1>
        <p class="page-subtitle">${escapeHtml(getLocalizedLabel(lang, 'jungian_concept'))}</p>
      </header>

      <section class="content-section">
        <h2>${getLocalizedLabel(lang, 'understanding')}</h2>
        <p>${escapeHtml(description)}</p>
      </section>

      ${concept.frc_mapping ? `
      <section class="content-section frc-mapping">
        <h3>${getLocalizedLabel(lang, 'frc_mapping')}</h3>
        <p>${escapeHtml(concept.frc_mapping)}</p>
      </section>` : ''}

      ${dimensionLinks ? `
      <section class="content-section related-dimensions">
        <h3>${getLocalizedLabel(lang, 'related_dimensions')}</h3>
        <div class="dimension-links">${dimensionLinks}</div>
      </section>` : ''}

      ${concept.related_dimensions.includes('all') ? `
      <section class="content-section">
        <p><em>${getLocalizedLabel(lang, 'all_dimensions_note')}</em></p>
      </section>` : ''}

      ${renderCTA(lang)}
    </article>`;

  return renderPage({
    title,
    description,
    content: renderedContent,
    schemaMarkup,
    currentLang: lang,
    currentPath,
    voice: voice || undefined,
    breadcrumbs,
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

function buildConceptSchema(name: string, description: string, url: string): Record<string, unknown> {
  return {
    '@type': 'DefinedTerm',
    name,
    description,
    url: `https://therealmofpatterns.com${url}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'Jungian Psychology Concepts',
    },
  };
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
    en: 'Discover Your Archetypes',
    'pt-br': 'Descubra Seus Arquetipos',
    'pt-pt': 'Descubra os Seus Arquetipos',
    'es-mx': 'Descubre Tus Arquetipos',
    'es-ar': 'Descubri Tus Arquetipos',
    'es-es': 'Descubre Tus Arquetipos',
  };

  return `
    <div class="content-cta">
      <a href="/${escapeHtml(lang)}/" class="cta-button">${escapeHtml(ctaText[lang] || ctaText.en)}</a>
    </div>`;
}

function getLocalizedLabel(lang: string, key: string): string {
  const labels: Record<string, Record<string, string>> = {
    en: {
      jungian_archetype: 'Jungian Archetype',
      jungian_concept: 'Jungian Concept',
      associated_dimension: 'Associated Dimension',
      about_archetype: 'About This Archetype',
      shadow_aspect: 'Shadow Aspect',
      jung_quotes: 'Jung on This Archetype',
      integration_practices: 'Integration Practices',
      understanding: 'Understanding',
      frc_mapping: '16D Framework Mapping',
      related_dimensions: 'Related Dimensions',
      all_dimensions_note: 'This concept relates to all dimensions of the 16D framework.',
      related: 'Related Concepts',
    },
    'pt-br': {
      jungian_archetype: 'Arquetipo Junguiano',
      jungian_concept: 'Conceito Junguiano',
      associated_dimension: 'Dimensao Associada',
      about_archetype: 'Sobre Este Arquetipo',
      shadow_aspect: 'Aspecto Sombra',
      jung_quotes: 'Jung Sobre Este Arquetipo',
      integration_practices: 'Praticas de Integracao',
      understanding: 'Compreendendo',
      frc_mapping: 'Mapeamento no Framework 16D',
      related_dimensions: 'Dimensoes Relacionadas',
      all_dimensions_note: 'Este conceito se relaciona com todas as dimensoes do framework 16D.',
      related: 'Conceitos Relacionados',
    },
    'pt-pt': {
      jungian_archetype: 'Arquetipo Junguiano',
      jungian_concept: 'Conceito Junguiano',
      associated_dimension: 'Dimensao Associada',
      about_archetype: 'Sobre Este Arquetipo',
      shadow_aspect: 'Aspecto Sombra',
      jung_quotes: 'Jung Sobre Este Arquetipo',
      integration_practices: 'Praticas de Integracao',
      understanding: 'Compreendendo',
      frc_mapping: 'Mapeamento no Framework 16D',
      related_dimensions: 'Dimensoes Relacionadas',
      all_dimensions_note: 'Este conceito relaciona-se com todas as dimensoes do framework 16D.',
      related: 'Conceitos Relacionados',
    },
    'es-mx': {
      jungian_archetype: 'Arquetipo Junguiano',
      jungian_concept: 'Concepto Junguiano',
      associated_dimension: 'Dimension Asociada',
      about_archetype: 'Sobre Este Arquetipo',
      shadow_aspect: 'Aspecto Sombra',
      jung_quotes: 'Jung Sobre Este Arquetipo',
      integration_practices: 'Practicas de Integracion',
      understanding: 'Comprendiendo',
      frc_mapping: 'Mapeo en el Framework 16D',
      related_dimensions: 'Dimensiones Relacionadas',
      all_dimensions_note: 'Este concepto se relaciona con todas las dimensiones del framework 16D.',
      related: 'Conceptos Relacionados',
    },
    'es-ar': {
      jungian_archetype: 'Arquetipo Junguiano',
      jungian_concept: 'Concepto Junguiano',
      associated_dimension: 'Dimension Asociada',
      about_archetype: 'Sobre Este Arquetipo',
      shadow_aspect: 'Aspecto Sombra',
      jung_quotes: 'Jung Sobre Este Arquetipo',
      integration_practices: 'Practicas de Integracion',
      understanding: 'Comprendiendo',
      frc_mapping: 'Mapeo en el Framework 16D',
      related_dimensions: 'Dimensiones Relacionadas',
      all_dimensions_note: 'Este concepto se relaciona con todas las dimensiones del framework 16D.',
      related: 'Conceptos Relacionados',
    },
    'es-es': {
      jungian_archetype: 'Arquetipo Junguiano',
      jungian_concept: 'Concepto Junguiano',
      associated_dimension: 'Dimension Asociada',
      about_archetype: 'Sobre Este Arquetipo',
      shadow_aspect: 'Aspecto Sombra',
      jung_quotes: 'Jung Sobre Este Arquetipo',
      integration_practices: 'Practicas de Integracion',
      understanding: 'Comprendiendo',
      frc_mapping: 'Mapeo en el Framework 16D',
      related_dimensions: 'Dimensiones Relacionadas',
      all_dimensions_note: 'Este concepto se relaciona con todas las dimensiones del framework 16D.',
      related: 'Conceptos Relacionados',
    },
  };

  return labels[lang]?.[key] || labels['en'][key] || key;
}

function getLocalizedDescription(lang: string, archetype: JungianArchetype): string {
  if (lang.startsWith('pt') && archetype.description_pt) {
    return archetype.description_pt;
  }
  if (lang.startsWith('es') && archetype.description_es) {
    return archetype.description_es;
  }
  return archetype.description_en;
}

function getLocalizedConceptDescription(lang: string, concept: JungianConcept): string {
  if (lang.startsWith('pt') && concept.description_pt) {
    return concept.description_pt;
  }
  if (lang.startsWith('es') && concept.description_es) {
    return concept.description_es;
  }
  return concept.description_en;
}

function getShadowDescription(lang: string, archetype: string, shadow: string): string {
  const templates: Record<string, string> = {
    en: `When ${archetype} becomes imbalanced or unconscious, it manifests as ${shadow}. This shadow aspect represents the distorted or excessive expression of the archetype's energy.`,
    'pt-br': `Quando ${archetype} se torna desequilibrado ou inconsciente, manifesta-se como ${shadow}. Este aspecto sombra representa a expressao distorcida ou excessiva da energia do arquetipo.`,
    'pt-pt': `Quando ${archetype} se torna desequilibrado ou inconsciente, manifesta-se como ${shadow}. Este aspecto sombra representa a expressao distorcida ou excessiva da energia do arquetipo.`,
    'es-mx': `Cuando ${archetype} se desequilibra o se vuelve inconsciente, se manifiesta como ${shadow}. Este aspecto sombra representa la expresion distorsionada o excesiva de la energia del arquetipo.`,
    'es-ar': `Cuando ${archetype} se desequilibra o se vuelve inconsciente, se manifiesta como ${shadow}. Este aspecto sombra representa la expresion distorsionada o excesiva de la energia del arquetipo.`,
    'es-es': `Cuando ${archetype} se desequilibra o se vuelve inconsciente, se manifiesta como ${shadow}. Este aspecto sombra representa la expresion distorsionada o excesiva de la energia del arquetipo.`,
  };

  return templates[lang] || templates['en'];
}
