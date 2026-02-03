/**
 * Generate brand assets using OpenAI DALL-E
 * POST /api/generate-assets
 */

interface Env {
  OPENAI_API_KEY: string;
  ADMIN_KEY: string;
}

interface AssetRequest {
  type: 'logo' | 'hero' | 'pattern' | 'witness' | 'circle';
  admin_key: string;
}

const PROMPTS: Record<string, string> = {
  logo: `A minimalist sacred geometry logo for "The Realm of Patterns".
    Design: An elegant diamond shape containing nested circles and a central sun symbol.
    Style: Gold metallic lines on pure black background, mystical but modern.
    Clean vector-style, no text, symmetrical, timeless alchemical aesthetic.
    High contrast, suitable for web favicon and brand mark.`,

  hero: `A mystical cosmic scene representing the alchemical theater.
    Style: Dark atmospheric background with golden celestial elements.
    Features: Swirling nebulae, geometric sacred patterns, planetary symbols floating.
    Colors: Deep blacks, rich golds, subtle purples and deep blues.
    Mood: Mysterious, contemplative, infinite depth.
    4K quality, cinematic lighting, no text.`,

  pattern: `Abstract sacred geometry pattern representing personal energy vectors.
    Style: Interconnected golden lines forming an 8-pointed star mandala.
    Background: Dark gradient from black to deep purple.
    Elements: Subtle planetary symbols at vertices, flowing energy lines.
    Aesthetic: Mathematical precision meets mystical beauty.
    Clean, modern, suitable for UI background.`,

  witness: `A contemplative figure silhouetted against cosmic infinity.
    Style: Minimalist, ethereal, mystical.
    Scene: Person meditating while cosmic patterns flow around them.
    Colors: Gold and amber highlights on deep black background.
    Mood: Peaceful observation, cosmic connection, witnessing the patterns.
    Artistic, no face details, symbolic representation.`,

  circle: `A group of silhouetted figures forming a circle, viewed from above.
    Style: Sacred geometry meets modern minimalism.
    Scene: Figures connected by golden light threads forming a mandala pattern.
    Colors: Gold connections on dark background, subtle glow effects.
    Mood: Community, shared awareness, collective witnessing.
    Abstract, symbolic, no detailed faces.`,
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as AssetRequest;
    const { type, admin_key } = body;

    // Verify admin key
    if (admin_key !== env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = PROMPTS[type];
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Invalid asset type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating ${type} asset...`);

    // Call OpenAI DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: type === 'logo' ? '1024x1024' : '1792x1024',
        quality: 'hd',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      return new Response(JSON.stringify({ error: 'Image generation failed', details: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json() as { data: Array<{ b64_json: string; revised_prompt?: string }> };
    const imageData = data.data[0].b64_json;
    const revisedPrompt = data.data[0].revised_prompt;

    return new Response(JSON.stringify({
      success: true,
      type,
      imageData: `data:image/png;base64,${imageData}`,
      revisedPrompt,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Asset generation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate asset' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
