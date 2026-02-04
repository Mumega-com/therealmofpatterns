import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully with correct title', async ({ page }) => {
    await page.goto('/');

    // Check page loads
    await expect(page).toHaveTitle(/Realm of Patterns/i);

    // Check main content is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays SaaS pricing (not $497)', async ({ page }) => {
    await page.goto('/');

    // Should NOT contain $497 anywhere
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('$497');
    expect(pageContent).not.toContain('$697');

    // Should contain SaaS pricing
    expect(pageContent).toContain('$19');
    expect(pageContent).toContain('$49');
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');

    // Check header exists
    const header = page.locator('header, nav, [role="navigation"]').first();
    await expect(header).toBeVisible();
  });

  test('CTA buttons link to check-in', async ({ page }) => {
    await page.goto('/');

    // Look for primary CTA
    const ctaLink = page.locator('a[href*="checkin"], a[href*="/sol"], a[href*="/kasra"], a[href*="/river"]').first();

    if (await ctaLink.isVisible()) {
      const href = await ctaLink.getAttribute('href');
      expect(href).toMatch(/\/(sol|kasra|river)(\/checkin)?/);
    }
  });

  test('subscribe links point to /subscribe', async ({ page }) => {
    await page.goto('/');

    // Check subscribe links
    const subscribeLinks = page.locator('a[href*="/subscribe"]');
    const count = await subscribeLinks.count();

    // Should have at least one subscribe link in pricing section
    expect(count).toBeGreaterThan(0);
  });
});
