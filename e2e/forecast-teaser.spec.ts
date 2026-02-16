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
  test('loads forecast page for today', async ({ page }) => {
    const today = isoDate();
    const tomorrow = addDays(today, 1);

    await page.goto(`/forecast/${today}`);

    // Page should load with date heading and forecast subtitle
    await expect(page.getByText('Your Daily Forecast')).toBeVisible();

    // Navigation links should exist
    const nextLink = page.getByRole('link', { name: /next/i });
    await expect(nextLink).toBeVisible();
    await expect(nextLink).toHaveAttribute('href', `/forecast/${tomorrow}`);
  });
});
