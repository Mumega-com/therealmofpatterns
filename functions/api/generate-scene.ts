/**
 * Cloudflare Pages Function: Generate Theater Scene
 *
 * POST /api/generate-scene
 * Body: { stage: string, kappa: number, date: string }
 *
 * Returns: { imageData: string } (base64 data URL)
 */

interface Env {
  GEMINI_API_KEY: string;
  GEMINI_API_KEY_2?: string;
  GEMINI_API_KEY_3?: string;
  GEMINI_API_KEY_4?: string;
  GEMINI_API_KEY_5?: string;
}

interface RequestBody {
  stage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';
  kappa: number;
  date: string;
}

// Stage theater themes
const STAGE_THEATER_THEMES: Record<string, any> = {
  nigredo: {
    name: 'Nigredo',
    title: 'The Dark Night',
    symbols: ['skull', 'raven', 'lead', 'eclipse', 'cauldron'],
    essence: 'dissolution, shadow work, the prima materia, death of the old self',
    mood: 'mysterious, introspective, transformative darkness',
    elements: 'ash, smoke, obsidian, moonless night',
    archetype: 'The Hermit descending into the cave',
    stageLight: '#1a1a2e'
  },
  albedo: {
    name: 'Albedo',
    title: 'The Purification',
    symbols: ['white rose', 'silver moon', 'dove', 'mirror', 'pearl'],
    essence: 'purification, clarity emerging from darkness, washing away',
    mood: 'serene, cleansing, crystalline clarity',
    elements: 'silver, moonlight, mist, still water',
    archetype: 'The Priestess holding the sacred mirror',
    stageLight: '#f0f4f8'
  },
  citrinitas: {
    name: 'Citrinitas',
    title: 'The Dawning',
    symbols: ['sunrise', 'phoenix feather', 'golden chalice', 'eye', 'lion'],
    essence: 'illumination, wisdom awakening, the solar consciousness',
    mood: 'enlightening, warm, expanding awareness',
    elements: 'gold, sunlight, sulfur, amber',
    archetype: 'The Magician at the moment of dawn',
    stageLight: '#fef3c7'
  },
  rubedo: {
    name: 'Rubedo',
    title: 'The Integration',
    symbols: ['philosopher\'s stone', 'sacred marriage', 'red lion', 'crown', 'heart'],
    essence: 'completion, integration of opposites, the Great Work achieved',
    mood: 'triumphant, unified, fully embodied',
    elements: 'ruby, blood, fire, rose petals',
    archetype: 'The Lovers united as One',
    stageLight: '#fecaca'
  }
};

// Day themes based on planetary rulers
const DAY_THEMES: Record<number, any> = {
  0: { ruler: 'sun', theme: 'solar radiance', color: 'gold' },
  1: { ruler: 'moon', theme: 'lunar reflection', color: 'silver' },
  2: { ruler: 'mars', theme: 'martial courage', color: 'crimson' },
  3: { ruler: 'mercury', theme: 'mercurial wisdom', color: 'quicksilver' },
  4: { ruler: 'jupiter', theme: 'jovial expansion', color: 'royal blue' },
  5: { ruler: 'venus', theme: 'venusian harmony', color: 'rose' },
  6: { ruler: 'saturn', theme: 'saturnine depth', color: 'lead gray' }
};

function buildTheaterPrompt(
  stage: string,
  kappa: number,
  dayOfWeek: number,
  dayOfYear: number
): string {
  const stageTheme = STAGE_THEATER_THEMES[stage] || STAGE_THEATER_THEMES.citrinitas;
  const dayTheme = DAY_THEMES[dayOfWeek] || DAY_THEMES[0];

  const intensity = kappa > 0.8 ? 'blazing with powerful energy' :
                    kappa > 0.6 ? 'glowing with steady light' :
                    kappa > 0.4 ? 'shimmering with potential' :
                    'emerging from shadows';

  return `Create a stunning hermetic theater scene for Act ${dayOfYear}, "${stageTheme.title}":

SETTING: A grand alchemical theater stage with deep red velvet curtains drawn open.
The stage is illuminated in ${stageTheme.stageLight} tones.

CENTRAL IMAGE: ${stageTheme.archetype}
The figure is ${intensity}, embodying the ${stage} phase of the Great Work.

VISUAL ELEMENTS:
- Alchemical symbols floating subtly: ${stageTheme.symbols.slice(0, 3).join(', ')}
- ${dayTheme.theme} influences the lighting (${dayTheme.color} undertones)
- Sacred geometry patterns in the background (flower of life, metatron's cube)
- The essence is: ${stageTheme.essence}

MOOD: ${stageTheme.mood}
ELEMENTAL PRESENCE: ${stageTheme.elements}

STYLE REQUIREMENTS:
- Museum-quality hermetic sacred art
- Renaissance alchemical manuscript aesthetic
- Rich, deep colors with mystical undertones
- Theatrical lighting with dramatic shadows
- NO text, letters, words, or signatures
- Aspect ratio: 16:9 (theatrical widescreen)
- The scene should feel like a living tarot card on a stage

This is Scene ${dayOfYear} of the Cosmic Opera - a daily revelation of the soul's journey.`;
}

function getApiKeys(env: Env): string[] {
  return [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY_3,
    env.GEMINI_API_KEY_4,
    env.GEMINI_API_KEY_5,
  ].filter((key): key is string => Boolean(key));
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body: RequestBody = await request.json();
    const { stage, kappa, date } = body;

    // Validate input
    if (!stage || !['nigredo', 'albedo', 'citrinitas', 'rubedo'].includes(stage)) {
      return new Response(JSON.stringify({ error: 'Invalid stage' }), {
        status: 400,
        headers,
      });
    }

    // Get API keys and select one (round-robin based on day)
    const apiKeys = getApiKeys(env);
    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No API keys configured' }), {
        status: 500,
        headers,
      });
    }

    const dateObj = new Date(date);
    const startOfYear = new Date(dateObj.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((dateObj.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const keyIndex = dayOfYear % apiKeys.length;
    const apiKey = apiKeys[keyIndex];

    // Build prompt
    const dayOfWeek = dateObj.getDay();
    const prompt = buildTheaterPrompt(stage, kappa, dayOfWeek, dayOfYear);

    // Call Gemini 2.5 Flash Image API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}` }), {
        status: 500,
        headers,
      });
    }

    const data = await response.json();

    // Extract image from response
    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart?.inlineData?.data) {
      return new Response(JSON.stringify({ error: 'No image in response' }), {
        status: 500,
        headers,
      });
    }

    const imageData = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

    return new Response(JSON.stringify({ imageData, cached: false }), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error generating scene:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
