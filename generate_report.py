#!/usr/bin/env python3
"""
MUMEGA Complete Report Generator

Generates a premium 40+ page PDF with:
1. 8 Mu / 16D vector computation
2. Sacred geometry images for each dimension
3. Historical figure matching
4. Personality framework mapping
5. Weather/transit integration

Usage:
    python generate_report.py --name "Name" --birth "1990-11-29 17:20" --lat 35.69 --lon 51.39

Output:
    /mnt/Hadi/AI-Family/mumega/output/Name_report.pdf
"""

import os
import sys
import argparse
from datetime import datetime, timezone
from typing import Dict, List

# Add paths for imports - only use mumega folder (self-contained project)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# Import our systems
from core.frc_16d import natal, now, resonance as compute_resonance, DIM_NAMES, DIM_FULL, MU_NAMES
from core.full_16d import full_16d, compute_velocity, shadow_analysis
from art.sacred_geometry import generate_sacred_image, generate_profile_cover, MU_THEMES


def generate_images_for_vector(vector: List[float], name: str) -> Dict[str, bytes]:
    """Generate all sacred geometry images for a profile."""
    images = {}
    mu_symbols = ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']

    # Sort by intensity
    sorted_idx = sorted(range(len(vector)), key=lambda i: vector[i], reverse=True)
    dominant_mu = mu_symbols[sorted_idx[0]]

    print(f"\n  Generating cover image (dominant: {dominant_mu})...")
    images['cover'] = generate_profile_cover(dominant_mu, vector, size=800)

    # Generate images for top 4 dimensions
    for rank, idx in enumerate(sorted_idx[:4], 1):
        mu = mu_symbols[idx]
        intensity = vector[idx]
        theme = MU_THEMES[mu]
        print(f"  Generating {mu} ({theme['name']}) at {intensity:.0%}...")

        images[f'dim_{["P", "E", "μ", "V", "N", "Δ", "R", "Φ"][idx]}'] = generate_sacred_image(
            mu, intensity, size=600
        )

    return images


