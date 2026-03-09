/**
 * generate-daily-voiceover.mjs
 * Generates a daily ElevenLabs voiceover for the DailyWeather video.
 *
 * Fetches today's brief, builds a narration script from the real data,
 * and saves it as public/daily-voiceover.mp3 for use during rendering.
 *
 * Usage:
 *   node scripts/generate-daily-voiceover.mjs            # today
 *   node scripts/generate-daily-voiceover.mjs 2026-03-10 # specific date
 *
 * Requires video/.env:
 *   ELEVENLABS_API_KEY=...
 *   BRIEF_API_URL=https://therealmofpatterns.com/api/daily-brief  (optional)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dir, '..');
const envPath = join(ROOT, '.env');

// Load .env
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BRIEF_API_URL      = process.env.BRIEF_API_URL ?? 'https://therealmofpatterns.com/api/daily-brief';
const VOICE_ID           = 'XB0fDUnXU5powFXDhCwa'; // Charlotte

function log(msg) { process.stdout.write(msg + '\n'); }

// ── Script builder ─────────────────────────────────────────────────
function buildNarrationScript(brief) {
  const yang = brief.archetypes.primary.polarity === 'yang'
    ? brief.archetypes.primary
    : brief.archetypes.secondary;
  const yin = brief.archetypes.primary.polarity === 'yin'
    ? brief.archetypes.primary
    : brief.archetypes.secondary;

  // ~28 seconds at natural pace (ElevenLabs reads ~150 words/min → ~70 words for 28s)
  return `${brief.planet} is shaping today's field.

${brief.narrative}

${brief.moonEmoji} The moon is ${brief.moonPhase.toLowerCase()}, and the ${brief.dimension?.name ?? 'field'} dimension is active.

Two archetypes emerge — ${yang.name}, and ${yin.name}. Which one speaks to you today?

Your natal pattern shapes how you move through this. Free reading at the realm of patterns dot com.`;
}

// ── ElevenLabs TTS ─────────────────────────────────────────────────
async function generateVoiceover(script, outputPath) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.72,
          similarity_boost: 0.78,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }

  const buffer = await res.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(buffer));
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  if (!ELEVENLABS_API_KEY) {
    log('❌ ELEVENLABS_API_KEY not set in video/.env');
    process.exit(1);
  }

  const dateArg = process.argv.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const dateStr = dateArg ?? new Date().toISOString().split('T')[0];

  log(`\n🎙 Generating daily voiceover — ${dateStr}`);

  // 1. Fetch brief
  log('   Fetching brief...');
  const res = await fetch(`${BRIEF_API_URL}?date=${dateStr}`);
  if (!res.ok) throw new Error(`Brief API ${res.status}`);
  const brief = await res.json();
  log(`   ✓ Planet: ${brief.planet} | ${brief.dimension?.name} | ${brief.moonEmoji} ${brief.moonPhase}`);

  // 2. Build script
  const script = buildNarrationScript(brief);
  log(`\n   Script (~${script.split(' ').length} words):`);
  log('   ─────────────────────────');
  script.split('\n').filter(Boolean).forEach(l => log(`   ${l}`));
  log('   ─────────────────────────\n');

  // 3. Generate
  const publicDir = join(ROOT, 'public');
  mkdirSync(publicDir, { recursive: true });
  const outPath = join(publicDir, 'daily-voiceover.mp3');

  log('   Calling ElevenLabs Charlotte voice...');
  await generateVoiceover(script, outPath);

  const size = (Buffer.byteLength(Buffer.from(''))).toString();
  log(`   ✓ Saved to public/daily-voiceover.mp3`);
  log('\n   Enable in video by setting hasAudio: true in DailyWeatherProps.\n');
}

main().catch(err => {
  console.error('\n❌ Voiceover error:', err.message);
  process.exit(1);
});
