"""
MUMEGA Image Manager: Unified Sacred Art System

Manages image generation across multiple sources:
1. xAI/Grok (primary for AI-generated sacred art)
2. Museum APIs (public domain classical art)
3. Local cache (for offline/fallback)

This module provides a unified interface regardless of source.
"""

import os
import base64
import hashlib
from typing import Optional, List, Dict, Tuple
from datetime import datetime
import json

# Mu visual themes (shared across generators)
MU_VISUAL_THEMES = {
    'μ₁': {
        'name': 'Phase',
        'essence': 'The golden sun rising, pure identity light',
        'symbols': ['sun', 'crown', 'golden sphere', 'radiant eye'],
        'colors': ['#FFD700', '#FFA500', '#FFFFFF', '#FFE4B5'],
        'mood': 'powerful, self-assured, radiant, majestic',
        'elements': 'fire, light, solar rays'
    },
    'μ₂': {
        'name': 'Existence',
        'essence': 'Ancient stone temple, sacred architecture',
        'symbols': ['mountain', 'cube', 'pyramid', 'foundation stone'],
        'colors': ['#228B22', '#808080', '#2F4F4F', '#3D3D3D'],
        'mood': 'grounded, eternal, stable, enduring',
        'elements': 'earth, stone, roots, crystals'
    },
    'μ₃': {
        'name': 'Cognition',
        'essence': 'Mercury streams through infinite mirrors of mind',
        'symbols': ['caduceus', 'scroll', 'feather', 'labyrinth'],
        'colors': ['#C0C0C0', '#87CEEB', '#E6E6FA', '#B0C4DE'],
        'mood': 'swift, intelligent, perceptive, luminous',
        'elements': 'air, mercury, thought-forms'
    },
    'μ₄': {
        'name': 'Value',
        'essence': 'Garden of impossible flowers at golden hour',
        'symbols': ['rose', 'shell', 'mirror', 'pearl'],
        'colors': ['#FFB6C1', '#B87333', '#FFC0CB', '#FFE4C4'],
        'mood': 'beautiful, harmonious, precious, tender',
        'elements': 'water, flowers, precious metals'
    },
    'μ₅': {
        'name': 'Expansion',
        'essence': 'Cosmic doorway opening to infinite galaxies',
        'symbols': ['eagle', 'lightning bolt', 'tree of life', 'spiral'],
        'colors': ['#9370DB', '#191970', '#FFFFFF', '#4B0082'],
        'mood': 'expansive, optimistic, vast, meaningful',
        'elements': 'ether, space, galaxies, growth'
    },
    'μ₆': {
        'name': 'Action',
        'essence': 'Lightning striking mountain peak, warrior energy',
        'symbols': ['sword', 'arrow', 'flame', 'forge'],
        'colors': ['#FF4500', '#DC143C', '#808080', '#B22222'],
        'mood': 'powerful, decisive, transformative, fierce',
        'elements': 'fire, metal, lightning, blood'
    },
    'μ₇': {
        'name': 'Relation',
        'essence': 'Two celestial beings connected by threads of light',
        'symbols': ['moon', 'chalice', 'heart', 'vesica piscis'],
        'colors': ['#C0C0C0', '#FFFAFA', '#FF69B4', '#E6E6FA'],
        'mood': 'connected, nurturing, emotional, attuned',
        'elements': 'water, moonlight, tears, embrace'
    },
    'μ₈': {
        'name': 'Field',
        'essence': 'Vast cosmic eye witnessing all creation in stillness',
        'symbols': ['all-seeing eye', 'ocean', 'void', 'infinity'],
        'colors': ['#4B0082', '#000000', '#FFFFFF', '#483D8B'],
        'mood': 'transcendent, infinite, witnessing, still',
        'elements': 'void, cosmos, consciousness, presence'
    }
}


