/**
 * Content Renderer Utility
 * Generates consistent HTML for dynamic content pages with:
 * - Cultural voice styling
 * - Schema markup injection
 * - Hreflang links
 * - Internal navigation
 * - Footer with language switcher
 */

import { Env } from '../types';

// ============================================
// Types
// ============================================

export interface ContentVoice {
  language_code: string;
  voice_name: string;
  tone: string;
  style: string;
  cultural_references: string[];
  unique_concepts: Record<string, string>;
  example_phrases: string[];
  seo_keywords: string[];
}

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'quote' | 'list' | 'section' | 'cta' | 'dimension_card' | 'figure_card';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CosmicContent {
  id: string;
  language_code: string;
  content_type: string;
  slug: string;
  title: string;
  meta_description: string;
  content_blocks: ContentBlock[];
  schema_markup?: Record<string, unknown>;
  related_topics?: { title: string; url: string }[];
  published_at?: string;
}

export interface RenderOptions {
  title: string;
  description: string;
  content: string;
  schemaMarkup?: Record<string, unknown>;
  currentLang: string;
  currentPath: string;
  voice?: ContentVoice;
  ogImage?: string;
  canonicalUrl?: string;
  breadcrumbs?: { title: string; url: string }[];
}

// ============================================
// Supported Languages
// ============================================

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'pt-br', name: 'Portugues (BR)', flag: 'PT-BR' },
  { code: 'pt-pt', name: 'Portugues (PT)', flag: 'PT-PT' },
  { code: 'es-mx', name: 'Espanol (MX)', flag: 'ES-MX' },
  { code: 'es-ar', name: 'Espanol (AR)', flag: 'ES-AR' },
  { code: 'es-es', name: 'Espanol (ES)', flag: 'ES-ES' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// ============================================
// Voice Loader
// ============================================

export async function loadVoice(env: Env, langCode: string): Promise<ContentVoice | null> {
  try {
    // Try KV cache first
    const cached = await env.CACHE.get(`voice:${langCode}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const result = await env.DB.prepare(`
      SELECT * FROM content_voices WHERE language_code = ?
    `).bind(langCode).first();

    if (!result) return null;

    const voice: ContentVoice = {
      language_code: result.language_code as string,
      voice_name: result.voice_name as string,
      tone: result.tone as string || '',
      style: result.style as string || '',
      cultural_references: safeParseJSON(result.cultural_references as string, []),
      unique_concepts: safeParseJSON(result.unique_concepts as string, {}),
      example_phrases: safeParseJSON(result.example_phrases as string, []),
      seo_keywords: safeParseJSON(result.seo_keywords as string, []),
    };

    // Cache for 1 hour
    await env.CACHE.put(`voice:${langCode}`, JSON.stringify(voice), { expirationTtl: 3600 });

    return voice;
  } catch (error) {
    console.error('Error loading voice:', error);
    return null;
  }
}

// ============================================
// Hreflang Generator
// ============================================

export function generateHreflangTags(baseUrl: string, currentPath: string, currentLang: string): string {
  const tags: string[] = [];
  const pathWithoutLang = currentPath.replace(`/${currentLang}`, '');

  for (const lang of SUPPORTED_LANGUAGES) {
    const url = `${baseUrl}/${lang.code}${pathWithoutLang}`;
    tags.push(`<link rel="alternate" hreflang="${lang.code}" href="${escapeHtml(url)}">`);
  }

  // x-default should point to English
  const defaultUrl = `${baseUrl}/en${pathWithoutLang}`;
  tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(defaultUrl)}">`);

  return tags.join('\n    ');
}

// ============================================
// Schema Markup Generator
// ============================================

export function generateSchemaMarkup(
  type: string,
  data: Record<string, unknown>,
  baseUrl: string
): string {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': type,
    publisher: {
      '@type': 'Organization',
      name: 'The Realm of Patterns',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/logo.png`,
      },
    },
    ...data,
  };

  return `<script type="application/ld+json">${JSON.stringify(baseSchema, null, 2)}</script>`;
}

// ============================================
// Language Switcher HTML
// ============================================

export function generateLanguageSwitcher(currentPath: string, currentLang: string): string {
  const pathWithoutLang = currentPath.replace(`/${currentLang}`, '');

  const buttons = SUPPORTED_LANGUAGES.map((lang) => {
    const isActive = lang.code === currentLang;
    const href = `/${lang.code}${pathWithoutLang}`;
    return `<a href="${escapeHtml(href)}" class="lang-btn${isActive ? ' active' : ''}" aria-label="${escapeHtml(lang.name)}">${escapeHtml(lang.flag)}</a>`;
  }).join('\n          ');

  return `
        <div class="language-switcher">
          ${buttons}
        </div>`;
}

// ============================================
// Navigation HTML
// ============================================

export function generateNavigation(lang: string): string {
  const navItems = [
    { href: `/${lang}/`, label: getTranslation(lang, 'home') },
    { href: `/${lang}/cosmic-weather/today`, label: getTranslation(lang, 'cosmic_weather') },
    { href: `/${lang}/dimensions`, label: getTranslation(lang, 'dimensions') },
    { href: `/${lang}/figures`, label: getTranslation(lang, 'figures') },
    { href: `/${lang}/jungian`, label: getTranslation(lang, 'jungian') },
  ];

  const items = navItems.map((item) =>
    `<a href="${escapeHtml(item.href)}" class="nav-link">${escapeHtml(item.label)}</a>`
  ).join('\n        ');

  return `
      <nav class="main-nav">
        ${items}
      </nav>`;
}

// ============================================
// Breadcrumbs HTML
// ============================================

export function generateBreadcrumbs(breadcrumbs: { title: string; url: string }[]): string {
  if (!breadcrumbs || breadcrumbs.length === 0) return '';

  const items = breadcrumbs.map((item, index) => {
    const isLast = index === breadcrumbs.length - 1;
    if (isLast) {
      return `<span class="breadcrumb-current">${escapeHtml(item.title)}</span>`;
    }
    return `<a href="${escapeHtml(item.url)}" class="breadcrumb-link">${escapeHtml(item.title)}</a>`;
  }).join(' <span class="breadcrumb-sep">/</span> ');

  return `
      <div class="breadcrumbs">
        ${items}
      </div>`;
}

// ============================================
// Footer HTML
// ============================================

export function generateFooter(lang: string, currentPath: string): string {
  return `
    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>The Realm of Patterns</h3>
          <p>${escapeHtml(getTranslation(lang, 'footer_tagline'))}</p>
        </div>
        <div class="footer-links">
          <a href="/${lang}/">${escapeHtml(getTranslation(lang, 'home'))}</a>
          <a href="/${lang}/about">${escapeHtml(getTranslation(lang, 'about'))}</a>
          <a href="/${lang}/privacy">${escapeHtml(getTranslation(lang, 'privacy'))}</a>
        </div>
        ${generateLanguageSwitcher(currentPath, lang)}
      </div>
      <div class="footer-bottom">
        <p>The Realm of Patterns - 16D Universal Vector Framework</p>
        <p>Vedic + Western + Jungian Unified</p>
      </div>
    </footer>`;
}

// ============================================
// Content Block Renderer
// ============================================

export function renderContentBlocks(blocks: ContentBlock[]): string {
  return blocks.map((block) => renderBlock(block)).join('\n');
}

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'heading':
      const level = (block.metadata?.level as number) || 2;
      return `<h${level} class="content-heading">${escapeHtml(block.content)}</h${level}>`;

    case 'paragraph':
      return `<p class="content-paragraph">${escapeHtml(block.content)}</p>`;

    case 'quote':
      const author = block.metadata?.author as string;
      return `
        <blockquote class="content-quote">
          <p>${escapeHtml(block.content)}</p>
          ${author ? `<cite>- ${escapeHtml(author)}</cite>` : ''}
        </blockquote>`;

    case 'list':
      const items = block.metadata?.items as string[] || [];
      const listItems = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n');
      return `<ul class="content-list">${listItems}</ul>`;

    case 'section':
      return `
        <section class="content-section">
          <h3>${escapeHtml(block.metadata?.title as string || '')}</h3>
          <p>${escapeHtml(block.content)}</p>
        </section>`;

    case 'cta':
      const href = block.metadata?.href as string || '/';
      return `
        <div class="content-cta">
          <a href="${escapeHtml(href)}" class="cta-button">${escapeHtml(block.content)}</a>
        </div>`;

    case 'dimension_card':
      const dim = block.metadata as Record<string, unknown>;
      return `
        <div class="dimension-card">
          <div class="dim-symbol">${escapeHtml(dim.symbol as string || '')}</div>
          <div class="dim-name">${escapeHtml(dim.name as string || '')}</div>
          <div class="dim-description">${escapeHtml(block.content)}</div>
        </div>`;

    case 'figure_card':
      const figure = block.metadata as Record<string, unknown>;
      return `
        <div class="figure-card">
          <div class="figure-name">${escapeHtml(figure.name as string || '')}</div>
          <div class="figure-era">${escapeHtml(figure.era as string || '')} - ${escapeHtml(figure.culture as string || '')}</div>
          <blockquote class="figure-quote">${escapeHtml(block.content)}</blockquote>
        </div>`;

    default:
      return `<div class="content-block">${escapeHtml(block.content)}</div>`;
  }
}

// ============================================
// Full Page Renderer
// ============================================

export function renderPage(options: RenderOptions): string {
  const {
    title,
    description,
    content,
    schemaMarkup,
    currentLang,
    currentPath,
    voice,
    ogImage,
    canonicalUrl,
    breadcrumbs,
  } = options;

  const baseUrl = 'https://therealmofpatterns.com';
  const fullCanonical = canonicalUrl || `${baseUrl}${currentPath}`;
  const fullOgImage = ogImage || `${baseUrl}/images/og-default.png`;

  const hreflangTags = generateHreflangTags(baseUrl, currentPath, currentLang);
  const schemaScript = schemaMarkup ? generateSchemaMarkup('Article', schemaMarkup, baseUrl) : '';
  const navigation = generateNavigation(currentLang);
  const breadcrumbsHtml = generateBreadcrumbs(breadcrumbs || []);
  const footer = generateFooter(currentLang, currentPath);

  // Voice-specific styling hints
  const voiceClass = voice ? `voice-${voice.language_code.replace('-', '_')}` : '';
  const voiceTone = voice ? voice.tone : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(getLangAttribute(currentLang))}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} | The Realm of Patterns</title>
    <meta name="description" content="${escapeHtml(description)}">

    <!-- Canonical & Hreflang -->
    <link rel="canonical" href="${escapeHtml(fullCanonical)}">
    ${hreflangTags}

    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${escapeHtml(fullCanonical)}">
    <meta property="og:image" content="${escapeHtml(fullOgImage)}">
    <meta property="og:site_name" content="The Realm of Patterns">
    <meta property="og:locale" content="${escapeHtml(getLocale(currentLang))}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(fullOgImage)}">

    <!-- Schema Markup -->
    ${schemaScript}

    <!-- Styles -->
    <style>
        :root {
            --cosmic-gold: #d4af37;
            --cosmic-purple: #6b21a8;
            --cosmic-deep: #0a0a1a;
            --cosmic-nebula: #1a1a2e;
            --cosmic-text: #e8e6e3;
            --cosmic-muted: #888;
            --nebula-pink: #c77dff;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background: linear-gradient(180deg, var(--cosmic-deep) 0%, var(--cosmic-nebula) 100%);
            color: var(--cosmic-text);
            min-height: 100vh;
            line-height: 1.7;
        }

        .container { max-width: 900px; margin: 0 auto; padding: 2rem; }

        /* Header */
        .site-header {
            border-bottom: 1px solid rgba(212, 175, 55, 0.3);
            padding: 1rem 2rem;
        }

        .header-inner {
            max-width: 1200px; margin: 0 auto;
            display: flex; justify-content: space-between; align-items: center;
        }

        .site-logo {
            color: var(--cosmic-gold);
            text-decoration: none;
            font-size: 1.2rem;
            letter-spacing: 0.1em;
        }

        .main-nav { display: flex; gap: 1.5rem; }
        .nav-link {
            color: var(--cosmic-text);
            text-decoration: none;
            font-size: 0.9rem;
            opacity: 0.8;
            transition: opacity 0.3s;
        }
        .nav-link:hover { opacity: 1; color: var(--cosmic-gold); }

        /* Breadcrumbs */
        .breadcrumbs {
            padding: 1rem 0;
            font-size: 0.85rem;
            color: var(--cosmic-muted);
        }
        .breadcrumb-link { color: var(--cosmic-gold); text-decoration: none; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-sep { margin: 0 0.5rem; }
        .breadcrumb-current { color: var(--cosmic-text); }

        /* Main Content */
        .page-title {
            font-size: 2.5rem;
            color: var(--cosmic-gold);
            margin-bottom: 1rem;
            font-weight: 400;
        }

        .page-subtitle {
            color: var(--nebula-pink);
            font-style: italic;
            margin-bottom: 2rem;
        }

        .content-heading {
            color: var(--cosmic-gold);
            margin: 2rem 0 1rem;
            font-weight: 400;
        }

        .content-paragraph { margin-bottom: 1.5rem; }

        .content-quote {
            border-left: 3px solid var(--cosmic-gold);
            padding: 1rem 1.5rem;
            margin: 2rem 0;
            background: rgba(212, 175, 55, 0.1);
            font-style: italic;
        }

        .content-quote cite {
            display: block;
            margin-top: 0.5rem;
            color: var(--cosmic-muted);
            font-size: 0.9rem;
        }

        .content-list {
            margin: 1.5rem 0;
            padding-left: 1.5rem;
        }

        .content-list li {
            margin-bottom: 0.5rem;
            padding-left: 0.5rem;
        }

        .content-section {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            padding: 2rem;
            margin: 2rem 0;
        }

        .content-section h3 {
            color: var(--cosmic-gold);
            margin-bottom: 1rem;
        }

        .content-cta {
            text-align: center;
            margin: 3rem 0;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, var(--cosmic-gold) 0%, #b8941f 100%);
            color: var(--cosmic-deep);
            padding: 1rem 2.5rem;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(212, 175, 55, 0.3);
        }

        /* Cards */
        .dimension-card, .figure-card {
            background: rgba(107, 33, 168, 0.2);
            border: 1px solid rgba(212, 175, 55, 0.3);
            border-radius: 12px;
            padding: 2rem;
            margin: 1.5rem 0;
            text-align: center;
        }

        .dim-symbol {
            font-size: 3rem;
            color: var(--cosmic-gold);
        }

        .dim-name, .figure-name {
            font-size: 1.5rem;
            color: var(--cosmic-gold);
            margin: 0.5rem 0;
        }

        .dim-description, .figure-quote {
            color: var(--cosmic-text);
            opacity: 0.9;
        }

        .figure-era {
            color: var(--nebula-pink);
            font-style: italic;
            font-size: 0.95rem;
        }

        .figure-quote {
            font-style: italic;
            margin-top: 1rem;
            padding: 1rem;
            border-left: 2px solid var(--cosmic-gold);
            text-align: left;
        }

        /* Language Switcher */
        .language-switcher {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
        }

        .lang-btn {
            padding: 0.4rem 0.8rem;
            border: 1px solid var(--cosmic-gold);
            background: transparent;
            color: var(--cosmic-gold);
            border-radius: 4px;
            font-size: 0.8rem;
            text-decoration: none;
            transition: all 0.3s;
        }

        .lang-btn:hover, .lang-btn.active {
            background: var(--cosmic-gold);
            color: var(--cosmic-deep);
        }

        /* Footer */
        .site-footer {
            border-top: 1px solid rgba(212, 175, 55, 0.3);
            margin-top: 4rem;
            padding: 3rem 2rem;
        }

        .footer-content {
            max-width: 900px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .footer-brand h3 {
            color: var(--cosmic-gold);
            margin-bottom: 0.5rem;
        }

        .footer-brand p {
            color: var(--cosmic-muted);
            font-size: 0.9rem;
        }

        .footer-links {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .footer-links a {
            color: var(--cosmic-text);
            text-decoration: none;
            font-size: 0.9rem;
            opacity: 0.8;
        }

        .footer-links a:hover {
            color: var(--cosmic-gold);
        }

        .footer-bottom {
            text-align: center;
            color: var(--cosmic-muted);
            font-size: 0.85rem;
        }

        /* Voice-specific styles */
        .voice-pt_br { --accent-color: #00a859; }
        .voice-es_mx { --accent-color: #006847; }

        /* Responsive */
        @media (max-width: 768px) {
            .page-title { font-size: 1.8rem; }
            .header-inner { flex-direction: column; gap: 1rem; }
            .main-nav { flex-wrap: wrap; justify-content: center; }
        }
    </style>
</head>
<body class="${escapeHtml(voiceClass)}" data-tone="${escapeHtml(voiceTone)}">
    <header class="site-header">
      <div class="header-inner">
        <a href="/${escapeHtml(currentLang)}/" class="site-logo">THE REALM OF PATTERNS</a>
        ${navigation}
      </div>
    </header>

    <main class="container">
      ${breadcrumbsHtml}
      ${content}
    </main>

    ${footer}
</body>
</html>`;
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

function getLangAttribute(langCode: string): string {
  const map: Record<string, string> = {
    'en': 'en',
    'pt-br': 'pt-BR',
    'pt-pt': 'pt-PT',
    'es-mx': 'es-MX',
    'es-ar': 'es-AR',
    'es-es': 'es-ES',
  };
  return map[langCode] || 'en';
}

function getLocale(langCode: string): string {
  const map: Record<string, string> = {
    'en': 'en_US',
    'pt-br': 'pt_BR',
    'pt-pt': 'pt_PT',
    'es-mx': 'es_MX',
    'es-ar': 'es_AR',
    'es-es': 'es_ES',
  };
  return map[langCode] || 'en_US';
}

// ============================================
// Translations
// ============================================

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    home: 'Home',
    cosmic_weather: 'Cosmic Weather',
    dimensions: 'Dimensions',
    figures: 'Historical Figures',
    jungian: 'Jungian Concepts',
    about: 'About',
    privacy: 'Privacy',
    footer_tagline: 'Discover your cosmic identity through the 16D framework',
    not_found: 'Page Not Found',
    not_found_message: 'The content you are looking for does not exist.',
    back_home: 'Return Home',
    future_date: 'This date is in the future. Cosmic weather is only available for past and present dates.',
  },
  'pt-br': {
    home: 'Inicio',
    cosmic_weather: 'Clima Cosmico',
    dimensions: 'Dimensoes',
    figures: 'Figuras Historicas',
    jungian: 'Conceitos Junguianos',
    about: 'Sobre',
    privacy: 'Privacidade',
    footer_tagline: 'Descubra sua identidade cosmica atraves do framework 16D',
    not_found: 'Pagina Nao Encontrada',
    not_found_message: 'O conteudo que voce procura nao existe.',
    back_home: 'Voltar ao Inicio',
    future_date: 'Esta data esta no futuro. O clima cosmico so esta disponivel para datas passadas e presentes.',
  },
  'pt-pt': {
    home: 'Inicio',
    cosmic_weather: 'Clima Cosmico',
    dimensions: 'Dimensoes',
    figures: 'Figuras Historicas',
    jungian: 'Conceitos Junguianos',
    about: 'Sobre',
    privacy: 'Privacidade',
    footer_tagline: 'Descubra a sua identidade cosmica atraves do framework 16D',
    not_found: 'Pagina Nao Encontrada',
    not_found_message: 'O conteudo que procura nao existe.',
    back_home: 'Voltar ao Inicio',
    future_date: 'Esta data esta no futuro. O clima cosmico so esta disponivel para datas passadas e presentes.',
  },
  'es-mx': {
    home: 'Inicio',
    cosmic_weather: 'Clima Cosmico',
    dimensions: 'Dimensiones',
    figures: 'Figuras Historicas',
    jungian: 'Conceptos Junguianos',
    about: 'Acerca de',
    privacy: 'Privacidad',
    footer_tagline: 'Descubre tu identidad cosmica a traves del framework 16D',
    not_found: 'Pagina No Encontrada',
    not_found_message: 'El contenido que buscas no existe.',
    back_home: 'Volver al Inicio',
    future_date: 'Esta fecha esta en el futuro. El clima cosmico solo esta disponible para fechas pasadas y presentes.',
  },
  'es-ar': {
    home: 'Inicio',
    cosmic_weather: 'Clima Cosmico',
    dimensions: 'Dimensiones',
    figures: 'Figuras Historicas',
    jungian: 'Conceptos Junguianos',
    about: 'Acerca de',
    privacy: 'Privacidad',
    footer_tagline: 'Descubri tu identidad cosmica a traves del framework 16D',
    not_found: 'Pagina No Encontrada',
    not_found_message: 'El contenido que buscas no existe.',
    back_home: 'Volver al Inicio',
    future_date: 'Esta fecha esta en el futuro. El clima cosmico solo esta disponible para fechas pasadas y presentes.',
  },
  'es-es': {
    home: 'Inicio',
    cosmic_weather: 'Clima Cosmico',
    dimensions: 'Dimensiones',
    figures: 'Figuras Historicas',
    jungian: 'Conceptos Junguianos',
    about: 'Acerca de',
    privacy: 'Privacidad',
    footer_tagline: 'Descubre tu identidad cosmica a traves del framework 16D',
    not_found: 'Pagina No Encontrada',
    not_found_message: 'El contenido que buscas no existe.',
    back_home: 'Volver al Inicio',
    future_date: 'Esta fecha esta en el futuro. El clima cosmico solo esta disponible para fechas pasadas y presentes.',
  },
};

export function getTranslation(lang: string, key: string): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
}

// ============================================
// Error Page Renderer
// ============================================

export function render404Page(lang: string, currentPath: string): string {
  const content = `
    <div style="text-align: center; padding: 4rem 0;">
      <h1 class="page-title">${escapeHtml(getTranslation(lang, 'not_found'))}</h1>
      <p class="page-subtitle">${escapeHtml(getTranslation(lang, 'not_found_message'))}</p>
      <div class="content-cta">
        <a href="/${escapeHtml(lang)}/" class="cta-button">${escapeHtml(getTranslation(lang, 'back_home'))}</a>
      </div>
    </div>`;

  return renderPage({
    title: getTranslation(lang, 'not_found'),
    description: getTranslation(lang, 'not_found_message'),
    content,
    currentLang: lang,
    currentPath,
  });
}

export function renderFutureDatePage(lang: string, currentPath: string): string {
  const content = `
    <div style="text-align: center; padding: 4rem 0;">
      <h1 class="page-title">${escapeHtml(getTranslation(lang, 'cosmic_weather'))}</h1>
      <p class="page-subtitle">${escapeHtml(getTranslation(lang, 'future_date'))}</p>
      <div class="content-cta">
        <a href="/${escapeHtml(lang)}/cosmic-weather/today" class="cta-button">${escapeHtml(getTranslation(lang, 'cosmic_weather'))}</a>
      </div>
    </div>`;

  return renderPage({
    title: getTranslation(lang, 'cosmic_weather'),
    description: getTranslation(lang, 'future_date'),
    content,
    currentLang: lang,
    currentPath,
  });
}

// ============================================
// Content Fetcher
// ============================================

export async function fetchContent(
  env: Env,
  langCode: string,
  contentType: string,
  slug: string
): Promise<CosmicContent | null> {
  try {
    // Build full slug path: {lang}/{type_path}/{slug}
    const typePaths: Record<string, string> = {
      'dimension_guide': 'dimension',
      'historical_figure': 'figure',
      'jungian_concept': 'jungian',
    };
    const typePath = typePaths[contentType] || contentType;
    const fullSlug = `${langCode}/${typePath}/${slug}`;

    // Try KV cache first
    const cacheKey = `cms:${fullSlug}`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query CMS database (cms_cosmic_content table)
    const result = await env.DB.prepare(`
      SELECT * FROM cms_cosmic_content
      WHERE slug = ? AND published = 1
    `).bind(fullSlug).first();

    if (!result) return null;

    const content: CosmicContent = {
      id: result.id as string,
      language_code: result.language as string,
      content_type: result.content_type as string,
      slug: result.slug as string,
      title: result.title as string,
      meta_description: result.meta_description as string || '',
      content_blocks: safeParseJSON(result.content_blocks as string, []),
      schema_markup: safeParseJSON(result.schema_markup as string, undefined),
      related_topics: safeParseJSON(result.related_topics as string, []),
      published_at: result.created_at as string,
    };

    // Cache for 1 hour
    await env.CACHE.put(cacheKey, JSON.stringify(content), { expirationTtl: 3600 });

    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    return null;
  }
}

// ============================================
// Validate Language
// ============================================

export function isValidLanguage(lang: string): lang is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === lang);
}
