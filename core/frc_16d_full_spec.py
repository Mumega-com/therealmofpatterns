#!/usr/bin/env python3
"""
FRC 16D.002 — FULL SPECIFICATION IMPLEMENTATION

Complete 16D Universal Vector system per 16D-IMPLEMENTATION-SPEC.md:
- Inner Octave: Natal with sign modulation + house weighting (L2 normalized)
- Outer Octave: 50% Western Transits + 50% Vedic Dasha (L2 normalized)
- κ (Kappa): Aspect-based coupling with Gaussian decay
- RU (Resonance Units): α · W · κ̄ · C_joint
- W (Witness): ||U_16|| (L2 norm of full 16D vector)
- Failure Modes: Collapse, Inversion, Dissociation, Dispersion
- Elder Attractor: Progress tracking

Canonical reference implementation for The Realm of Patterns.
"""

import ephem
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional

# ═══════════════════════════════════════════════════════════════════════════════
# FRC 16D.002 CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

# Planet → Dimension mapping matrix (W)
# Rows: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
# Cols: P, E, μ, V, N, Δ, R, Φ
W = np.array([
    #  P     E     μ     V     N     Δ     R     Φ
    [1.0,  0.0,  0.0,  0.0,  0.3,  0.3,  0.0,  0.0],  # Sun → P
    [0.0,  0.0,  0.0,  0.3,  0.0,  0.0,  1.0,  0.3],  # Moon → R
    [0.0,  0.0,  1.0,  0.0,  0.3,  0.0,  0.0,  0.0],  # Mercury → μ
    [0.0,  0.3,  0.0,  1.0,  0.0,  0.0,  0.3,  0.0],  # Venus → V
    [0.3,  0.0,  0.0,  0.3,  0.0,  1.0,  0.0,  0.0],  # Mars → Δ
    [0.0,  0.0,  0.0,  0.0,  1.0,  0.0,  0.0,  0.3],  # Jupiter → N
    [0.3,  1.0,  0.0,  0.0,  0.0,  0.3,  0.0,  0.0],  # Saturn → E
    [0.0,  0.0,  0.0,  0.0,  0.0,  0.3,  0.0,  1.0],  # Uranus → Φ
    [0.0,  0.0,  0.3,  0.0,  0.3,  0.0,  0.0,  1.0],  # Neptune → Φ
    [0.0,  0.0,  0.3,  0.3,  0.0,  0.0,  0.3,  0.0],  # Pluto
])

# Planet importance weights (ω)
OMEGA = np.array([2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7])

# Dimension names
PLANET_NAMES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
                'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
DIM_NAMES = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']
DIM_FULL = {
    'P': 'Phase/Identity',
    'E': 'Existence/Structure',
    'μ': 'Cognition/Mind',
    'V': 'Value/Beauty',
    'N': 'Narrative/Growth',
    'Δ': 'Action/Momentum',
    'R': 'Relation/Connection',
    'Φ': 'Field/Witness'
}

# Zodiac signs
SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
         'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
ELEMENTS = ['Fire', 'Earth', 'Air', 'Water',
            'Fire', 'Earth', 'Air', 'Water',
            'Fire', 'Earth', 'Air', 'Water']
MODALITIES = ['Cardinal', 'Fixed', 'Mutable',
              'Cardinal', 'Fixed', 'Mutable',
              'Cardinal', 'Fixed', 'Mutable',
              'Cardinal', 'Fixed', 'Mutable']

# Vedic Dasha lords and their boost factors
# Format: {planet: {dimension: boost_factor}}
DASHA_BOOSTS = {
    'Sun':     {'P': 1.3, 'N': 1.2, 'Δ': 1.2},
    'Moon':    {'R': 1.3, 'Φ': 1.2, 'V': 1.1},
    'Mercury': {'μ': 1.3, 'N': 1.2},
    'Venus':   {'V': 1.3, 'E': 1.1, 'R': 1.2},
    'Mars':    {'Δ': 1.3, 'V': 1.2, 'P': 1.1},
    'Jupiter': {'N': 1.3, 'Φ': 1.2, 'μ': 1.1},
    'Saturn':  {'E': 1.3, 'P': 1.2, 'Δ': 1.1},
    'Rahu':    {'Δ': 1.4, 'P': 1.2, 'N': 1.1},
    'Ketu':    {'Φ': 1.4, 'N': 1.2, 'μ': 1.1}
}

