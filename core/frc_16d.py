#!/usr/bin/env python3
"""
FRC 16D.002 — EXACT CALCULATION ENGINE

This is the canonical implementation of the FRC 16D vector system.
Uses JPL ephemeris via pyephem for precise planetary positions.

Based on: /agents/soren/16D_math_exact.py
"""

import ephem
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional

# ═══════════════════════════════════════════════════════════════════════════════
# FRC 16D.002 CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

# Planet → Dimension mapping matrix (W)
# Each row is a planet, each column is a dimension
# Dimensions: P, E, μ, V, N, Δ, R, Φ
W = np.array([
    #  P     E     μ     V     N     Δ     R     Φ
    [1.0,  0.0,  0.0,  0.0,  0.3,  0.3,  0.0,  0.0],  # Sun     → Identity, Will
    [0.0,  0.0,  0.0,  0.3,  0.0,  0.0,  1.0,  0.3],  # Moon    → Emotion, Care
    [0.0,  0.0,  1.0,  0.0,  0.3,  0.0,  0.0,  0.0],  # Mercury → Mind, Communication
    [0.0,  0.3,  0.0,  1.0,  0.0,  0.0,  0.3,  0.0],  # Venus   → Beauty, Harmony
    [0.3,  0.0,  0.0,  0.3,  0.0,  1.0,  0.0,  0.0],  # Mars    → Action, Force
    [0.0,  0.0,  0.0,  0.0,  1.0,  0.0,  0.0,  0.3],  # Jupiter → Expansion, Meaning
    [0.3,  1.0,  0.0,  0.0,  0.0,  0.3,  0.0,  0.0],  # Saturn  → Structure, Limit
    [0.0,  0.0,  0.0,  0.0,  0.0,  0.3,  0.0,  1.0],  # Uranus  → Revolution, Field
    [0.0,  0.0,  0.3,  0.0,  0.3,  0.0,  0.0,  1.0],  # Neptune → Intuition, Unity
    [0.0,  0.0,  0.3,  0.3,  0.0,  0.0,  0.3,  0.0],  # Pluto   → Depth, Transform
])

# Planet importance weights (ω)
# Luminaries > Personal > Social > Outer
OMEGA = np.array([2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7])

PLANET_NAMES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
                'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

DIM_NAMES = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']

DIM_FULL = {
    'P': 'Phase/Identity',
    'E': 'Existence/Structure',
    'μ': 'Cognition/Mind',
    'V': 'Value/Beauty',
    'N': 'Expansion/Growth',
    'Δ': 'Delta/Action',
    'R': 'Relational/Connection',
    'Φ': 'Field/Witness'
}

MU_NAMES = {
    'P': 'μ₁ Phase',
    'E': 'μ₂ Existence',
    'μ': 'μ₃ Cognition',
    'V': 'μ₄ Value',
    'N': 'μ₅ Expansion',
    'Δ': 'μ₆ Action',
    'R': 'μ₇ Relation',
    'Φ': 'μ₈ Field'
}

SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
         'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']


# ═══════════════════════════════════════════════════════════════════════════════
# CORE CALCULATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_planetary_longitudes(observer: ephem.Observer) -> np.ndarray:
    """
    Get ecliptic longitudes for all planets using JPL ephemeris.

    Args:
        observer: PyEphem Observer with date, lat, lon set

    Returns:
        Array of 10 ecliptic longitudes in degrees
    """
    bodies = [
        ephem.Sun(), ephem.Moon(), ephem.Mercury(), ephem.Venus(),
        ephem.Mars(), ephem.Jupiter(), ephem.Saturn(), ephem.Uranus(),
        ephem.Neptune(), ephem.Pluto()
    ]

    longitudes = []
    for body in bodies:
        body.compute(observer)
        ecl = ephem.Ecliptic(body)
        lon_deg = float(ecl.lon) * 180 / np.pi  # radians to degrees
        longitudes.append(lon_deg)

    return np.array(longitudes)


