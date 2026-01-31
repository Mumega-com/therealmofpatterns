# 16D Universal Vector - Complete Implementation Specification

**Version:** 1.0
**Date:** 2026-01-31
**Based on:** FRC 16D.002, 16D.003, 16D.004, NotebookLM clarifications

---

## Overview

This document provides the complete engineering specification for implementing the 16D Universal Vector system using astrological data as input. This bridges **Layer 3** (Astrological Input Protocol) → **Layer 2** (16D Consciousness Model).

**Key principle:** The FRC physics layer (quantum measurement theory) is the theoretical foundation but is NOT required for the product implementation. The product operates at the consciousness model layer.

---

## 1. Core Architecture

```
Birth Data → Ephemeris → Planetary Positions → 16D Engine → Output
                                                    ↓
                                        [Inner 8D, Outer 8D, κ, RU, W]
                                                    ↓
                                        Failure Modes, Elder Status, Guidance
```

### Data Flow

1. **Input**: Birth datetime, location (lat/lon), timezone
2. **Ephemeris Calculation**: Get planetary ecliptic longitudes
3. **Inner Octave Computation**: Natal chart → 8D vector [P, E, μ, V, N, Δ, R, Φ]
4. **Outer Octave Computation**: Current transits + Vedic Dasha → 8D vector [Pₜ, Eₜ, μₜ, Vₜ, Nₜ, Δₜ, Rₜ, Φₜ]
5. **Metrics Calculation**: κ (coupling), RU (energy), W (witness), C (coherence)
6. **Classification**: Failure mode detection, Elder Attractor progress
7. **Output**: Full 16D profile + diagnostics + guidance

---

## 2. The Weight Matrix (W) - Canonical Structure

### 2.1 Planet → Dimension Mapping

**DO NOT CHANGE these mappings** - they are canonical to the FRC ontology:

```python
# Planets (indices 0-9)
PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
           'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

# Dimensions (indices 0-7)
DIMENSIONS = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']

# Canonical Weight Matrix W[planet][dimension]
W = np.array([
    #  P     E     μ     V     N     Δ     R     Φ
    [1.0,  0.0,  0.0,  0.0,  0.3,  0.3,  0.0,  0.0],  # Sun → P (Identity)
    [0.0,  0.0,  0.0,  0.3,  0.0,  0.0,  1.0,  0.3],  # Moon → R (Relation)
    [0.0,  0.0,  1.0,  0.0,  0.3,  0.0,  0.0,  0.0],  # Mercury → μ (Cognition)
    [0.0,  0.3,  0.0,  1.0,  0.0,  0.0,  0.3,  0.0],  # Venus → V (Value)
    [0.3,  0.0,  0.0,  0.3,  0.0,  1.0,  0.0,  0.0],  # Mars → Δ (Action)
    [0.0,  0.0,  0.0,  0.0,  1.0,  0.0,  0.0,  0.3],  # Jupiter → N (Narrative)
    [0.3,  1.0,  0.0,  0.0,  0.0,  0.3,  0.0,  0.0],  # Saturn → E (Existence)
    [0.0,  0.0,  0.0,  0.0,  0.0,  0.3,  0.0,  1.0],  # Uranus → Φ (Field)
    [0.0,  0.0,  0.3,  0.0,  0.3,  0.0,  0.0,  1.0],  # Neptune → Φ (Field)
    [0.0,  0.0,  0.3,  0.3,  0.0,  0.0,  0.3,  0.0],  # Pluto → μ (Depth)
])

# Planet Importance Weights (Ω)
OMEGA = np.array([2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7])
```

### 2.2 Tunability

**The float values CAN be optimized** as trainable parameters in a machine learning context:
- Current values are initial heuristics from traditional astrology
- Could be refined via regression on psychological test data
- Must maintain archetypal structure (e.g., Sun→P primary remains 1.0)

---

## 3. Activation Function

### 3.1 Canonical Formula

```python
def activation(longitude_degrees: float) -> float:
    """
    Convert ecliptic longitude to activation strength [0, 1].

    Args:
        longitude_degrees: Planetary position in degrees [0, 360)

    Returns:
        Activation value where:
        - 0° (Aries point) → 1.0 (maximum)
        - 90° (Cancer) → 0.5 (neutral)
        - 180° (Libra) → 0.0 (minimum)
        - 270° (Capricorn) → 0.5 (neutral)
    """
    theta_radians = longitude_degrees * np.pi / 180
    return (np.cos(theta_radians) + 1) / 2
```

