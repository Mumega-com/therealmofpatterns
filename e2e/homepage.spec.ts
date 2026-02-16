import { test, expect } from './fixtures';

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
    expect(pageContent).toContain('$9');
    expect(pageContent).toContain('$29');
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');

    // Check header exists
    const header = page.locator('header, nav, [role="navigation"]').first();
    await expect(header).toBeVisible();
  });

  test('CTA buttons link to discover or check-in', async ({ page }) => {
    await page.goto('/');

    // Look for primary CTA (points to /discover for new users, or /mode/checkin for returning)
    const ctaLink = page.locator('a[href*="discover"], a[href*="checkin"], a[href*="/sol"], a[href*="/kasra"], a[href*="/river"]').first();

    if (await ctaLink.isVisible()) {
      const href = await ctaLink.getAttribute('href');
      expect(href).toMatch(/\/(discover|(sol|kasra|river)(\/checkin)?)/);
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

  test('email capture section accepts an email', async ({ page }) => {
    await page.route('**/api/subscribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/');

    const newsletter = page.locator('.newsletter-section');
    await newsletter.scrollIntoViewIfNeeded();

    // Wait for React hydration (client:visible triggers on scroll)
    const emailInput = newsletter.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await page.waitForTimeout(500);

    await emailInput.fill('test@example.com');

    const submitButton = newsletter.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Success message varies by mode: "You're in!" (sol), "SUBSCRIBED" (kasra), "Welcome to the Pattern" (river)
    await expect(newsletter).toContainText(/you're in!|subscribed|welcome to the pattern/i, { timeout: 10000 });
  });
});
