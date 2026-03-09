/**
 * generate-assets.mjs
 * Generates all reusable visual assets for the DailyWeather video using gpt-image-1.
 *
 * Assets are saved to public/assets/ and versioned with git.
 * Run once per asset type — skips existing files by default.
 *
 * Usage:
 *   node scripts/generate-assets.mjs              # generate all missing assets
 *   node scripts/generate-assets.mjs planets       # only planets
 *   node scripts/generate-assets.mjs dimensions    # only dimension textures
 *   node scripts/generate-assets.mjs archetypes    # only archetype art
 *   node scripts/generate-assets.mjs background    # cosmic bg
 *   node scripts/generate-assets.mjs --force       # regenerate everything
 *
 * Requires video/.env:
 *   OPENAI_API_KEY=sk-proj-...
 *
 * Generated assets:
 *   public/assets/planet-{name}.png         — 10 planet sigils (1024×1024, transparent)
 *   public/assets/dimension-{name}.png      — 5 dimension textures (1024×1536)
 *   public/assets/archetype-yang.png        — Yang archetype symbol (1024×1024, transparent)
 *   public/assets/archetype-yin.png         — Yin archetype symbol (1024×1024, transparent)
 *   public/assets/cosmic-bg.png             — Cosmic field background (1024×1536)
 *   public/assets/sol-logo.png              — Sol brand mark (1024×1024, transparent)
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir   = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dir, '..');
const envPath = join(ROOT, '.env');

// Load .env
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSETS_DIR     = join(ROOT, 'public', 'assets');
const FORCE          = process.argv.includes('--force');
const TARGET         = process.argv.find(a => !a.startsWith('-') && !a.includes('/')) ?? 'all';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set in video/.env');
  process.exit(1);
}

mkdirSync(ASSETS_DIR, { recursive: true });

// ── Asset definitions ─────────────────────────────────────────────

const PLANETS = [
  {
    name: 'sun',
    prompt: `Sacred geometry solar symbol for the Sun — a radiant geometric circle with emanating rays, golden mandala pattern, precise line art, white/gold on pure transparent background, NO background, no landscape, no space scene, centered symbol only, spiritual astronomical glyph, very clean lines`,
  },
  {
    name: 'moon',
    prompt: `Sacred geometry lunar symbol for the Moon — crescent moon with geometric inner pattern, silver and gold line art, pure transparent background, NO backdrop, centered symbol only, spiritual astronomical glyph, minimalist sacred art`,
  },
  {
    name: 'mercury',
    prompt: `Sacred geometry symbol for Mercury planet — the caduceus/messenger glyph as geometric sacred art, gold line art on transparent background, centered symbol only, no background, minimal cosmic glyph, precise geometric line art`,
  },
  {
    name: 'venus',
    prompt: `Sacred geometry symbol for Venus planet — Venus glyph as geometric flower, circle with cross below, gold and rose-gold line art, transparent background, centered symbol only, no backdrop, sacred geometric art`,
  },
  {
    name: 'mars',
    prompt: `Sacred geometry symbol for Mars planet — circle with upward arrow, geometric diamond patterns, gold and deep red line art, transparent background, centered symbol only, no backdrop, sacred geometric glyph art`,
  },
  {
    name: 'jupiter',
    prompt: `Sacred geometry symbol for Jupiter — traditional Jupiter glyph as sacred geometry, golden geometric art, divine proportions, transparent background, centered symbol only, no backdrop, precise spiritual line art`,
  },
  {
    name: 'saturn',
    prompt: `Sacred geometry symbol for Saturn — the scythe/cross with geometric ring patterns, dark gold and silver line art on transparent background, centered symbol only, no backdrop, ancient astronomical sacred glyph art`,
  },
  {
    name: 'uranus',
    prompt: `Sacred geometry symbol for Uranus — geometric glyph with circle and cross, electric blue and gold line art on transparent background, centered symbol only, no backdrop, minimal sacred astronomical art`,
  },
  {
    name: 'neptune',
    prompt: `Sacred geometry symbol for Neptune — trident glyph as sacred geometry, ocean blue and silver line art on transparent background, centered symbol only, no backdrop, mystical minimal cosmic glyph`,
  },
  {
    name: 'pluto',
    prompt: `Sacred geometry symbol for Pluto — underworld glyph as sacred geometry, dark gold and deep purple line art on transparent background, centered symbol only, no backdrop, transformative symbolic art`,
  },
];

const DIMENSIONS = [
  {
    name: 'energy',
    prompt: `Abstract cosmic texture for Energy dimension — electric field lines, radiant gold lightning patterns on near-black #080706 background, very subtle and atmospheric, tiny gold particles scattered throughout, minimal noise texture, cinematic depth, no text, no figures, pure atmospheric background for video overlay`,
  },
  {
    name: 'body',
    prompt: `Abstract cosmic texture for Body/physical dimension — earth tones with gold dust particles on near-black #080706 background, organic cellular patterns extremely subtle, warm amber atmospheric glow at horizon, no text, pure atmospheric video background`,
  },
  {
    name: 'emotion',
    prompt: `Abstract cosmic texture for Emotion dimension — soft flowing water-like ripples in silver and gold on near-black #080706 background, aurora-like wisps of purple and gold, very subtle and atmospheric, no text, pure atmospheric video background`,
  },
  {
    name: 'clarity',
    prompt: `Abstract cosmic texture for Clarity/mind dimension — crystalline geometric light refractions, diamond-like particles in silver-white and gold on near-black #080706 background, very subtle lattice patterns, crisp atmospheric glow, no text, pure atmospheric video background`,
  },
  {
    name: 'ground',
    prompt: `Abstract cosmic texture for Ground dimension — deep earth geometric patterns, concentric stone-like rings in muted gold and brown on near-black #080706 background, grounding atmospheric texture, very subtle, no text, pure atmospheric video background`,
  },
];

const ARCHETYPES = [
  {
    name: 'yang',
    prompt: `Sacred geometry Yang archetype symbol — a bold diamond/rhombus with inner geometric patterns, architectural precision, gold and white line art, pure transparent background NO backdrop, centered symbol only, archetypal masculine sacred art, minimal and powerful`,
  },
  {
    name: 'yin',
    prompt: `Sacred geometry Yin archetype symbol — crescent moon with inner circle, flowing curves with geometric precision, purple-silver and gold line art, pure transparent background NO backdrop, centered symbol only, archetypal feminine sacred art, minimal and ethereal`,
  },
];

const SPECIAL = [
  {
    name: 'cosmic-bg',
    size: '1024x1536',
    prompt: `Deep space cosmic field background — near-black #080706 background, vast star field with depth layers, thin gold nebula wisps, sacred geometric light patterns extremely subtle in mid-field, photorealistic space atmosphere, cinematic, no text, no figures, designed as vertical 9:16 video background, masterful astronomical photography style`,
  },
  {
    name: 'sol-logo',
    size: '1024x1024',
    prompt: `Minimal sacred logo mark for "Sol" — a perfect circle with a geometric sun-like inner pattern, gold (#d4a854) on transparent background, the word SOL subtly integrated as geometric letterforms or implied, pure transparent background, centered symbol, clean minimal design, spiritual brand mark`,
  },
];

// ── API call ──────────────────────────────────────────────────────

async function generateImage({ prompt, size = '1024x1024', transparent = false, quality = 'medium' }) {
  const body = {
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size,
    quality,
    output_format: 'png',
    response_format: 'b64_json',
  };

  if (transparent) {
    body.background = 'transparent';
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const b64  = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image in response: ${JSON.stringify(data)}`);
  return Buffer.from(b64, 'base64');
}

// ── Generation helpers ────────────────────────────────────────────

async function generateAndSave(filename, options, label) {
  const outPath = join(ASSETS_DIR, filename);

  if (!FORCE && existsSync(outPath)) {
    log(`   ✓ ${filename} (exists — skip)`);
    return;
  }

  log(`   Generating ${label}...`);
  try {
    const buffer = await generateImage(options);
    writeFileSync(outPath, buffer);
    log(`   ✓ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    log(`   ❌ ${filename}: ${err.message}`);
  }

  // Rate limit: gpt-image-1 is ~3 req/min on Tier 1 — wait between calls
  await sleep(1200);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { process.stdout.write(msg + '\n'); }

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  log(`\n🎨 Generating video assets with gpt-image-1`);
  log(`   Mode: ${FORCE ? 'force (regenerate all)' : 'incremental (skip existing)'}`);
  log(`   Target: ${TARGET}\n`);

  const runPlanets    = TARGET === 'all' || TARGET === 'planets';
  const runDimensions = TARGET === 'all' || TARGET === 'dimensions';
  const runArchetypes = TARGET === 'all' || TARGET === 'archetypes';
  const runBackground = TARGET === 'all' || TARGET === 'background';

  // 1. Planet sigils
  if (runPlanets) {
    log('── Planet sigils (10) ───────────────────');
    for (const planet of PLANETS) {
      await generateAndSave(
        `planet-${planet.name}.png`,
        { prompt: planet.prompt, size: '1024x1024', transparent: true, quality: 'medium' },
        `${planet.name} sigil`
      );
    }
  }

  // 2. Dimension textures
  if (runDimensions) {
    log('\n── Dimension textures (5) ──────────────');
    for (const dim of DIMENSIONS) {
      await generateAndSave(
        `dimension-${dim.name}.png`,
        { prompt: dim.prompt, size: '1024x1536', transparent: false, quality: 'low' },
        `${dim.name} texture`
      );
    }
  }

  // 3. Archetype art
  if (runArchetypes) {
    log('\n── Archetype symbols (2) ───────────────');
    for (const arch of ARCHETYPES) {
      await generateAndSave(
        `archetype-${arch.name}.png`,
        { prompt: arch.prompt, size: '1024x1024', transparent: true, quality: 'medium' },
        `${arch.name} archetype`
      );
    }
  }

  // 4. Cosmic background + Sol logo
  if (runBackground) {
    log('\n── Special assets ──────────────────────');
    for (const s of SPECIAL) {
      await generateAndSave(
        `${s.name}.png`,
        { prompt: s.prompt, size: s.size, transparent: s.name.includes('logo'), quality: 'high' },
        s.name
      );
    }
  }

  log(`\n✅ Done! Assets in video/public/assets/`);
  log('   Use in Remotion: staticFile("assets/planet-saturn.png")');
  log('   Commit to git to version your assets.\n');
}

main().catch(err => {
  console.error('\n❌ Asset generation error:', err.message);
  process.exit(1);
});
