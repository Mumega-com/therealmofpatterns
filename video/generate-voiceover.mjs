/**
 * Generate homepage voiceover via ElevenLabs API.
 * Run: node generate-voiceover.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { readFileSync } from 'fs';

const KEY = process.env.ELEVENLABS_API_KEY
  || readFileSync('../.env', 'utf8').match(/ELEVENLABS_API_KEY=(.+)/)?.[1]?.trim();

if (!KEY) {
  console.error('No ELEVENLABS_API_KEY found');
  process.exit(1);
}

// Charlotte — warm, calm, feminine. Good for mystical/reflective content.
const VOICE_ID = 'XB0fDUnXU5powFXDhCwa';

const SCRIPT = `
A daily practice. With your own narrator.

Sol reads your natal pattern — and holds it alongside how you move today.

Five dimensions. One minute. What is actually moving in you.

Not predictions. Real presence.

The field remembers you.

Begin the practice. Free.
`.trim();

async function generate() {
  console.log('Calling ElevenLabs...');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: SCRIPT,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.72,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('ElevenLabs error:', err);
    process.exit(1);
  }

  const buffer = await res.arrayBuffer();
  mkdirSync('public', { recursive: true });
  writeFileSync('public/voiceover.mp3', Buffer.from(buffer));
  console.log('✓ Saved public/voiceover.mp3 (' + Math.round(buffer.byteLength / 1024) + ' KB)');
}

generate();
