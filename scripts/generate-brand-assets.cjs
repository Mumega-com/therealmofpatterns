#!/usr/bin/env node
/**
 * Generate brand assets using OpenAI DALL-E
 * Usage: OPENAI_API_KEY=sk-xxx node scripts/generate-brand-assets.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable required');
  console.error('Usage: OPENAI_API_KEY=sk-xxx node scripts/generate-brand-assets.js');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, '../public/assets/brand');

const ASSETS = [
  {
    name: 'logo',
    filename: 'logo.png',
    size: '1024x1024',
    prompt: `A minimalist sacred geometry logo mark for "The Realm of Patterns".
      Design: An elegant diamond shape with nested concentric circles and a radiant sun/star at center.
      Style: Crisp golden/amber metallic lines on pure black background.
      Aesthetic: Mystical yet modern, alchemical symbolism, mathematical precision.
      Clean vector-like quality, perfectly symmetrical, no text, suitable as favicon/brand mark.
      High contrast gold (#d4a854) on black (#0a0908).`
  },
  {
    name: 'hero-cosmic',
    filename: 'hero-cosmic.png',
    size: '1792x1024',
    prompt: `A breathtaking cosmic theater scene for a mystical astrology website.
      Scene: Deep space vista with swirling golden nebulae and sacred geometry patterns.
      Elements: Subtle planetary symbols floating in space, concentric circles, diamond shapes.
      Colors: Rich blacks, deep purples, golden amber highlights, subtle blue accents.
      Mood: Infinite depth, contemplative mystery, cosmic grandeur.
      Style: Cinematic, atmospheric, 4K quality, no text or UI elements.`
  },
  {
    name: 'pattern-bg',
    filename: 'pattern-bg.png',
    size: '1792x1024',
    prompt: `Abstract sacred geometry pattern for a mystical website background.
      Design: Interconnected golden geometric lines forming mandala-like patterns.
      Style: Subtle, elegant, tileable pattern with varying opacity.
      Colors: Golden amber lines (#d4a854) on very dark background (#0a0908).
      Elements: Circles, diamonds, connecting lines, sacred proportions.
      Mood: Mathematical beauty, cosmic order, subtle mysticism.
      Low contrast, suitable as page background, no focal point.`
  },
  {
    name: 'witness-figure',
    filename: 'witness.png',
    size: '1024x1024',
    prompt: `A contemplative silhouette witnessing cosmic patterns.
      Scene: Single figure in meditation pose, viewed from behind.
      Background: Swirling cosmic energy, golden light streams, sacred geometry.
      Style: Minimalist, symbolic, no facial details visible.
      Colors: Figure in deep shadow, surrounded by golden and amber light.
      Mood: Peaceful observation, cosmic connection, inner stillness.
      Artistic, ethereal, suitable for "Witness" tier imagery.`
  },
  {
    name: 'circle-group',
    filename: 'circle.png',
    size: '1792x1024',
    prompt: `Aerial view of figures forming a sacred circle, connected by light.
      Scene: 5-7 silhouetted figures standing in a perfect circle formation.
      Connections: Golden light threads connecting each person, forming mandala.
      Background: Dark gradient, subtle cosmic elements.
      Style: Abstract, symbolic, geometric precision.
      Colors: Dark silhouettes, golden connections (#d4a854), subtle glow.
      Mood: Community, shared consciousness, collective witnessing.
      Suitable for "Circle" team tier imagery.`
  }
];

async function generateImage(asset) {
  console.log(`\n🎨 Generating: ${asset.name}...`);

  const requestBody = JSON.stringify({
    model: 'dall-e-3',
    prompt: asset.prompt,
    n: 1,
    size: asset.size,
    quality: 'hd',
    response_format: 'b64_json'
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message));
            return;
          }
          resolve(json.data[0]);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

async function saveImage(asset, imageData) {
  const filePath = path.join(ASSETS_DIR, asset.filename);
  const buffer = Buffer.from(imageData.b64_json, 'base64');
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Saved: ${filePath}`);
  if (imageData.revised_prompt) {
    console.log(`   Revised prompt: ${imageData.revised_prompt.substring(0, 100)}...`);
  }
}

async function main() {
  console.log('🚀 Brand Asset Generator');
  console.log('========================\n');

  // Create assets directory
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log(`📁 Created: ${ASSETS_DIR}`);
  }

  const results = [];

  for (const asset of ASSETS) {
    try {
      const imageData = await generateImage(asset);
      await saveImage(asset, imageData);
      results.push({ name: asset.name, success: true });
    } catch (error) {
      console.error(`❌ Failed: ${asset.name} - ${error.message}`);
      results.push({ name: asset.name, success: false, error: error.message });
    }

    // Rate limit pause
    if (ASSETS.indexOf(asset) < ASSETS.length - 1) {
      console.log('   ⏳ Waiting 2s for rate limit...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n========================');
  console.log('📊 Results:');
  results.forEach(r => {
    console.log(`   ${r.success ? '✅' : '❌'} ${r.name}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✨ Generated ${successCount}/${ASSETS.length} assets`);
  console.log(`📁 Assets saved to: ${ASSETS_DIR}`);
}

main().catch(console.error);
