import { test, expect } from './fixtures';

test.describe('Core Pages', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/settings', name: 'Settings' },
    { path: '/subscribe', name: 'Subscribe' },
    { path: '/faq', name: 'FAQ' },
    { path: '/about', name: 'About' },
    { path: '/privacy', name: 'Privacy' },
    { path: '/terms', name: 'Terms' },
    { path: '/dashboard', name: 'Dashboard' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page (${path}) loads without errors`, async ({ page }) => {
      const response = await page.goto(path);

      // Should return 200
      expect(response?.status()).toBe(200);

      // Page should have content
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('404 page works for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz');

    // Should return 404
    expect(response?.status()).toBe(404);
  });

  test('settings page has privacy controls', async ({ page }) => {
    await page.goto('/settings');

    await page.waitForLoadState('networkidle');

    // Should have settings content
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/settings|privacy|mode|sync/i);
  });

  test('subscribe page has pricing plans', async ({ page }) => {
    await page.goto('/subscribe');

    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');

    // Should have SaaS pricing info
    expect(body).toMatch(/\$9|\$29|month|pro|team/i);
  });

  test('FAQ page has content', async ({ page }) => {
    await page.goto('/faq');

    await page.waitForLoadState('networkidle');

    // Should have FAQ content
    const questions = page.locator('h2, h3, details, [role="heading"]');
    expect(await questions.count()).toBeGreaterThan(0);
  });
});
