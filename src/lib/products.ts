/**
 * TROP Product Catalog
 *
 * Central source of truth for commerce pricing. Reference from checkout
 * endpoints, Telegram /upgrade command, and marketing copy.
 *
 * Glass Commerce (Mumega SaaS) takes 5% platform fee. When the Connect
 * account is provisioned, set GLASS_PLATFORM_ACCOUNT_ID and the checkout
 * endpoints will include application_fee_percent=5 + transfer_data.destination.
 */

export type ProductTier = 'single_reading' | 'pro_monthly' | 'founder';

export interface Product {
  id: ProductTier;
  name: string;
  description: string;
  priceCents: number;        // USD cents
  currency: 'usd';
  recurring: 'one_time' | 'month';
  stripePriceId?: string;    // Set via env, keeps catalog code-free
  entitlement: string;       // What the buyer unlocks
}

export const PRODUCTS: Record<ProductTier, Product> = {
  single_reading: {
    id: 'single_reading',
    name: 'Personal Pattern Report',
    description: 'One-time deep 16D pattern reading with shadow analysis and historical resonance matches.',
    priceCents: 499,
    currency: 'usd',
    recurring: 'one_time',
    entitlement: 'premium_single_reading',
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Daily personal readings, full 16D profile, archived readings, premium check-in depth.',
    priceCents: 999,
    currency: 'usd',
    recurring: 'month',
    entitlement: 'pro_monthly',
  },
  founder: {
    id: 'founder',
    name: 'Founding Member',
    description: 'Lifetime access to all current and future premium features. Limited allocation.',
    priceCents: 9900,
    currency: 'usd',
    recurring: 'one_time',
    entitlement: 'founder',
  },
};

export function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function upgradePitch(): string {
  const pro = PRODUCTS.pro_monthly;
  const single = PRODUCTS.single_reading;
  return [
    '✨ *Upgrade to deeper readings*',
    '',
    `*${pro.name}* — ${formatPrice(pro.priceCents)}/mo`,
    pro.description,
    '',
    `*${single.name}* — ${formatPrice(single.priceCents)} one-time`,
    single.description,
    '',
    'Tap below to continue.',
  ].join('\n');
}

/**
 * Glass Commerce config. Null when not provisioned; checkout still works
 * without splitting fees (100% goes to TROP's Stripe account).
 */
export function glassCommerceConfig(env: {
  GLASS_PLATFORM_ACCOUNT_ID?: string;
  GLASS_PLATFORM_FEE_PERCENT?: string;
}): { destinationAccount: string; feePercent: number } | null {
  if (!env.GLASS_PLATFORM_ACCOUNT_ID) return null;
  return {
    destinationAccount: env.GLASS_PLATFORM_ACCOUNT_ID,
    feePercent: Number(env.GLASS_PLATFORM_FEE_PERCENT ?? '5'),
  };
}
