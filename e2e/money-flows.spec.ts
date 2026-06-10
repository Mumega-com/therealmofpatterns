import { test, expect } from './fixtures';

/**
 * Money-adjacent flow coverage — SAFE for production.
 *
 * Rules enforced here:
 *  - No real payments: we never click through to Stripe checkout.
 *  - No persistent writes: API POSTs only exercise validation-failure paths
 *    that return 4xx BEFORE any D1 write / Stripe call / email send
 *    (verified against functions/api/* sources).
 *  - /api/preview is stateless (compute + KV rate-limit counter only), so
 *    the /dna preview interaction is allowed.
 *  - /api/archetype-report is NOT submitted with a valid body — a valid
 *    request writes to D1 and can send email. Only the invalid path is hit.
 */

test.describe('Money flows — pages', () => {
  test('free-report page loads with birth-date inputs and submit control', async ({ page }) => {
    await page.goto('/free-report/');

    await expect(page).toHaveTitle(/archetype report/i);
    await expect(page.locator('main.free-report-page h1')).toBeVisible();

    // FreeReportForm is a client:load React island — wait for hydration
    const form = page.locator('form.free-report-form');
    await expect(form).toBeVisible();

    // Birth date inputs: YYYY / MM / DD
    await expect(form.locator('#birth-year')).toBeVisible();
    await expect(form.locator('input[placeholder="MM"]').first()).toBeVisible();
    await expect(form.locator('input[placeholder="DD"]').first()).toBeVisible();

    // Submit control exists and is disabled until the form is valid.
    // Do NOT fill + submit: a valid submission writes to D1 (free_reports).
    const submit = form.locator('button.submit-btn[type="submit"]');
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('subscribe page loads with enabled upgrade buttons', async ({ page }) => {
    await page.goto('/subscribe/');

    await expect(page.locator('.page-header h1')).toBeVisible();

    // Founding Member one-time purchase button
    const foundingBtn = page.locator('#foundingBtn');
    await expect(foundingBtn).toBeVisible();
    await expect(foundingBtn).toBeEnabled();

    // Pro (individual) and Team (squad) plan buttons
    const individualBtn = page.locator('#individualBtn');
    await expect(individualBtn).toBeVisible();
    await expect(individualBtn).toBeEnabled();

    const squadBtn = page.locator('#squadBtn');
    await expect(squadBtn).toBeVisible();
    await expect(squadBtn).toBeEnabled();

    // Clicking a plan button only reveals the email form (no network call yet)
    await individualBtn.click();
    const checkoutForm = page.locator('#checkoutForm');
    await expect(checkoutForm).toBeVisible();
    await expect(checkoutForm.locator('input#email')).toBeVisible();
    // Stop here — do NOT submit the email form (it would create a Stripe session)
  });

  test('subscribe upgrade handlers target live checkout endpoints (validation only)', async ({ request }) => {
    test.skip(process.env.E2E_STATIC_DIST === '1', 'No API server in E2E_STATIC_DIST mode');

    // The page script POSTs to these endpoints. Both validate email/plan and
    // return 400 BEFORE talking to Stripe, so an empty body is prod-safe and
    // proves the endpoint exists, is routed, and is validating.
    const founding = await request.post('/api/create-founding-checkout', { data: {} });
    expect(founding.status()).toBe(400);

    const subscription = await request.post('/api/create-subscription-checkout', { data: {} });
    expect(subscription.status()).toBe(400);

    // /dna buy flow targets this endpoint — same validation-first pattern
    const dna = await request.post('/api/create-dna-checkout', { data: {} });
    expect(dna.status()).toBe(400);
  });

  test('dna page date input enables the preview button', async ({ page }) => {
    await page.goto('/dna/');

    await expect(page.locator('.hero h1')).toBeVisible();

    const dateInput = page.locator('#f-date');
    await expect(dateInput).toBeVisible();

    // Preview button starts disabled
    const previewBtn = page.locator('#preview-btn');
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toBeDisabled();

    // Fill a date → button enables
    await dateInput.fill('1990-06-15');
    await expect(previewBtn).toBeEnabled();
  });

  // FIXME(deploy pending): the deployed /dna page has the buy modal
  // (#buy-modal) stuck OPEN on load, blocking all pointer events — the page
  // CSS `.modal-overlay { display: flex }` overrode the UA `[hidden]` rule.
  // The fix (`.modal-overlay[hidden] { display: none }`) is committed in
  // src/pages/dna.astro; switch fixme → test after the next production deploy.
  test.fixme('dna preview generates a result after clicking the preview button', async ({ page }) => {
    await page.goto('/dna/');

    const dateInput = page.locator('#f-date');
    await dateInput.fill('1990-06-15');

    const previewBtn = page.locator('#preview-btn');
    await expect(previewBtn).toBeEnabled();

    // Submitting is safe: the handler only calls the stateless /api/preview
    // (with a deterministic client-side fallback) — no server-side state.
    await previewBtn.click();
    await expect(page.locator('#preview-card')).toBeVisible();
    await expect(page.locator('#preview-result')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#preview-archetype')).not.toHaveText('');

    // The buy button exists but is NOT clicked (leads to Stripe checkout)
    await expect(page.locator('#buy-btn')).toBeVisible();
  });
});

test.describe('Money flows — API validation paths', () => {
  test.skip(process.env.E2E_STATIC_DIST === '1', 'No API server in E2E_STATIC_DIST mode');

  test('POST /api/auth/magic rejects an invalid body with 4xx', async ({ request }) => {
    // Missing email → 400 before any DB write or email send
    const response = await request.post('/api/auth/magic', { data: {} });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('POST /api/archetype-report rejects an empty body with 4xx', async ({ request }) => {
    // A valid-shaped request writes to D1 and may send email, so we only
    // exercise the invalid path: missing birth_date → 400 before any write.
    const response = await request.post('/api/archetype-report', { data: {} });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe('MISSING_BIRTH_DATE');
  });

  test('POST /api/subscription-status validates and is read-only for unknown email', async ({ request }) => {
    // Empty body → 400 (must provide sessionId or email)
    const invalid = await request.post('/api/subscription-status', { data: {} });
    expect(invalid.status()).toBe(400);

    // Unknown email → read-only D1 lookup, returns free tier (no writes)
    const unknown = await request.post('/api/subscription-status', {
      data: { email: 'e2e-nonexistent-account@example.com' },
    });
    expect(unknown.ok()).toBeTruthy();

    const body = await unknown.json();
    expect(body.success).toBe(true);
    expect(body.isPro).toBe(false);
    expect(body.tier).toBe('free');
  });
});