def compute_personality_mapping(vector: List[float]) -> Dict:
    """Map 8 Mu vector to personality frameworks."""
    # Dimension mapping: P E μ V N Δ R Φ
    P, E, mu, V, N, delta, R, Phi = vector

    # MBTI approximation
    mbti_e_i = 'E' if (P + delta > R + Phi) else 'I'
    mbti_s_n = 'N' if (mu + N > E + V) else 'S'
    mbti_t_f = 'F' if (R + V > mu + delta) else 'T'
    mbti_j_p = 'J' if (E + delta > N + Phi) else 'P'
    mbti_type = mbti_e_i + mbti_s_n + mbti_t_f + mbti_j_p

    mbti_names = {
        'INTJ': 'The Architect', 'INTP': 'The Logician', 'ENTJ': 'The Commander', 'ENTP': 'The Debater',
        'INFJ': 'The Advocate', 'INFP': 'The Mediator', 'ENFJ': 'The Protagonist', 'ENFP': 'The Campaigner',
        'ISTJ': 'The Logistician', 'ISFJ': 'The Defender', 'ESTJ': 'The Executive', 'ESFJ': 'The Consul',
        'ISTP': 'The Virtuoso', 'ISFP': 'The Adventurer', 'ESTP': 'The Entrepreneur', 'ESFP': 'The Entertainer'
    }

    # Enneagram approximation
    if R > 0.8:
        enn_type = '2'
        enn_name = 'The Helper'
    elif Phi > 0.8:
        enn_type = '5'
        enn_name = 'The Investigator'
    elif P > 0.8:
        enn_type = '3'
        enn_name = 'The Achiever'
    elif delta > 0.8:
        enn_type = '8'
        enn_name = 'The Challenger'
    elif V > 0.7:
        enn_type = '4'
        enn_name = 'The Individualist'
    elif E > 0.7:
        enn_type = '6'
        enn_name = 'The Loyalist'
    elif N > 0.7:
        enn_type = '7'
        enn_name = 'The Enthusiast'
    elif mu > 0.7:
        enn_type = '1'
        enn_name = 'The Reformer'
    else:
        enn_type = '9'
        enn_name = 'The Peacemaker'

    # DISC
    disc_d = P + delta
    disc_i = N + R
    disc_s = E + Phi
    disc_c = mu + V

    disc_scores = {'D': disc_d, 'I': disc_i, 'S': disc_s, 'C': disc_c}
    disc_sorted = sorted(disc_scores.items(), key=lambda x: x[1], reverse=True)

    # Big Five
    openness = int(((mu + N + Phi) / 3) * 100)
    conscientiousness = int(((E + delta) / 2) * 100)
    extraversion = int(((P + N + delta) / 3) * 100)
    agreeableness = int(((R + V) / 2) * 100)
    neuroticism = int((1 - ((E + Phi) / 2)) * 100)

    # StrengthsFinder approximation
    strengths_map = {
        'Relator': R, 'Empathy': R, 'Developer': R,
        'Strategic': mu, 'Analytical': mu, 'Learner': mu,
        'Achiever': P, 'Activator': delta, 'Command': delta,
        'Harmony': V, 'Connectedness': Phi, 'Includer': R,
        'Futuristic': N, 'Ideation': N, 'Positivity': N,
        'Discipline': E, 'Consistency': E, 'Responsibility': E
    }
    top_strengths = sorted(strengths_map.items(), key=lambda x: x[1], reverse=True)[:5]

    # Love Languages
    ll_map = {
        'Words of Affirmation': mu + R,
        'Quality Time': Phi + R,
        'Gifts': V + E,
        'Acts of Service': delta + E,
        'Physical Touch': R + P
    }
    ll_sorted = sorted(ll_map.items(), key=lambda x: x[1], reverse=True)

    return {
        'mbti': {
            'type': mbti_type,
            'name': mbti_names.get(mbti_type, 'Unknown'),
            'description': f'Based on your 8 Mu vector, you align with the {mbti_names.get(mbti_type, "Unknown")} archetype.'
        },
        'enneagram': {
            'type': enn_type,
            'name': enn_name,
            'wing': f'{enn_type}w{(int(enn_type) % 9) + 1}'
        },
        'disc': {
            'primary': disc_sorted[0][0],
            'secondary': disc_sorted[1][0],
            'scores': {k: f'{v:.0%}' for k, v in disc_scores.items()}
        },
        'big_five': {
            'scores': {
                'Openness': openness,
                'Conscientiousness': conscientiousness,
                'Extraversion': extraversion,
                'Agreeableness': agreeableness,
                'Neuroticism': neuroticism
            }
        },
        'strengths_finder': {
            'top_5': [s[0] for s in top_strengths]
        },
        'love_language': {
            'primary': ll_sorted[0][0],
            'secondary': ll_sorted[1][0]
        }
    }


