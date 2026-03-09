/**
 * publish-daily.mjs
 * Daily pipeline: fetch brief → render video → upload to YouTube Shorts
 *
 * Usage:
 *   node scripts/publish-daily.mjs            # today
 *   node scripts/publish-daily.mjs 2026-03-10 # specific date
 *
 * Requires video/.env:
 *   GOOGLE_CLIENT_ID=...
 *   GOOGLE_CLIENT_SECRET=...
 *   YOUTUBE_REFRESH_TOKEN=...
 *   BRIEF_API_URL=https://therealmofpatterns.com/api/daily-brief
 */

import { execSync, exec as execCb } from 'child_process';
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env manually (no dotenv dependency needed)
const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const envPath = join(ROOT, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const API_URL   = process.env.BRIEF_API_URL ?? 'https://therealmofpatterns.com/api/daily-brief';
const USE_LAMBDA = process.argv.includes('--lambda');
const USE_VPS    = process.argv.includes('--vps');

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const dateArg = process.argv.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const today   = dateArg ? new Date(dateArg) : new Date();
  const dateStr = today.toISOString().split('T')[0];
  const mode    = USE_LAMBDA ? 'Lambda (AWS)' : USE_VPS ? 'Hetzner VPS' : 'local';

  log(`\n🎬 Daily Brief Pipeline — ${dateStr} [${mode}]`);

  // 1. Fetch brief
  log('   Fetching brief from API...');
  const brief = await fetchBrief(dateStr);
  log(`   ✓ Planet: ${brief.planet} | ${brief.dimension.name} | ${brief.moonEmoji} ${brief.moonPhase}`);

  // 2. Build Remotion props
  const yin  = brief.archetypes.primary.polarity  === 'yin'  ? brief.archetypes.primary  : brief.archetypes.secondary;
  const yang = brief.archetypes.primary.polarity  === 'yang' ? brief.archetypes.primary  : brief.archetypes.secondary;

  const remotionProps = {
    date: brief.dateFormatted,
    narrative: brief.narrative,
    dominantPlanet: brief.planet,
    frequency: brief.frequency,
    archetypes: {
      yin:  { name: yin.name,  symbol: yin.symbol,  quality: yin.quality  },
      yang: { name: yang.name, symbol: yang.symbol, quality: yang.quality },
    },
    moonPhase: brief.moonPhase,
    moonEmoji: brief.moonEmoji,
    dimension: brief.dimension.name,
    hasAudio: false,
  };

  const propsFile = join(ROOT, '.render-props.json');
  writeFileSync(propsFile, JSON.stringify(remotionProps));

  // 3. Render (local or Lambda)
  mkdirSync(join(ROOT, 'out'), { recursive: true });
  const outFile = join(ROOT, 'out', `daily-${dateStr}.mp4`);
  log(`\n   Rendering ${outFile}...`);

  if (USE_VPS) {
    const { renderOnVPS } = await import('./render-vps.mjs');
    await renderOnVPS('DailyWeather', outFile, propsFile);
  } else if (USE_LAMBDA) {
    await renderWithLambda(remotionProps, outFile, dateStr);
  } else {
    execSync(
      `npx remotion render DailyWeather "${outFile}" --props="${propsFile}" --log=error --concurrency=4`,
      { cwd: ROOT, stdio: 'inherit' }
    );
  }
  log(`   ✓ Rendered (${(statSync(outFile).size / 1024 / 1024).toFixed(1)} MB)`);

  // 4. Upload
  if (!process.env.YOUTUBE_REFRESH_TOKEN) {
    log('\n   ⚠ YOUTUBE_REFRESH_TOKEN not set — skipping upload');
    log(`   Video saved to: ${outFile}`);
    return;
  }

  log('\n   Uploading to YouTube...');
  const videoId = await uploadToYouTube(outFile, brief, today);
  const shortUrl = `https://youtube.com/shorts/${videoId}`;
  log(`   ✓ Published: ${shortUrl}`);

  // 5. Clean up temp props file
  try { unlinkSync(propsFile); } catch {}

  return shortUrl;
}