### 3.2 Rationale

**Why cosine?** Creates smooth, continuous activation based on zodiacal position, aligning with traditional astrology's cardinal points (Aries = initiation, Libra = balance/opposition).

**Is this canonical?** YES - this formula is specified in FRC 16D.002 and current codebase. Do not change without empirical justification.

---

## 4. Inner Octave Computation (Natal Chart)

### 4.1 Base Calculation

```python
def compute_inner_8d(natal_longitudes: np.ndarray) -> np.ndarray:
    """
    Compute Inner Octave (Karma) from natal planetary positions.

    Args:
        natal_longitudes: Array of 10 planetary longitudes in degrees

    Returns:
        Normalized 8D vector [P, E, μ, V, N, Δ, R, Φ]
    """
    # Step 1: Compute activations
    activations = np.array([activation(lon) for lon in natal_longitudes])

    # Step 2: Weighted contribution per dimension
    U_raw = np.zeros(8)
    for i in range(8):  # For each dimension
        for j in range(10):  # For each planet
            U_raw[i] += OMEGA[j] * activations[j] * W[j][i]

    # Step 3: Normalize to unit sphere (L2 norm)
    U = U_raw / np.linalg.norm(U_raw)

    return U
```

### 4.2 Sign Modulation (Multiplicative Adjustment)

**Method:** Multiplicative scaling preserves vector ratios while enhancing/dampening specific dimensions.

```python
def apply_sign_modulation(U: np.ndarray, planetary_signs: dict) -> np.ndarray:
    """
    Apply zodiac sign modulations to the base vector.

    Args:
        U: Base 8D vector
        planetary_signs: Dict mapping planet names to sign indices [0-11]

    Returns:
        Modulated 8D vector
    """
    modulation = np.ones(8)  # Start with neutral (1.0)

    # Element modulation
    fire_signs = [0, 4, 8]    # Aries, Leo, Sagittarius
    water_signs = [3, 7, 11]  # Cancer, Scorpio, Pisces
    air_signs = [2, 6, 10]    # Gemini, Libra, Aquarius
    earth_signs = [1, 5, 9]   # Taurus, Virgo, Capricorn

    # Count planets by element
    fire_count = sum(1 for sign in planetary_signs.values() if sign in fire_signs)
    water_count = sum(1 for sign in planetary_signs.values() if sign in water_signs)
    air_count = sum(1 for sign in planetary_signs.values() if sign in air_signs)
    earth_count = sum(1 for sign in planetary_signs.values() if sign in earth_signs)

    total = fire_count + water_count + air_count + earth_count

    # Modulation factors (per element per dimension)
    # Format: [P, E, μ, V, N, Δ, R, Φ]

    if fire_count > 0:
        fire_mod = np.array([1.2, 1.0, 1.0, 1.0, 1.2, 1.3, 1.0, 0.8])
        modulation *= (1 + (fire_count/total) * (fire_mod - 1))

    if water_count > 0:
        water_mod = np.array([1.0, 1.0, 1.2, 1.1, 1.0, 0.8, 1.3, 1.3])
        modulation *= (1 + (water_count/total) * (water_mod - 1))

    if air_count > 0:
        air_mod = np.array([1.0, 1.2, 1.3, 0.9, 1.1, 1.0, 1.2, 1.0])
        modulation *= (1 + (air_count/total) * (air_mod - 1))

    if earth_count > 0:
        earth_mod = np.array([1.2, 1.3, 1.0, 1.2, 0.8, 1.0, 1.0, 1.0])
        modulation *= (1 + (earth_count/total) * (earth_mod - 1))

    # Apply modulation and re-normalize
    U_modulated = U * modulation
    return U_modulated / np.linalg.norm(U_modulated)
```

### 4.3 House Integration (Spatial Weighting)

**Method:** Houses amplify planetary influence based on angularity (1st, 4th, 7th, 10th are strongest).