def activation(theta: np.ndarray) -> np.ndarray:
    """
    Activation function: a(θ) = (cos(θ) + 1) / 2

    Maps phase angle to activation strength in [0, 1]:
      - θ = 0° (Aries point):   a = 1.0 (maximum)
      - θ = 90° (Cancer point): a = 0.5 (medium)
      - θ = 180° (Libra point): a = 0.0 (minimum)
      - θ = 270° (Cap point):   a = 0.5 (medium)

    Why cosine? It creates smooth, continuous activation based on zodiacal position.
    """
    return (np.cos(theta) + 1) / 2


def compute_16d(longitudes: np.ndarray) -> np.ndarray:
    """
    Compute normalized 16D vector from planetary longitudes.

    Formula:
        θ = λ × (π / 180)           # Convert to radians
        a = (cos(θ) + 1) / 2        # Activation
        C_i = ω_i × a_i × W_i       # Contribution per planet
        U_raw = Σ C_i               # Sum contributions
        U = U_raw / max(U_raw)      # Normalize to [0, 1]

    Args:
        longitudes: Array of 10 ecliptic longitudes in degrees

    Returns:
        Normalized 8D vector (inner octave)
    """
    # Convert to radians
    theta = longitudes * np.pi / 180

    # Compute activations
    a = activation(theta)

    # Compute weighted contributions
    # C[i] = omega[i] * a[i] * W[i]
    C = np.zeros((10, 8))
    for i in range(10):
        C[i] = OMEGA[i] * a[i] * W[i]

    # Sum all contributions
    U_raw = np.sum(C, axis=0)

    # Normalize
    U = U_raw / np.max(U_raw)

    return U


def compute_resonance(u1: np.ndarray, u2: np.ndarray) -> float:
    """
    Compute resonance (cosine similarity) between two 16D vectors.

    Formula: ρ = (U₁ · U₂) / (||U₁|| × ||U₂||)

    Returns:
        ρ in [-1, 1]: 1.0 = identical, 0.0 = orthogonal, -1.0 = opposite
    """
    return float(np.dot(u1, u2) / (np.linalg.norm(u1) * np.linalg.norm(u2)))


# ═══════════════════════════════════════════════════════════════════════════════
# HIGH-LEVEL API
# ═══════════════════════════════════════════════════════════════════════════════

