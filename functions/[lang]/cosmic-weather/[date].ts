/**
 * GET /[lang]/cosmic-weather/[date]
 * Fetch daily weather from cosmic_content where content_type='daily_weather'
 * Handle date parsing, 404 for future dates
 * Cache in KV for 1 hour
 */

import { Env, DIMENSION_METADATA } from '../../../src/types';
import {
  fetchContent,
  loadVoice,
  renderPage,
  render404Page,
  renderFutureDatePage,
  renderContentBlocks,
  isValidLanguage,
  getTranslation,
} from '../../../src/lib/content-renderer';
import { approximateLongitudes, compute8D, getDominant } from '../../../src/lib/16d-engine';

// WeatherData interface kept for documentation purposes but not currently used
// interface WeatherData {
//   date: string;
//   vector: number[];
//   dominant: {
//     symbol: string;
//     name: string;
//     index: number;
//   };
//   influences: {
//     planet: string;
//     sign: string;
//     aspect?: string;
//     meaning: string;
//   }[];
// }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const lang = params.lang as string;
  const dateParam = params.date as string;

  // Validate language
  if (!isValidLanguage(lang)) {
    return new Response(render404Page('en', `/${lang}/cosmic-weather/${dateParam}`), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const currentPath = `/${lang}/cosmic-weather/${dateParam}`;

  try {
    // Parse date parameter
    const parsedDate = parseDate(dateParam);

    if (!parsedDate) {
      return new Response(render404Page(lang, currentPath), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedDate > today) {
      return new Response(renderFutureDatePage(lang, currentPath), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const dateKey = formatDate(parsedDate);
    const cacheKey = `page:${lang}:weather:${dateKey}`;

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
    const content = await fetchContent(env, lang, 'daily_weather', dateKey);

    if (content) {
      const html = await renderWeatherFromContent(env, lang, content, currentPath, parsedDate);
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

    // Try to fetch from cosmic_weather_content table
    const weatherContent = await fetchWeatherContent(env, lang, dateKey);

    if (weatherContent) {
      const html = await renderWeatherFromDb(env, lang, weatherContent, currentPath, parsedDate);
      await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'DB',
        },
      });
    }

    // Generate fallback from computation
    const html = await generateWeatherFallback(env, lang, parsedDate, currentPath);
    await env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'COMPUTED',
      },
    });
  } catch (error) {
    console.error('Cosmic weather page error:', error);
    return new Response(render404Page(lang, currentPath), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};

// ============================================
// Date Parsing
// ============================================

function parseDate(dateParam: string): Date | null {
  // Handle 'today' special case
  if (dateParam.toLowerCase() === 'today') {
    return new Date();
  }

  // Handle 'yesterday' special case
  if (dateParam.toLowerCase() === 'yesterday') {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }

  // Handle ISO format: YYYY-MM-DD
  const isoMatch = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // Handle compact format: YYYYMMDD
  const compactMatch = dateParam.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(date: Date, lang: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'pt-br': 'pt-BR',
    'pt-pt': 'pt-PT',
    'es-mx': 'es-MX',
    'es-ar': 'es-AR',
    'es-es': 'es-ES',
  };

  return date.toLocaleDateString(localeMap[lang] || 'en-US', options);
}

// ============================================
// Fetch Weather Content from DB
// ============================================

async function fetchWeatherContent(
  env: Env,
  lang: string,
  dateKey: string
): Promise<Record<string, unknown> | null> {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM cosmic_weather_content
      WHERE date = ? AND language_code = ?
    `).bind(dateKey, lang).first();

    return result || null;
  } catch (error) {
    console.error('Error fetching weather content:', error);
    return null;
  }
}

// ============================================
// Render Weather from Content
// ============================================

async function renderWeatherFromContent(
  env: Env,
  lang: string,
  content: { title: string; meta_description: string; content_blocks: import('../../../src/lib/content-renderer').ContentBlock[]; published_at?: string },
  currentPath: string,
  date: Date
): Promise<string> {
  const voice = await loadVoice(env, lang);
  const dateDisplay = formatDateDisplay(date, lang);

  const schemaMarkup = buildWeatherSchema(content.title, content.meta_description, currentPath, date);

  const breadcrumbs = [
    { title: getTranslation(lang, 'home'), url: `/${lang}/` },
    { title: getTranslation(lang, 'cosmic_weather'), url: `/${lang}/cosmic-weather/today` },
    { title: dateDisplay, url: currentPath },
  ];

  const renderedContent = `
    <article class="weather-article">
      <header class="weather-header">
        <h1 class="page-title">${escapeHtml(content.title)}</h1>
        <p class="weather-date">${escapeHtml(dateDisplay)}</p>
        <div class="fusion-badge">
          <span>Vedic</span>
          <span>+</span>
          <span>Western</span>
          <span>= 16D</span>
        </div>
      </header>

      <div class="weather-content">
        ${renderContentBlocks(content.content_blocks)}
      </div>

      ${renderNavigation(lang, date)}
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
// Render Weather from DB
// ============================================

async function renderWeatherFromDb(
  env: Env,
  lang: string,
  weatherData: Record<string, unknown>,
  currentPath: string,
  date: Date
): Promise<string> {
  const voice = await loadVoice(env, lang);
  const dateDisplay = formatDateDisplay(date, lang);

  const title = weatherData.title as string || `Cosmic Weather - ${dateDisplay}`;
  const summary = weatherData.summary as string || '';
  const vedicInsights = weatherData.vedic_insights as string || '';
  const westernInsights = weatherData.western_insights as string || '';
  const guidance = weatherData.practical_guidance as string || '';

  const schemaMarkup = buildWeatherSchema(title, summary, currentPath, date);

  const breadcrumbs = [
    { title: getTranslation(lang, 'home'), url: `/${lang}/` },
    { title: getTranslation(lang, 'cosmic_weather'), url: `/${lang}/cosmic-weather/today` },
    { title: dateDisplay, url: currentPath },
  ];

  const renderedContent = `
    <article class="weather-article">
      <header class="weather-header">
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="weather-date">${escapeHtml(dateDisplay)}</p>
        <div class="fusion-badge">
          <span>Vedic</span>
          <span>+</span>
          <span>Western</span>
          <span>= 16D</span>
        </div>
      </header>

      <section class="content-section">
        <h2>${getLocalizedLabel(lang, 'summary')}</h2>
        <p>${escapeHtml(summary)}</p>
      </section>

      ${vedicInsights ? `
      <section class="content-section">
        <h3>${getLocalizedLabel(lang, 'vedic')}</h3>
        <p>${escapeHtml(vedicInsights)}</p>
      </section>` : ''}

      ${westernInsights ? `
      <section class="content-section">
        <h3>${getLocalizedLabel(lang, 'western')}</h3>
        <p>${escapeHtml(westernInsights)}</p>
      </section>` : ''}

      ${guidance ? `
      <section class="content-section">
        <h3>${getLocalizedLabel(lang, 'guidance')}</h3>
        <p>${escapeHtml(guidance)}</p>
      </section>` : ''}

      ${renderNavigation(lang, date)}
      ${renderCTA(lang)}
    </article>`;

  return renderPage({
    title,
    description: summary,
    content: renderedContent,
    schemaMarkup,
    currentLang: lang,
    currentPath,
    voice: voice || undefined,
    breadcrumbs,
  });
}

// ============================================
// Generate Weather Fallback
// ============================================

async function generateWeatherFallback(
  env: Env,
  lang: string,
  date: Date,
  currentPath: string
): Promise<string> {
  const voice = await loadVoice(env, lang);
  const dateDisplay = formatDateDisplay(date, lang);

  // Compute weather using 16D engine
  const birthData = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };

  const longitudes = approximateLongitudes(birthData);
  const vector = compute8D(longitudes);
  const dominant = getDominant(vector);

  const title = `${getLocalizedLabel(lang, 'cosmic_weather')} - ${dateDisplay}`;
  const description = getLocalizedWeatherDescription(lang, dominant.symbol, dominant.name);

  const schemaMarkup = buildWeatherSchema(title, description, currentPath, date);

  const breadcrumbs = [
    { title: getTranslation(lang, 'home'), url: `/${lang}/` },
    { title: getTranslation(lang, 'cosmic_weather'), url: `/${lang}/cosmic-weather/today` },
    { title: dateDisplay, url: currentPath },
  ];

  const renderedContent = `
    <article class="weather-article">
      <header class="weather-header">
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="weather-date">${escapeHtml(dateDisplay)}</p>
        <div class="fusion-badge">
          <span>Vedic</span>
          <span>+</span>
          <span>Western</span>
          <span>= 16D</span>
        </div>
      </header>

      <section class="dominant-dimension">
        <div class="dim-symbol">${escapeHtml(dominant.symbol)}</div>
        <div class="dim-name">${escapeHtml(dominant.name)}</div>
        <p class="dim-description">${escapeHtml(DIMENSION_METADATA[dominant.index]?.domain || '')}</p>
      </section>

      <section class="content-section">
        <h2>${getLocalizedLabel(lang, 'today_climate')}</h2>
        <p>${escapeHtml(description)}</p>
      </section>

      <section class="content-section vector-section">
        <h3>${getLocalizedLabel(lang, 'daily_vector')}</h3>
        <div class="vector-display">
          ${renderVectorGrid(vector)}
        </div>
      </section>

      <section class="content-section">
        <h3>${getLocalizedLabel(lang, 'guidance')}</h3>
        <p>${escapeHtml(getGuidance(lang, dominant.symbol))}</p>
      </section>

      ${renderNavigation(lang, date)}
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

function buildWeatherSchema(
  title: string,
  description: string,
  url: string,
  date: Date
): Record<string, unknown> {
  return {
    '@type': 'Article',
    headline: title,
    description,
    url: `https://therealmofpatterns.com${url}`,
    datePublished: date.toISOString(),
    author: {
      '@type': 'Organization',
      name: 'The Realm of Patterns',
    },
  };
}

