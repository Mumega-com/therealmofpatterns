/**
 * generate-ambient.mjs
 * Synthesizes a 30-second planetary ambient WAV from the daily brief.
 * No API needed — pure Node.js PCM synthesis at the planet's frequency.
 *
 * Usage:
 *   node scripts/generate-ambient.mjs              # today (fetches brief)
 *   node scripts/generate-ambient.mjs 147.85 Saturn # specific freq + planet
 *
 * Output: public/daily-ambient.wav
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir   = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dir, '..');
const envPath = join(ROOT, '.env');

if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const SAMPLE_RATE  = 44100;
const DURATION_SEC = 31; // slightly longer than video
const NUM_CHANNELS = 2;
const BITS         = 16;
const API_URL      = process.env.BRIEF_API_URL ?? 'https://therealmofpatterns.com/api/daily-brief';

function log(m) { process.stdout.write(m + '\n'); }

// ── WAV header ────────────────────────────────────────────────────
function buildWavHeader(numSamples) {
  const dataSize = numSamples * NUM_CHANNELS * (BITS / 8);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + dataSize, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);                             // PCM
  h.writeUInt16LE(NUM_CHANNELS, 22);
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BITS / 8, 28);
  h.writeUInt16LE(NUM_CHANNELS * BITS / 8, 32);
  h.writeUInt16LE(BITS, 34);
  h.write('data', 36);
  h.writeUInt32LE(dataSize, 40);
  return h;
}

// ── Synthesis ─────────────────────────────────────────────────────
function synthesize(freq) {
  const numSamples = SAMPLE_RATE * DURATION_SEC;
  const samples    = Buffer.alloc(numSamples * NUM_CHANNELS * (BITS / 8));
  const MAX        = 32767;

  // Harmonic series for a rich ambient pad
  const harmonics = [
    { mult: 0.25,  amp: 0.22 },  // sub-bass
    { mult: 0.5,   amp: 0.28 },  // bass octave
    { mult: 1.0,   amp: 0.35 },  // fundamental
    { mult: 1.5,   amp: 0.18 },  // perfect fifth
    { mult: 2.0,   amp: 0.15 },  // octave
    { mult: 3.0,   amp: 0.07 },  // 12th
    { mult: 4.0,   amp: 0.05 },  // double octave
  ];

  // Per-harmonic slight detuning for chorus width
  const detunes = harmonics.map(() => (Math.random() - 0.5) * 0.003);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Volume envelope: 2.5s fade-in, sustain, 4s fade-out
    const fadeIn  = Math.min(1, t / 2.5);
    const fadeOut = Math.min(1, (DURATION_SEC - t) / 4.0);
    const env     = fadeIn * fadeOut;

    // Slow tremolo (0.08 Hz) for movement
    const tremolo = 1 - 0.06 * (Math.sin(2 * Math.PI * 0.08 * t) * 0.5 + 0.5);

    // Sum harmonics
    let sL = 0, sR = 0;
    for (let h = 0; h < harmonics.length; h++) {
      const { mult, amp } = harmonics[h];
      const fL = freq * mult * (1 + detunes[h]);
      const fR = freq * mult * (1 - detunes[h] * 0.5);
      // Slight phase offset per harmonic for width
      const phase = h * 0.37;
      sL += Math.sin(2 * Math.PI * fL * t + phase) * amp;
      sR += Math.sin(2 * Math.PI * fR * t + phase + 0.1) * amp;
    }

    // Soft clip (tanh) to prevent harsh distortion
    const normalize = 0.42;
    const left  = Math.tanh(sL * normalize) * env * tremolo * MAX * 0.7;
    const right = Math.tanh(sR * normalize) * env * tremolo * MAX * 0.7;

    const offset = i * NUM_CHANNELS * (BITS / 8);
    samples.writeInt16LE(Math.round(left),  offset);
    samples.writeInt16LE(Math.round(right), offset + 2);
  }

  return { samples, numSamples };
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  let freq   = parseFloat(process.argv[2]);
  let planet = process.argv[3] ?? 'unknown';

  // If no freq given, fetch from brief API
  if (!freq) {
    const dateStr = new Date().toISOString().slice(0, 10);
    log(`Fetching brief for ${dateStr}...`);
    try {
      const res  = await fetch(`${API_URL}?date=${dateStr}`);
      const data = await res.json();
      freq   = data.frequency ?? 147.85;
      planet = data.planet ?? 'Saturn';
    } catch {
      log('Could not fetch brief — using Saturn 147.85 Hz');
      freq   = 147.85;
      planet = 'Saturn';
    }
  }

  log(`\n🎵 Synthesizing ${planet} ambient — ${freq} Hz · ${DURATION_SEC}s`);
  log('   Generating layered harmonic pad...');

  const { samples, numSamples } = synthesize(freq);
  const header = buildWavHeader(numSamples);

  mkdirSync(join(ROOT, 'public'), { recursive: true });
  const outPath = join(ROOT, 'public', 'daily-ambient.wav');
  writeFileSync(outPath, Buffer.concat([header, samples]));

  const mb = ((header.length + samples.length) / 1024 / 1024).toFixed(1);
  log(`   ✓ Saved public/daily-ambient.wav (${mb} MB)`);
  log(`\n   Tuned to ${freq.toFixed(2)} Hz (${planet})`);
  log('   Set hasAudio: true in render props to use it.\n');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
