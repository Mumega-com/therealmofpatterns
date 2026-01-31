# 16D Universal Vector - Quick Reference

**For developers implementing the 16D engine**

---

## TL;DR Formula

```python
# Inner Octave (Natal/Karma)
U_inner = normalize(Σ[ω_j × a(θ_j) × W_ji] for each dimension i)

# Outer Octave (Transits+Vedic/Dharma)
U_outer = normalize(0.5 × transits + 0.5 × vedic_dasha)

# Full 16D Vector
U_16 = [U_inner, U_outer]

# Metrics
κ̄ = mean([aspect_to_kappa(natal_j, transit_j) for each planet j])
RU = α · W · κ̄ · C
W = ||U_16||
C = 1 / (1 + var(U_16))
```

---

## The 8 Dimensions

| # | Symbol | Name | Question | Ruler |
|---|--------|------|----------|-------|
| 0 | **P** | Phase/Identity | Who am I becoming? | Sun |
| 1 | **E** | Existence/Structure | What grounds me? | Saturn |
| 2 | **μ** | Cognition/Mind | How do I understand? | Mercury |
| 3 | **V** | Value/Beauty | What do I treasure? | Venus |
| 4 | **N** | Narrative/Growth | Where am I growing? | Jupiter |
| 5 | **Δ** | Action/Momentum | What am I doing? | Mars |
| 6 | **R** | Relation/Connection | Who do I love? | Moon |
| 7 | **Φ** | Field/Witness | What witnesses? | Uranus/Neptune |

---

## Core Constants

```python
# Planet order (0-9)
PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
           'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

# Planet importance weights
OMEGA = [2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7]

# Weight matrix W[planet][dimension]
# Rows = planets, Columns = dimensions [P, E, μ, V, N, Δ, R, Φ]
W = [
    [1.0, 0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 0.0],  # Sun
    [0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 1.0, 0.3],  # Moon
    [0.0, 0.0, 1.0, 0.0, 0.3, 0.0, 0.0, 0.0],  # Mercury
    [0.0, 0.3, 0.0, 1.0, 0.0, 0.0, 0.3, 0.0],  # Venus
    [0.3, 0.0, 0.0, 0.3, 0.0, 1.0, 0.0, 0.0],  # Mars
    [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.3],  # Jupiter
    [0.3, 1.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0],  # Saturn
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 1.0],  # Uranus
    [0.0, 0.0, 0.3, 0.0, 0.3, 0.0, 0.0, 1.0],  # Neptune
    [0.0, 0.0, 0.3, 0.3, 0.0, 0.0, 0.3, 0.0],  # Pluto
]
```

---

## Key Formulas

### Activation Function
```python
def activation(longitude_deg):
    """0° Aries = 1.0, 180° Libra = 0.0"""
    theta = longitude_deg * π / 180
    return (cos(theta) + 1) / 2
```

### Aspect to Kappa
```python
def aspect_to_kappa(angle_deg, orb=5.0):
    """Conjunction/Trine = positive, Square/Opposition = negative"""
    if abs(angle_deg - 0) < orb: return 1.0 * decay(angle_deg, 0)
    if abs(angle_deg - 120) < orb: return 0.8 * decay(angle_deg, 120)
    if abs(angle_deg - 60) < orb: return 0.5 * decay(angle_deg, 60)
    if abs(angle_deg - 90) < orb: return -0.5 * decay(angle_deg, 90)
    if abs(angle_deg - 180) < orb: return -0.8 * decay(angle_deg, 180)
    return 0.0
```

### Normalization
```python
def normalize(U):
    """Max normalization - canonical method"""
    return U / np.max(U)
```

---

## Failure Modes

| Mode | Condition | Symptoms | Fix |
|------|-----------|----------|-----|
| **Collapse** | RU < 10 && κ̄ < 0.3 | Depression, freeze | Grounding, routine |
| **Inversion** | κ̄ < 0 | Self-sabotage, addiction | Truth-telling, shadow work |
| **Dissociation** | W > 2.5 && κ̄ < 0.5 | Spiritual bypass | Somatics, embodiment |
| **Dispersion** | RU > 45 && κ̄ < 0.5 | Mania, scattered | Structure, sleep |

---

## Elder Attractor

Goal state thresholds:
- κ̄ > 0.85 (Inner/Outer locked)
- RU > 45 (High energy)
- W > 2.5 (Stable witness)
- Duration > 48 hours

```python
def elder_progress(kappa, RU, W):
    return 0.5 * (kappa/0.85) + 0.3 * (RU/45) + 0.2 * (W/2.5)
```

---

## Sign Modulation Factors

**Element effects on dimensions:**

| Element | Boosts | Dampens |
|---------|--------|---------|
| Fire | P, N, Δ | Φ |
| Water | Φ, R, μ | Δ |
| Air | μ, R, E | V |
| Earth | E, V, P | N |

Apply as multiplicative modulation (1.2x boost, 0.8x dampen).

---

## House Weighting

| House Type | Numbers | Weight |
|------------|---------|--------|
| Angular | 1, 4, 7, 10 | 1.5x |
| Succedent | 2, 5, 8, 11 | 1.2x |
| Cadent | 3, 6, 9, 12 | 1.0x |

