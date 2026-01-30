"""
MUMEGA Sacred Geometry Generator

Creates beautiful sacred geometry PNG images using PIL.
Each Mu dimension has its own geometric pattern.
"""

import math
import io
from typing import Tuple, Dict, List
from PIL import Image, ImageDraw, ImageFilter

# Mu visual themes
MU_THEMES = {
    'μ₁': {
        'name': 'Phase',
        'geometry': 'sun',
        'colors': ['#FFD700', '#FFA500', '#FF8C00'],
        'bg_colors': ['#1a0a00', '#0a0500']
    },
    'μ₂': {
        'name': 'Existence',
        'geometry': 'cube',
        'colors': ['#228B22', '#2F4F4F', '#006400'],
        'bg_colors': ['#000a00', '#000500']
    },
    'μ₃': {
        'name': 'Cognition',
        'geometry': 'merkaba',
        'colors': ['#C0C0C0', '#87CEEB', '#B0C4DE'],
        'bg_colors': ['#05050a', '#000005']
    },
    'μ₄': {
        'name': 'Value',
        'geometry': 'flower',
        'colors': ['#FFB6C1', '#FF69B4', '#FFC0CB'],
        'bg_colors': ['#0a0005', '#050003']
    },
    'μ₅': {
        'name': 'Expansion',
        'geometry': 'spiral',
        'colors': ['#9370DB', '#8A2BE2', '#4B0082'],
        'bg_colors': ['#05000a', '#030008']
    },
    'μ₆': {
        'name': 'Action',
        'geometry': 'flame',
        'colors': ['#FF4500', '#DC143C', '#FF6347'],
        'bg_colors': ['#0a0000', '#050000']
    },
    'μ₇': {
        'name': 'Relation',
        'geometry': 'vesica',
        'colors': ['#C0C0C0', '#FF69B4', '#E6E6FA'],
        'bg_colors': ['#050508', '#030305']
    },
    'μ₈': {
        'name': 'Field',
        'geometry': 'eye',
        'colors': ['#4B0082', '#483D8B', '#6A5ACD'],
        'bg_colors': ['#000005', '#000003']
    }
}


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_radial_gradient(size: int, center_color: str, edge_color: str) -> Image.Image:
    """Create a radial gradient background."""
    img = Image.new('RGB', (size, size))
    center = (size // 2, size // 2)
    max_dist = math.sqrt(2) * size / 2

    center_rgb = hex_to_rgb(center_color)
    edge_rgb = hex_to_rgb(edge_color)

    for y in range(size):
        for x in range(size):
            dist = math.sqrt((x - center[0])**2 + (y - center[1])**2)
            ratio = min(dist / max_dist, 1.0)

            r = int(center_rgb[0] * (1 - ratio) + edge_rgb[0] * ratio)
            g = int(center_rgb[1] * (1 - ratio) + edge_rgb[1] * ratio)
            b = int(center_rgb[2] * (1 - ratio) + edge_rgb[2] * ratio)

            img.putpixel((x, y), (r, g, b))

    return img


def draw_sun(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
             color: str, intensity: float):
    """Draw sun with rays."""
    r = int(size * 0.08 * intensity)
    color_rgb = hex_to_rgb(color)
    alpha_color = (*color_rgb, int(255 * intensity))

    # Central circle
    draw.ellipse([center[0]-r, center[1]-r, center[0]+r, center[1]+r],
                 fill=color_rgb, outline=color_rgb)

    # Rays
    num_rays = 12
    for i in range(num_rays):
        angle = i * 2 * math.pi / num_rays
        inner_r = r * 1.3
        outer_r = r * (2.5 + intensity)

        x1 = center[0] + inner_r * math.cos(angle)
        y1 = center[1] + inner_r * math.sin(angle)
        x2 = center[0] + outer_r * math.cos(angle)
        y2 = center[1] + outer_r * math.sin(angle)

        draw.line([(x1, y1), (x2, y2)], fill=color_rgb, width=3)

    # Outer glow circle
    r2 = int(r * 1.5)
    draw.ellipse([center[0]-r2, center[1]-r2, center[0]+r2, center[1]+r2],
                 outline=color_rgb, width=2)


def draw_cube(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
              color: str, intensity: float):
    """Draw 3D cube / metatron's cube."""
    s = int(size * 0.15 * (0.5 + intensity * 0.5))
    color_rgb = hex_to_rgb(color)
    offset = int(s * 0.3)

    # Front face
    front = [
        (center[0] - s, center[1] - s),
        (center[0] + s, center[1] - s),
        (center[0] + s, center[1] + s),
        (center[0] - s, center[1] + s)
    ]
    draw.polygon(front, outline=color_rgb, width=3)

    # Back face (offset)
    back = [
        (center[0] - s + offset, center[1] - s - offset),
        (center[0] + s + offset, center[1] - s - offset),
        (center[0] + s + offset, center[1] + s - offset),
        (center[0] - s + offset, center[1] + s - offset)
    ]
    draw.polygon(back, outline=color_rgb, width=2)

    # Connect corners
    for i in range(4):
        draw.line([front[i], back[i]], fill=color_rgb, width=2)

    # Inner cube
    s2 = int(s * 0.6)
    inner = [
        (center[0] - s2, center[1] - s2),
        (center[0] + s2, center[1] - s2),
        (center[0] + s2, center[1] + s2),
        (center[0] - s2, center[1] + s2)
    ]
    draw.polygon(inner, outline=color_rgb, width=1)


def draw_merkaba(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
                 color: str, intensity: float):
    """Draw merkaba / star tetrahedron."""
    r = int(size * 0.2 * (0.5 + intensity * 0.5))
    color_rgb = hex_to_rgb(color)

    # Upward triangle
    up_points = []
    for i in range(3):
        angle = i * 2 * math.pi / 3 - math.pi / 2
        x = center[0] + r * math.cos(angle)
        y = center[1] + r * math.sin(angle)
        up_points.append((x, y))
    draw.polygon(up_points, outline=color_rgb, width=3)

    # Downward triangle
    down_points = []
    for i in range(3):
        angle = i * 2 * math.pi / 3 + math.pi / 2
        x = center[0] + r * math.cos(angle)
        y = center[1] + r * math.sin(angle)
        down_points.append((x, y))
    draw.polygon(down_points, outline=color_rgb, width=3)

    # Enclosing circle
    draw.ellipse([center[0]-r, center[1]-r, center[0]+r, center[1]+r],
                 outline=color_rgb, width=1)


def draw_flower(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
                color: str, intensity: float):
    """Draw flower of life."""
    r = int(size * 0.08 * (0.5 + intensity * 0.5))
    color_rgb = hex_to_rgb(color)

    # Center circle
    draw.ellipse([center[0]-r, center[1]-r, center[0]+r, center[1]+r],
                 outline=color_rgb, width=2)

    # 6 surrounding circles
    for i in range(6):
        angle = i * math.pi / 3
        cx = center[0] + r * math.cos(angle)
        cy = center[1] + r * math.sin(angle)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=color_rgb, width=1)

    # Second ring
    for i in range(6):
        angle = i * math.pi / 3 + math.pi / 6
        cx = center[0] + r * 1.73 * math.cos(angle)
        cy = center[1] + r * 1.73 * math.sin(angle)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=color_rgb, width=1)

    # Outer boundary
    r2 = int(r * 2.5)
    draw.ellipse([center[0]-r2, center[1]-r2, center[0]+r2, center[1]+r2],
                 outline=color_rgb, width=2)


