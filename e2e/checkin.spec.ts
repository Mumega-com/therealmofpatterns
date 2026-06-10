import { test, expect } from './fixtures';

test.describe('Check-in Flow', () => {
  test('sol check-in page loads', async ({ page }) => {
    await page.goto('/sol/checkin');

    // Page should load without errors
    await expect(page).toHaveURL(/\/sol\/checkin/);

    // Check for check-in form elements
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('sol landing page loads', async ({ page }) => {
    await page.goto('/sol');

    // Page should load
    await expect(page).toHaveURL(/\/sol/);
  });

  // Kasra and River were retired as user-facing voices; their URLs
  // 301 to the Sol equivalents (see public/_redirects).
  for (const mode of ['kasra', 'river'] as const) {
    test(`${mode} check-in redirects to sol`, async ({ page }) => {
      await page.goto(`/${mode}/checkin`);
      await expect(page).toHaveURL(/\/sol\/checkin/);
    });

    test(`${mode} landing redirects to sol`, async ({ page }) => {
      await page.goto(`/${mode}`);
      await expect(page).toHaveURL(/\/sol\//);
    });
  }

  test('check-in form has required elements', async ({ page }) => {
    await page.goto('/sol/checkin');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Look for slider or input elements typical in check-in
    const sliders = page.locator('input[type="range"], [role="slider"]');
    const buttons = page.locator('button');

    // Should have interactive elements
    const hasSliders = (await sliders.count()) > 0;
    const hasButtons = (await buttons.count()) > 0;

    expect(hasSliders || hasButtons).toBeTruthy();
  });
});
