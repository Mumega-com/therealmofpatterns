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
  GEMINI_API_KEY_6?: string;
  GEMINI_API_KEY_7?: string;
  GEMINI_API_KEY_8?: string;
  GEMINI_API_KEY_9?: string;
  GEMINI_API_KEY_10?: string;
  GEMINI_API_KEY_11?: string;
  OPENAI_API_KEY?: string;
  GROK_API_KEY?: string;
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
    env.GEMINI_API_KEY_6,
    env.GEMINI_API_KEY_7,
    env.GEMINI_API_KEY_8,
    env.GEMINI_API_KEY_9,
    env.GEMINI_API_KEY_10,
    env.GEMINI_API_KEY_11,
  ].filter((key): key is string => Boolean(key));
}

// Smart key rotation with retry on rate limit
async function callGeminiWithRotation(
  prompt: string,
  apiKeys: string[],
  startIndex: number
): Promise<{ success: boolean; data?: any; error?: string; keyUsed?: number }> {
  const maxRetries = Math.min(apiKeys.length, 5); // Try up to 5 different keys

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyIndex = (startIndex + attempt) % apiKeys.length;
    const apiKey = apiKeys[keyIndex];

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            }
          })
        }
      );

      if (response.status === 429) {
        // Rate limited, try next key
        console.log(`Key ${keyIndex + 1} rate limited, trying next...`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error with key ${keyIndex + 1}:`, response.status, errorText);
        // For non-429 errors, still try next key
        continue;
      }

      const data = await response.json();
      return { success: true, data, keyUsed: keyIndex + 1 };
    } catch (error) {
      console.error(`Error with key ${keyIndex + 1}:`, error);
      continue;
    }
  }

  return { success: false, error: 'All Gemini API keys exhausted or rate limited' };
}

// OpenAI DALL-E fallback
async function callOpenAIDalle(
  prompt: string,
  apiKey: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1792x1024', // 16:9 aspect ratio
        quality: 'standard', // Use standard for cost savings
        response_format: 'b64_json'
      })
    });

    if (response.status === 429) {
      return { success: false, error: 'OpenAI rate limited' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    if (data.data?.[0]?.b64_json) {
      return { success: true, data: `data:image/png;base64,${data.data[0].b64_json}` };
    }

    return { success: false, error: 'No image in OpenAI response' };
  } catch (error) {
    console.error('OpenAI error:', error);
    return { success: false, error: 'OpenAI request failed' };
  }
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

    // Use hour + minute for more granular rotation within a day
    const hourMinute = dateObj.getHours() * 60 + dateObj.getMinutes();
    const startKeyIndex = (dayOfYear * 24 + Math.floor(hourMinute / 60)) % apiKeys.length;

    // Build prompt
    const dayOfWeek = dateObj.getDay();
    const prompt = buildTheaterPrompt(stage, kappa, dayOfWeek, dayOfYear);

    // Try Gemini first with smart key rotation
    let imageData: string | null = null;
    let provider = 'gemini';

    const geminiResult = await callGeminiWithRotation(prompt, apiKeys, startKeyIndex);

    if (geminiResult.success) {
      // Extract image from Gemini response - handle multiple formats
      if (geminiResult.data?.images?.[0]?.image?.imageBytes) {
        imageData = `data:image/png;base64,${geminiResult.data.images[0].image.imageBytes}`;
      } else if (geminiResult.data?.candidates?.[0]?.content?.parts) {
        const imagePart = geminiResult.data.candidates[0].content.parts.find(
          (part: any) => part.inlineData?.mimeType?.startsWith('image/')
        );
        if (imagePart?.inlineData?.data) {
          imageData = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
      } else if (geminiResult.data?.generatedImages?.[0]?.image?.imageBytes) {
        imageData = `data:image/png;base64,${geminiResult.data.generatedImages[0].image.imageBytes}`;
      }
    }

    // Fallback to OpenAI DALL-E if Gemini failed
    if (!imageData && env.OPENAI_API_KEY) {
      console.log('Gemini failed, trying OpenAI DALL-E...');
      const openaiResult = await callOpenAIDalle(prompt, env.OPENAI_API_KEY);
      if (openaiResult.success && openaiResult.data) {
        imageData = openaiResult.data;
        provider = 'openai';
      }
    }

    if (!imageData) {
      return new Response(JSON.stringify({
        error: 'All providers failed to generate image',
        geminiKeys: apiKeys.length,
        geminiError: geminiResult.error,
        openaiAvailable: !!env.OPENAI_API_KEY
      }), {
        status: 503,
        headers,
      });
    }

    return new Response(JSON.stringify({
      imageData,
      cached: false,
      provider,
      keyUsed: provider === 'gemini' ? geminiResult.keyUsed : undefined,
      keysAvailable: apiKeys.length
    }), {
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
