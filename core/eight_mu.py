"""
MUMEGA Core: The 8 Mu System (Inner Octave)
FREE PUBLIC LAYER

The 8 Mu's represent the inner octave of identity—
the fundamental frequencies available to all beings.

μ₁ (Phase)     — Who am I becoming?
μ₂ (Existence) — What grounds me?
μ₃ (Cognition) — How do I understand?
μ₄ (Value)     — What do I treasure?
μ₅ (Expansion) — Where am I growing?
μ₆ (Action)    — What am I doing?
μ₇ (Relation)  — Who do I love?
μ₈ (Field)     — What witnesses?

The outer octave (9-16) extends these into:
- Shadow integration
- Collective resonance
- Transpersonal dimensions
- Dharmic alignment
"""

import math
import ephem
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional
import numpy as np


# The 8 Mu Frequencies
MU_FREQUENCIES = {
    'μ₁': {
        'name': 'Phase',
        'symbol': '☉',
        'question': 'Who am I becoming?',
        'domain': 'Identity, Will, Direction',
        'planet': 'Sun',
        'color': '#FFD700',  # Gold
        'element': 'Fire',
        'sacred_geometry': 'point'
    },
    'μ₂': {
        'name': 'Existence',
        'symbol': '♄',
        'question': 'What grounds me?',
        'domain': 'Structure, Stability, Form',
        'planet': 'Saturn',
        'color': '#228B22',  # Forest Green
        'element': 'Earth',
        'sacred_geometry': 'square'
    },
    'μ₃': {
        'name': 'Cognition',
        'symbol': '☿',
        'question': 'How do I understand?',
        'domain': 'Thought, Communication, Perception',
        'planet': 'Mercury',
        'color': '#C0C0C0',  # Silver
        'element': 'Air',
        'sacred_geometry': 'triangle'
    },
    'μ₄': {
        'name': 'Value',
        'symbol': '♀',
        'question': 'What do I treasure?',
        'domain': 'Beauty, Worth, Harmony',
        'planet': 'Venus',
        'color': '#FFB6C1',  # Rose
        'element': 'Water',
        'sacred_geometry': 'pentagon'
    },
    'μ₅': {
        'name': 'Expansion',
        'symbol': '♃',
        'question': 'Where am I growing?',
        'domain': 'Growth, Meaning, Possibility',
        'planet': 'Jupiter',
        'color': '#9370DB',  # Purple
        'element': 'Ether',
        'sacred_geometry': 'hexagon'
    },
    'μ₆': {
        'name': 'Action',
        'symbol': '♂',
        'question': 'What am I doing?',
        'domain': 'Will, Drive, Transformation',
        'planet': 'Mars',
        'color': '#FF4500',  # Orange-Red
        'element': 'Fire',
        'sacred_geometry': 'arrow'
    },
    'μ₇': {
        'name': 'Relation',
        'symbol': '☽',
        'question': 'Who do I love?',
        'domain': 'Connection, Emotion, Attunement',
        'planet': 'Moon',
        'color': '#FF69B4',  # Pink
        'element': 'Water',
        'sacred_geometry': 'vesica_piscis'
    },
    'μ₈': {
        'name': 'Field',
        'symbol': '♆',
        'question': 'What witnesses?',
        'domain': 'Presence, Transcendence, Unity',
        'planet': 'Neptune',
        'color': '#4B0082',  # Indigo
        'element': 'Void',
        'sacred_geometry': 'circle'
    }
}


# Planet → Mu mapping weights
# Each planet contributes to each Mu with different weights
PLANET_MU_MATRIX = np.array([
    # μ₁   μ₂   μ₃   μ₄   μ₅   μ₆   μ₇   μ₈
    [1.0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.3, 0.4],  # Sun
    [0.3, 0.2, 0.4, 0.5, 0.3, 0.2, 1.0, 0.6],  # Moon
    [0.4, 0.3, 1.0, 0.4, 0.5, 0.5, 0.4, 0.3],  # Mercury
    [0.5, 0.3, 0.4, 1.0, 0.4, 0.3, 0.6, 0.4],  # Venus
    [0.6, 0.4, 0.5, 0.3, 0.5, 1.0, 0.3, 0.3],  # Mars
    [0.5, 0.4, 0.6, 0.5, 1.0, 0.4, 0.4, 0.5],  # Jupiter
    [0.3, 1.0, 0.4, 0.3, 0.4, 0.5, 0.3, 0.5],  # Saturn
    [0.4, 0.5, 0.5, 0.4, 0.6, 0.4, 0.5, 0.7],  # Uranus
    [0.4, 0.3, 0.4, 0.5, 0.5, 0.3, 0.6, 1.0],  # Neptune
    [0.5, 0.6, 0.3, 0.3, 0.4, 0.7, 0.4, 0.6],  # Pluto
])

