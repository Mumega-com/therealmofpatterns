import { test as base, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.ico':
      return 'image/x-icon';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function distFileForPathname(pathname: string): string | null {
  const normalized = path.posix.normalize(decodeURIComponent(pathname));
  if (normalized.includes('..')) return null;

  let rel = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  if (!rel) rel = 'index.html';
  else if (rel.endsWith('/')) rel = `${rel}index.html`;
  else if (!path.posix.basename(rel).includes('.')) rel = `${rel}/index.html`;

  return path.join(DIST_DIR, ...rel.split('/'));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const test = base;
export { expect };

test.beforeEach(async ({ page }, testInfo) => {
  if (process.env.E2E_STATIC_DIST !== '1') return;

  const baseURL = testInfo.project.use.baseURL as string | undefined;
  const origin = baseURL ? new URL(baseURL).origin : 'http://local.test';

  await page.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    const url = new URL(requestUrl);

    // Block any external network requests to keep tests deterministic.
    if (url.origin !== origin) {
      await route.abort();
      return;
    }

    // Minimal API stubs for static-dist runs (no real server).
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/subscribe') {
        await route.fallback();
        return;
      }

      if (url.pathname === '/api/health') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      if (url.pathname === '/api/theater/current') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ imageUrl: null, stage: 'citrinitas' }),
        });
        return;
      }

      // Default: not implemented in static-dist mode.
      await route.fulfill({
        status: 404,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ error: 'Not available in E2E_STATIC_DIST mode' }),
      });
      return;
    }

    const filePath = distFileForPathname(url.pathname);
    if (!filePath) {
      await route.fulfill({ status: 400, body: 'Bad request' });
      return;
    }

    // Serve static assets out of dist/.
    if (!(await fileExists(filePath))) {
      const fallback404 = path.join(DIST_DIR, '404.html');
      if (route.request().resourceType() === 'document' && (await fileExists(fallback404))) {
        const body = await fs.readFile(fallback404);
        await route.fulfill({
          status: 404,
          contentType: 'text/html; charset=utf-8',
          body,
        });
        return;
      }

      await route.fulfill({ status: 404, body: 'Not found' });
      return;
    }

    const body = await fs.readFile(filePath);
    await route.fulfill({
      status: 200,
      contentType: getContentType(filePath),
      body,
    });
  });
});