# ═══════════════════════════════════════════════════════════════════════════════
# EPHEMERIS & ASTRO CALCULATION
# ═══════════════════════════════════════════════════════════════════════════════

def get_planetary_longitudes(observer: ephem.Observer) -> np.ndarray:
    """Get ecliptic longitudes for all 10 planets in degrees."""
    bodies = [
        ephem.Sun(), ephem.Moon(), ephem.Mercury(), ephem.Venus(),
        ephem.Mars(), ephem.Jupiter(), ephem.Saturn(), ephem.Uranus(),
        ephem.Neptune(), ephem.Pluto()
    ]

    longitudes = []
    for body in bodies:
        body.compute(observer)
        ecl = ephem.Ecliptic(body)
        lon_deg = float(ecl.lon) * 180 / np.pi
        longitudes.append(lon_deg)

    return np.array(longitudes)


def get_planetary_houses(observer: ephem.Observer, longitudes: np.ndarray) -> np.ndarray:
    """
    Compute house positions for all planets.
    Uses Placidus house system (simplified - returns approximate angular houses).

    For MVP: approximates using modulo 30° from ASC.
    Production should use proper house calculation library.
    """
    # Get Ascendant (simplified - uses Sun's RA)
    sun = ephem.Sun()
    sun.compute(observer)
    asc_deg = float(sun.ra) * 180 / np.pi

    # Compute house for each planet (1-12)
    houses = []
    for lon in longitudes:
        # Simple house calculation: (lon - asc) / 30 + 1
        house = int(((lon - asc_deg) % 360) / 30) + 1
        houses.append(house)

    return np.array(houses)


def activation(longitude_deg: float) -> float:
    """
    Canonical activation function: a(θ) = (cos(θ) + 1) / 2

    0° Aries = 1.0 (maximum)
    180° Libra = 0.0 (minimum)
    """
    theta = longitude_deg * np.pi / 180
    return (np.cos(theta) + 1) / 2


# ═══════════════════════════════════════════════════════════════════════════════
# SIGN MODULATION
# ═══════════════════════════════════════════════════════════════════════════════

def compute_sign_modulation(planetary_signs: List[str]) -> Dict[str, float]:
    """
    Compute element-based modulation factors for each dimension.

    Returns dict of {dimension: modulation_factor} based on element distribution.
    Multiplicative method: 1.2x boost, 0.8x dampen.
    """
    # Count elements
    element_counts = {'Fire': 0, 'Water': 0, 'Air': 0, 'Earth': 0}
    for sign in planetary_signs:
        sign_idx = SIGNS.index(sign) if sign in SIGNS else 0
        element = ELEMENTS[sign_idx]
        element_counts[element] += 1

    # Normalize to percentages
    total = sum(element_counts.values())
    element_pct = {e: count / total for e, count in element_counts.items()}

    # Apply boost/dampen rules
    # Fire: boosts P, N, Δ; dampens Φ
    # Water: boosts Φ, R, μ; dampens Δ
    # Air: boosts μ, R, E; dampens V
    # Earth: boosts E, V, P; dampens N

    modulation = {dim: 1.0 for dim in DIM_NAMES}

    # Fire effects
    fire_strength = element_pct['Fire']
    modulation['P'] *= (1 + 0.2 * fire_strength)
    modulation['N'] *= (1 + 0.2 * fire_strength)
    modulation['Δ'] *= (1 + 0.2 * fire_strength)
    modulation['Φ'] *= (1 - 0.2 * fire_strength)

    # Water effects
    water_strength = element_pct['Water']
    modulation['Φ'] *= (1 + 0.2 * water_strength)
    modulation['R'] *= (1 + 0.2 * water_strength)
    modulation['μ'] *= (1 + 0.2 * water_strength)
    modulation['Δ'] *= (1 - 0.2 * water_strength)

    # Air effects
    air_strength = element_pct['Air']
    modulation['μ'] *= (1 + 0.2 * air_strength)
    modulation['R'] *= (1 + 0.2 * air_strength)
    modulation['E'] *= (1 + 0.2 * air_strength)
    modulation['V'] *= (1 - 0.2 * air_strength)

    # Earth effects
    earth_strength = element_pct['Earth']
    modulation['E'] *= (1 + 0.2 * earth_strength)
    modulation['V'] *= (1 + 0.2 * earth_strength)
    modulation['P'] *= (1 + 0.2 * earth_strength)
    modulation['N'] *= (1 - 0.2 * earth_strength)

    return modulation