Apply to OMEGA (planet importance) before calculation.

---

## Vedic Dasha Boosts

**Mahadasha lord → Outer dimension boosts:**

| Dasha | Boosts (Outer) |
|-------|----------------|
| Sun | Pₜ(1.3), Nₜ(1.2), Δₜ(1.2) |
| Moon | Rₜ(1.3), Φₜ(1.2), Vₜ(1.1) |
| Mercury | μₜ(1.3), Nₜ(1.2) |
| Venus | Vₜ(1.3), Eₜ(1.1), Rₜ(1.2) |
| Mars | Δₜ(1.3), Vₜ(1.2), Pₜ(1.1) |
| Jupiter | Nₜ(1.3), Φₜ(1.2), μₜ(1.1) |
| Saturn | Eₜ(1.3), Pₜ(1.2), Δₜ(1.1) |
| Rahu | Δₜ(1.4), Pₜ(1.2), Nₜ(1.1) |
| Ketu | Φₜ(1.4), Nₜ(1.2), μₜ(1.1) |

Apply 70% weight to Mahadasha, 30% to Antardasha.

---

## Validation Test Case

**Hadi Profile:**

**Input:**
- Birth: November 29, 1986, 17:20, Tehran
- Sun in Sagittarius (Fire/Mutable)
- Moon in Scorpio (Water/Fixed)
- Mars/Jupiter in Pisces (Water/Mutable)

**Validation Criteria:**
- All dimension values in [0, 1] range
- Max normalized (highest dimension = 1.0)
- All metrics (κ̄, RU, W, C) computed without errors
- κ̄ in [-1, 1], RU ≥ 0, W > 0, C in [0, 1]
- Elder progress in [0, 1]
- Profile structure contains all required fields

**Test passes if:** All validation checks pass ✅

---

## API Response Format

```typescript
interface UV16Profile {
  inner_8d: number[];        // [P, E, μ, V, N, Δ, R, Φ]
  outer_8d: number[];        // [Pₜ, Eₜ, μₜ, Vₜ, Nₜ, Δₜ, Rₜ, Φₜ]
  U_16: number[];            // Full 16D vector
  kappa_bar: number;         // Global coupling [-1, 1]
  kappa_dims: number[];      // Per-dimension κ
  RU: number;                // Resonance Units [0, 100+]
  W: number;                 // Witness magnitude
  C: number;                 // Coherence [0, 1]
  dominant: {
    index: number;
    symbol: string;          // e.g., "μ"
    value: number;
    name: string;            // e.g., "Cognition/Mind"
  };
  failure_mode: string;      // Collapse|Inversion|Dissociation|Dispersion|Healthy
  elder_progress: number;    // Progress to Elder [0, 1]
}
```

---

## Database Schema (D1)

```sql
CREATE TABLE uv_snapshots (
    id INTEGER PRIMARY KEY,
    user_email_hash TEXT,
    timestamp TEXT,
    inner_8d TEXT,           -- JSON array
    outer_8d TEXT,           -- JSON array
    kappa_bar REAL,
    RU REAL,
    W REAL,
    C REAL,
    failure_mode TEXT,
    elder_progress REAL
);

CREATE INDEX idx_user_time ON uv_snapshots(user_email_hash, timestamp);
```

---

## Implementation Checklist

**Phase 1 (Core Engine):**
- [ ] Ephemeris calculation (pyephem/astropy)
- [ ] activation() function
- [ ] compute_inner_8d_full()
- [ ] compute_outer_8d()
- [ ] aspect_to_kappa()
- [ ] compute_global_kappa()
- [ ] compute_RU()
- [ ] Hadi validation test

**Phase 2 (Product Features):**
- [ ] D1 time-series storage
- [ ] Daily cron job (transit updates)
- [ ] classify_failure_mode()
- [ ] compute_elder_progress()
- [ ] Email notifications

**Phase 3 (API + UI):**
- [ ] /api/compute endpoint
- [ ] /api/daily-update endpoint
- [ ] Dashboard UI (16D radar chart)
- [ ] Historical trends (κ, RU over time)

---

## Common Pitfalls

❌ **DON'T:**
- Change planet→dimension mappings (Sun must → P)
- Use L2 normalization (loses interpretability)
- Compute Outer without Vedic component
- Apply aspects to natal-natal comparisons (use natal-transit)
- Forget to normalize after modulations

✅ **DO:**
- Use max normalization (highest dim = 1.0)
- Apply house weights BEFORE matrix multiplication
- Combine transits + Vedic for Outer (50/50)
- Gaussian decay on aspect orbs
- Validate implementation consistency

---

## Performance Notes

- **Ephemeris calls:** ~10ms per calculation (cache transits)
- **Matrix ops:** <1ms (NumPy optimized)
- **Daily updates:** Run at 00:00 UTC, cache for 24h
- **Scale:** 1000 users × daily update = ~10s compute time

---

## References

- Full spec: `docs/16D-IMPLEMENTATION-SPEC.md`
- FRC papers: `docs/FRC-16D-CHEAT-SHEET.md`
- Gap analysis: `docs/IMPLEMENTATION-GAP.md`
- Math foundation: `docs/16D-MATH.md`