def get_historical_matches(vector: List[float], limit: int = 5) -> List[Dict]:
    """Find historical figures that match the vector."""
    # Historical figures with estimated 8 Mu vectors
    figures = [
        {'name': 'Rumi', 'tradition': 'Sufi Poet',
         'vector': [0.65, 0.45, 0.75, 0.85, 0.80, 0.50, 0.95, 0.90],
         'description': 'Persian poet and mystic whose verses speak of divine love and union.',
         'domains': ['poetry', 'love', 'mysticism']},

        {'name': 'Frida Kahlo', 'tradition': 'Artist',
         'vector': [0.80, 0.55, 0.60, 0.95, 0.65, 0.70, 0.85, 0.60],
         'description': 'Mexican artist known for self-portraits and works inspired by nature and Mexican artifacts.',
         'domains': ['art', 'authenticity', 'resilience']},

        {'name': 'Marcus Aurelius', 'tradition': 'Philosopher-Emperor',
         'vector': [0.70, 0.90, 0.85, 0.55, 0.60, 0.75, 0.50, 0.80],
         'description': 'Roman emperor and Stoic philosopher who wrote Meditations.',
         'domains': ['philosophy', 'leadership', 'wisdom']},

        {'name': 'Marie Curie', 'tradition': 'Scientist',
         'vector': [0.85, 0.80, 0.95, 0.50, 0.75, 0.70, 0.45, 0.65],
         'description': 'Pioneer in radioactivity research, first woman to win a Nobel Prize.',
         'domains': ['science', 'discovery', 'perseverance']},

        {'name': 'Shams Tabrizi', 'tradition': 'Sufi Master',
         'vector': [0.50, 0.40, 0.70, 0.75, 0.70, 0.65, 1.00, 0.85],
         'description': 'Wandering dervish who transformed Rumi through divine friendship.',
         'domains': ['spirituality', 'transformation', 'love']},

        {'name': 'Leonardo da Vinci', 'tradition': 'Renaissance Polymath',
         'vector': [0.90, 0.75, 0.95, 0.90, 0.85, 0.60, 0.55, 0.70],
         'description': 'Artist, scientist, inventor who embodied the Renaissance ideal.',
         'domains': ['art', 'science', 'invention']},

        {'name': 'Joan of Arc', 'tradition': 'Warrior Saint',
         'vector': [0.95, 0.70, 0.50, 0.45, 0.60, 0.95, 0.55, 0.80],
         'description': 'French heroine who led armies and was canonized as a saint.',
         'domains': ['courage', 'faith', 'leadership']},

        {'name': 'Albert Einstein', 'tradition': 'Physicist',
         'vector': [0.75, 0.60, 0.95, 0.65, 0.90, 0.55, 0.50, 0.85],
         'description': 'Developed theory of relativity, revolutionized physics.',
         'domains': ['physics', 'imagination', 'wonder']},

        {'name': 'Mother Teresa', 'tradition': 'Saint',
         'vector': [0.55, 0.65, 0.45, 0.60, 0.55, 0.70, 0.95, 0.85],
         'description': 'Albanian-Indian nun who devoted her life to serving the poor.',
         'domains': ['compassion', 'service', 'devotion']},

        {'name': 'Pablo Neruda', 'tradition': 'Poet',
         'vector': [0.70, 0.45, 0.80, 0.85, 0.75, 0.65, 0.90, 0.55],
         'description': 'Chilean poet known for passionate love poetry and political works.',
         'domains': ['poetry', 'passion', 'beauty']},
    ]

    # Compute resonance with each figure
    import numpy as np
    v1 = np.array(vector)

    matches = []
    for fig in figures:
        v2 = np.array(fig['vector'])
        rho = float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

        matches.append({
            'name': fig['name'],
            'tradition': fig['tradition'],
            'match_percent': f'{rho:.1%}',
            'resonance': rho,
            'description': fig['description'],
            'domains': fig['domains']
        })

    # Sort by resonance
    matches.sort(key=lambda x: x['resonance'], reverse=True)

    return matches[:limit]