// ── Lambda rendering ───────────────────────────────────────────────
async function renderWithLambda(props, outFile, dateStr) {
  const functionName = process.env.LAMBDA_FUNCTION_NAME;
  const serveUrl     = process.env.LAMBDA_SERVE_URL;
  const region       = process.env.AWS_REGION ?? 'us-east-1';

  if (!functionName || !serveUrl) {
    log('   ⚠ LAMBDA_FUNCTION_NAME or LAMBDA_SERVE_URL not set.');
    log('   Run: node scripts/lambda-deploy.mjs deploy');
    log('   Falling back to local render...');
    const propsFile = join(ROOT, '.render-props.json');
    writeFileSync(propsFile, JSON.stringify(props));
    execSync(
      `npx remotion render DailyWeather "${outFile}" --props="${propsFile}" --log=error`,
      { cwd: ROOT, stdio: 'inherit' }
    );
    return;
  }

  // Use @remotion/lambda renderMediaOnLambda
  const { renderMediaOnLambda, downloadMedia } = await import('@remotion/lambda');

  log(`   Starting Lambda render on ${functionName}...`);
  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: 'DailyWeather',
    inputProps: props,
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 3,
    privacy: 'private',
    logLevel: 'error',
    outName: `daily-${dateStr}.mp4`,
  });

  log(`   Render ID: ${renderId} — waiting for completion...`);

  // Download when done
  const { outputFile } = await downloadMedia({
    region,
    bucketName,
    renderId,
    outPath: outFile,
  });

  log(`   ✓ Downloaded from S3: ${outputFile}`);
}

// ── Brief API ─────────────────────────────────────────────────
async function fetchBrief(dateStr) {
  const url = `${API_URL}?date=${dateStr}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Brief API returned ${res.status} for ${url}`);
  return res.json();
}

// ── YouTube OAuth ──────────────────────────────────────────────
async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`OAuth token error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── YouTube upload ─────────────────────────────────────────────
async function uploadToYouTube(filePath, brief, date) {
  const token    = await getAccessToken();
  const fileSize = statSync(filePath).size;

  const title       = buildTitle(brief, date);
  const description = buildDescription(brief, date);
  const tags        = buildTags(brief);

  log(`   Title: ${title}`);

  // 1. Initiate resumable upload session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags,
          categoryId: '27',         // Education
          defaultLanguage: 'en',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
          madeForKids: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube init error ${initRes.status}: ${err}`);
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL');

  // 2. Upload video bytes
  const videoBytes = readFileSync(filePath);
  const uploadRes  = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(fileSize),
    },
    body: videoBytes,
  });

  if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 201) {
    const err = await uploadRes.text();
    throw new Error(`YouTube upload error ${uploadRes.status}: ${err}`);
  }

  const video = await uploadRes.json();
  return video.id;
}

// ── Metadata builders ──────────────────────────────────────────
function buildTitle(brief, date) {
  const day = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  // YouTube Shorts: title ≤ 100 chars, include #Shorts for classification
  return `${brief.moonEmoji} ${brief.planet} Field · ${day} #Shorts`;
}

function buildDescription(brief, date) {
  const day = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return `${brief.moonEmoji} ${brief.moonPhase} · ${brief.planet} at ${brief.frequency} Hz

Today's dominant field: ${brief.dimension.name} dimension

Active archetypes:
◎ Yang — ${brief.archetypes.primary.polarity === 'yang' ? brief.archetypes.primary.name : brief.archetypes.secondary.name}
◑ Yin  — ${brief.archetypes.primary.polarity === 'yin'  ? brief.archetypes.primary.name : brief.archetypes.secondary.name}

"${brief.narrative}"

─────────────────────────
📖 Your natal pattern shapes how you experience today's field.
Free reading — no signup required:

→ https://therealmofpatterns.com/sol/today

─────────────────────────
#CosmicWeather #${brief.planet} #${brief.dimension.name}Field #DailyReading #Archetypes #DepthPsychology #JungianPsychology #${brief.moonPhase.replace(/\s/g, '')} #SpiritualGrowth #Consciousness #Astrology #Shorts #YouTubeShorts`;
}

function buildTags(brief) {
  return [
    'cosmic weather', 'daily reading', 'archetypes',
    brief.planet, brief.dimension?.name ?? 'field',
    'depth psychology', 'Jungian', brief.moonPhase,
    'spiritual growth', 'consciousness', 'astrology',
    'natal chart', 'soul reading', 'frequency',
    'Shorts', 'YouTube Shorts', 'therealmofpatterns',
  ];
}

// ── Util ───────────────────────────────────────────────────────
function log(msg) { process.stdout.write(msg + '\n'); }

main().catch(err => {
  console.error('\n❌ Pipeline error:', err.message);
  process.exit(1);
});