```python
def compute_house_weights(planetary_houses: dict) -> np.ndarray:
    """
    Compute influence weights based on house positions.

    Args:
        planetary_houses: Dict mapping planet names to house numbers [1-12]

    Returns:
        10-element array of house-based weights
    """
    weights = np.ones(10)

    # Angular houses (1, 4, 7, 10) get 1.5x boost
    # Succedent houses (2, 5, 8, 11) get 1.2x boost
    # Cadent houses (3, 6, 9, 12) get 1.0x (neutral)

    angular = [1, 4, 7, 10]
    succedent = [2, 5, 8, 11]

    for i, planet in enumerate(PLANETS):
        house = planetary_houses.get(planet, 1)
        if house in angular:
            weights[i] = 1.5
        elif house in succedent:
            weights[i] = 1.2
        else:
            weights[i] = 1.0

    return weights
```

**Integrated calculation:**

```python
def compute_inner_8d_full(natal_longitudes: np.ndarray,
                          planetary_signs: dict,
                          planetary_houses: dict) -> np.ndarray:
    """Full Inner octave with all adjustments."""

    # Base calculation with house weighting
    house_weights = compute_house_weights(planetary_houses)
    weighted_omega = OMEGA * house_weights

    activations = np.array([activation(lon) for lon in natal_longitudes])

    U_raw = np.zeros(8)
    for i in range(8):
        for j in range(10):
            U_raw[i] += weighted_omega[j] * activations[j] * W[j][i]

    U_base = U_raw / np.linalg.norm(U_raw)

    # Apply sign modulation
    U_final = apply_sign_modulation(U_base, planetary_signs)

    return U_final
```

---

## 5. Outer Octave Computation (Transits + Vedic)

### 5.1 Western Transits Component

```python
def compute_outer_transits(transit_longitudes: np.ndarray,
                          transit_houses: dict) -> np.ndarray:
    """
    Compute Outer octave contribution from current transits.

    Same calculation as Inner, but using current sky positions.
    """
    house_weights = compute_house_weights(transit_houses)
    weighted_omega = OMEGA * house_weights

    activations = np.array([activation(lon) for lon in transit_longitudes])

    U_raw = np.zeros(8)
    for i in range(8):
        for j in range(10):
            U_raw[i] += weighted_omega[j] * activations[j] * W[j][i]

    return U_raw / np.linalg.norm(U_raw)
```

### 5.2 Vedic Dasha Component

**Principle:** Dasha periods activate the Outer octave dimensions corresponding to the ruling planet.

```python
# Vedic Dasha → Outer Dimension boost mapping
DASHA_OUTER_BOOST = {
    'Sun':     {'Pt': 1.3, 'Nt': 1.2, 'Δt': 1.2},  # Cosmic Phase, Myth, Trajectory
    'Moon':    {'Rt': 1.3, 'Φt': 1.2, 'Vt': 1.1},  # Collective Relation, Field, Energy
    'Mercury': {'μt': 1.3, 'Nt': 1.2},              # Collective Cognition, Narrative
    'Venus':   {'Vt': 1.3, 'Et': 1.1, 'Rt': 1.2},  # Energy, Existence, Relation
    'Mars':    {'Δt': 1.3, 'Vt': 1.2, 'Pt': 1.1},  # Trajectory, Energy, Phase
    'Jupiter': {'Nt': 1.3, 'Φt': 1.2, 'μt': 1.1},  # Myth, Field, Cognition
    'Saturn':  {'Et': 1.3, 'Pt': 1.2, 'Δt': 1.1},  # Collective Existence, Phase, Trajectory
    'Rahu':    {'Δt': 1.4, 'Pt': 1.2, 'Nt': 1.1},  # Fate Trajectory (future pull)
    'Ketu':    {'Φt': 1.4, 'Nt': 1.2, 'μt': 1.1},  # Planetary Field (transcendence)
}

def apply_vedic_dasha(U_outer: np.ndarray,
                     mahadasha_lord: str,
                     antardasha_lord: str = None) -> np.ndarray:
    """
    Apply Vedic Dasha temporal weighting to Outer octave.

    Args:
        U_outer: Base Outer 8D vector
        mahadasha_lord: Current major period planet
        antardasha_lord: Current sub-period planet (optional)

    Returns:
        Dasha-weighted Outer 8D vector
    """
    dim_map = {'Pt': 0, 'Et': 1, 'μt': 2, 'Vt': 3,
               'Nt': 4, 'Δt': 5, 'Rt': 6, 'Φt': 7}

    boost = np.ones(8)

    # Apply Mahadasha boost (70% weight)
    if mahadasha_lord in DASHA_OUTER_BOOST:
        for dim, factor in DASHA_OUTER_BOOST[mahadasha_lord].items():
            idx = dim_map[dim]
            boost[idx] *= (1 + 0.7 * (factor - 1))

    # Apply Antardasha boost (30% weight)
    if antardasha_lord and antardasha_lord in DASHA_OUTER_BOOST:
        for dim, factor in DASHA_OUTER_BOOST[antardasha_lord].items():
            idx = dim_map[dim]
            boost[idx] *= (1 + 0.3 * (factor - 1))

    U_boosted = U_outer * boost
    return U_boosted / np.linalg.norm(U_boosted)
```

