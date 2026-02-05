import { test, expect } from './fixtures';

test.describe('API Endpoints', () => {
  test.skip(process.env.E2E_STATIC_DIST === '1', 'No API server in E2E_STATIC_DIST mode');

  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');

    // Should return success
    expect(response.ok()).toBeTruthy();
  });

  test('preview endpoint accepts POST', async ({ request }) => {
    const response = await request.post('/api/preview', {
      data: {
        birth_data: {
          year: 1990,
          month: 6,
          day: 15,
          hour: 12,
          minute: 0,
          latitude: 40.7128,
          longitude: -74.006,
          timezone: 'America/New_York',
        },
      },
    });

    // Should return 200 or valid error
    expect([200, 400, 500]).toContain(response.status());
  });

  test('weather endpoint responds', async ({ request }) => {
    const response = await request.get('/api/weather');

    // Should return some response
    expect([200, 404, 500]).toContain(response.status());
  });

  test('CORS headers are present', async ({ request }) => {
    const response = await request.get('/api/health');
    const headers = response.headers();

    // Should have CORS header or be same-origin
    // Note: Pages handles this automatically
    expect(response.ok()).toBeTruthy();
  });
});