class ImageCache:
    """Local cache for generated images."""

    def __init__(self, cache_dir: str = None):
        self.cache_dir = cache_dir or os.path.join(
            os.path.dirname(__file__), 'cache'
        )
        os.makedirs(self.cache_dir, exist_ok=True)
        self.manifest_path = os.path.join(self.cache_dir, 'manifest.json')
        self.manifest = self._load_manifest()

    def _load_manifest(self) -> Dict:
        if os.path.exists(self.manifest_path):
            with open(self.manifest_path, 'r') as f:
                return json.load(f)
        return {}

    def _save_manifest(self):
        with open(self.manifest_path, 'w') as f:
            json.dump(self.manifest, f, indent=2)

    def get_cache_key(self, mu: str, context: str = "") -> str:
        raw = f"{mu}:{context}"
        return hashlib.md5(raw.encode()).hexdigest()[:12]

    def get(self, mu: str, context: str = "") -> Optional[bytes]:
        key = self.get_cache_key(mu, context)
        if key in self.manifest:
            path = os.path.join(self.cache_dir, f"{key}.png")
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    return f.read()
        return None

    def put(self, mu: str, image_bytes: bytes, context: str = "", metadata: dict = None):
        key = self.get_cache_key(mu, context)
        path = os.path.join(self.cache_dir, f"{key}.png")

        with open(path, 'wb') as f:
            f.write(image_bytes)

        self.manifest[key] = {
            'mu': mu,
            'context': context,
            'created_at': datetime.utcnow().isoformat(),
            'metadata': metadata or {}
        }
        self._save_manifest()

    def list_cached(self) -> List[Dict]:
        return [
            {'key': k, **v}
            for k, v in self.manifest.items()
        ]


class SacredArtGenerator:
    """
    Unified sacred art generator.

    Tries sources in order:
    1. Local cache
    2. xAI/Grok API (if available)
    3. Museum APIs (if available)
    4. Procedural SVG generation (always available)
    """

    def __init__(self, xai_api_key: str = None, cache_dir: str = None):
        self.xai_api_key = xai_api_key or os.environ.get("XAI_API_KEY")
        self.cache = ImageCache(cache_dir)
        self._api_available = None  # Will test on first use

    def _test_api_connection(self) -> bool:
        """Test if xAI API is reachable."""
        if self._api_available is not None:
            return self._api_available

        try:
            import requests
            response = requests.get(
                "https://api.x.ai/v1/models",
                headers={"Authorization": f"Bearer {self.xai_api_key}"},
                timeout=10
            )
            self._api_available = response.status_code == 200
        except Exception:
            self._api_available = False

        return self._api_available

    def generate_mu_art(
        self,
        mu_symbol: str,
        intensity: float = 1.0,
        name: str = "",
        use_cache: bool = True
    ) -> Tuple[bytes, str]:
        """
        Generate art for a specific Mu dimension.

        Returns:
            Tuple of (image_bytes, source)
            source is one of: 'cache', 'xai', 'museum', 'procedural'
        """
        context = f"{name}:{intensity:.2f}"

        # Try cache first
        if use_cache:
            cached = self.cache.get(mu_symbol, context)
            if cached:
                return cached, 'cache'

        # Try xAI/Grok
        if self.xai_api_key and self._test_api_connection():
            try:
                image_bytes = self._generate_xai(mu_symbol, intensity, name)
                self.cache.put(mu_symbol, image_bytes, context, {'source': 'xai'})
                return image_bytes, 'xai'
            except Exception as e:
                print(f"xAI generation failed: {e}")

        # Fallback to procedural SVG
        image_bytes = self._generate_procedural(mu_symbol, intensity)
        if use_cache:
            self.cache.put(mu_symbol, image_bytes, context, {'source': 'procedural'})
        return image_bytes, 'procedural'

    def _generate_xai(self, mu_symbol: str, intensity: float, name: str) -> bytes:
        """Generate using xAI/Grok API."""
        import requests

        theme = MU_VISUAL_THEMES.get(mu_symbol, MU_VISUAL_THEMES['μ₁'])

        intensity_desc = (
            "blazing with overwhelming power" if intensity > 0.9 else
            "radiating strong energy" if intensity > 0.7 else
            "glowing steadily" if intensity > 0.5 else
            "subtly present" if intensity > 0.3 else
            "quietly emerging"
        )

        symbols = ", ".join(theme['symbols'][:3])

        prompt = f"""Create a stunning piece of ethereal sacred art:

Theme: {theme['essence']}

The energy is {intensity_desc} at {intensity:.0%} intensity.

Visual elements: {symbols}
Color palette: {', '.join(theme['colors'])}
Mood: {theme['mood']}
Elemental presence: {theme['elements']}

Style requirements:
- Museum-quality sacred art
- Rich, deep colors with cosmic undertones
- Ethereal light effects and sacred geometry
- NO text, letters, or words in the image
- Mystical and transformative atmosphere
- Professional art book quality

{f'Context: This represents the {theme["name"]} dimension of {name}' if name else ''}
"""

        response = requests.post(
            "https://api.x.ai/v1/images/generations",
            headers={
                "Authorization": f"Bearer {self.xai_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "grok-2-image",
                "prompt": prompt,
                "n": 1,
                "response_format": "b64_json"
            },
            timeout=120
        )

        if response.status_code != 200:
            raise Exception(f"xAI API error: {response.status_code}")

        data = response.json()
        if data.get('data') and data['data'][0].get('b64_json'):
            return base64.b64decode(data['data'][0]['b64_json'])

        raise Exception("No image data in response")

    def _generate_procedural(self, mu_symbol: str, intensity: float) -> bytes:
        """Generate procedural sacred geometry SVG, convert to PNG."""
        theme = MU_VISUAL_THEMES.get(mu_symbol, MU_VISUAL_THEMES['μ₁'])

        # Create SVG
        svg = self._create_sacred_svg(theme, intensity)

        # Convert SVG to PNG using cairosvg if available, else return SVG
        try:
            import cairosvg
            return cairosvg.svg2png(bytestring=svg.encode(), output_width=1024, output_height=1024)
        except ImportError:
            # Return SVG as bytes if cairosvg not available
            return svg.encode()

    def _create_sacred_svg(self, theme: Dict, intensity: float) -> str:
        """Create sacred geometry SVG based on theme."""
        import math

        colors = theme['colors']
        primary = colors[0]
        secondary = colors[1] if len(colors) > 1 else colors[0]
        tertiary = colors[2] if len(colors) > 2 else colors[0]

        # Base SVG with gradient background
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" style="stop-color:{secondary};stop-opacity:0.8"/>
      <stop offset="100%" style="stop-color:#0a0a1a;stop-opacity:1"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:{primary};stop-opacity:{intensity}"/>
      <stop offset="100%" style="stop-color:{primary};stop-opacity:0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>

  <!-- Central glow -->
  <circle cx="512" cy="512" r="300" fill="url(#glow)" filter="url(#blur)"/>
