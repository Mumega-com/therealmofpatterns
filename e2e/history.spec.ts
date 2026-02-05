import { test, expect } from './fixtures';

function isoDate(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

test.describe('History Dashboard', () => {
  test('shows empty state when no history exists', async ({ page }) => {
    await page.goto('/history');

    await expect(page.getByRole('heading', { name: /the unfolding pattern/i })).toBeVisible();
    await expect(page.locator('.history-empty')).toBeVisible();
    await expect(page.locator('.history-empty')).toContainText(/no history yet/i);
  });

  test('renders a chart when history is present', async ({ page }) => {
    const today = isoDate();
    const yesterday = addDays(today, -1);
    const twoDaysAgo = addDays(today, -2);

    const seededHistory = [
      { date: today, kappa: 0.72, stage: 'citrinitas', muLevel: 4, failureMode: 'healthy' },
      { date: yesterday, kappa: 0.62, stage: 'citrinitas', muLevel: 4, failureMode: 'healthy' },
      { date: twoDaysAgo, kappa: 0.48, stage: 'albedo', muLevel: 3, failureMode: 'healthy' },
    ];

    await page.addInitScript((history) => {
      localStorage.setItem('rop_history', JSON.stringify(history));
    }, seededHistory);

    await page.goto('/history');

    const dashboard = page.locator('.history-dashboard');
    await expect(dashboard).toBeVisible();

    await expect(page.locator('.history-dashboard .text-right .text-2xl')).toHaveText('3');
    await expect(page.locator('.chart-container > div.flex-1')).toHaveCount(3);
  });
});
