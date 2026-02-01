/**
 * Geo-Language Mapping for The Realm of Patterns
 *
 * Automatically detects user location via Cloudflare headers
 * and maps to the appropriate language variant.
 */

// Country to language mapping
export const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  // Portuguese variants
  'BR': 'pt-br',  // Brazil → Brazilian Portuguese
  'PT': 'pt-pt',  // Portugal → European Portuguese
  'AO': 'pt-pt',  // Angola → European Portuguese
  'MZ': 'pt-pt',  // Mozambique → European Portuguese

  // Spanish variants
  'MX': 'es-mx',  // Mexico → Mexican Spanish
  'AR': 'es-ar',  // Argentina → Argentine Spanish
  'UY': 'es-ar',  // Uruguay → Argentine Spanish (similar)
  'PY': 'es-ar',  // Paraguay → Argentine Spanish
  'ES': 'es-es',  // Spain → Castilian Spanish
  'CO': 'es-mx',  // Colombia → Mexican Spanish (neutral)
  'PE': 'es-mx',  // Peru → Mexican Spanish
  'VE': 'es-mx',  // Venezuela → Mexican Spanish
  'CL': 'es-ar',  // Chile → Argentine Spanish
  'EC': 'es-mx',  // Ecuador → Mexican Spanish
  'GT': 'es-mx',  // Guatemala → Mexican Spanish
  'CU': 'es-mx',  // Cuba → Mexican Spanish
  'BO': 'es-mx',  // Bolivia → Mexican Spanish
  'DO': 'es-mx',  // Dominican Republic → Mexican Spanish
  'HN': 'es-mx',  // Honduras → Mexican Spanish
  'SV': 'es-mx',  // El Salvador → Mexican Spanish
  'NI': 'es-mx',  // Nicaragua → Mexican Spanish
  'CR': 'es-mx',  // Costa Rica → Mexican Spanish
  'PA': 'es-mx',  // Panama → Mexican Spanish
  'PR': 'es-mx',  // Puerto Rico → Mexican Spanish

  // English (default for these)
  'US': 'en',
  'GB': 'en',
  'CA': 'en',
  'AU': 'en',
  'NZ': 'en',
  'IE': 'en',
  'ZA': 'en',
  'IN': 'en',
  'PH': 'en',
  'SG': 'en',
  'MY': 'en',
  'NG': 'en',
  'KE': 'en',
  'GH': 'en',
};

// Supported languages with metadata
export const SUPPORTED_LANGUAGES = {
  'en': {
    name: 'English',
    native: 'English',
    dir: 'ltr',
    hreflang: 'en',
    default: true,
  },
  'pt-br': {
    name: 'Brazilian Portuguese',
    native: 'Português (Brasil)',
    dir: 'ltr',
    hreflang: 'pt-BR',
  },
  'pt-pt': {
    name: 'European Portuguese',
    native: 'Português (Portugal)',
    dir: 'ltr',
    hreflang: 'pt-PT',
  },
  'es-mx': {
    name: 'Mexican Spanish',
    native: 'Español (México)',
    dir: 'ltr',
    hreflang: 'es-MX',
  },
  'es-ar': {
    name: 'Argentine Spanish',
    native: 'Español (Argentina)',
    dir: 'ltr',
    hreflang: 'es-AR',
  },
  'es-es': {
    name: 'Castilian Spanish',
    native: 'Español (España)',
    dir: 'ltr',
    hreflang: 'es-ES',
  },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Get language from country code
 */
export function getLanguageFromCountry(countryCode: string | null): SupportedLanguage {
  if (!countryCode) return 'en';
  return (COUNTRY_LANGUAGE_MAP[countryCode.toUpperCase()] || 'en') as SupportedLanguage;
}

/**
 * Get language from Accept-Language header
 */
export function getLanguageFromHeader(acceptLanguage: string | null): SupportedLanguage | null {
  if (!acceptLanguage) return null;

  // Parse Accept-Language header (e.g., "pt-BR,pt;q=0.9,en;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.toLowerCase(),
        q: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.q - a.q);

  // Map to our supported languages
  for (const { code } of languages) {
    // Exact match
    if (code in SUPPORTED_LANGUAGES) {
      return code as SupportedLanguage;
    }

    // Partial match (e.g., "pt" matches "pt-br")
    const partial = Object.keys(SUPPORTED_LANGUAGES).find(
      lang => lang.startsWith(code) || code.startsWith(lang.split('-')[0])
    );
    if (partial) {
      return partial as SupportedLanguage;
    }
  }

  return null;
}

