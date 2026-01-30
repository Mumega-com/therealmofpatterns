"""
Gemini 2.0 Flash Image Generation for FRC 16D Reports
Uses the "nano banana" model (gemini-2.0-flash-exp with image generation)
"""
import os
import base64
import httpx
from typing import Optional
import asyncio

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


async def generate_image(
    prompt: str,
    style: str = "ethereal mystical art",
    aspect_ratio: str = "16:9",
    output_path: Optional[str] = None
) -> bytes:
    """
    Generate an image using Gemini 2.0 Flash (image generation).

    Args:
        prompt: The image description
        style: Art style to apply
        aspect_ratio: Image aspect ratio
        output_path: Optional path to save the image

    Returns:
        Image bytes (PNG format)
    """

    full_prompt = f"""Create a stunning, museum-quality illustration:

{prompt}

Style: {style}
- Rich, deep colors with cosmic undertones
- Ethereal light effects and sacred geometry
- Professional art book quality
- No text or letters in the image
- Mystical and transformative atmosphere
- Aspect ratio: {aspect_ratio}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"

    headers = {
        "Content-Type": "application/json",
    }

    payload = {
        "contents": [{
            "parts": [{"text": full_prompt}]
        }],
        "generationConfig": {
            "responseModalities": ["image", "text"],
            "responseMimeType": "image/png"
        }
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{url}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload
        )

        if response.status_code != 200:
            raise Exception(f"Gemini API error: {response.status_code} - {response.text}")

        data = response.json()

        # Extract image from response
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "inlineData" in part:
                    image_data = base64.b64decode(part["inlineData"]["data"])

                    if output_path:
                        with open(output_path, "wb") as f:
                            f.write(image_data)

                    return image_data

        raise Exception("No image generated in response")


class FRC16DImageGenerator:
    """Generate themed images for each section of the 16D report."""

    DIMENSION_THEMES = {
        "P": {
            "name": "Phase",
            "visual": "golden sun rising over an infinite horizon, rays of pure identity light streaming through cosmic mist",
            "colors": "gold, amber, white light"
        },
        "E": {
            "name": "Existence",
            "visual": "ancient stone temple with sacred geometry, crystalline structure emerging from earth",
            "colors": "deep earth tones, granite gray, forest green"
        },
        "μ": {
            "name": "Mu (Cognition)",
            "visual": "luminous mind palace with infinite mirrors reflecting wisdom, mercury streams flowing",
            "colors": "silver, quicksilver, pale blue"
        },
        "V": {
            "name": "Value (Beauty)",
            "visual": "garden of impossible flowers at golden hour, each petal a different precious metal",
            "colors": "rose gold, copper, warm amber"
        },
        "N": {
            "name": "Nu (Expansion)",
            "visual": "cosmic doorway opening to infinite galaxies, seeds of possibility floating in starlight",
            "colors": "deep purple, cosmic blue, stardust white"
        },
        "Δ": {
            "name": "Delta (Action)",
            "visual": "lightning striking a mountain peak, warrior energy frozen in perfect motion",
            "colors": "electric red, forge orange, steel gray"
        },
        "R": {
            "name": "Rho (Relational)",
            "visual": "two celestial beings connected by threads of light, hearts as twin stars",
            "colors": "deep rose, soft pink, ethereal white"
        },
        "Φ": {
            "name": "Phi (Field/Witness)",
            "visual": "vast cosmic eye witnessing all creation, the universe reflected in stillness",
            "colors": "deep indigo, void black, starlight"
        }
    }

    async def generate_cover_image(self, name: str, dominant_dimension: str, vector: list) -> bytes:
        """Generate the report cover image."""
        theme = self.DIMENSION_THEMES.get(dominant_dimension, self.DIMENSION_THEMES["P"])

        prompt = f"""A breathtaking cosmic portrait representing a soul's essence:

Central imagery: {theme['visual']}

The image should feel like viewing into someone's deepest identity -
a window into their cosmic DNA. The dominant energy is {theme['name']}.

Color palette: {theme['colors']}