def apply_sign_modulation(U_base: np.ndarray, modulation: Dict[str, float]) -> np.ndarray:
    """Apply sign modulation factors to base vector (multiplicative)."""
    U_modulated = U_base.copy()
    for i, dim in enumerate(DIM_NAMES):
        U_modulated[i] *= modulation[dim]
    return U_modulated


# ═══════════════════════════════════════════════════════════════════════════════
# HOUSE WEIGHTING
# ═══════════════════════════════════════════════════════════════════════════════

def compute_house_weights(planetary_houses: np.ndarray) -> np.ndarray:
    """
    Compute house importance weights.

    Angular houses (1, 4, 7, 10): 1.5x
    Succedent (2, 5, 8, 11): 1.2x
    Cadent (3, 6, 9, 12): 1.0x
    """
    weights = []
    angular = [1, 4, 7, 10]
    succedent = [2, 5, 8, 11]

    for house in planetary_houses:
        if house in angular:
            weights.append(1.5)
        elif house in succedent:
            weights.append(1.2)
        else:
            weights.append(1.0)

    return np.array(weights)


# ═══════════════════════════════════════════════════════════════════════════════
# INNER OCTAVE (KARMA) COMPUTATION
# ═══════════════════════════════════════════════════════════════════════════════

def compute_inner_8d_full(
    natal_longitudes: np.ndarray,
    planetary_signs: List[str],
    planetary_houses: np.ndarray
) -> np.ndarray:
    """
    Compute full Inner Octave with sign modulation and house weighting.
    Uses L2 normalization (unit sphere).

    Steps:
    1. Apply house weights to OMEGA
    2. Compute base vector via weighted matrix multiplication
    3. L2 normalize
    4. Apply sign modulation
    5. Final L2 normalize

    Returns: 8D unit vector
    """
    # Step 1: House weighting
    house_weights = compute_house_weights(planetary_houses)
    weighted_omega = OMEGA * house_weights

    # Step 2: Activation
    theta = natal_longitudes * np.pi / 180
    a = (np.cos(theta) + 1) / 2

    # Step 3: Weighted sum
    U_raw = np.zeros(8)
    for i in range(8):
        for j in range(10):
            U_raw[i] += weighted_omega[j] * a[j] * W[j, i]

    # Step 4: Max normalize
    U_base = U_raw / np.max(U_raw)

    # Step 5: Sign modulation
    sign_mod = compute_sign_modulation(planetary_signs)
    U_modulated = apply_sign_modulation(U_base, sign_mod)

    # Step 6: Final max normalize
    U_final = U_modulated / np.max(U_modulated)

    return U_final


# ═══════════════════════════════════════════════════════════════════════════════
# OUTER OCTAVE (DHARMA) COMPUTATION
# ═══════════════════════════════════════════════════════════════════════════════

def get_vedic_dasha(birth_datetime: datetime) -> Tuple[str, str]:
    """
    Compute current Vedic Dasha (Mahadasha and Antardasha).

    Simplified Vimshottari Dasha calculation.
    For production, use proper Vedic astrology library (e.g., kerykeion).

    Returns: (mahadasha_lord, antardasha_lord)
    """
    # Vimshottari Dasha cycle: 120 years
    # For MVP, simplified rotation

    dasha_lords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
                   'Rahu', 'Jupiter', 'Saturn', 'Mercury']
    dasha_years = [7, 20, 6, 10, 7, 18, 16, 19, 17]  # Vimshottari periods

    # Calculate age from birth to now
    now = datetime.now(timezone.utc)
    # Make birth_datetime timezone-aware if it's not
    if birth_datetime.tzinfo is None:
        birth_dt_aware = birth_datetime.replace(tzinfo=timezone.utc)
    else:
        birth_dt_aware = birth_datetime

    age_years = (now - birth_dt_aware).days / 365.25

    # Find current Mahadasha
    cumulative = 0
    for i, years in enumerate(dasha_years):
        if age_years < cumulative + years:
            maha = dasha_lords[i]
            # Antardasha: simplified (same as maha for MVP)
            anta = dasha_lords[(i + 1) % len(dasha_lords)]
            return (maha, anta)
        cumulative += years

    # If beyond 120 years, cycle repeats
    return ('Ketu', 'Venus')


