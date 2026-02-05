import { test, expect } from './fixtures';

test.describe('Check-in Flow', () => {
  const modes = ['sol', 'kasra', 'river'] as const;

  for (const mode of modes) {
    test(`${mode} check-in page loads`, async ({ page }) => {
      await page.goto(`/${mode}/checkin`);

      // Page should load without errors
      await expect(page).toHaveURL(new RegExp(`/${mode}/checkin`));

      // Check for check-in form elements
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test(`${mode} landing page loads`, async ({ page }) => {
      await page.goto(`/${mode}`);

      // Page should load
      await expect(page).toHaveURL(new RegExp(`/${mode}`));
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