Include subtle sacred geometry patterns (flower of life, metatron's cube)
woven into the background. The overall feeling should be one of
profound recognition - as if the viewer is seeing their true self
for the first time.

Museum-quality digital art, suitable for a luxury coffee table book.
Mystical, transformative, deeply personal."""

        return await generate_image(prompt, aspect_ratio="3:4")

    async def generate_dimension_image(self, dimension: str, value: float, rank: int) -> bytes:
        """Generate an image for a specific dimension section."""
        theme = self.DIMENSION_THEMES.get(dimension, self.DIMENSION_THEMES["P"])

        intensity = "blazing with power" if value > 0.8 else "glowing steadily" if value > 0.5 else "quietly present"

        prompt = f"""A symbolic representation of the {theme['name']} dimension:

{theme['visual']}

The energy level is {intensity} (strength: {value:.0%}).
This is ranked #{rank} in the person's profile.

Color palette: {theme['colors']}

The image should evoke the essence of this dimension -
what it means to embody this energy. Include symbolic elements
that represent the dimension's domain.

Style: Ethereal, mystical, deeply symbolic art.
Quality: Museum-grade illustration."""

        return await generate_image(prompt, aspect_ratio="16:9")

    async def generate_archetype_image(self, archetype_name: str, tradition: str, domains: list) -> bytes:
        """Generate an image for an archetype match."""
        domains_str = ", ".join(domains) if domains else "wisdom, power, transformation"

        prompt = f"""A majestic portrayal of {archetype_name} from {tradition} mythology:

This figure embodies: {domains_str}

Show the archetype in their element - powerful, ancient, archetypal.
Not a literal depiction but a symbolic essence - what it FEELS like
to be touched by this energy.

The figure should feel both ancient and timeless,
as if they've always existed in the collective unconscious.

Style: Mythological art meets modern ethereal illustration.
Atmosphere: Reverent, powerful, transformative.
Quality: Art book illustration quality."""

        return await generate_image(prompt, aspect_ratio="1:1")

    async def generate_transit_image(self, transit_theme: str) -> bytes:
        """Generate an image for current transits/timing section."""
        prompt = f"""A cosmic weather visualization:

{transit_theme}

Show the current energies as a living, breathing cosmic landscape.
Time itself visible as flowing rivers of light.
Opportunities appearing as doorways or portals.
Challenges as mountain passes to be navigated.

The overall feeling: You are exactly where you need to be,
and the universe is actively supporting your journey.

Style: Cosmic landscape art with symbolic elements.
Quality: Luxury publication standard."""

        return await generate_image(prompt, aspect_ratio="21:9")

    async def generate_all_report_images(
        self,
        name: str,
        vector: list,
        dimensions: dict,
        dominant: str,
        archetypes: list
    ) -> dict:
        """Generate all images needed for a complete report."""

        images = {}

        # Cover image
        images["cover"] = await self.generate_cover_image(name, dominant, vector)

        # Dimension images (for top 4 dimensions)
        sorted_dims = sorted(dimensions.items(), key=lambda x: x[1]["rank"])
        for symbol, data in sorted_dims[:4]:
            images[f"dim_{symbol}"] = await self.generate_dimension_image(
                symbol, data["value"], data["rank"]
            )
            await asyncio.sleep(1)  # Rate limiting

        # Archetype images (top 2)
        for i, arch in enumerate(archetypes[:2]):
            images[f"archetype_{i}"] = await self.generate_archetype_image(
                arch["name"],
                arch.get("tradition", "Ancient"),
                arch.get("domains", [])
            )
            await asyncio.sleep(1)

        # Transit image
        images["transits"] = await self.generate_transit_image(
            "Current cosmic energies supporting transformation and growth"
        )

        return images


# Fallback for when Gemini isn't available
def generate_placeholder_image(width: int = 800, height: int = 600, text: str = "") -> bytes:
    """Generate a placeholder image when API is unavailable."""
    from PIL import Image, ImageDraw, ImageFont
    import io

    # Create gradient background
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)

    # Gradient from deep purple to cosmic blue
    for y in range(height):
        r = int(30 + (y/height) * 20)
        g = int(20 + (y/height) * 30)
        b = int(60 + (y/height) * 40)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Add some "stars"
    import random
    random.seed(42)
    for _ in range(100):
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.randint(1, 3)
        brightness = random.randint(150, 255)
        draw.ellipse([x, y, x+size, y+size], fill=(brightness, brightness, brightness))

    # Add text if provided
    if text:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        draw.text((x, y), text, fill=(255, 255, 255), font=font)

    # Convert to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()
