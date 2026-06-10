/**
 * Monetization boundary — single source of truth for tier checks and
 * free-tier limits (GTM roadmap §4.2/4.3).
 *
 * PAYWALL_ENABLED is the master switch. It stays false until Stripe
 * checkout is verified end-to-end; until then every gate passes and the
 * product behaves exactly as before. Flip it to true to enforce the
 * free-tier boundary everywhere at once.
 */

export const PAYWALL_ENABLED = false;

export const FREE_WEEKLY_CHECKIN_LIMIT = 3;

export type Tier = 'free' | 'keeper' | 'circle';

/** Read the user's tier from localStorage (set by success.astro / user store). */
export function getUserTier(): Tier {
  if (typeof window === 'undefined') return 'free';
  try {
    const tier = localStorage.getItem('rop_subscription_tier');
    if (tier === 'keeper' || tier === 'circle') return tier;
    // Legacy Pro flag from before tiers existed
    if (JSON.parse(localStorage.getItem('rop_user') || '{}').isPro === true) return 'keeper';
  } catch { /* corrupt storage — treat as free */ }
  return 'free';
}

export function isPaidTier(tier: Tier): boolean {
  return tier === 'keeper' || tier === 'circle';
}

/**
 * Pure decision: may a user with this tier and this many check-ins this
 * week start another check-in?
 */
export function canCheckin(tier: Tier, checkinsThisWeek: number, paywallEnabled: boolean = PAYWALL_ENABLED): boolean {
  if (!paywallEnabled) return true;
  if (isPaidTier(tier)) return true;
  return checkinsThisWeek < FREE_WEEKLY_CHECKIN_LIMIT;
}