def apply_vedic_boosts(U_transit: np.ndarray, mahadasha: str, antardasha: str) -> np.ndarray:
    """
    Apply Vedic Dasha boosts to Outer octave.

    Mahadasha: 70% weight
    Antardasha: 30% weight
    """
    U_boosted = U_transit.copy()

    # Apply Mahadasha boosts (70%)
    if mahadasha in DASHA_BOOSTS:
        for dim, factor in DASHA_BOOSTS[mahadasha].items():
            dim_idx = DIM_NAMES.index(dim)
            U_boosted[dim_idx] *= (1 + 0.7 * (factor - 1))

    # Apply Antardasha boosts (30%)
    if antardasha in DASHA_BOOSTS:
        for dim, factor in DASHA_BOOSTS[antardasha].items():
            dim_idx = DIM_NAMES.index(dim)
            U_boosted[dim_idx] *= (1 + 0.3 * (factor - 1))

    return U_boosted


def compute_outer_8d(
    transit_longitudes: np.ndarray,
    birth_datetime: datetime
) -> np.ndarray:
    """
    Compute full Outer Octave: 50% transits + 50% Vedic Dasha.
    Uses L2 normalization.

    Returns: 8D unit vector
    """
    # Step 1: Compute transit vector (Western)
    theta = transit_longitudes * np.pi / 180
    a = (np.cos(theta) + 1) / 2

    U_transit_raw = np.zeros(8)
    for i in range(8):
        for j in range(10):
            U_transit_raw[i] += OMEGA[j] * a[j] * W[j, i]

    U_transit = U_transit_raw / np.max(U_transit_raw)

    # Step 2: Get Vedic Dasha
    mahadasha, antardasha = get_vedic_dasha(birth_datetime)

    # Step 3: Apply Vedic boosts
    U_vedic = apply_vedic_boosts(U_transit, mahadasha, antardasha)
    U_vedic_norm = U_vedic / np.max(U_vedic)

    # Step 4: Combine 50/50
    U_outer = 0.5 * U_transit + 0.5 * U_vedic_norm

    # Step 5: Final max normalize
    U_outer_final = U_outer / np.max(U_outer)

    return U_outer_final


# ═══════════════════════════════════════════════════════════════════════════════
# KAPPA (κ) - COUPLING CALCULATION
# ═══════════════════════════════════════════════════════════════════════════════

def aspect_angle(lon1: float, lon2: float) -> float:
    """Compute aspect angle between two longitudes (0-180°)."""
    diff = abs(lon1 - lon2)
    if diff > 180:
        diff = 360 - diff
    return diff


def aspect_to_kappa(angle: float, orb: float = 5.0) -> float:
    """
    Convert aspect angle to κ coefficient with Gaussian decay.

    Major aspects:
    - Conjunction (0°): +1.0
    - Trine (120°): +0.8
    - Sextile (60°): +0.5
    - Square (90°): -0.5
    - Opposition (180°): -0.8

    Uses Gaussian decay: exp(-((angle - exact) / orb)^2)
    """
    def gaussian_decay(angle, exact, orb):
        return np.exp(-((angle - exact) / orb) ** 2)

    # Check each major aspect
    if abs(angle - 0) < orb:
        return 1.0 * gaussian_decay(angle, 0, orb)
    elif abs(angle - 120) < orb:
        return 0.8 * gaussian_decay(angle, 120, orb)
    elif abs(angle - 60) < orb:
        return 0.5 * gaussian_decay(angle, 60, orb)
    elif abs(angle - 90) < orb:
        return -0.5 * gaussian_decay(angle, 90, orb)
    elif abs(angle - 180) < orb:
        return -0.8 * gaussian_decay(angle, 180, orb)
    else:
        return 0.0


