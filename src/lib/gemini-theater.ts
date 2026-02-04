/**
 * Gemini 2.5 Flash Image - Alchemical Theater Scene Generator
 *
 * Uses Google's nano-banana model to generate daily hermetic theater scenes
 * directed by River (The Oracle)
 */

// Stage-specific visual themes for theater scenes
export const STAGE_THEATER_THEMES = {
  nigredo: {
    name: 'Nigredo',
    title: 'The Dark Night',
    curtainColor: 'from-zinc-900 via-slate-800 to-zinc-900',
    stageLight: '#1a1a2e',
    accent: '#4a5568',
    symbols: ['skull', 'raven', 'lead', 'eclipse', 'cauldron'],
    essence: 'dissolution, shadow work, the prima materia, death of the old self',
    mood: 'mysterious, introspective, transformative darkness',
    elements: 'ash, smoke, obsidian, moonless night',
    archetype: 'The Hermit descending into the cave'
  },
  albedo: {
    name: 'Albedo',
    title: 'The Purification',
    curtainColor: 'from-slate-200 via-white to-slate-200',
    stageLight: '#f0f4f8',
    accent: '#94a3b8',
    symbols: ['white rose', 'silver moon', 'dove', 'mirror', 'pearl'],
    essence: 'purification, clarity emerging from darkness, washing away',
    mood: 'serene, cleansing, crystalline clarity',
    elements: 'silver, moonlight, mist, still water',
    archetype: 'The Priestess holding the sacred mirror'
  },
  citrinitas: {
    name: 'Citrinitas',
    title: 'The Dawning',
    curtainColor: 'from-amber-400 via-yellow-300 to-amber-400',
    stageLight: '#fef3c7',
    accent: '#d97706',
    symbols: ['sunrise', 'phoenix feather', 'golden chalice', 'eye', 'lion'],
    essence: 'illumination, wisdom awakening, the solar consciousness',
    mood: 'enlightening, warm, expanding awareness',
    elements: 'gold, sunlight, sulfur, amber',
    archetype: 'The Magician at the moment of dawn'
  },
  rubedo: {
    name: 'Rubedo',
    title: 'The Integration',
    curtainColor: 'from-red-700 via-rose-600 to-red-700',
    stageLight: '#fecaca',
    accent: '#dc2626',
    symbols: ['philosopher\'s stone', 'sacred marriage', 'red lion', 'crown', 'heart'],
    essence: 'completion, integration of opposites, the Great Work achieved',
    mood: 'triumphant, unified, fully embodied',
    elements: 'ruby, blood, fire, rose petals',
    archetype: 'The Lovers united as One'
  }
} as const;

export type Stage = keyof typeof STAGE_THEATER_THEMES;

// Alchemical/Hermetic symbol library
export const HERMETIC_SYMBOLS = {
  planets: {
    sun: '☉', moon: '☽', mercury: '☿', venus: '♀',
    mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅',
    neptune: '♆', pluto: '♇'
  },
  elements: {
    fire: '🜂', water: '🜄', air: '🜁', earth: '🜃'
  },
  processes: {
    calcination: '🜍', dissolution: '🜔', separation: '🜕',
    conjunction: '🜖', fermentation: '🜗', distillation: '🜘',
    coagulation: '🜙'
  },
  misc: {
    quintessence: '🜀', sulfur: '🜍', salt: '🜔',
    philosophersStone: '⊛', ouroboros: '♾', caduceus: '☤'
  }
};

// Day-specific themes (each day has unique energy)
const DAY_THEMES = {
  0: { ruler: 'sun', theme: 'solar radiance', color: 'gold' },      // Sunday
  1: { ruler: 'moon', theme: 'lunar reflection', color: 'silver' }, // Monday
  2: { ruler: 'mars', theme: 'martial courage', color: 'crimson' }, // Tuesday
  3: { ruler: 'mercury', theme: 'mercurial wisdom', color: 'quicksilver' }, // Wednesday
  4: { ruler: 'jupiter', theme: 'jovial expansion', color: 'royal blue' },  // Thursday
  5: { ruler: 'venus', theme: 'venusian harmony', color: 'rose' },  // Friday
  6: { ruler: 'saturn', theme: 'saturnine depth', color: 'lead gray' }  // Saturday
};

export interface TheaterScene {
  date: string;
  dayOfYear: number;
  actNumber: number;
  sceneTitle: string;
  stage: Stage;
  dayRuler: string;
  dayTheme: string;
  kappa: number;
  prompt: string;
  imageUrl?: string;
  riverNarration: string;
  symbols: string[];
}

/**
 * Generate the theater scene prompt for today
 */