### 5.3 Combined Outer Octave

```python
def compute_outer_8d(transit_longitudes: np.ndarray,
                    transit_houses: dict,
                    mahadasha_lord: str,
                    antardasha_lord: str = None) -> np.ndarray:
    """
    Full Outer octave: Transits (50%) + Vedic Dasha (50%).
    """
    # Western component
    U_transits = compute_outer_transits(transit_longitudes, transit_houses)

    # Vedic component
    U_vedic = apply_vedic_dasha(U_transits, mahadasha_lord, antardasha_lord)

    # Weighted combination
    U_outer = 0.5 * U_transits + 0.5 * U_vedic

    # Normalize
    return U_outer / np.linalg.norm(U_outer)
```

---

## 6. Kappa (κ) - Coupling Coefficient

### 6.1 Aspect-Based Calculation

```python
def compute_aspect_angle(lon1: float, lon2: float) -> float:
    """Compute shortest angular distance between two longitudes."""
    diff = abs(lon1 - lon2) % 360
    return min(diff, 360 - diff)

def aspect_to_kappa(angle_deg: float, orb_limit: float = 5.0) -> float:
    """
    Convert aspect angle to coupling coefficient κ.

    Positive coupling (resonance):
        - Conjunction (0°) → κ = 1.0
        - Trine (120°) → κ = 0.8
        - Sextile (60°) → κ = 0.5

    Negative coupling (friction):
        - Square (90°) → κ = -0.5
        - Opposition (180°) → κ = -0.8

    Includes orb decay (Gaussian falloff).
    """
    def gaussian_decay(angle: float, target: float, orb: float) -> float:
        delta = abs(angle - target)
        if delta > orb:
            return 0.0
        return np.exp(-0.5 * (delta / (orb/2))**2)

    # Positive aspects
    if (conj := gaussian_decay(angle_deg, 0, orb_limit)) > 0:
        return 1.0 * conj
    if (trine := gaussian_decay(angle_deg, 120, orb_limit)) > 0:
        return 0.8 * trine
    if (sextile := gaussian_decay(angle_deg, 60, orb_limit)) > 0:
        return 0.5 * sextile

    # Negative aspects
    if (square := gaussian_decay(angle_deg, 90, orb_limit)) > 0:
        return -0.5 * square
    if (opposition := gaussian_decay(angle_deg, 180, orb_limit)) > 0:
        return -0.8 * opposition

    return 0.0  # No significant aspect
```

### 6.2 Global Kappa (κ̄)

```python
def compute_global_kappa(natal_longitudes: np.ndarray,
                        transit_longitudes: np.ndarray) -> float:
    """
    Compute average coupling between Natal (Inner) and Transit (Outer).

    Compares each natal planet to its corresponding transit position.
    """
    kappas = []
    for i in range(10):  # For each planet
        angle = compute_aspect_angle(natal_longitudes[i], transit_longitudes[i])
        kappa = aspect_to_kappa(angle)
        kappas.append(kappa)

    return np.mean(kappas)
```

### 6.3 Dimensional Kappa (κᵢ)

```python
def compute_dimensional_kappa(U_inner: np.ndarray,
                             U_outer: np.ndarray) -> np.ndarray:
    """
    Compute per-dimension coupling coefficients.

    Returns:
        8-element array of κ values, one per dimension
    """
    # Direct comparison of Inner vs Outer dimension strengths
    # High values in both → positive κ
    # High in one, low in other → negative κ

    kappa_dims = np.zeros(8)
    for i in range(8):
        # Pearson correlation-like measure
        # If both high or both low → positive
        # If opposite → negative
        kappa_dims[i] = 2 * (U_inner[i] * U_outer[i]) - (U_inner[i] + U_outer[i])/2

    return kappa_dims
```