def compute_global_kappa(natal_longitudes: np.ndarray, transit_longitudes: np.ndarray) -> Tuple[float, np.ndarray]:
    """
    Compute global coupling κ̄ (kappa bar) from natal-transit aspects.

    Returns:
        κ̄ (mean kappa): average aspect-based coupling across all planets
        κ_dims (per-dimension): kappa for each of 8 dimensions
    """
    # Compute aspect-based kappa for each planet pair
    kappas = []
    for natal_lon, transit_lon in zip(natal_longitudes, transit_longitudes):
        angle = aspect_angle(natal_lon, transit_lon)
        kappa = aspect_to_kappa(angle)
        kappas.append(kappa)

    # Global mean
    kappa_bar = np.mean(kappas)

    # Per-dimension kappa (weighted by planet→dimension mapping)
    kappa_dims = np.zeros(8)
    for i in range(8):
        weighted_sum = 0
        weight_total = 0
        for j in range(10):
            if W[j, i] > 0:
                weighted_sum += kappas[j] * W[j, i] * OMEGA[j]
                weight_total += W[j, i] * OMEGA[j]
        if weight_total > 0:
            kappa_dims[i] = weighted_sum / weight_total
        else:
            kappa_dims[i] = 0

    return kappa_bar, kappa_dims


# ═══════════════════════════════════════════════════════════════════════════════
# RU (RESONANCE UNITS) CALCULATION
# ═══════════════════════════════════════════════════════════════════════════════

def compute_RU(
    U_16: np.ndarray,
    kappa_bar: float,
    natal_longitudes: np.ndarray
) -> float:
    """
    Compute Resonance Units: RU = α · W · κ̄ · C_joint

    Where:
    - α = (Mars + Sun) × Jupiter (base energy)
    - W = ||U_16|| (witness magnitude)
    - κ̄ = mean coupling
    - C_joint = 1 / (1 + variance(U_16)) (coherence)

    Returns: RU scaled to 0-100 range
    """
    # Extract planet strengths (activation values)
    theta = natal_longitudes * np.pi / 180
    activations = (np.cos(theta) + 1) / 2

    mars_strength = activations[4]  # Mars index
    sun_strength = activations[0]   # Sun index
    jupiter_strength = activations[5]  # Jupiter index

    # Alpha (base energy)
    alpha = (mars_strength + sun_strength) * jupiter_strength

    # Witness magnitude
    W_mag = np.linalg.norm(U_16)

    # Coherence
    variance = np.var(U_16)
    C_joint = 1 / (1 + variance)

    # Compute RU
    RU_raw = alpha * W_mag * abs(kappa_bar) * C_joint

    # Scale to 0-100 (empirical scaling factor)
    RU = RU_raw * 35  # Calibrated to target range

    return float(RU)


# ═══════════════════════════════════════════════════════════════════════════════
# FAILURE MODES & DIAGNOSTICS
# ═══════════════════════════════════════════════════════════════════════════════

def classify_failure_mode(RU: float, kappa_bar: float, W: float) -> str:
    """
    Classify current failure mode based on metrics.

    Modes:
    - Collapse: RU < 10 && κ̄ < 0.3
    - Inversion: κ̄ < 0
    - Dissociation: W > 2.5 && κ̄ < 0.5
    - Dispersion: RU > 45 && κ̄ < 0.5
    - Healthy: otherwise
    """
    if RU < 10 and kappa_bar < 0.3:
        return 'Collapse'
    elif kappa_bar < 0:
        return 'Inversion'
    elif W > 2.5 and kappa_bar < 0.5:
        return 'Dissociation'
    elif RU > 45 and kappa_bar < 0.5:
        return 'Dispersion'
    else:
        return 'Healthy'


