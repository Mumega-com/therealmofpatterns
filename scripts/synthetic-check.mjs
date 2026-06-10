#!/usr/bin/env node
/**
 * Synthetic production check — fails (exit 1) if any core flow is broken.
 * Run by .github/workflows/monitoring.yml on a schedule; also runnable
 * locally: node scripts/synthetic-check.mjs [base-url]
 */

const BASE = process.argv[2] || 'https://therealmofpatterns.com';
const today = new Date().toISOString().split('T')[0];

const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    failures.push(`${name}: ${err.message}`);
  }
}

async function getOk(path, mustContain) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (mustContain) {
    const text = await res.text();
    if (!text.includes(mustContain)) throw new Error(`missing expected content "${mustContain}"`);
  }
  return res;
}

// ── Core pages ──────────────────────────────────────────────
await check('homepage', () => getOk('/', 'Realm of Patterns'));
await check('sol dashboard', () => getOk('/sol/'));
await check('sol today', () => getOk('/sol/today/'));
await check('free report page', () => getOk('/free-report/'));
await check('subscribe page', () => getOk('/subscribe/'));
await check(`forecast page for today (${today})`, () => getOk(`/forecast/${today}/`, 'Your Daily Forecast'));
await check('sitemap', () => getOk('/sitemap.xml'));

// ── APIs ────────────────────────────────────────────────────
await check('health endpoint', () => getOk('/api/health'));

await check('daily-brief is fresh (daily cron ran)', async () => {
  const res = await fetch(`${BASE}/api/daily-brief`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const brief = await res.json();
  // The brief must be today's — a stale date means the daily cron died
  const briefDate = brief.date || brief.dateStr || '';
  if (briefDate && briefDate !== today) {
    throw new Error(`brief date ${briefDate} != today ${today} — daily cron may be down`);
  }
  if (!brief.narrative && !brief.dimension) throw new Error('brief has no content');
});

await check('preview engine computes', async () => {
  const res = await fetch(`${BASE}/api/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birth_data: { year: 1990, month: 6, day: 15 } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success || !Array.isArray(data.vector) || data.vector.length !== 8) {
    throw new Error('preview did not return an 8D vector');
  }
});

// ── Result ──────────────────────────────────────────────────
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nAll synthetic checks passed.');