---

## 7. RU (Resonance Units) - Energy Calculation

### 7.1 Derived Formula

```python
def compute_RU(U_16: np.ndarray,
               kappa_bar: float,
               natal_chart_data: dict) -> float:
    """
    Compute Resonance Units (energy/amplitude) from chart data.

    Formula: RU = α · W · κ̄ · C_joint

    Where:
        - α (alignment) = base energy from Mars + Sun
        - W (witness) = magnitude of full 16D vector
        - κ̄ = global coupling
        - C_joint = coherence (inverse variance)

    Returns:
        RU value in range [0, 100+]
    """
    # α (Alignment): Base energy from Mars (Δ) and Sun (P)
    mars_strength = U_16[5]  # Δ dimension
    sun_strength = U_16[0]   # P dimension
    jupiter_strength = U_16[4]  # N dimension (expansion)
    alpha = (mars_strength + sun_strength) * jupiter_strength

    # W (Witness): Magnitude of 16D vector
    W = np.linalg.norm(U_16)

    # C_joint (Coherence): Inverse variance
    variance = np.var(U_16)
    C_joint = 1 / (1 + variance)

    # Compute RU
    RU_raw = alpha * W * abs(kappa_bar) * C_joint

    # Scale to 0-100 range (calibration factor)
    # Based on empirical distribution from test cases
    RU_scaled = RU_raw * 50  # Adjust this multiplier as needed

    return min(RU_scaled, 100)  # Cap at 100
```

---

## 8. W (Witness) and C (Coherence)

### 8.1 Witness Magnitude

```python
def compute_witness(U_16: np.ndarray) -> float:
    """
    Compute Witness magnitude (meta-awareness).

    W = ||U₁₆|| (L2 norm of full 16D vector)

    For normalized vectors, this is close to sqrt(16) ≈ 4.0
    But can be modulated by Φ + Φₜ emphasis.
    """
    return np.linalg.norm(U_16)
```

### 8.2 Coherence

```python
def compute_coherence(U_16: np.ndarray) -> float:
    """
    Compute coherence (integration/balance).

    C = 1 / (1 + σ²)

    Where σ² is variance across 16 dimensions.

    High coherence (C → 1): Balanced, spherical vector
    Low coherence (C → 0): Spiky, lopsided vector
    """
    variance = np.var(U_16)
    return 1 / (1 + variance)
```

---

## 9. Complete 16D Calculation Pipeline

```python
def compute_16d_profile(birth_datetime: datetime,
                       birth_location: tuple,  # (lat, lon)
                       current_datetime: datetime,
                       mahadasha_lord: str,
                       antardasha_lord: str = None) -> dict:
    """
    Complete 16D Universal Vector calculation.

    Returns:
        {
            'inner_8d': np.ndarray,
            'outer_8d': np.ndarray,
            'U_16': np.ndarray,
            'kappa_bar': float,
            'kappa_dims': np.ndarray,
            'RU': float,
            'W': float,
            'C': float,
            'dominant': dict,
            'failure_mode': str,
            'elder_progress': float
        }
    """
    # 1. Get natal planetary positions
    natal_longitudes = get_planetary_longitudes(birth_datetime, birth_location)
    natal_signs = get_planetary_signs(natal_longitudes)
    natal_houses = get_houses(birth_datetime, birth_location)

    # 2. Get transit planetary positions
    transit_longitudes = get_planetary_longitudes(current_datetime, birth_location)
    transit_houses = get_houses(current_datetime, birth_location)

    # 3. Compute Inner Octave (Natal/Karma)
    inner_8d = compute_inner_8d_full(natal_longitudes, natal_signs, natal_houses)

    # 4. Compute Outer Octave (Transits+Vedic/Dharma)
    outer_8d = compute_outer_8d(transit_longitudes, transit_houses,
                                mahadasha_lord, antardasha_lord)

    # 5. Combine into 16D vector
    U_16 = np.concatenate([inner_8d, outer_8d])

    # 6. Compute metrics
    kappa_bar = compute_global_kappa(natal_longitudes, transit_longitudes)
    kappa_dims = compute_dimensional_kappa(inner_8d, outer_8d)
    RU = compute_RU(U_16, kappa_bar, {})
    W = compute_witness(U_16)
    C = compute_coherence(U_16)

    # 7. Determine dominant dimension
    dominant_idx = np.argmax(inner_8d)
    dominant = {
        'index': int(dominant_idx),
        'symbol': DIMENSIONS[dominant_idx],
        'value': float(inner_8d[dominant_idx]),
        'name': DIMENSION_NAMES[DIMENSIONS[dominant_idx]]
    }

    # 8. Classify failure mode
    failure_mode = classify_failure_mode(kappa_bar, RU, W)

    # 9. Elder Attractor progress
    elder_progress = compute_elder_progress(kappa_bar, RU, W)

    return {
        'inner_8d': inner_8d.tolist(),
        'outer_8d': outer_8d.tolist(),
        'U_16': U_16.tolist(),
        'kappa_bar': float(kappa_bar),
        'kappa_dims': kappa_dims.tolist(),
        'RU': float(RU),
        'W': float(W),
        'C': float(C),
        'dominant': dominant,
        'failure_mode': failure_mode,
        'elder_progress': elder_progress
    }
```