function renderVectorGrid(vector: number[]): string {
  return `<div class="vector-grid">
    ${DIMENSION_METADATA.map((dim, i) => {
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
    }).join('')}
  </div>`;
}

function renderNavigation(lang: string, currentDate: Date): string {
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevKey = formatDate(prevDate);

  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextKey = formatDate(nextDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const showNext = nextDate <= today;

  return `
    <nav class="weather-nav">
      <a href="/${escapeHtml(lang)}/cosmic-weather/${escapeHtml(prevKey)}" class="nav-prev">
        &larr; ${getLocalizedLabel(lang, 'previous_day')}
      </a>
      ${showNext ? `
      <a href="/${escapeHtml(lang)}/cosmic-weather/${escapeHtml(nextKey)}" class="nav-next">
        ${getLocalizedLabel(lang, 'next_day')} &rarr;
      </a>` : ''}
    </nav>`;
}

function renderCTA(lang: string): string {
  const ctaText: Record<string, string> = {
    en: 'Discover Your Personal Pattern',
    'pt-br': 'Descubra Seu Padrao Pessoal',
    'pt-pt': 'Descubra o Seu Padrao Pessoal',
    'es-mx': 'Descubre Tu Patron Personal',
    'es-ar': 'Descubri Tu Patron Personal',
    'es-es': 'Descubre Tu Patron Personal',
  };

  return `
    <div class="content-cta">
      <a href="/${escapeHtml(lang)}/" class="cta-button">${escapeHtml(ctaText[lang] || ctaText.en)}</a>
    </div>`;
}

function getLocalizedLabel(lang: string, key: string): string {
  const labels: Record<string, Record<string, string>> = {
    en: {
      cosmic_weather: 'Cosmic Weather',
      summary: 'Cosmic Climate',
      vedic: 'Vedic Perspective',
      western: 'Western Transits',
      guidance: 'Practical Guidance',
      today_climate: "Today's Cosmic Climate",
      daily_vector: 'Daily 8D Vector',
      previous_day: 'Previous Day',
      next_day: 'Next Day',
    },
    'pt-br': {
      cosmic_weather: 'Clima Cosmico',
      summary: 'Clima Cosmico',
      vedic: 'Perspectiva Vedica',
      western: 'Transitos Ocidentais',
      guidance: 'Orientacao Pratica',
      today_climate: 'Clima Cosmico de Hoje',
      daily_vector: 'Vetor 8D Diario',
      previous_day: 'Dia Anterior',
      next_day: 'Proximo Dia',
    },
    'pt-pt': {
      cosmic_weather: 'Clima Cosmico',
      summary: 'Clima Cosmico',
      vedic: 'Perspectiva Vedica',
      western: 'Transitos Ocidentais',
      guidance: 'Orientacao Pratica',
      today_climate: 'Clima Cosmico de Hoje',
      daily_vector: 'Vector 8D Diario',
      previous_day: 'Dia Anterior',
      next_day: 'Dia Seguinte',
    },
    'es-mx': {
      cosmic_weather: 'Clima Cosmico',
      summary: 'Clima Cosmico',
      vedic: 'Perspectiva Vedica',
      western: 'Transitos Occidentales',
      guidance: 'Orientacion Practica',
      today_climate: 'Clima Cosmico de Hoy',
      daily_vector: 'Vector 8D Diario',
      previous_day: 'Dia Anterior',
      next_day: 'Dia Siguiente',
    },
    'es-ar': {
      cosmic_weather: 'Clima Cosmico',
      summary: 'Clima Cosmico',
      vedic: 'Perspectiva Vedica',
      western: 'Transitos Occidentales',
      guidance: 'Orientacion Practica',
      today_climate: 'Clima Cosmico de Hoy',
      daily_vector: 'Vector 8D Diario',
      previous_day: 'Dia Anterior',
      next_day: 'Dia Siguiente',
    },
    'es-es': {
      cosmic_weather: 'Clima Cosmico',
      summary: 'Clima Cosmico',
      vedic: 'Perspectiva Vedica',
      western: 'Transitos Occidentales',
      guidance: 'Orientacion Practica',
      today_climate: 'Clima Cosmico de Hoy',
      daily_vector: 'Vector 8D Diario',
      previous_day: 'Dia Anterior',
      next_day: 'Dia Siguiente',
    },
  };

  return labels[lang]?.[key] || labels['en'][key] || key;
}

function getLocalizedWeatherDescription(lang: string, symbol: string, name: string): string {
  const templates: Record<string, string> = {
    en: `Today the collective field emphasizes ${name} (${symbol}). This energy invites you to focus on themes of ${getDimensionThemes(symbol)}.`,
    'pt-br': `Hoje o campo coletivo enfatiza ${name} (${symbol}). Esta energia convida voce a focar em temas de ${getDimensionThemes(symbol)}.`,
    'pt-pt': `Hoje o campo colectivo enfatiza ${name} (${symbol}). Esta energia convida-o a focar em temas de ${getDimensionThemes(symbol)}.`,
    'es-mx': `Hoy el campo colectivo enfatiza ${name} (${symbol}). Esta energia te invita a enfocarte en temas de ${getDimensionThemes(symbol)}.`,
    'es-ar': `Hoy el campo colectivo enfatiza ${name} (${symbol}). Esta energia te invita a enfocarte en temas de ${getDimensionThemes(symbol)}.`,
    'es-es': `Hoy el campo colectivo enfatiza ${name} (${symbol}). Esta energia te invita a enfocarte en temas de ${getDimensionThemes(symbol)}.`,
  };

  return templates[lang] || templates['en'];
}

function getDimensionThemes(symbol: string): string {
  const themes: Record<string, string> = {
    'P': 'identity, will, and self-expression',
    'E': 'structure, form, and lasting foundations',
    'μ': 'thought, communication, and learning',
    'V': 'beauty, harmony, and relationships',
    'N': 'growth, expansion, and meaning',
    'Δ': 'action, transformation, and change',
    'R': 'connection, care, and nurturing',
    'Φ': 'unity, witness, and cosmic awareness',
  };
  return themes[symbol] || 'cosmic alignment';
}

function getGuidance(lang: string, symbol: string): string {
  const guidance: Record<string, Record<string, string>> = {
    en: {
      'P': 'Start that project you have been postponing. Your willpower is amplified today.',
      'E': 'Organize your space. Create systems. Build something that will last.',
      'μ': 'Journal your thoughts. Have meaningful conversations. Learn something new.',
      'V': 'Create art. Express love. Notice beauty in small things.',
      'N': 'Plan a journey. Read philosophy. Question your assumptions.',
      'Δ': 'Exercise. Clear clutter. End what needs ending. Act decisively.',
      'R': 'Reach out to someone. Listen deeply. Nurture your connections.',
      'Φ': 'Meditate. Observe without judgment. Feel the interconnection of all things.',
    },
    'pt-br': {
      'P': 'Comece aquele projeto que voce vem adiando. Sua forca de vontade esta amplificada hoje.',
      'E': 'Organize seu espaco. Crie sistemas. Construa algo que vai durar.',
      'μ': 'Escreva seus pensamentos. Tenha conversas significativas. Aprenda algo novo.',
      'V': 'Crie arte. Expresse amor. Note a beleza nas pequenas coisas.',
      'N': 'Planeje uma jornada. Leia filosofia. Questione suas suposicoes.',
      'Δ': 'Faca exercicio. Limpe a bagunca. Termine o que precisa terminar. Aja decisivamente.',
      'R': 'Entre em contato com alguem. Escute profundamente. Nutra suas conexoes.',
      'Φ': 'Medite. Observe sem julgamento. Sinta a interconexao de todas as coisas.',
    },
    'es-mx': {
      'P': 'Comienza ese proyecto que has estado posponiendo. Tu fuerza de voluntad esta amplificada hoy.',
      'E': 'Organiza tu espacio. Crea sistemas. Construye algo que perdure.',
      'μ': 'Escribe tus pensamientos. Ten conversaciones significativas. Aprende algo nuevo.',
      'V': 'Crea arte. Expresa amor. Nota la belleza en las pequenas cosas.',
      'N': 'Planea un viaje. Lee filosofia. Cuestiona tus suposiciones.',
      'Δ': 'Haz ejercicio. Despeja el desorden. Termina lo que necesita terminar. Actua decisivamente.',
      'R': 'Contacta a alguien. Escucha profundamente. Nutre tus conexiones.',
      'Φ': 'Medita. Observa sin juzgar. Siente la interconexion de todas las cosas.',
    },
  };

  const langGuidance = guidance[lang] || guidance['en'];
  return langGuidance[symbol] || langGuidance['Φ'];
}