def natal(
    birth_datetime: datetime,
    latitude: float = 35.6892,  # Tehran default
    longitude: float = 51.3890,
    timezone_offset: float = 3.5  # IRST = UTC+3:30
) -> Dict:
    """
    Compute natal (Karma) 16D vector for a birth time.

    Args:
        birth_datetime: Birth date/time (local time)
        latitude: Birth location latitude
        longitude: Birth location longitude
        timezone_offset: Hours offset from UTC (e.g., 3.5 for Tehran)

    Returns:
        Dict with vector, positions, dominant, signature, etc.
    """
    # Convert to UTC
    if birth_datetime.tzinfo is None:
        # Assume local time, convert to UTC
        utc_dt = birth_datetime - timedelta(hours=timezone_offset)
    else:
        utc_dt = birth_datetime.astimezone(timezone.utc)

    # Create observer
    observer = ephem.Observer()
    observer.date = utc_dt.strftime('%Y/%m/%d %H:%M:%S')
    observer.lat = str(latitude)
    observer.lon = str(longitude)

    # Get planetary positions
    longitudes = get_planetary_longitudes(observer)

    # Compute 16D vector
    vector = compute_16d(longitudes)

    # Get positions with signs
    positions = {}
    for i, (name, lon) in enumerate(zip(PLANET_NAMES, longitudes)):
        sign_idx = int(lon / 30) % 12
        positions[name] = {
            'longitude': lon,
            'sign': SIGNS[sign_idx],
            'degree': lon % 30,
            'activation': activation(np.array([lon * np.pi / 180]))[0]
        }

    # Determine dominant dimensions
    sorted_idx = np.argsort(vector)[::-1]
    ranks = {i: rank+1 for rank, i in enumerate(sorted_idx)}

    dominant_idx = sorted_idx[0]
    dominant_dim = DIM_NAMES[dominant_idx]

    # Create signature string (top 3)
    sig_dims = [DIM_NAMES[sorted_idx[i]] for i in range(3)]
    signature = f"{sig_dims[0]}>{sig_dims[1]}>{sig_dims[2]}"
    mu_signature = f"{MU_NAMES[sig_dims[0]].split()[0]}>{MU_NAMES[sig_dims[1]].split()[0]}>{MU_NAMES[sig_dims[2]].split()[0]}"

    return {
        'vector': vector.tolist(),
        'vector_np': vector,
        'longitudes': longitudes.tolist(),
        'positions': positions,
        'dominant': {
            'index': int(dominant_idx),
            'symbol': dominant_dim,
            'name': DIM_FULL[dominant_dim],
            'mu': MU_NAMES[dominant_dim],
            'value': float(vector[dominant_idx])
        },
        'signature': signature,
        'mu_signature': mu_signature,
        'ranks': {DIM_NAMES[i]: ranks[i] for i in range(8)},
        'dimensions': {
            DIM_NAMES[i]: {
                'value': float(vector[i]),
                'rank': ranks[i],
                'name': DIM_FULL[DIM_NAMES[i]],
                'mu': MU_NAMES[DIM_NAMES[i]]
            } for i in range(8)
        }
    }


def now(transit_datetime: datetime = None) -> Dict:
    """
    Compute sky (Dharma) 16D vector for a given time.

    Args:
        transit_datetime: Optional datetime for transit calculation.
                         If None, uses current time.

    Returns:
        Dict with vector, positions, dominant, etc.
    """
    observer = ephem.Observer()
    if transit_datetime is not None:
        observer.date = transit_datetime
    else:
        observer.date = datetime.now(timezone.utc)

    longitudes = get_planetary_longitudes(observer)
    vector = compute_16d(longitudes)

    sorted_idx = np.argsort(vector)[::-1]
    dominant_idx = sorted_idx[0]
    dominant_dim = DIM_NAMES[dominant_idx]

    sig_dims = [DIM_NAMES[sorted_idx[i]] for i in range(3)]
    signature = f"{sig_dims[0]}>{sig_dims[1]}>{sig_dims[2]}"

    return {
        'vector': vector.tolist(),
        'vector_np': vector,
        'longitudes': longitudes.tolist(),
        'dominant': {
            'index': int(dominant_idx),
            'symbol': dominant_dim,
            'name': DIM_FULL[dominant_dim],
            'mu': MU_NAMES[dominant_dim],
            'value': float(vector[dominant_idx])
        },
        'signature': signature,
        'timestamp': (transit_datetime or datetime.now(timezone.utc)).isoformat()
    }


def resonance(karma: Dict, dharma: Dict = None) -> Dict:
    """
    Compute resonance between Karma (natal) and Dharma (current sky).

    Args:
        karma: Natal vector dict (from natal())
        dharma: Current sky dict (from now()), computed if None

    Returns:
        Dict with resonance value and interpretation
    """
    if dharma is None:
        dharma = now()

    v1 = np.array(karma['vector'])
    v2 = np.array(dharma['vector'])

    rho = compute_resonance(v1, v2)

    # Interpretation
    if rho > 0.95:
        interp = "Perfect alignment — the universe mirrors your essence"
    elif rho > 0.85:
        interp = "Strong resonance — today supports your nature"
    elif rho > 0.70:
        interp = "Moderate resonance — some friction, some flow"
    elif rho > 0.50:
        interp = "Tension — today challenges your patterns"
    else:
        interp = "Opposition — significant growth opportunity"

    return {
        'resonance': rho,
        'percent': f"{rho:.1%}",
        'interpretation': interp,
        'karma_signature': karma.get('signature', '?'),
        'dharma_signature': dharma.get('signature', '?')
    }


