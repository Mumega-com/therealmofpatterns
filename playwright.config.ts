import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Tests run against the deployed Cloudflare Pages site
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Test against production or preview URL
    baseURL: process.env.BASE_URL || 'https://therealmofpatterns.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL
          ? { channel: process.env.PLAYWRIGHT_CHANNEL as any }
          : process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === '1'
            ? { channel: 'chrome' }
            : {}),
      },
    },
  ],

  // No webServer - we test against deployed site
});