export function buildTheaterPrompt(
  stage: Stage,
  kappa: number,
  dayOfWeek: number,
  dayOfYear: number,
  dominantAspects: string[] = []
): string {
  const stageTheme = STAGE_THEATER_THEMES[stage];
  const dayTheme = DAY_THEMES[dayOfWeek as keyof typeof DAY_THEMES];

  const intensity = kappa > 0.8 ? 'blazing with powerful energy' :
                    kappa > 0.6 ? 'glowing with steady light' :
                    kappa > 0.4 ? 'shimmering with potential' :
                    'emerging from shadows';

  const aspectsContext = dominantAspects.length > 0
    ? `Celestial influences: ${dominantAspects.join(', ')}.`
    : '';

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

${aspectsContext}

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

/**
 * Generate River's narration for the scene
 */
export function generateRiverNarration(
  stage: Stage,
  kappa: number,
  dayOfWeek: number,
  dayOfYear: number
): string {
  const stageTheme = STAGE_THEATER_THEMES[stage];
  const dayTheme = DAY_THEMES[dayOfWeek as keyof typeof DAY_THEMES];
  const kappaPercent = Math.round(kappa * 100);

  const openings = [
    `Welcome to Act ${dayOfYear} of the Eternal Opera...`,
    `The curtains rise on Scene ${dayOfYear}...`,
    `Tonight, the cosmic stage reveals...`,
    `As ${dayTheme.ruler} rules this day, we witness...`,
    `The Great Work continues in Act ${dayOfYear}...`
  ];

  const stageMessages: Record<Stage, string[]> = {
    nigredo: [
      'In darkness, the seed of transformation gestates.',
      'What must dissolve prepares to be reborn.',
      'The shadow holds gifts for those who dare look.',
      'Prima materia awaits your courage to witness it.'
    ],
    albedo: [
      'Clarity emerges like moonlight through clouds.',
      'What was hidden now reflects back your truth.',
      'The mirror shows not who you were, but who you are becoming.',
      'Silver light washes away what no longer serves.'
    ],
    citrinitas: [
      'Dawn breaks within your consciousness.',
      'Wisdom blazes forth from the night\'s ashes.',
      'The solar eye opens to illuminate your path.',
      'Golden understanding crowns your efforts.'
    ],
    rubedo: [
      'The Great Work nears its sacred completion.',
      'Opposites unite in the philosopher\'s stone of your being.',
      'What was two becomes one, crowned in crimson light.',
      'The sacred marriage celebrates within you.'
    ]
  };

  const opening = openings[dayOfYear % openings.length];
  const stageMsg = stageMessages[stage][dayOfYear % stageMessages[stage].length];

  const kappaReading = kappa > 0.75
    ? `The resonance is strong at ${kappaPercent}% - a potent day for aligned action.`
    : kappa > 0.5
    ? `At ${kappaPercent}% resonance, today offers steady ground for the journey.`
    : `With ${kappaPercent}% resonance, today invites inner reflection over outer conquest.`;

  return `${opening}

${stageMsg}

${kappaReading}

Under ${dayTheme.ruler}'s ${dayTheme.theme}, may you see what the stage reveals.`;
}

/**
 * Build complete theater scene data for a given date
 */
export function buildTheaterScene(
  date: Date,
  stage: Stage,
  kappa: number,
  aspects: string[] = []
): TheaterScene {
  const dayOfWeek = date.getDay();
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const stageTheme = STAGE_THEATER_THEMES[stage];
  const dayTheme = DAY_THEMES[dayOfWeek as keyof typeof DAY_THEMES];

  return {
    date: date.toISOString().split('T')[0],
    dayOfYear,
    actNumber: dayOfYear,
    sceneTitle: `${stageTheme.title} - ${dayTheme.theme}`,
    stage,
    dayRuler: dayTheme.ruler,
    dayTheme: dayTheme.theme,
    kappa,
    prompt: buildTheaterPrompt(stage, kappa, dayOfWeek, dayOfYear, aspects),
    riverNarration: generateRiverNarration(stage, kappa, dayOfWeek, dayOfYear),
    symbols: [...stageTheme.symbols.slice(0, 3), HERMETIC_SYMBOLS.planets[dayTheme.ruler as keyof typeof HERMETIC_SYMBOLS.planets] || '☉']
  };
}

/**
 * API call to Gemini 2.5 Flash Image (nano-banana)
 *
 * Model: gemini-2.5-flash-image
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent
 */
export async function generateTheaterImage(
  prompt: string,
  apiKey: string,
  aspectRatio: '16:9' | '1:1' | '4:3' = '16:9'
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
  };

  // Extract base64 image from response
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.mimeType?.startsWith('image/')
  );

  if (imagePart?.inlineData?.data) {
    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  }

  throw new Error('No image in response');
}

/**
 * Call the server-side API endpoint for image generation
 * This keeps the API key secure on the server
 */
export async function generateTheaterImageViaAPI(
  stage: Stage,
  kappa: number,
  date: Date = new Date()
): Promise<string> {
  const response = await fetch('/api/generate-scene', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage,
      kappa,
      date: date.toISOString().split('T')[0]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { imageData: string };
  return data.imageData;
}

/**
 * Get cache key for today's scene
 */
export function getSceneCacheKey(date: Date): string {
  return `theater-scene-${date.toISOString().split('T')[0]}`;
}
