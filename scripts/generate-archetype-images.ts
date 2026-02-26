/**
 * generate-archetype-images.ts
 *
 * One-time script to generate all 8 archetype images for the Realm of Patterns.
 * Saves PNG files to public/assets/archetypes/
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx tsx scripts/generate-archetype-images.ts
 *
 * Requires: tsx  (npm i -D tsx)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Set OPENAI_API_KEY environment variable first.');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'public', 'assets', 'archetypes');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────
// BRAND STYLE LOCK — prepended to every prompt
// Constrains the model to the Realm of Patterns visual identity.
// ─────────────────────────────────────────────────────────

const STYLE_LOCK = `
Dark alchemical fine art print. Single centered symbolic composition on near-black ground.
Palette strictly limited to: near-black, antique gold (#d4a854), amber (#e8c88a), aged warm cream.
NO white. NO bright colors. NO photorealism. NO digital gradients. NO modern typography.
Visual style: antique astronomical manuscript engraving meets contemporary dark art limited-edition print.
Technique: detailed engraving-style linework, aged parchment texture dissolved into darkness,
subtle gold leaf highlights, sepia wash shadows.
References: 16th century alchemical codex woodcuts, Albrecht Dürer engravings,
Remedios Varo's surrealism, vintage De Agostini astronomical plates.
Mood: sacred, contemplative, mysterious, timeless.
Square composition. Museum-quality artifact. Every visual element carries symbolic meaning.
`.trim();

// ─────────────────────────────────────────────────────────
// ARCHETYPE PROMPTS
// Each is a symbolic artifact — a meaningful visual object, not an illustration.
// ─────────────────────────────────────────────────────────

const ARCHETYPES = [
  {
    id: 'hero',
    name: 'The Hero',
    symbol: '☀',
    filename: '0-hero.png',
    prompt: `
${STYLE_LOCK}

Subject: The Hero archetype. Solar deity power contained in alchemical vessel.
Central image: A radiant sun disk, rays like a crown of swords, engraved in dense gold linework.
Surrounding elements: A lion emerging from flames at the base, its mane becoming solar rays.
An open eye within the solar disk — the eye of authentic self-expression.
Border inscription in engraved Latin script: "AURUM EST LUX INTUS" (gold is the light within).
Background: concentric rings of planetary orbits, faint star field in deep black.
The image feels like it was torn from an alchemical treatise on solar sovereignty.
Dense, ritualistic, powerful. No human figure — only pure symbolism.
    `.trim(),
  },
  {
    id: 'ruler',
    name: 'The Ruler',
    symbol: '♄',
    filename: '1-ruler.png',
    prompt: `
${STYLE_LOCK}

Subject: The Ruler archetype. Saturn as builder of eternal structures.
Central image: The Saturn glyph ♄ rendered as a monumental stone keystone with rings orbiting it.
Surrounding elements: An architectural arch made of stacked stone tablets, each engraved with geometric symbols.
A scythe leaned against the arch — time and harvest. Hourglass at the base, sand mid-fall.
Tessellated floor pattern of squares and diamonds extending to infinity.
Border inscription: "FORMA DAT ESSE" (form gives being).
Background: star map with Saturn's rings drawn as precise astronomical diagram.
The image feels like a blueprint from a lost civilization's sacred architecture manual.
Dense linework. Geometric precision. The weight of permanence.
    `.trim(),
  },
  {
    id: 'sage',
    name: 'The Sage',
    symbol: '☿',
    filename: '2-sage.png',
    prompt: `
${STYLE_LOCK}

Subject: The Sage archetype. Mercury as the mind that sees beneath appearance.
Central image: The Mercury caduceus ☿ — twin serpents ascending a staff, wings at the crown.
Surrounding elements: A shattered mirror with star reflections visible in the cracks.
Stacked ancient books at the base, their pages becoming birds in flight.
An intricate labyrinth drawn in gold linework behind the caduceus.
Small planetary glyphs orbit the central staff like electrons.
Border inscription: "SCIO ME NESCIRE" (I know that I do not know).
Background: dense star field with constellation lines drawn as thought-map connections.
The image feels like it was found inside a Renaissance philosopher's private codex.
Layered, intellectual, mysterious. The mind as infinite recursion.
    `.trim(),
  },
  {
    id: 'creator',
    name: 'The Creator',
    symbol: '♀',
    filename: '3-creator.png',
    prompt: `
${STYLE_LOCK}

Subject: The Creator archetype. Venus as the force that makes beauty from chaos.
Central image: The Venus mirror symbol ♀ — a hand mirror with a rose reflected inside it.
Surrounding elements: Two hands emerging from darkness, fingers touching at center —
the moment of creation. Between the fingertips: a tiny unfurling rose, gold petals opening.
A loom with threads of light extending outward. Honeycomb geometry in the background.
A pomegranate split open at the base — seeds as creative potential.
Border inscription: "EX NIHILO NIHIL FIT" (from beauty, all things).
Background: fibonacci spiral drawn in faint gold, planets of the inner solar system.
The image feels like a page from a medieval Book of Hours, but darker and more primal.
Sensual geometry. Organic symmetry. Creation as sacred act.
    `.trim(),
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    symbol: '♃',
    filename: '4-explorer.png',
    prompt: `
${STYLE_LOCK}

Subject: The Explorer archetype. Jupiter as the mind that expands every horizon.
Central image: A compass rose rendered in precise engraving, all 32 points visible.
At the center: the Jupiter glyph ♃ like an anchor.
Surrounding elements: An eagle with wings fully spread above, feathers becoming stars.
An open manuscript at the base with a map dissolving at its edges into unmapped territory.
A lightning bolt (Jupiter's attribute) striking downward into the compass center.
Horizon line visible through an archway, distance fading to near-black.
Border inscription: "FINIS CORONAT OPUS" (the horizon crowns the work).
Background: celestial globe diagram, great circle routes, ancient navigator's tools.
The image feels like the frontispiece of a forbidden explorer's journal.
Expansive composition. The feeling of perpetual motion. Meaning-seeking made visible.
    `.trim(),
  },
  {
    id: 'warrior',
    name: 'The Warrior',
    symbol: '♂',
    filename: '5-warrior.png',
    prompt: `
${STYLE_LOCK}

Subject: The Warrior archetype. Mars as decisive force seeking right direction.
Central image: A sword planted vertically into stone — blade facing up, pommel at base.
The Mars glyph ♂ engraved on the blade. Flames rising around the blade, but contained.
Surrounding elements: A clenched hand holding a flame that doesn't burn it.
Mountain peaks at the base. Dawn light breaking behind the mountain — first light only.
An anvil with hammer resting beside the sword. A shield with alchemical triangle: fire.
Border inscription: "VIS CONSILI EXPERS MOLE RUIT SUA" (force without wisdom falls by its own weight).
Background: star map showing Aries constellation, Mars orbital path.
The image feels like a war god's reliquary icon from a lost martial order.
Vertical energy. Contained power. The sword as question: what am I fighting for?
    `.trim(),
  },
  {
    id: 'caregiver',
    name: 'The Caregiver',
    symbol: '☽',
    filename: '6-caregiver.png',
    prompt: `
${STYLE_LOCK}

Subject: The Caregiver archetype. Moon as the force that sees others' hidden depths.
Central image: A crescent moon ☽ cradling a smaller sphere — protection, not possession.
Surrounding elements: Tidal waves drawn as engraving lines, graceful not violent, curling inward.
Two cupped hands holding water with the moon's reflection visible.
A lotus flower growing from dark water. A single candle flame, small but steady.
Thread connecting the moon to the water below — invisible bond made visible.
Border inscription: "LUNA VIDET OMNES" (the moon sees everyone).
Background: lunar phases drawn as eight sequential circles, tide chart lines.
The image feels like a talisman from a midwife's sacred kit, worn smooth with use.
Fluid curves against geometric star field. Tenderness as a structural force.
    `.trim(),
  },
  {
    id: 'mystic',
    name: 'The Mystic',
    symbol: '♅',
    filename: '7-mystic.png',
    prompt: `
${STYLE_LOCK}

Subject: The Mystic archetype. Uranus/Neptune as perception beyond the visible.
Central image: A single open eye at center — not human, more like a galaxy seen from above.
The pupil is a portal: within it, another universe of stars.
The Uranus glyph ♅ crowning the eye like a third-eye symbol.
Surrounding elements: Lightning bolt descending into the eye from above — sudden knowing.
Concentric circles like sonar rings emanating from the eye outward.
A veil half-drawn to one side, revealing the star field behind reality.
Moth wings framing the eye — creatures drawn to light they cannot resist.
Border inscription: "VIDET INVISIBILIA" (sees the invisible things).
Background: deep field space — thousands of galaxies rendered as fine engraving dots.
The image feels like a religious icon from a faith that worshipped consciousness itself.
Radial symmetry. The uncanny. The feeling of being seen by something vast.
    `.trim(),
  },
];

// ─────────────────────────────────────────────────────────
// OpenAI gpt-image-1 generation
// ─────────────────────────────────────────────────────────

async function generateImage(prompt: string): Promise<Buffer> {
  const body = JSON.stringify({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'high',
    output_format: 'png',
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/images/generations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', async () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            const json = JSON.parse(raw);
            if (json.error) {
              reject(new Error(json.error.message));
              return;
            }

            const item = json.data?.[0];

            // gpt-image-1 returns base64 by default
            if (item?.b64_json) {
              resolve(Buffer.from(item.b64_json, 'base64'));
              return;
            }

            // Fallback: url (older models)
            if (item?.url) {
              const imgBuf = await downloadUrl(item.url);
              resolve(imgBuf);
              return;
            }

            reject(new Error('No image data in response: ' + raw.slice(0, 300)));
          } catch (e) {
            reject(new Error('Parse error: ' + raw.slice(0, 300)));
          }
        });
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function downloadUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n✦ Realm of Patterns — Archetype Image Generator`);
  console.log(`Output: ${OUT_DIR}\n`);

  const args = process.argv.slice(2);
  const targets = args.length
    ? ARCHETYPES.filter(a => args.includes(a.id))
    : ARCHETYPES;

  if (!targets.length) {
    console.error('No matching archetypes. Valid ids:', ARCHETYPES.map(a => a.id).join(', '));
    process.exit(1);
  }

  for (const arch of targets) {
    const outPath = path.join(OUT_DIR, arch.filename);

    if (fs.existsSync(outPath)) {
      console.log(`  ⟳  ${arch.name} — already exists, skipping (delete to regenerate)`);
      continue;
    }

    console.log(`  ◆  Generating ${arch.name} (${arch.symbol})…`);

    try {
      const buf = await generateImage(arch.prompt);
      fs.writeFileSync(outPath, buf);
      console.log(`  ✓  Saved → ${arch.filename}  (${Math.round(buf.length / 1024)}KB)`);
    } catch (err: any) {
      console.error(`  ✗  ${arch.name} failed: ${err.message}`);
    }

    // Rate limit: 1 image per 6 seconds (10/min on tier 1)
    if (targets.indexOf(arch) < targets.length - 1) {
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  console.log('\n✦ Done. Images saved to public/assets/archetypes/');
  console.log('  Reference them in HTML as: /assets/archetypes/0-hero.png\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