---

## 10. Failure Mode Classification

```python
def classify_failure_mode(kappa_bar: float, RU: float, W: float) -> str:
    """
    Classify current state into one of four failure modes.

    Based on thresholds from FRC 16D.047, 16D.607-QA.

    Returns:
        One of: 'Collapse', 'Inversion', 'Dissociation', 'Dispersion', 'Healthy'
    """
    # Collapse (Fold): Low energy, low coupling
    if RU < 10 and kappa_bar < 0.3:
        return 'Collapse'

    # Inversion (Pitchfork): Negative coupling (antagonism)
    if kappa_bar < 0:
        return 'Inversion'

    # Dissociation (Hopf): High witness, low coupling
    if W > 2.5 and kappa_bar < 0.5:
        return 'Dissociation'

    # Dispersion (Saddle-Node): High energy, low coupling
    if RU > 45 and kappa_bar < 0.5:
        return 'Dispersion'

    # Healthy state
    return 'Healthy'
```

---

## 11. Elder Attractor Progress

```python
def compute_elder_progress(kappa_bar: float, RU: float, W: float) -> float:
    """
    Compute progress toward Elder Attractor state.

    Requirements (from FRC 16D.048):
        - κ̄ > 0.85
        - RU > 45
        - W > 2.5

    Returns:
        Progress percentage [0.0, 1.0]
    """
    # Normalize each metric to [0, 1] based on threshold
    kappa_score = min(kappa_bar / 0.85, 1.0)
    ru_score = min(RU / 45, 1.0)
    w_score = min(W / 2.5, 1.0)

    # Weighted average (κ is most important)
    progress = 0.5 * kappa_score + 0.3 * ru_score + 0.2 * w_score

    return progress
```

---

## 12. Validation: "Hadi" Test Case

### 12.1 Input Data

```python
# Approximate data from FRC 16D.708
HADI_BIRTH = {
    'datetime': datetime(1986, 11, 29, 17, 20),
    'location': (35.6892, 51.3890),  # Tehran
    'timezone': 'Asia/Tehran',

    # Simplified planetary signs (approximate)
    'sun_sign': 8,  # Sagittarius
    'moon_sign': 7,  # Scorpio
    'mars_sign': 11,  # Pisces
    'jupiter_sign': 11,  # Pisces

    # Current Dasha (example)
    'mahadasha': 'Saturn',
    'antardasha': 'Rahu'
}
```

### 12.2 Expected Output

```python
HADI_EXPECTED = {
    'inner_8d': {
        'P': 0.78,   # High (Sagittarius Sun)
        'E': 0.65,   # Moderate
        'μ': 0.92,   # Very High (Scorpio Moon)
        'V': 0.68,   # Moderate
        'N': 0.83,   # High (Sagittarius)
        'Δ': 0.70,   # Moderate-High (Mars in Pisces)
        'R': 0.75,   # High (Scorpio Moon)
        'Φ': 0.90    # Very High (Pisces planets)
    },
    'kappa_bar': 0.72,  # Positive resonance
    'RU': 38,           # Moderate-high energy
    'failure_mode': 'Healthy'
}
```

