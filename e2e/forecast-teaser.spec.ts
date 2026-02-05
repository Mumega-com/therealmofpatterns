import { test, expect } from './fixtures';

function isoDate(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

test.describe('Forecast Pages', () => {
  test('shows tomorrow teaser in River mode', async ({ page }) => {
    const today = isoDate();
    const tomorrow = addDays(today, 1);

    await page.addInitScript(() => {
      localStorage.setItem('rop_mode', 'river');
    });

    await page.goto(`/forecast/${today}`);

    await expect(page.getByRole('heading', { name: /today's reading/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /the wheel turns/i })).toBeVisible();

    const teaserLink = page.getByRole('link', { name: /glimpse tomorrow/i });
    await expect(teaserLink).toBeVisible();
    await expect(teaserLink).toHaveAttribute('href', `/forecast/${tomorrow}`);
  });
});