PLANET_WEIGHTS = [2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7]


def get_planetary_positions(dt: datetime = None) -> Dict[str, float]:
    """Get current planetary positions in degrees."""
    if dt is None:
        dt = datetime.now(timezone.utc)

    date = ephem.Date(dt)

    planets = {
        'Sun': ephem.Sun(date),
        'Moon': ephem.Moon(date),
        'Mercury': ephem.Mercury(date),
        'Venus': ephem.Venus(date),
        'Mars': ephem.Mars(date),
        'Jupiter': ephem.Jupiter(date),
        'Saturn': ephem.Saturn(date),
        'Uranus': ephem.Uranus(date),
        'Neptune': ephem.Neptune(date),
        'Pluto': ephem.Pluto(date),
    }

    positions = {}
    for name, planet in planets.items():
        # Convert ecliptic longitude to degrees
        lon_rad = float(ephem.Ecliptic(planet).lon)
        lon_deg = math.degrees(lon_rad) % 360
        positions[name] = lon_deg

    return positions


def activation_function(theta_deg: float) -> float:
    """
    Convert zodiacal position to activation value.
    Uses cosine for smooth mapping.

    0° (Aries) = 1.0 (maximum activation)
    180° (Libra) = 0.0 (minimum activation)
    """
    theta_rad = math.radians(theta_deg)
    return (math.cos(theta_rad) + 1) / 2


def compute_8mu(dt: datetime = None, birth_dt: datetime = None) -> Dict:
    """
    Compute the 8 Mu vector.

    If birth_dt is provided, computes natal 8 Mu (Karma).
    Otherwise, computes current sky 8 Mu (Dharma).

    Returns:
        Dict with vector, mu details, and dominant mu
    """
    target_dt = birth_dt if birth_dt else dt
    positions = get_planetary_positions(target_dt)

    # Get activation values for each planet
    planet_names = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
                    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

    activations = np.array([activation_function(positions[p]) for p in planet_names])
    weights = np.array(PLANET_WEIGHTS)

    # Compute weighted contribution to each Mu
    mu_vector = np.zeros(8)

    for i, (act, weight) in enumerate(zip(activations, weights)):
        mu_vector += act * weight * PLANET_MU_MATRIX[i]

    # Normalize to [0, 1]
    mu_vector = mu_vector / mu_vector.max()

    # Build result
    mu_symbols = ['μ₁', 'μ₂', 'μ₃', 'μ₄', 'μ₅', 'μ₆', 'μ₇', 'μ₈']

    # Sort by value to get ranks
    sorted_indices = np.argsort(mu_vector)[::-1]
    ranks = np.zeros(8, dtype=int)
    for rank, idx in enumerate(sorted_indices, 1):
        ranks[idx] = rank

    mu_details = {}
    for i, symbol in enumerate(mu_symbols):
        info = MU_FREQUENCIES[symbol]
        mu_details[symbol] = {
            'value': round(float(mu_vector[i]), 4),
            'rank': int(ranks[i]),
            'name': info['name'],
            'question': info['question'],
            'domain': info['domain'],
            'color': info['color'],
            'sacred_geometry': info['sacred_geometry']
        }

    # Find dominant
    dominant_idx = np.argmax(mu_vector)
    dominant_symbol = mu_symbols[dominant_idx]

    return {
        'vector': [round(float(v), 4) for v in mu_vector],
        'mu': mu_details,
        'dominant': {
            'symbol': dominant_symbol,
            'name': MU_FREQUENCIES[dominant_symbol]['name'],
            'value': round(float(mu_vector[dominant_idx]), 4),
            'question': MU_FREQUENCIES[dominant_symbol]['question']
        },
        'planetary_positions': positions,
        'computed_at': (target_dt or datetime.now(timezone.utc)).isoformat(),
        'type': 'natal' if birth_dt else 'transit'
    }


