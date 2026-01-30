"""
MUMEGA Sacred Art Generator using xAI/Grok Image Models

Grok's image generation for creating sacred, personalized art
based on 8 Mu / 16D profiles.
"""

import os
import base64
import requests
from typing import Optional, List, Dict
from datetime import datetime

# xAI API Configuration
XAI_API_KEY = os.environ.get("XAI_API_KEY")
XAI_BASE_URL = "https://api.x.ai/v1"


# Mu-specific visual themes for sacred art
MU_VISUAL_THEMES = {
    'μ₁': {  # Phase/Identity
        'name': 'Phase',
        'essence': 'The golden sun rising, pure identity light',
        'symbols': ['sun', 'crown', 'golden sphere', 'radiant eye'],
        'colors': 'gold, amber, white light, solar yellow',
        'mood': 'powerful, self-assured, radiant, majestic',
        'elements': 'fire, light, solar rays'
    },
    'μ₂': {  # Existence/Structure
        'name': 'Existence',
        'essence': 'Ancient stone temple, sacred architecture',
        'symbols': ['mountain', 'cube', 'pyramid', 'foundation stone'],
        'colors': 'earth tones, granite gray, forest green, obsidian',
        'mood': 'grounded, eternal, stable, enduring',
        'elements': 'earth, stone, roots, crystals'
    },
    'μ₃': {  # Cognition
        'name': 'Cognition',
        'essence': 'Mercury streams through infinite mirrors of mind',
        'symbols': ['caduceus', 'scroll', 'feather', 'labyrinth'],
        'colors': 'silver, quicksilver, pale blue, mercury',
        'mood': 'swift, intelligent, perceptive, luminous',
        'elements': 'air, mercury, thought-forms'
    },
    'μ₄': {  # Value/Beauty
        'name': 'Value',
        'essence': 'Garden of impossible flowers at golden hour',
        'symbols': ['rose', 'shell', 'mirror', 'pearl'],
        'colors': 'rose gold, copper, soft pink, warm amber',
        'mood': 'beautiful, harmonious, precious, tender',
        'elements': 'water, flowers, precious metals'
    },
    'μ₅': {  # Expansion
        'name': 'Expansion',
        'essence': 'Cosmic doorway opening to infinite galaxies',
        'symbols': ['eagle', 'lightning bolt', 'tree of life', 'spiral'],
        'colors': 'royal purple, cosmic blue, stardust white',
        'mood': 'expansive, optimistic, vast, meaningful',
        'elements': 'ether, space, galaxies, growth'
    },
    'μ₆': {  # Action
        'name': 'Action',
        'essence': 'Lightning striking mountain peak, warrior energy',
        'symbols': ['sword', 'arrow', 'flame', 'forge'],
        'colors': 'electric red, forge orange, steel gray, crimson',
        'mood': 'powerful, decisive, transformative, fierce',
        'elements': 'fire, metal, lightning, blood'
    },
    'μ₇': {  # Relation
        'name': 'Relation',
        'essence': 'Two celestial beings connected by threads of light',
        'symbols': ['moon', 'chalice', 'heart', 'vesica piscis'],
        'colors': 'silver, pearl white, soft pink, moonlight',
        'mood': 'connected, nurturing, emotional, attuned',
        'elements': 'water, moonlight, tears, embrace'
    },
    'μ₈': {  # Field/Witness
        'name': 'Field',
        'essence': 'Vast cosmic eye witnessing all creation in stillness',
        'symbols': ['all-seeing eye', 'ocean', 'void', 'infinity'],
        'colors': 'deep indigo, void black, starlight, cosmic purple',
        'mood': 'transcendent, infinite, witnessing, still',
        'elements': 'void, cosmos, consciousness, presence'
    }
}


def generate_image(
    prompt: str,
    model: str = "grok-2-image",
    size: str = "1024x1024",
    n: int = 1
) -> List[Dict]:
    """
    Generate image using xAI/Grok API.

    Args:
        prompt: The image description
        model: Model to use (grok-2-image, grok-2-image-1212)
        size: Image size
        n: Number of images

    Returns:
        List of image data dicts with base64 or URL
    """

    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "prompt": prompt,
        "n": n,
        "response_format": "b64_json"  # Get base64 encoded image
    }

    response = requests.post(
        f"{XAI_BASE_URL}/images/generations",
        headers=headers,
        json=payload,
        timeout=120
    )

    if response.status_code != 200:
        print(f"xAI API error: {response.status_code}")
        print(response.text)
        raise Exception(f"xAI API error: {response.status_code} - {response.text}")

    data = response.json()
    return data.get("data", [])


def build_sacred_prompt(
    mu_symbol: str,
    intensity: float,
    context: str = "",
    style: str = "ethereal sacred art"
) -> str:
    """
    Build a sacred art prompt for a specific Mu dimension.
    """
    theme = MU_VISUAL_THEMES.get(mu_symbol, MU_VISUAL_THEMES['μ₁'])

    intensity_desc = (
        "blazing with overwhelming power" if intensity > 0.9 else
        "radiating strong energy" if intensity > 0.7 else
        "glowing steadily" if intensity > 0.5 else
        "subtly present" if intensity > 0.3 else
        "quietly emerging"
    )

    symbols = ", ".join(theme['symbols'][:3])

    prompt = f"""Create a stunning piece of {style}:

Theme: {theme['essence']}

The energy is {intensity_desc} at {intensity:.0%} intensity.

Visual elements: {symbols}
Color palette: {theme['colors']}
Mood: {theme['mood']}
Elemental presence: {theme['elements']}

Style requirements:
- Museum-quality sacred art
- Rich, deep colors with cosmic undertones
- Ethereal light effects and sacred geometry
- NO text, letters, or words in the image
- Mystical and transformative atmosphere
- Professional art book quality

{f'Context: This represents the {theme["name"]} dimension of {context}' if context else ''}
"""

    return prompt