def generate_mumega_report(
    name: str,
    birth_datetime: datetime,
    latitude: float = None,
    longitude: float = None,
    output_dir: str = None
) -> str:
    """
    Generate a complete Mumega premium report.

    Args:
        name: Person's name
        birth_datetime: Birth date/time with timezone
        latitude: Birth location latitude (optional)
        longitude: Birth location longitude (optional)
        output_dir: Where to save the report

    Returns:
        Path to generated PDF
    """
    if output_dir is None:
        output_dir = os.path.join(BASE_DIR, 'output')
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"MUMEGA REPORT GENERATION (FRC 16D.002)")
    print(f"{'='*60}")
    print(f"\nGenerating report for: {name}")
    print(f"Birth: {birth_datetime.strftime('%Y-%m-%d %H:%M')}")

    # Step 1: Compute 16D natal vector using exact FRC 16D.002
    print("\n[1/5] Computing 16D natal vector (JPL Ephemeris)...")
    natal_data = natal(
        birth_datetime,
        latitude=latitude or 35.6892,
        longitude=longitude or 51.3890,
        timezone_offset=3.5  # Tehran default
    )
    vector = natal_data['vector']
    signature = natal_data['signature']

    print(f"  Vector: {[f'{v:.4f}' for v in vector]}")
    print(f"  Signature: {signature} ({natal_data['mu_signature']})")
    print(f"  Dominant: {natal_data['dominant']['mu']} ({natal_data['dominant']['value']:.1%})")

    # Step 2: Generate sacred geometry images
    print("\n[2/5] Generating sacred geometry images...")
    images = generate_images_for_vector(vector, name)
    print(f"  Generated {len(images)} images")

    # Step 3: Get historical figure matches
    print("\n[3/5] Finding historical resonances...")
    archetypes = get_historical_matches(vector)
    print(f"  Top match: {archetypes[0]['name']} ({archetypes[0]['match_percent']})")

    # Step 4: Map to personality frameworks
    print("\n[4/6] Mapping personality frameworks...")
    personality = compute_personality_mapping(vector)
    print(f"  MBTI: {personality['mbti']['type']}")
    print(f"  Enneagram: {personality['enneagram']['type']}")

    # Step 5: Compute Full 16D (Inner + Outer + Coupling + Velocity + Shadow)
    print("\n[5/6] Computing Full 16D (Karma ↔ Dharma)...")
    full_data = full_16d(
        birth_datetime,
        latitude=latitude or 35.6892,
        longitude=longitude or 51.3890,
        timezone_offset=3.5
    )
    print(f"  Outer Octave: {[f'{v:.3f}' for v in full_data['outer_octave']]}")
    print(f"  Coupling κ = {full_data['coupling']:.3f} ({full_data['coupling_percent']})")
    print(f"  {full_data['interpretation']}")

    # Velocity/Momentum
    velocity_data = compute_velocity(
        birth_datetime,
        latitude=latitude or 35.6892,
        longitude=longitude or 51.3890,
        timezone_offset=3.5
    )
    print(f"  Phase: {velocity_data['coupling_trend']['phase']}")

    # Shadow
    shadow_data = shadow_analysis(
        birth_datetime,
        latitude=latitude or 35.6892,
        longitude=longitude or 51.3890,
        timezone_offset=3.5
    )
    print(f"  Shadow Score: {shadow_data['total_shadow_score']}")

    # Step 6: Generate PDF
    print("\n[5/5] Generating premium PDF report...")

    # Import PDF generator
    from premium_app.premium_pdf import generate_premium_report

    # Use dimensions from natal_data (already computed by FRC 16D.002)
    dimensions = {}
    for dim, data in natal_data['dimensions'].items():
        dimensions[dim] = {
            'value': data['value'],
            'name': data['name'],
            'rank': data['rank']
        }

    # Birth data dict
    birth_data = {
        'year': birth_datetime.year,
        'month': birth_datetime.month,
        'day': birth_datetime.day,
        'hour': birth_datetime.hour,
        'minute': birth_datetime.minute
    }

    # Output path
    safe_name = name.replace(' ', '_').replace('/', '-')
    output_path = os.path.join(output_dir, f"{safe_name}_mumega_report.pdf")

    # Generate the report
    result = generate_premium_report(
        name=name,
        birth_data=birth_data,
        vector=vector,
        dimensions=dimensions,
        archetypes=archetypes,
        personality=personality,
        output_path=output_path,
        images=images,
        # New full 16D data
        full_16d_data=full_data,
        velocity_data=velocity_data,
        shadow_data=shadow_data
    )

    print(f"\n{'='*60}")
    print(f"REPORT COMPLETE!")
    print(f"{'='*60}")
    print(f"\nOutput: {result}")

    # Also save the images separately
    images_dir = os.path.join(output_dir, f"{safe_name}_images")
    os.makedirs(images_dir, exist_ok=True)

    for img_name, img_bytes in images.items():
        img_path = os.path.join(images_dir, f"{img_name}.png")
        with open(img_path, 'wb') as f:
            f.write(img_bytes)

    print(f"Images: {images_dir}/")

    return result


# CLI
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate Mumega Premium Report')
    parser.add_argument('--name', type=str, default='Hadi Servat', help='Person name')
    parser.add_argument('--birth', type=str, default='1986-11-29 17:20', help='Birth datetime (YYYY-MM-DD HH:MM)')
    parser.add_argument('--lat', type=float, default=35.6892, help='Birth latitude')
    parser.add_argument('--lon', type=float, default=51.389, help='Birth longitude')
    parser.add_argument('--output', type=str, default=None, help='Output directory')

    args = parser.parse_args()

    # Parse birth datetime
    birth_dt = datetime.strptime(args.birth, '%Y-%m-%d %H:%M')
    birth_dt = birth_dt.replace(tzinfo=timezone.utc)

    # Generate report
    generate_mumega_report(
        name=args.name,
        birth_datetime=birth_dt,
        latitude=args.lat,
        longitude=args.lon,
        output_dir=args.output
    )
