import { describe, it, expect, beforeEach } from 'vitest';
import { canCheckin, getUserTier, isPaidTier, FREE_WEEKLY_CHECKIN_LIMIT, PAYWALL_ENABLED } from '../src/lib/monetization';
import { startOfWeek, getCheckinsThisWeek } from '../src/lib/checkin-storage';

describe('monetization boundary', () => {
  it('paywall master switch is OFF until Stripe is wired end-to-end', () => {
    // This is a product decision, not an oversight — if this test fails
    // because you flipped the switch on purpose, update it and verify
    // /subscribe checkout works first.
    expect(PAYWALL_ENABLED).toBe(false);
  });

  it('everything passes while the switch is off', () => {
    expect(canCheckin('free', 999, false || PAYWALL_ENABLED)).toBe(true);
  });

  describe('with paywall enabled (passed explicitly)', () => {
    it('free users get the weekly limit', () => {
      expect(canCheckin('free', 0, true)).toBe(true);
      expect(canCheckin('free', FREE_WEEKLY_CHECKIN_LIMIT - 1, true)).toBe(true);
      expect(canCheckin('free', FREE_WEEKLY_CHECKIN_LIMIT, true)).toBe(false);
      expect(canCheckin('free', FREE_WEEKLY_CHECKIN_LIMIT + 5, true)).toBe(false);
    });

    it('paid tiers are unlimited', () => {
      expect(canCheckin('keeper', 999, true)).toBe(true);
      expect(canCheckin('circle', 999, true)).toBe(true);
    });
  });

  it('isPaidTier', () => {
    expect(isPaidTier('free')).toBe(false);
    expect(isPaidTier('keeper')).toBe(true);
    expect(isPaidTier('circle')).toBe(true);
  });
});

describe('getUserTier from localStorage', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to free', () => {
    expect(getUserTier()).toBe('free');
  });

  it('reads rop_subscription_tier', () => {
    localStorage.setItem('rop_subscription_tier', 'keeper');
    expect(getUserTier()).toBe('keeper');
    localStorage.setItem('rop_subscription_tier', 'circle');
    expect(getUserTier()).toBe('circle');
  });

  it('ignores unknown tier values', () => {
    localStorage.setItem('rop_subscription_tier', 'platinum');
    expect(getUserTier()).toBe('free');
  });

  it('honors legacy isPro flag on rop_user', () => {
    localStorage.setItem('rop_user', JSON.stringify({ isPro: true }));
    expect(getUserTier()).toBe('keeper');
  });

  it('survives corrupt rop_user', () => {
    localStorage.setItem('rop_user', '{not json');
    expect(getUserTier()).toBe('free');
  });
});

describe('weekly check-in window', () => {
  beforeEach(() => localStorage.clear());

  it('startOfWeek returns the preceding Monday at midnight', () => {
    // 2026-06-10 is a Wednesday
    const wed = new Date(2026, 5, 10, 15, 30);
    const monday = startOfWeek(wed);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(8);
    expect(monday.getHours()).toBe(0);

    // A Monday maps to itself
    const mon = new Date(2026, 5, 8, 9, 0);
    expect(startOfWeek(mon).getDate()).toBe(8);

    // A Sunday belongs to the week that started 6 days earlier
    const sun = new Date(2026, 5, 14, 23, 59);
    expect(startOfWeek(sun).getDate()).toBe(8);
  });

  it('counts only entries within the current week', () => {
    const now = new Date(2026, 5, 10, 12, 0); // Wednesday
    const entries = [
      { timestamp: new Date(2026, 5, 9, 8, 0).toISOString() },  // Tuesday — in week
      { timestamp: new Date(2026, 5, 8, 0, 30).toISOString() }, // Monday — in week
      { timestamp: new Date(2026, 5, 7, 22, 0).toISOString() }, // Sunday — previous week
      { timestamp: new Date(2026, 4, 1, 12, 0).toISOString() }, // long ago
    ];
    localStorage.setItem('rop_checkin_history', JSON.stringify({ entries, lastCheckin: null, streak: 0 }));
    expect(getCheckinsThisWeek(now)).toBe(2);
  });

  it('returns 0 with no history', () => {
    expect(getCheckinsThisWeek()).toBe(0);
  });
});