class GrokSacredArtGenerator:
    """
    Generate sacred art for Mumega using Grok's image models.
    """

    def __init__(self, api_key: str = None):
        if api_key:
            global XAI_API_KEY
            XAI_API_KEY = api_key

    def generate_mu_art(
        self,
        mu_symbol: str,
        intensity: float,
        name: str = "",
        save_path: str = None
    ) -> bytes:
        """
        Generate art for a specific Mu dimension.
        """
        prompt = build_sacred_prompt(mu_symbol, intensity, context=name)

        results = generate_image(prompt)

        if results and 'b64_json' in results[0]:
            image_bytes = base64.b64decode(results[0]['b64_json'])

            if save_path:
                with open(save_path, 'wb') as f:
                    f.write(image_bytes)

            return image_bytes

        raise Exception("No image generated")

    def generate_profile_cover(
        self,
        dominant_mu: str,
        vector: List[float],
        name: str
    ) -> bytes:
        """
        Generate a cover image for someone's 8 Mu / 16D profile.
        """
        theme = MU_VISUAL_THEMES.get(dominant_mu, MU_VISUAL_THEMES['μ₁'])

        # Find secondary themes
        mu_symbols = ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']
        sorted_idx = sorted(range(len(vector)), key=lambda i: vector[i], reverse=True)
        secondary = MU_VISUAL_THEMES.get(mu_symbols[sorted_idx[1]], {})

        prompt = f"""Create a breathtaking cosmic portrait representing a soul's unique essence:

Primary energy: {theme['essence']}
Secondary influence: {secondary.get('essence', '')}

This is the cosmic signature of {name} — a visual representation of their
fundamental frequencies. The dominant energy is {theme['name']} ({vector[sorted_idx[0]]:.0%}),
blending with {secondary.get('name', 'Unknown')} ({vector[sorted_idx[1]]:.0%}).

Color palette: Primarily {theme['colors']}, with hints of {secondary.get('colors', '')}

Include subtle sacred geometry (flower of life, metatron's cube) woven into the background.
The overall feeling should be one of profound recognition — as if the viewer is seeing
their true cosmic self for the first time.

Style: Museum-quality ethereal sacred art
NO text or letters
Mystical, transformative, deeply personal
"""

        results = generate_image(prompt)

        if results and 'b64_json' in results[0]:
            return base64.b64decode(results[0]['b64_json'])

        raise Exception("No cover image generated")

    def generate_all_profile_images(
        self,
        name: str,
        vector: List[float],
        save_dir: str = None
    ) -> Dict[str, bytes]:
        """
        Generate all images for a complete profile.
        """
        import time

        images = {}
        mu_symbols = ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']

        # Sort by intensity
        sorted_idx = sorted(range(len(vector)), key=lambda i: vector[i], reverse=True)
        dominant_mu = mu_symbols[sorted_idx[0]]

        print(f"Generating cover image for {name}...")
        images['cover'] = self.generate_profile_cover(dominant_mu, vector, name)

        if save_dir:
            os.makedirs(save_dir, exist_ok=True)
            with open(os.path.join(save_dir, "cover.png"), 'wb') as f:
                f.write(images['cover'])
            print(f"  Saved: cover.png")

        # Top 3 dimensions
        for rank, idx in enumerate(sorted_idx[:3], 1):
            mu = mu_symbols[idx]
            intensity = vector[idx]
            print(f"Generating {mu} ({MU_VISUAL_THEMES[mu]['name']}) image...")
            images[f'dim_{rank}_{mu}'] = self.generate_mu_art(mu, intensity, name)

            if save_dir:
                filename = f"dim_{rank}_{mu.replace('μ', 'mu')}.png"
                with open(os.path.join(save_dir, filename), 'wb') as f:
                    f.write(images[f'dim_{rank}_{mu}'])
                print(f"  Saved: {filename}")

            time.sleep(2)  # Rate limiting

        return images


# ============ TEST ============

def test_generation():
    """Test image generation."""
    print("=" * 60)
    print("MUMEGA SACRED ART GENERATION (xAI/Grok)")
    print("=" * 60)

    generator = GrokSacredArtGenerator()

    # Hadi's 8 Mu vector
    hadi_vector = [0.549, 0.411, 0.421, 0.705, 0.327, 0.760, 1.000, 0.692]

    # Test single Mu image
    print("\nGenerating μ₇ (Relation) image for Hadi...")
    try:
        image_bytes = generator.generate_mu_art(
            'μ₇',
            1.0,
            name="Hadi",
            save_path="/sessions/affectionate-wizardly-einstein/mnt/Hadi/AI-Family/mumega/art/test_mu7_hadi.png"
        )
        print(f"Generated: {len(image_bytes)} bytes")
        print("Saved to: test_mu7_hadi.png")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_generation()
