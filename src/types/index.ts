/**
 * The Realm of Patterns - Type Definitions
 */

// ============================================
// Birth Data
// ============================================
export interface BirthData {
  year: number;       // 1900-2100
  month: number;      // 1-12
  day: number;        // 1-31
  hour?: number;      // 0-23, defaults to 12
  minute?: number;    // 0-59, defaults to 0
  latitude?: number;  // -90 to 90
  longitude?: number; // -180 to 180
  timezone_offset?: number; // -12 to 14
}

// ============================================
// 8D/16D Vectors
// ============================================
export type Vector8D = [number, number, number, number, number, number, number, number];
export type Vector16D = [...Vector8D, ...Vector8D]; // 8D + shadow

export interface DimensionInfo {
  index: number;
  symbol: string;
  name: string;
  domain: string;
  ruler: string;
  value: number;
  shadow: number;
  rank: number;
}

export const DIMENSION_METADATA: Omit<DimensionInfo, 'value' | 'shadow' | 'rank'>[] = [
  { index: 0, symbol: 'P', name: 'Phase', domain: 'Identity, Will', ruler: 'Sun' },
  { index: 1, symbol: 'E', name: 'Existence', domain: 'Structure, Form', ruler: 'Saturn' },
  { index: 2, symbol: 'μ', name: 'Cognition', domain: 'Mind, Communication', ruler: 'Mercury' },
  { index: 3, symbol: 'V', name: 'Value', domain: 'Beauty, Harmony', ruler: 'Venus' },
  { index: 4, symbol: 'N', name: 'Expansion', domain: 'Growth, Meaning', ruler: 'Jupiter' },
  { index: 5, symbol: 'Δ', name: 'Delta/Action', domain: 'Force, Movement', ruler: 'Mars' },
  { index: 6, symbol: 'R', name: 'Relation', domain: 'Connection, Care', ruler: 'Moon' },
  { index: 7, symbol: 'Φ', name: 'Field', domain: 'Witness, Unity', ruler: 'Uranus/Neptune' },
];

// ============================================
// Historical Figures
// ============================================
export interface HistoricalFigure {
  id: number;
  name: string;
  era: string;
  culture: string;
  domains: string[];
  vector: number[];
  quote: string;
  bio?: string;
  image_url?: string;
}

export interface FigureMatch extends HistoricalFigure {
  resonance: number; // 0-1, cosine similarity
}

// ============================================
// API Responses
// ============================================
export interface PreviewResponse {
  success: boolean;
  vector: number[];
  dominant: {
    index: number;
    symbol: string;
    name: string;
    value: number;
    description: string;
  };
  archetype: FigureMatch;
  teaser: string;
}

export interface ComputeResponse {
  success: boolean;
  vector_8d: number[];
  vector_16d: number[];
  dimensions: Record<string, DimensionInfo>;
  historical_matches: FigureMatch[];
  art_url?: string;
}

export interface WeatherResponse {
  date: string;
  vector: number[];
  dominant: {
    symbol: string;
    name: string;
    description: string;
  };
  influences: {
    planet: string;
    sign: string;
    aspect?: string;
    meaning: string;
  }[];
}

export interface CheckoutRequest {
  product_id: 'premium_16d_report' | 'complete_bundle';
  birth_data: BirthData;
  name: string;
  email: string;
}

export interface CheckoutResponse {
  session_id: string;
  url: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retry_after?: number;
  };
}

// ============================================
// Database Models
// ============================================
export interface Order {
  id: string;
  email: string;
  email_hash: string;
  product_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  birth_data: BirthData;
  stripe_customer_id?: string;
  stripe_payment_intent?: string;
  created_at: string;
  completed_at?: string;
}

export interface Report {
  id: string;
  order_id: string;
  email_hash: string;
  vector_8d: number[];
  vector_16d: number[];
  historical_matches: FigureMatch[];
  art_url?: string;
  pdf_url?: string;
  expires_at?: string;
  created_at: string;
}

// ============================================
// Cloudflare Bindings
// ============================================
export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
  AI: Ai;

  // Environment variables
  ENVIRONMENT: string;
  APP_NAME: string;
  APP_URL: string;

  // Secrets
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;
  GEMINI_API_KEY: string;
  ADMIN_KEY: string;
  TWITTER_BEARER_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  DISCORD_WEBHOOK_URL?: string;

  // Additional Gemini API keys for rotation (optional)
  GEMINI_API_KEY_2?: string;
  GEMINI_API_KEY_3?: string;
  GEMINI_API_KEY_4?: string;
  GEMINI_API_KEY_5?: string;
  GEMINI_API_KEY_6?: string;
  GEMINI_API_KEY_7?: string;
  GEMINI_API_KEY_8?: string;
  GEMINI_API_KEY_9?: string;
  GEMINI_API_KEY_10?: string;
  GEMINI_API_KEY_11?: string;

  // Python backend for PDF generation (optional)
  PYTHON_BACKEND_URL?: string;
}

// ============================================
// Stripe Types (simplified)
// ============================================
export interface StripeCheckoutSession {
  id: string;
  customer_email: string;
  metadata: Record<string, string>;
  payment_status: string;
  url: string;
}

// ============================================
// Products
// ============================================
export const PRODUCTS = {
  premium_16d_report: {
    name: 'Premium 16D Report',
    price_cents: 49700, // $497
    description: '40+ page luxury PDF with full 16D analysis',
  },
  complete_bundle: {
    name: 'Complete Bundle',
    price_cents: 69700, // $697
    description: 'Premium Report + Art Print + Booklet',
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;