'''

        # Add sacred geometry based on Mu
        if theme['name'] == 'Phase':
            # Sun rays
            svg += self._sun_geometry(primary, intensity)
        elif theme['name'] == 'Existence':
            # Square/cube
            svg += self._cube_geometry(primary, intensity)
        elif theme['name'] == 'Cognition':
            # Triangle/merkaba
            svg += self._triangle_geometry(primary, intensity)
        elif theme['name'] == 'Value':
            # Pentagon/flower
            svg += self._flower_geometry(primary, intensity)
        elif theme['name'] == 'Expansion':
            # Spiral/galaxy
            svg += self._spiral_geometry(primary, intensity)
        elif theme['name'] == 'Action':
            # Arrow/flame
            svg += self._flame_geometry(primary, intensity)
        elif theme['name'] == 'Relation':
            # Vesica piscis
            svg += self._vesica_geometry(primary, intensity)
        elif theme['name'] == 'Field':
            # Infinite eye
            svg += self._eye_geometry(primary, intensity)

        svg += '\n</svg>'
        return svg

    def _sun_geometry(self, color: str, intensity: float) -> str:
        """Create sun/solar rays geometry."""
        rays = ""
        for i in range(12):
            angle = i * 30 * 3.14159 / 180
            x1 = 512 + 100 * math.cos(angle)
            y1 = 512 + 100 * math.sin(angle)
            x2 = 512 + (250 + 100 * intensity) * math.cos(angle)
            y2 = 512 + (250 + 100 * intensity) * math.sin(angle)
            rays += f'  <line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{color}" stroke-width="3" opacity="{intensity}"/>\n'

        return f'''
  <!-- Sun -->
  <circle cx="512" cy="512" r="80" fill="{color}" opacity="{intensity}"/>
  <circle cx="512" cy="512" r="100" fill="none" stroke="{color}" stroke-width="2" opacity="{intensity * 0.7}"/>
{rays}'''

    def _cube_geometry(self, color: str, intensity: float) -> str:
        """Create cube/metatron geometry."""
        return f'''
  <!-- Cube -->
  <rect x="362" y="362" width="300" height="300" fill="none" stroke="{color}" stroke-width="3" opacity="{intensity}"/>
  <rect x="412" y="412" width="200" height="200" fill="none" stroke="{color}" stroke-width="2" opacity="{intensity * 0.7}"/>
  <line x1="362" y1="362" x2="412" y2="412" stroke="{color}" stroke-width="2" opacity="{intensity * 0.5}"/>
  <line x1="662" y1="362" x2="612" y2="412" stroke="{color}" stroke-width="2" opacity="{intensity * 0.5}"/>
  <line x1="362" y1="662" x2="412" y2="612" stroke="{color}" stroke-width="2" opacity="{intensity * 0.5}"/>
  <line x1="662" y1="662" x2="612" y2="612" stroke="{color}" stroke-width="2" opacity="{intensity * 0.5}"/>'''

    def _triangle_geometry(self, color: str, intensity: float) -> str:
        """Create triangle/merkaba geometry."""
        return f'''
  <!-- Merkaba -->
  <polygon points="512,262 712,562 312,562" fill="none" stroke="{color}" stroke-width="3" opacity="{intensity}"/>
  <polygon points="512,762 712,462 312,462" fill="none" stroke="{color}" stroke-width="3" opacity="{intensity * 0.7}"/>
  <circle cx="512" cy="512" r="150" fill="none" stroke="{color}" stroke-width="1" opacity="{intensity * 0.5}"/>'''

    def _flower_geometry(self, color: str, intensity: float) -> str:
        """Create flower of life geometry."""
        circles = ""
        for i in range(6):
            angle = i * 60 * 3.14159 / 180
            x = 512 + 100 * math.cos(angle)
            y = 512 + 100 * math.sin(angle)
            circles += f'  <circle cx="{x:.0f}" cy="{y:.0f}" r="100" fill="none" stroke="{color}" stroke-width="1" opacity="{intensity * 0.7}"/>\n'

        return f'''
  <!-- Flower of Life -->
  <circle cx="512" cy="512" r="100" fill="none" stroke="{color}" stroke-width="2" opacity="{intensity}"/>
{circles}
  <circle cx="512" cy="512" r="200" fill="none" stroke="{color}" stroke-width="1" opacity="{intensity * 0.5}"/>'''

    def _spiral_geometry(self, color: str, intensity: float) -> str:
        """Create spiral/galaxy geometry."""
        points = []
        for t in range(200):
            angle = t * 0.15
            r = 50 + t * 1.5
            x = 512 + r * math.cos(angle)
            y = 512 + r * math.sin(angle)
            points.append(f"{x:.0f},{y:.0f}")

        return f'''
  <!-- Spiral -->
  <polyline points="{' '.join(points)}" fill="none" stroke="{color}" stroke-width="2" opacity="{intensity}"/>
  <circle cx="512" cy="512" r="40" fill="{color}" opacity="{intensity}"/>'''

    def _flame_geometry(self, color: str, intensity: float) -> str:
        """Create flame/arrow geometry."""
        return f'''
  <!-- Flame -->
  <path d="M512 262 L612 512 L562 512 L562 762 L462 762 L462 512 L412 512 Z"
        fill="{color}" opacity="{intensity * 0.3}"/>
  <path d="M512 262 L612 512 L562 512 L562 762 L462 762 L462 512 L412 512 Z"
        fill="none" stroke="{color}" stroke-width="3" opacity="{intensity}"/>
  <path d="M512 312 L582 492 L552 492 L552 712 L472 712 L472 492 L442 492 Z"
        fill="none" stroke="{color}" stroke-width="1" opacity="{intensity * 0.5}"/>'''

    def _vesica_geometry(self, color: str, intensity: float) -> str:
        """Create vesica piscis geometry."""
        return f'''
  <!-- Vesica Piscis -->
  <circle cx="412" cy="512" r="200" fill="none" stroke="{color}" stroke-width="3" opacity="{intensity}"/>
  <circle cx="612" cy="512" r="200" fill="none" stroke="{color}" stroke-width="3" opacity="{intensity}"/>
  <ellipse cx="512" cy="512" rx="75" ry="150" fill="{color}" opacity="{intensity * 0.2}"/>'''

    def _eye_geometry(self, color: str, intensity: float) -> str:
        """Create cosmic eye geometry."""
        return f'''
  <!-- Cosmic Eye -->
  <ellipse cx="512" cy="512" rx="250" ry="150" fill="none" stroke="{color}" stroke-width="3" opacity="{intensity}"/>
  <circle cx="512" cy="512" r="80" fill="none" stroke="{color}" stroke-width="3" opacity="{intensity}"/>
  <circle cx="512" cy="512" r="40" fill="{color}" opacity="{intensity}"/>
  <circle cx="512" cy="512" r="15" fill="#000"/>
  <!-- Rays -->
  <line x1="512" y1="312" x2="512" y2="212" stroke="{color}" stroke-width="2" opacity="{intensity * 0.7}"/>
  <line x1="512" y1="712" x2="512" y2="812" stroke="{color}" stroke-width="2" opacity="{intensity * 0.7}"/>'''

    def generate_profile_images(
        self,
        name: str,
        vector: List[float],
        save_dir: str = None
    ) -> Dict[str, Tuple[bytes, str]]:
        """
        Generate all images for a complete profile.

        Returns dict mapping image type to (bytes, source) tuple.
        """
        images = {}
        mu_symbols = ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']

        # Sort by intensity to get dominant
        sorted_idx = sorted(range(len(vector)), key=lambda i: vector[i], reverse=True)

        # Generate cover (based on dominant Mu)
        dominant_mu = mu_symbols[sorted_idx[0]]
        images['cover'] = self.generate_mu_art(dominant_mu, vector[sorted_idx[0]], name)

        # Generate top 3 dimension images
        for rank, idx in enumerate(sorted_idx[:3], 1):
            mu = mu_symbols[idx]
            intensity = vector[idx]
            images[f'dim_{rank}_{mu}'] = self.generate_mu_art(mu, intensity, name)

        # Save if directory provided
        if save_dir:
            os.makedirs(save_dir, exist_ok=True)
            for key, (img_bytes, source) in images.items():
                ext = 'png' if source != 'procedural' else 'svg'
                # Try PNG first
                filename = f"{key}.png"
                with open(os.path.join(save_dir, filename), 'wb') as f:
                    f.write(img_bytes)
                print(f"  Saved: {filename} (source: {source})")

        return images


# Convenience function
def generate_sacred_art(mu_symbol: str, intensity: float = 1.0, name: str = "") -> bytes:
    """Generate sacred art for a Mu dimension."""
    generator = SacredArtGenerator()
    img_bytes, source = generator.generate_mu_art(mu_symbol, intensity, name)
    return img_bytes


# ============ TEST ============

if __name__ == "__main__":
    import math

    print("=" * 60)
    print("MUMEGA IMAGE MANAGER TEST")
    print("=" * 60)

    generator = SacredArtGenerator()

    # Test Hadi's profile
    hadi_vector = [0.549, 0.411, 0.421, 0.705, 0.327, 0.760, 1.000, 0.692]

    print("\nGenerating images for Hadi's profile...")
    print("(Using procedural fallback since APIs are unavailable)")

    save_dir = os.path.join(os.path.dirname(__file__), 'test_output')
    images = generator.generate_profile_images("Hadi", hadi_vector, save_dir)

    print(f"\nGenerated {len(images)} images:")
    for key, (img_bytes, source) in images.items():
        print(f"  {key}: {len(img_bytes)} bytes from {source}")
