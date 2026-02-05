import { test, expect } from './fixtures';

function isoDate(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

test.describe('Streak Badge', () => {
  test('appears in header when streak is active', async ({ page }) => {
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

    await page.goto('/');

    const streak = page.locator('.streak-container');
    await expect(streak).toBeVisible();
    await expect(streak.locator('.streak-count')).toHaveText('3');

    await streak.hover();
    await expect(streak.locator('.streak-tooltip')).toBeVisible();
    await expect(streak.locator('.streak-tooltip')).toContainText(/3 day streak/i);
  });
});