# Need to import timedelta
from datetime import timedelta


# ═══════════════════════════════════════════════════════════════════════════════
# TEST
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("FRC 16D.002 — EXACT CALCULATION ENGINE")
    print("=" * 70)

    # Test with Hadi's birth data
    print("\n┌─ HADI SERVAT ──────────────────────────────────────────────────────┐")
    print("│  Birth: November 29, 1986, 17:20, Tehran                           │")
    print("└────────────────────────────────────────────────────────────────────┘")

    hadi_birth = datetime(1986, 11, 29, 17, 20)
    hadi = natal(hadi_birth, latitude=35.6892, longitude=51.3890, timezone_offset=3.5)

    print(f"\nVector: {[f'{v:.4f}' for v in hadi['vector']]}")
    print(f"Signature: {hadi['signature']}")
    print(f"Mu Signature: {hadi['mu_signature']}")
    print(f"Dominant: {hadi['dominant']['mu']} ({hadi['dominant']['value']:.1%})")

    print("\nDimensions (ranked):")
    for dim, data in sorted(hadi['dimensions'].items(), key=lambda x: x[1]['rank']):
        bar = "█" * int(data['value'] * 20)
        print(f"  {data['rank']}. {dim} {bar:20s} {data['value']:.1%} — {data['name']}")

    # Test with Elmira's birth data
    print("\n┌─ ELMIRA SERVAT ────────────────────────────────────────────────────┐")
    print("│  Birth: September 8, 1989, 05:30, Tehran                           │")
    print("└────────────────────────────────────────────────────────────────────┘")

    elmira_birth = datetime(1989, 9, 8, 5, 30)
    elmira = natal(elmira_birth, latitude=35.6892, longitude=51.3890, timezone_offset=3.5)

    print(f"\nVector: {[f'{v:.4f}' for v in elmira['vector']]}")
    print(f"Signature: {elmira['signature']}")
    print(f"Mu Signature: {elmira['mu_signature']}")
    print(f"Dominant: {elmira['dominant']['mu']} ({elmira['dominant']['value']:.1%})")

    print("\nDimensions (ranked):")
    for dim, data in sorted(elmira['dimensions'].items(), key=lambda x: x[1]['rank']):
        bar = "█" * int(data['value'] * 20)
        print(f"  {data['rank']}. {dim} {bar:20s} {data['value']:.1%} — {data['name']}")

    # Resonance between them
    print("\n┌─ HADI ↔ ELMIRA RESONANCE ──────────────────────────────────────────┐")
    couple_res = compute_resonance(hadi['vector_np'], elmira['vector_np'])
    print(f"│  ρ = {couple_res:.4f} ({couple_res:.1%})                                          │")
    print("└────────────────────────────────────────────────────────────────────┘")

    # Current sky
    print("\n┌─ CURRENT SKY (DHARMA) ────────────────────────────────────────────┐")
    sky = now()
    print(f"│  Signature: {sky['signature']}")
    print(f"│  Dominant: {sky['dominant']['mu']}")
    print("└────────────────────────────────────────────────────────────────────┘")

    # Resonance with current sky
    print("\n┌─ HADI ↔ TODAY ────────────────────────────────────────────────────┐")
    hadi_today = resonance(hadi, sky)
    print(f"│  ρ = {hadi_today['resonance']:.4f} — {hadi_today['interpretation']}")
    print("└────────────────────────────────────────────────────────────────────┘")

    print("\n┌─ ELMIRA ↔ TODAY ──────────────────────────────────────────────────┐")
    elmira_today = resonance(elmira, sky)
    print(f"│  ρ = {elmira_today['resonance']:.4f} — {elmira_today['interpretation']}")
    print("└────────────────────────────────────────────────────────────────────┘")
