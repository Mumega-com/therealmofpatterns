/**
 * youtube-auth.mjs
 * One-time OAuth2 flow to get your YouTube refresh token.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com
 *   2. Create a project → Enable "YouTube Data API v3"
 *   3. OAuth consent screen → External → add your email as test user
 *   4. Credentials → Create → OAuth 2.0 Client ID → Desktop App
 *   5. Copy client_id and client_secret into video/.env
 *
 * Then run:
 *   node scripts/youtube-auth.mjs
 *   → Opens auth URL in terminal
 *   → Paste it in your browser, authorize
 *   → Prints YOUTUBE_REFRESH_TOKEN to copy into .env
 */

import { createServer } from 'http';
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '..', '.env');

// Load .env
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3456/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in video/.env\n');
  process.exit(1);
}

const params = new URLSearchParams({
  client_id:     CLIENT_ID,
  redirect_uri:  REDIRECT_URI,
  response_type: 'code',
  scope:         'https://www.googleapis.com/auth/youtube.upload',
  access_type:   'offline',
  prompt:        'consent',
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

console.log('\n══════════════════════════════════════════════════');
console.log('  YouTube OAuth — one-time setup');
console.log('══════════════════════════════════════════════════');
console.log('\n1. Open this URL in your browser:\n');
console.log(`   ${authUrl}`);
console.log('\n2. Authorize "The Realm of Patterns" to upload videos.');
console.log('   You\'ll be redirected to localhost — that\'s expected.\n');

const server = createServer(async (req, res) => {
  try {
    const url  = new URL(req.url, 'http://localhost:3456');
    const code = url.searchParams.get('code');
    const err  = url.searchParams.get('error');

    if (err) {
      res.end(`Authorization failed: ${err}`);
      console.error(`\n❌ Authorization failed: ${err}`);
      server.close();
      return;
    }

    if (!code) { res.end('No code received.'); return; }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2 style="font-family:sans-serif;padding:40px">✓ Authorized! Check your terminal.</h2>');
    server.close();

    if (!tokens.refresh_token) {
      console.error('\n❌ No refresh_token received. Try revoking access at');
      console.error('   https://myaccount.google.com/permissions and re-running.\n');
      return;
    }

    console.log('\n══════════════════════════════════════════════════');
    console.log('  ✓ Success! Add this line to video/.env:');
    console.log('══════════════════════════════════════════════════\n');
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

    // Auto-append to .env if it exists
    const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
    if (!envContent.includes('YOUTUBE_REFRESH_TOKEN')) {
      appendFileSync(envPath, `\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      console.log('  (Also auto-appended to video/.env)\n');
    }

  } catch (e) {
    res.end(`Error: ${e.message}`);
    console.error('\n❌ Error:', e.message);
    server.close();
  }
});

server.listen(3456, () => {
  console.log('   Waiting for callback on http://localhost:3456 ...\n');
});