def get_mu_weather(dt: datetime = None) -> Dict:
    """
    Get the current Mu weather—the cosmic field state.

    This is the FREE public reading available to all.
    """
    result = compute_8mu(dt)

    # Add weather interpretation
    dominant = result['dominant']

    weather_descriptions = {
        'Phase': "The field calls for self-definition. Who are you becoming?",
        'Existence': "Ground yourself. Build something lasting today.",
        'Cognition': "The mind is clear. Understanding flows easily.",
        'Value': "Beauty is available. What do you truly treasure?",
        'Expansion': "Growth beckons. Say yes to possibility.",
        'Action': "Move. The field supports decisive action.",
        'Relation': "Connection is highlighted. Reach out to those you love.",
        'Field': "Presence deepens. The witness awakens."
    }

    result['weather'] = {
        'dominant_field': dominant['name'],
        'message': weather_descriptions.get(dominant['name'], ''),
        'question_of_the_day': dominant['question']
    }

    return result


def compute_resonance(mu1: List[float], mu2: List[float]) -> float:
    """
    Compute resonance between two 8 Mu vectors.
    Uses cosine similarity.
    """
    a = np.array(mu1)
    b = np.array(mu2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


class MuField:
    """
    The Lambda Field interface for 8 Mu computation.

    This is the public, free layer of Mumega.
    """

    def __init__(self):
        self.cache = {}

    def now(self) -> Dict:
        """Get current Mu weather."""
        return get_mu_weather()

    def at(self, dt: datetime) -> Dict:
        """Get Mu field at specific time."""
        return get_mu_weather(dt)

    def natal(self, birth_dt: datetime) -> Dict:
        """Compute natal 8 Mu (Karma) from birth moment."""
        return compute_8mu(birth_dt=birth_dt)

    def resonance(self, mu1: List[float], mu2: List[float]) -> Dict:
        """Compute resonance between two 8 Mu vectors."""
        rho = compute_resonance(mu1, mu2)
        return {
            'resonance': round(rho, 4),
            'percent': f"{rho:.1%}",
            'interpretation': self._interpret_resonance(rho)
        }

    def _interpret_resonance(self, rho: float) -> str:
        if rho > 0.95:
            return "Near-identical frequencies. Deep recognition."
        elif rho > 0.80:
            return "Strong resonance. Natural harmony."
        elif rho > 0.60:
            return "Moderate resonance. Complementary growth."
        elif rho > 0.40:
            return "Low resonance. Different orientations."
        else:
            return "Minimal resonance. Opposing frequencies."


# Global field instance
field = MuField()


if __name__ == "__main__":
    # Test current Mu weather
    print("=" * 60)
    print("MUMEGA 8 MU WEATHER")
    print("=" * 60)

    weather = field.now()

    print(f"\nDominant Field: {weather['dominant']['symbol']} {weather['dominant']['name']}")
    print(f"Value: {weather['dominant']['value']:.0%}")
    print(f"\nQuestion: {weather['dominant']['question']}")
    print(f"\nMessage: {weather['weather']['message']}")

    print("\n8 Mu Vector:")
    for symbol, data in weather['mu'].items():
        bar = "█" * int(data['value'] * 20) + "░" * (20 - int(data['value'] * 20))
        print(f"  {symbol} {data['name']:12} {bar} {data['value']:.0%} (#{data['rank']})")

    # Test natal computation
    print("\n" + "=" * 60)
    print("HADI NATAL 8 MU")
    print("=" * 60)

    hadi_birth = datetime(1990, 11, 29, 17, 20, tzinfo=timezone.utc)
    hadi_mu = field.natal(hadi_birth)

    print(f"\nDominant: {hadi_mu['dominant']['symbol']} {hadi_mu['dominant']['name']}")

    # Resonance between Hadi and current field
    print("\n" + "=" * 60)
    print("RESONANCE: HADI ↔ NOW")
    print("=" * 60)

    res = field.resonance(hadi_mu['vector'], weather['vector'])
    print(f"\nResonance: {res['percent']}")
    print(f"Interpretation: {res['interpretation']}")
