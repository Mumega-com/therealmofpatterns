# 16D Mathematical Specification

## FRC 16D.002 — The Complete Vector System

### Overview

The FRC 16D system computes an 8-dimensional identity vector from astronomical data at a given moment (typically birth). Each dimension represents a fundamental aspect of consciousness.

## The 8 Dimensions

| Index | Symbol | Name | Domain | Planetary Ruler |
|-------|--------|------|--------|-----------------|
| 0 | P | Phase | Identity, Will | Sun |
| 1 | E | Existence | Structure, Form | Saturn |
| 2 | μ | Cognition | Mind, Communication | Mercury |
| 3 | V | Value | Beauty, Harmony | Venus |
| 4 | N | Expansion | Growth, Meaning | Jupiter |
| 5 | Δ | Delta/Action | Force, Movement | Mars |
| 6 | R | Relation | Connection, Care | Moon |
| 7 | Φ | Field | Witness, Unity | Uranus/Neptune |

## Core Computation

### Step 1: Get Planetary Longitudes

For a given datetime and location, compute the ecliptic longitude (0-360°) of each planet:

```
Planets = [Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto]
θⱼ = ecliptic_longitude(planetⱼ, datetime, location)
```

### Step 2: Compute Activation Values

Convert longitude to activation (0-1 range):

```
aⱼ = (cos(θⱼ × π/180) + 1) / 2
```

This creates a smooth mapping where:
- 0° (Aries point) → 1.0 (maximum)
- 180° (Libra point) → 0.0 (minimum)
- 90°/270° → 0.5 (neutral)

### Step 3: Apply Planet-Dimension Weights

The mapping matrix W defines how each planet influences each dimension:

```
W = [
    # P     E     μ     V     N     Δ     R     Φ
    [1.0,  0.0,  0.0,  0.0,  0.3,  0.3,  0.0,  0.0],  # Sun
    [0.0,  0.0,  0.0,  0.3,  0.0,  0.0,  1.0,  0.3],  # Moon
    [0.0,  0.0,  1.0,  0.0,  0.3,  0.0,  0.0,  0.0],  # Mercury
    [0.0,  0.3,  0.0,  1.0,  0.0,  0.0,  0.3,  0.0],  # Venus
    [0.3,  0.0,  0.0,  0.3,  0.0,  1.0,  0.0,  0.0],  # Mars
    [0.0,  0.0,  0.0,  0.0,  1.0,  0.0,  0.0,  0.3],  # Jupiter
    [0.3,  1.0,  0.0,  0.0,  0.0,  0.3,  0.0,  0.0],  # Saturn
    [0.0,  0.0,  0.0,  0.0,  0.0,  0.3,  0.0,  1.0],  # Uranus
    [0.0,  0.0,  0.3,  0.0,  0.3,  0.0,  0.0,  1.0],  # Neptune
    [0.0,  0.0,  0.3,  0.3,  0.0,  0.0,  0.3,  0.0],  # Pluto
]
```

### Step 4: Apply Planet Importance Weights

Not all planets contribute equally:

```
ω = [2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7]
#   Sun  Moon Merc Ven  Mars Jup  Sat  Ura  Nep  Plu

Hierarchy:
- Luminaries (Sun, Moon): 2.0
- Personal (Mercury, Venus, Mars): 1.5
- Social (Jupiter, Saturn): 1.0
- Outer (Uranus, Neptune, Pluto): 0.7
```

### Step 5: Compute Final Vector

```
For each dimension i:
    μᵢ = Σⱼ (ωⱼ × aⱼ × Wⱼᵢ)

Then normalize:
    μᵢ = μᵢ / max(μ)
```

**Complete Formula:**
```
μᵢ = normalize(Σⱼ₌₀⁹ (ωⱼ × ((cos(θⱼπ/180) + 1) / 2) × Wⱼᵢ))
```

## Resonance Computation

To compare two vectors (e.g., user vs historical figure):

### Cosine Similarity

```
ρ = (U₁ · U₂) / (||U₁|| × ||U₂||)

Where:
- U₁ · U₂ = Σᵢ (U₁ᵢ × U₂ᵢ)  (dot product)
- ||U|| = √(Σᵢ Uᵢ²)           (magnitude)
```

### Interpretation

| ρ Value | Interpretation |
|---------|----------------|
| 0.95-1.00 | Near-identical pattern |
| 0.85-0.95 | Strong resonance |
| 0.70-0.85 | Moderate resonance |
| 0.50-0.70 | Weak resonance |
| < 0.50 | Complementary/opposite |

## Shadow Dimensions (16D Extension)

The outer octave represents shadow/collective dimensions:

```
Vector16D = [μ₁, μ₂, μ₃, μ₄, μ₅, μ₆, μ₇, μ₈,
             μ₁ₛ, μ₂ₛ, μ₃ₛ, μ₄ₛ, μ₅ₛ, μ₆ₛ, μ₇ₛ, μ₈ₛ]

Shadow computation:
μᵢₛ = 1 - μᵢ
```

Shadow dimensions represent:
- Unconscious patterns
- Growth edges
- Integration opportunities

## TypeScript Implementation

```typescript
const W: number[][] = [
  [1.0, 0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 1.0, 0.3],
  [0.0, 0.0, 1.0, 0.0, 0.3, 0.0, 0.0, 0.0],
  [0.0, 0.3, 0.0, 1.0, 0.0, 0.0, 0.3, 0.0],
  [0.3, 0.0, 0.0, 0.3, 0.0, 1.0, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.3],
  [0.3, 1.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 1.0],
  [0.0, 0.0, 0.3, 0.0, 0.3, 0.0, 0.0, 1.0],
  [0.0, 0.0, 0.3, 0.3, 0.0, 0.0, 0.3, 0.0],
];

const OMEGA = [2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7];

function activation(longitude: number): number {
  return (Math.cos(longitude * Math.PI / 180) + 1) / 2;
}

function compute8D(longitudes: number[]): number[] {
  const dims = new Array(8).fill(0);

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      dims[i] += OMEGA[j] * activation(longitudes[j]) * W[j][i];
    }
  }

  const maxVal = Math.max(...dims);
  return dims.map(d => d / maxVal);
}

function cosineResonance(v1: number[], v2: number[]): number {
  const dot = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  const mag1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
  return dot / (mag1 * mag2);
}
```

## Astronomical Data Sources

### For Production (Accurate)
- JPL Horizons API
- Swiss Ephemeris (swisseph)
- Astronomical Algorithms (Jean Meeus)

### For Client-Side (Approximate)
- Pre-computed ephemeris tables (D1 cache)
- Simplified orbital mechanics
- Acceptable error: ±0.5° for outer planets

## Daily Weather Computation

The "cosmic weather" is simply the 8D vector for the current moment:

```typescript
function cosmicWeather(date: Date): Vector8D {
  const longitudes = getPlanetaryLongitudes(date);
  return compute8D(longitudes);
}
```

## References

1. Jean Meeus, *Astronomical Algorithms* (1991)
2. Swiss Ephemeris Documentation
3. FRC 893 Series Internal Specification