/**
 * Detect best language for user based on:
 * 1. URL path (explicit choice)
 * 2. Cookie preference (returning user)
 * 3. Accept-Language header (browser preference)
 * 4. Geo-location (Cloudflare cf-ipcountry)
 * 5. Default to English
 */
export function detectLanguage(options: {
  urlLang?: string | null;
  cookieLang?: string | null;
  acceptLanguage?: string | null;
  countryCode?: string | null;
}): SupportedLanguage {
  const { urlLang, cookieLang, acceptLanguage, countryCode } = options;

  // 1. URL path takes priority (user explicitly navigated)
  if (urlLang && urlLang in SUPPORTED_LANGUAGES) {
    return urlLang as SupportedLanguage;
  }

  // 2. Cookie preference (returning user chose this)
  if (cookieLang && cookieLang in SUPPORTED_LANGUAGES) {
    return cookieLang as SupportedLanguage;
  }

  // 3. Accept-Language header
  const headerLang = getLanguageFromHeader(acceptLanguage ?? null);
  if (headerLang) {
    return headerLang;
  }

  // 4. Geo-location
  const geoLang = getLanguageFromCountry(countryCode ?? null);
  if (geoLang !== 'en') {
    return geoLang;
  }

  // 5. Default
  return 'en';
}

/**
 * Get localized URL path for a given language
 */
export function getLocalizedPath(path: string, targetLang: SupportedLanguage): string {
  // Remove any existing language prefix
  const cleanPath = path.replace(/^\/(en|pt-br|pt-pt|es-mx|es-ar|es-es)/, '');

  // English doesn't need prefix (optional)
  if (targetLang === 'en') {
    return cleanPath || '/';
  }

  return `/${targetLang}${cleanPath || ''}`;
}

/**
 * Get all hreflang alternates for a page
 */
export function getHreflangAlternates(canonicalPath: string, baseUrl: string): Record<string, string> {
  const alternates: Record<string, string> = {};

  for (const [lang, meta] of Object.entries(SUPPORTED_LANGUAGES)) {
    const localizedPath = getLocalizedPath(canonicalPath, lang as SupportedLanguage);
    alternates[meta.hreflang] = `${baseUrl}${localizedPath}`;
  }

  // x-default points to English
  alternates['x-default'] = `${baseUrl}${getLocalizedPath(canonicalPath, 'en')}`;

  return alternates;
}

/**
 * Cloudflare request with geo data
 */
export interface CloudflareRequest extends Request {
  cf?: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
    latitude?: string;
    longitude?: string;
    postalCode?: string;
    continent?: string;
  };
}

/**
 * Extract geo info from Cloudflare request
 */
export function getGeoInfo(request: CloudflareRequest): {
  country: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  coordinates: { lat: number; lng: number } | null;
} {
  const cf = request.cf;

  if (!cf) {
    return {
      country: null,
      city: null,
      region: null,
      timezone: null,
      coordinates: null,
    };
  }

  return {
    country: cf.country || null,
    city: cf.city || null,
    region: cf.region || null,
    timezone: cf.timezone || null,
    coordinates: cf.latitude && cf.longitude
      ? { lat: parseFloat(cf.latitude), lng: parseFloat(cf.longitude) }
      : null,
  };
}