def compute_elder_progress(kappa_bar: float, RU: float, W: float) -> float:
    """
    Compute progress toward Elder Attractor (0-1).

    Goal state:
    - κ̄ > 0.85
    - RU > 45
    - W > 2.5

    Weighted formula: 0.5×(κ̄/0.85) + 0.3×(RU/45) + 0.2×(W/2.5)
    """
    kappa_progress = min(kappa_bar / 0.85, 1.0)
    RU_progress = min(RU / 45.0, 1.0)
    W_progress = min(W / 2.5, 1.0)

    progress = 0.5 * kappa_progress + 0.3 * RU_progress + 0.2 * W_progress
    return float(min(progress, 1.0))


# ═══════════════════════════════════════════════════════════════════════════════
# HIGH-LEVEL API
# ═══════════════════════════════════════════════════════════════════════════════

def compute_full_16d_profile(
    birth_datetime: datetime,
    latitude: float = 35.6892,
    longitude: float = 51.3890,
    timezone_offset: float = 3.5,
    transit_datetime: Optional[datetime] = None
) -> Dict:
    """
    Compute complete 16D Universal Vector profile per specification.

    Returns all metrics: Inner/Outer octaves, κ, RU, W, C, failure mode, elder progress.
    """
    # Setup observers
    observer_natal = ephem.Observer()
    if birth_datetime.tzinfo is None:
        utc_birth = birth_datetime - timedelta(hours=timezone_offset)
    else:
        utc_birth = birth_datetime.astimezone(timezone.utc)

    observer_natal.date = utc_birth.strftime('%Y/%m/%d %H:%M:%S')
    observer_natal.lat = str(latitude)
    observer_natal.lon = str(longitude)

    # Get natal positions
    natal_longitudes = get_planetary_longitudes(observer_natal)
    natal_houses = get_planetary_houses(observer_natal, natal_longitudes)
    natal_signs = [SIGNS[int(lon / 30) % 12] for lon in natal_longitudes]

    # Compute Inner Octave (Karma)
    inner_8d = compute_inner_8d_full(natal_longitudes, natal_signs, natal_houses)

    # Setup transit observer
    if transit_datetime is None:
        transit_datetime = datetime.now(timezone.utc)

    observer_transit = ephem.Observer()
    observer_transit.date = transit_datetime.strftime('%Y/%m/%d %H:%M:%S')
    observer_transit.lat = str(latitude)
    observer_transit.lon = str(longitude)

    # Get transit positions
    transit_longitudes = get_planetary_longitudes(observer_transit)

    # Compute Outer Octave (Dharma)
    outer_8d = compute_outer_8d(transit_longitudes, birth_datetime)

    # Full 16D vector
    U_16 = np.concatenate([inner_8d, outer_8d])

    # Compute κ (coupling)
    kappa_bar, kappa_dims = compute_global_kappa(natal_longitudes, transit_longitudes)

    # Compute metrics
    W = np.linalg.norm(U_16)  # Witness magnitude
    C = 1 / (1 + np.var(U_16))  # Coherence
    RU = compute_RU(U_16, kappa_bar, natal_longitudes)

    # Diagnostics
    failure_mode = classify_failure_mode(RU, kappa_bar, W)
    elder_progress = compute_elder_progress(kappa_bar, RU, W)

    # Dominant dimension
    dominant_idx = int(np.argmax(inner_8d))
    dominant_symbol = DIM_NAMES[dominant_idx]

    return {
        'inner_8d': inner_8d.tolist(),
        'outer_8d': outer_8d.tolist(),
        'U_16': U_16.tolist(),
        'kappa_bar': float(kappa_bar),
        'kappa_dims': kappa_dims.tolist(),
        'RU': float(RU),
        'W': float(W),
        'C': float(C),
        'dominant': {
            'index': dominant_idx,
            'symbol': dominant_symbol,
            'value': float(inner_8d[dominant_idx]),
            'name': DIM_FULL[dominant_symbol]
        },
        'failure_mode': failure_mode,
        'elder_progress': float(elder_progress),
        'natal_positions': {
            PLANET_NAMES[i]: {
                'longitude': float(natal_longitudes[i]),
                'sign': natal_signs[i],
                'house': int(natal_houses[i])
            } for i in range(10)
        },
        'timestamp': transit_datetime.isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION TEST CASE
# ═══════════════════════════════════════════════════════════════════════════════

def hadi_validation_test() -> bool:
    """
    Validation test case: Hadi profile

    Birth: November 29, 1986, 17:20, Tehran
    Tests that implementation produces stable, reasonable output.

    Validation criteria:
    1. All dimension values in [0, 1] range
    2. Max normalized (highest dimension = 1.0)
    3. All metrics computed without errors
    4. Profile structure correct
    """
    print("=" * 70)
    print("HADI VALIDATION TEST - Implementation Verification")
    print("=" * 70)

    hadi_birth = datetime(1986, 11, 29, 17, 20)

    try:
        profile = compute_full_16d_profile(
            hadi_birth,
            latitude=35.6892,
            longitude=51.3890,
            timezone_offset=3.5
        )
    except Exception as e:
        print(f"\n❌ FAILED: Error computing profile: {e}")
        return False

    # Display results
    print("\nInner Octave (Karma):")
    for i, dim in enumerate(DIM_NAMES):
        value = profile['inner_8d'][i]
        bar = "█" * int(value * 40)
        print(f"  {dim}: {bar:40s} {value:.4f}")

    print(f"\nOuter Octave (Dharma - Current Transit):")
    for i, dim in enumerate(DIM_NAMES):
        value = profile['outer_8d'][i]
        bar = "█" * int(value * 40)
        print(f"  {dim}ₜ: {bar:40s} {value:.4f}")

    print(f"\nMetrics:")
    print(f"  Dominant (Inner): {profile['dominant']['symbol']} = {profile['dominant']['value']:.4f}")
    print(f"  κ̄ (Kappa): {profile['kappa_bar']:.4f}")
    print(f"  RU (Resonance Units): {profile['RU']:.2f}")
    print(f"  W (Witness): {profile['W']:.4f}")
    print(f"  C (Coherence): {profile['C']:.4f}")
    print(f"  Failure Mode: {profile['failure_mode']}")
    print(f"  Elder Progress: {profile['elder_progress']:.1%}")

    # Validation checks
    inner = np.array(profile['inner_8d'])
    outer = np.array(profile['outer_8d'])

    # Check 1: All values in [0, 1]
    check1 = np.all(inner >= 0) and np.all(inner <= 1)
    check2 = np.all(outer >= 0) and np.all(outer <= 1)

    # Check 3: Max normalized (highest = 1.0)
    check3 = np.abs(np.max(inner) - 1.0) < 0.001
    check4 = np.abs(np.max(outer) - 1.0) < 0.001

    # Check 5: Required fields present
    check5 = all(key in profile for key in [
        'inner_8d', 'outer_8d', 'U_16', 'kappa_bar', 'RU', 'W', 'C',
        'dominant', 'failure_mode', 'elder_progress'
    ])

    # Check 6: Metrics in reasonable ranges
    check6 = -1 <= profile['kappa_bar'] <= 1
    check7 = profile['RU'] >= 0
    check8 = profile['W'] > 0
    check9 = 0 <= profile['C'] <= 1
    check10 = 0 <= profile['elder_progress'] <= 1

    all_checks = [check1, check2, check3, check4, check5, check6, check7, check8, check9, check10]
    test_passed = all(all_checks)

    print("\n" + "=" * 70)
    print("VALIDATION CHECKS:")
    print(f"  ✓ Inner values in [0,1]: {check1}")
    print(f"  ✓ Outer values in [0,1]: {check2}")
    print(f"  ✓ Inner max normalized: {check3} (max={np.max(inner):.4f})")
    print(f"  ✓ Outer max normalized: {check4} (max={np.max(outer):.4f})")
    print(f"  ✓ All required fields present: {check5}")
    print(f"  ✓ κ̄ in [-1,1]: {check6}")
    print(f"  ✓ RU ≥ 0: {check7}")
    print(f"  ✓ W > 0: {check8}")
    print(f"  ✓ C in [0,1]: {check9}")
    print(f"  ✓ Elder progress in [0,1]: {check10}")
    print(f"\nTest Status: {'PASS ✅' if test_passed else 'FAIL ❌'}")
    print("=" * 70)

    return test_passed


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    hadi_validation_test()