def draw_spiral(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
                color: str, intensity: float):
    """Draw golden spiral / galaxy."""
    color_rgb = hex_to_rgb(color)
    max_r = int(size * 0.25 * (0.5 + intensity * 0.5))

    points = []
    for t in range(300):
        angle = t * 0.1
        # Golden spiral approximation
        r = 5 + t * max_r / 300
        x = center[0] + r * math.cos(angle)
        y = center[1] + r * math.sin(angle)
        points.append((x, y))

    # Draw spiral as connected lines
    for i in range(len(points) - 1):
        alpha = int(255 * (i / len(points)) * intensity)
        draw.line([points[i], points[i+1]], fill=color_rgb, width=2)

    # Center point
    r = 10
    draw.ellipse([center[0]-r, center[1]-r, center[0]+r, center[1]+r],
                 fill=color_rgb)


def draw_flame(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
               color: str, intensity: float):
    """Draw flame / upward arrow."""
    h = int(size * 0.25 * (0.5 + intensity * 0.5))
    w = int(h * 0.4)
    color_rgb = hex_to_rgb(color)

    # Main arrow shape
    points = [
        (center[0], center[1] - h),           # Top
        (center[0] + w, center[1]),           # Right
        (center[0] + w//2, center[1]),        # Right notch
        (center[0] + w//2, center[1] + h//2), # Right bottom
        (center[0] - w//2, center[1] + h//2), # Left bottom
        (center[0] - w//2, center[1]),        # Left notch
        (center[0] - w, center[1]),           # Left
    ]
    draw.polygon(points, outline=color_rgb, width=3)

    # Inner flame
    h2 = int(h * 0.7)
    w2 = int(w * 0.6)
    inner = [
        (center[0], center[1] - h2),
        (center[0] + w2, center[1]),
        (center[0] - w2, center[1]),
    ]
    draw.polygon(inner, outline=color_rgb, width=1)


def draw_vesica(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
                color: str, intensity: float):
    """Draw vesica piscis."""
    r = int(size * 0.15 * (0.5 + intensity * 0.5))
    offset = int(r * 0.7)
    color_rgb = hex_to_rgb(color)

    # Left circle
    draw.ellipse([center[0]-offset-r, center[1]-r,
                  center[0]-offset+r, center[1]+r],
                 outline=color_rgb, width=3)

    # Right circle
    draw.ellipse([center[0]+offset-r, center[1]-r,
                  center[0]+offset+r, center[1]+r],
                 outline=color_rgb, width=3)

    # Center vesica (approximated with ellipse)
    vw = int(r * 0.5)
    vh = int(r * 1.2)
    draw.ellipse([center[0]-vw, center[1]-vh, center[0]+vw, center[1]+vh],
                 outline=color_rgb, width=2)


def draw_eye(draw: ImageDraw.Draw, center: Tuple[int, int], size: int,
             color: str, intensity: float):
    """Draw cosmic eye / all-seeing eye."""
    rw = int(size * 0.2 * (0.5 + intensity * 0.5))
    rh = int(rw * 0.6)
    color_rgb = hex_to_rgb(color)

    # Outer eye shape (ellipse)
    draw.ellipse([center[0]-rw, center[1]-rh, center[0]+rw, center[1]+rh],
                 outline=color_rgb, width=3)

    # Iris
    ir = int(rh * 0.6)
    draw.ellipse([center[0]-ir, center[1]-ir, center[0]+ir, center[1]+ir],
                 outline=color_rgb, width=2)

    # Pupil
    pr = int(ir * 0.5)
    draw.ellipse([center[0]-pr, center[1]-pr, center[0]+pr, center[1]+pr],
                 fill=color_rgb)

    # Highlight
    hr = int(pr * 0.3)
    hx = center[0] - pr // 3
    hy = center[1] - pr // 3
    draw.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=(255, 255, 255))

    # Rays above
    for i in range(-3, 4):
        angle = math.pi / 2 + i * 0.2
        x1 = center[0] + rh * 1.3 * math.cos(angle)
        y1 = center[1] - rh * 1.3 * abs(math.sin(angle))
        x2 = center[0] + rh * 2 * math.cos(angle)
        y2 = center[1] - rh * 2 * abs(math.sin(angle))
        draw.line([(x1, y1), (x2, y2)], fill=color_rgb, width=2)


GEOMETRY_FUNCTIONS = {
    'sun': draw_sun,
    'cube': draw_cube,
    'merkaba': draw_merkaba,
    'flower': draw_flower,
    'spiral': draw_spiral,
    'flame': draw_flame,
    'vesica': draw_vesica,
    'eye': draw_eye
}


def generate_sacred_image(
    mu_symbol: str,
    intensity: float = 1.0,
    size: int = 1024
) -> bytes:
    """
    Generate a sacred geometry image for a Mu dimension.

    Args:
        mu_symbol: One of μ₁ through μ₈
        intensity: 0.0 to 1.0
        size: Image size in pixels

    Returns:
        PNG image as bytes
    """
    theme = MU_THEMES.get(mu_symbol, MU_THEMES['μ₁'])

    # Create gradient background
    img = create_radial_gradient(size, theme['bg_colors'][0], theme['bg_colors'][1])
    draw = ImageDraw.Draw(img)

    center = (size // 2, size // 2)
    primary_color = theme['colors'][0]

    # Draw the geometry
    geometry_func = GEOMETRY_FUNCTIONS.get(theme['geometry'])
    if geometry_func:
        geometry_func(draw, center, size, primary_color, intensity)

        # Add secondary layer with second color at lower intensity
        if len(theme['colors']) > 1:
            geometry_func(draw, center, int(size * 0.9), theme['colors'][1], intensity * 0.5)

    # Apply slight blur for ethereal effect
    img = img.filter(ImageFilter.GaussianBlur(radius=1))

    # Save to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', quality=95)
    return buffer.getvalue()


def generate_profile_cover(
    dominant_mu: str,
    vector: List[float],
    size: int = 1024
) -> bytes:
    """
    Generate a cover image combining multiple Mu geometries.
    """
    mu_symbols = ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']
    theme = MU_THEMES.get(dominant_mu, MU_THEMES['μ₁'])

    # Create background
    img = create_radial_gradient(size, theme['bg_colors'][0], '#000000')
    draw = ImageDraw.Draw(img)

    center = (size // 2, size // 2)

    # Sort by intensity
    sorted_idx = sorted(range(len(vector)), key=lambda i: vector[i], reverse=True)

    # Draw top 3 geometries layered
    for i, idx in enumerate(sorted_idx[:3]):
        mu = mu_symbols[idx]
        mu_theme = MU_THEMES.get(mu, MU_THEMES['μ₁'])
        intensity = vector[idx]

        # Scale down for each layer
        scale = 1.0 - i * 0.15
        geometry_func = GEOMETRY_FUNCTIONS.get(mu_theme['geometry'])

        if geometry_func:
            color = mu_theme['colors'][0]
            geometry_func(draw, center, int(size * scale), color, intensity * (1 - i * 0.2))

    # Apply blur
    img = img.filter(ImageFilter.GaussianBlur(radius=2))

    buffer = io.BytesIO()
    img.save(buffer, format='PNG', quality=95)
    return buffer.getvalue()


# ============ TEST ============

if __name__ == "__main__":
    import os

    print("=" * 60)
    print("MUMEGA SACRED GEOMETRY GENERATOR")
    print("=" * 60)

    output_dir = os.path.join(os.path.dirname(__file__), 'test_output')
    os.makedirs(output_dir, exist_ok=True)

    # Generate one image for each Mu
    for mu in ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']:
        theme = MU_THEMES[mu]
        print(f"\nGenerating {mu} ({theme['name']})...")

        img_bytes = generate_sacred_image(mu, intensity=0.9, size=512)

        filename = f"{mu.replace('μ', 'mu')}_{theme['name'].lower()}.png"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'wb') as f:
            f.write(img_bytes)

        print(f"  Saved: {filename} ({len(img_bytes)} bytes)")

    # Generate Hadi's cover
    print("\n" + "-" * 40)
    print("Generating Hadi's profile cover...")

    hadi_vector = [0.549, 0.411, 0.421, 0.705, 0.327, 0.760, 1.000, 0.692]
    cover_bytes = generate_profile_cover('μ₇', hadi_vector, size=512)

    cover_path = os.path.join(output_dir, 'hadi_cover.png')
    with open(cover_path, 'wb') as f:
        f.write(cover_bytes)

    print(f"  Saved: hadi_cover.png ({len(cover_bytes)} bytes)")
    print(f"\nAll images saved to: {output_dir}")