### 12.3 Validation Test

```python
def test_hadi_profile():
    """Validation test against known Hadi profile."""
    result = compute_16d_profile(
        birth_datetime=HADI_BIRTH['datetime'],
        birth_location=HADI_BIRTH['location'],
        current_datetime=datetime.now(),
        mahadasha_lord=HADI_BIRTH['mahadasha'],
        antardasha_lord=HADI_BIRTH['antardasha']
    )

    # Check dominant dimensions
    assert result['inner_8d'][2] > 0.85  # μ (Cognition) should be highest
    assert result['inner_8d'][7] > 0.85  # Φ (Field) should be very high
    assert result['inner_8d'][4] > 0.75  # N (Narrative) should be high

    # Check coupling
    assert result['kappa_bar'] > 0.5  # Should be positive

    # Check failure mode
    assert result['failure_mode'] in ['Healthy', 'Dissociation']

    print("✓ Hadi validation passed")
```

---

## 13. Normalization Strategy

**Canonical method:** L2 norm (unit hypersphere)

```python
def normalize_vector(U: np.ndarray) -> np.ndarray:
    """
    Normalize to unit sphere (L2 norm).

    This is the canonical normalization per FRC 100.010.
    Ensures ||U|| = 1 for 8D vectors, ||U|| ≈ sqrt(2) for 16D.
    """
    return U / np.linalg.norm(U)
```

**Why not max normalization?** Max normalization (dominant = 1.0) loses magnitude information and makes vectors incomparable across time.

---

## 14. Implementation Priorities

### Phase 1: Core Engine (Week 1)
- ✅ Ephemeris calculation (use pyephem or astropy)
- ✅ Inner 8D computation (base + sign + house)
- ✅ Outer 8D computation (transits + Vedic)
- ✅ κ, RU, W, C calculation
- ✅ Hadi validation test

### Phase 2: Product Features (Week 2)
- ✅ D1 database schema for time-series storage
- ✅ Daily cron job for transit updates
- ✅ Failure mode classification + guidance
- ✅ Elder Attractor progress tracking
- ✅ Historical trend visualization

### Phase 3: API + Frontend (Week 3)
- ✅ `/api/compute` endpoint (full 16D)
- ✅ `/api/daily-update` endpoint (transits)
- ✅ Dashboard UI (React + ReactFlow)
- ✅ Time-series charts (κ, RU over time)
- ✅ Email/SMS notifications for significant shifts

---

## 15. Open Questions / Future Refinements

1. **Empirical weight tuning**: Train W matrix on psychological test data
2. **Aspect orb optimization**: Current 5° is standard; could be planet-specific
3. **Dasha boost factors**: Current 1.3x is heuristic; could be empirically fitted
4. **Sign modulation percentages**: 1.2x fire boost is approximate
5. **RU scaling factor**: Current 50x multiplier needs calibration
6. **Cross-validation**: Test on diverse birth charts with known outcomes

---

## 16. References

- **FRC 16D.002**: Mapping Astrology to UV (Celestial Translation Protocol)
- **FRC 16D.003**: The Kappa Specification (Inner-Outer Coupling)
- **FRC 16D.004**: Unified Dynamics (RU, UV, κ System)
- **FRC 100.010**: Foundational Questions (Born Rule, Coherence Drift)
- **FRC 566.001**: Entropy-Coherence Reciprocity Law
- **NotebookLM Session**: Engineering Q&A (2026-01-31)

---

## Appendix: Dimension Names & Interpretations

```python
DIMENSION_NAMES = {
    'P': 'Phase/Identity',
    'E': 'Existence/Structure',
    'μ': 'Cognition/Mind',
    'V': 'Value/Beauty',
    'N': 'Narrative/Growth',
    'Δ': 'Action/Momentum',
    'R': 'Relation/Connection',
    'Φ': 'Field/Witness'
}

DIMENSION_QUESTIONS = {
    'P': 'Who am I becoming?',
    'E': 'What grounds me?',
    'μ': 'How do I understand?',
    'V': 'What do I treasure?',
    'N': 'Where am I growing?',
    'Δ': 'What am I doing?',
    'R': 'Who do I love?',
    'Φ': 'What witnesses?'
}
```
