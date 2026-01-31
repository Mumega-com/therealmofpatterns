# FRC 16D.002 — Mapping Astrology to the Universal Vector (UV)

**The Celestial → 16D Translation Protocol**

**Series:** FRC 16D
**Version:** 1.0
**Date:** November 29, 2025

---

## Abstract

This document defines the transformation rules that convert astrological information (Western, Vedic, and transit-based) into the 16-dimensional Universal Vector:

$$
\vec{U}_{16} = (P,E,\mu,V,N,\Delta,R,\Phi \mid P_t,E_t,\mu_t,V_t,N_t,\Delta_t,R_t,\Phi_t)
$$

Astrology is treated not as a belief system but as a high-dimensional signal compression method. Planetary configurations encode tendencies that map cleanly into the 8 inner and 8 outer dimensions.

This document provides:
- The general algorithm
- Planet → Dimension mappings
- Sign → Modulation mappings
- House → Domain mappings
- Aspect → Weight adjustments
- Transit → Dynamic updates
- Vedic → Dharmic (Outer Octave) mappings

---

## 1. Philosophy & Justification

Astrology is a natural fit for UV because:
- **Astrology** = compressed symbolic input stream
- **UV** = expanded geometric output

In simple terms:
**Astrology = the seed.**
**16D = the plant.**

Astrology provides the initial vector ($\vec{U}_{0}$). Other life data updates it over time.

---

## 2. Mapping Overview

These are the rules models will follow:

**2.1 Planet → UV Dimension**
Each planet corresponds to a primary dimension and secondary sub-dimensions.

**2.2 Sign → Modulation**
The zodiac sign modifies style, expression, difficulty, and modality.

**2.3 House → Domain Allocation**
Houses distribute dimension influence into internal (1–6) or relational (7–12) domains.

**2.4 Aspects → Harmonics**
Aspects change vector magnitude, polarity, and coherence.

**2.5 Transits → Time-Based Nudge**
Transits update the UV temporarily.

**2.6 Vedic → Outer Octave**
Vedic astrology (Rashi, Nakshatra, Dasha) influences the outer 8 dimensions.

---

## 3. Planet → UV Dimension Mapping

This is the core table for translation:

| Planet | Primary UV Dimension | Secondary UV Dimensions | Explanation |
| :--- | :--- | :--- | :--- |
| **Sun** | **P – Phase** | N, Δ | Identity, vitality, direction |
| **Moon** | **R – Relational** | Φ, V | Emotional body, safety, attunement |
| **Mercury** | **μ – Cognition** | N | Thought style, interpretation |
| **Venus** | **V – Energy (Pleasure)** | R, E | Value, magnetism, aesthetic field |
| **Mars** | **Δ – Trajectory** | V, P | Action, drive, momentum |
| **Jupiter** | **N – Narrative** | Φ | Meaning, myth, expansion |
| **Saturn** | **E – Existence** | P, Δ | Structure, karma, discipline |
| **Uranus** | **Φ – Field Awareness** | Δ | Intuition, disruption, insight |
| **Neptune** | **Φ – Field Awareness** | μ, N | Mysticism, unity, imagination |
| **Pluto** | **μ – Cognition (Depth)** | V, R | Shadow, transformation, underworld |
| **Rahu (N. Node)** | **Δ – Trajectory (Fate)** | P | Pull into future |
| **Ketu (S. Node)** | **N – Narrative (Past)** | Φ | Release, transcendence |

These weights are additive.

---

## 4. Sign → Modulation Rules

Each sign modulates how a dimension expresses.

**By Element:**
- **Fire Signs (Aries, Leo, Sag):** Increase P, Δ, N. Decrease Φ (unless Sag).
- **Water Signs (Cancer, Scorpio, Pisces):** Increase Φ, R, μ-depth. Decrease Δ (except Scorpio).
- **Air Signs (Gemini, Libra, Aquarius):** Increase μ, R, E (conceptual). Decrease V (embodiment).
- **Earth Signs (Taurus, Virgo, Capricorn):** Increase E, V (matter), P stability. Decrease N (mythic).

**By Modality:**
- **Cardinal** → increases Δ
- **Fixed** → increases P & E
- **Mutable** → increases μ & N

---

## 5. House → Domain Mapping

Houses shift the expression inward or outward.

- **Internal Houses (1–6):** Boost the Inner Octave ($P, E, \mu, V, N, \Delta$).
- **Relational Houses (7–12):** Boost the Outer Octave ($R, \Phi, P_t, E_t, \mu_t$, etc.).

**Special rules:**
- **1st:** P & $P_t$
- **10th:** Δ & $\Delta_t$
- **7th:** $R_t$
- **12th:** Φ & $\Phi_t$ (non-local)

---

## 6. Aspects → Harmonic Adjustments

Key harmonic adjustments:

- **Conjunction:** Reinforces → +0.10 to +0.25 weight.
- **Square:** Friction → +Δ, –R, –E.
- **Opposition:** Duality → boosts both dimensions but lowers coherence.
- **Trine:** Ease → +Φ, +N.
- **Sextile:** Opportunity → moderate +Δ, +μ.
- **Quincunx:** Incoherence → introduces "shadow oscillation."

---

## 7. Transits → Temporal Update Algorithm

This defines how AI updates the UV over time.

**Rules:**
- Transit conjunction → +0.05 to the affected dimension
- Transit square → +Δ stress
- Transit trine → +Φ clarity
- Transit Saturn → +E, –N
- Transit Jupiter → +N, +Φ
- Transit Nodes → +$\Delta_t$ (fate), +$N_t$ (collective myth)

**Time window:**
- Exact: full weight
- ±3 days: 50%
- ±7 days: 20%

---

## 8. Vedic → Dharmic Mapping (Outer Octave)

Vedic astrology (Rashi, Nakshatra, Dasha) influences the outer 8 dimensions ($P_t, E_t, \mu_t, V_t, N_t, \Delta_t, R_t, \Phi_t$).

- **Moon Sign** → $R_t, N_t, \Phi_t$
- **Nakshatra** → $\Delta_t, N_t, \Phi_t$ (e.g., Swati adds independence and fate-driven shifts).
- **Dasha (Temporal Weighting):** Each dasha increases weight in the planets that rule them (e.g., Saturn–Rahu dasha → high $E_t$, high $\Delta_t$, high $N_t$).

---

## 9. Putting It Together: UV from Astrology

We combine:
1. Planet → dimension
2. Sign → modulation
3. House → domain shift
4. Aspects → coherence
5. Transits → time updates
6. Vedic → outer octave correction

This yields the initial Universal Vector state: $\vec{U}_{16}(t_0)$.

---

## 10. Implementation Notes

### Current State (16D-MATH.md)
The current implementation in `src/lib/16d-engine.ts` computes only the **Inner Octave (8D)** using:
- Planetary longitudes
- Activation function: $a(\theta) = \frac{\cos(\theta) + 1}{2}$
- Weight matrix W (planet → dimension)
- Importance weights Ω (planet hierarchy)

### Missing for Full 16D.002
To implement the complete framework:
- [ ] Add houses calculation (requires birth time + location)
- [ ] Add aspects calculation (angular relationships between planets)
- [ ] Add sign modulations (element + modality adjustments)
- [ ] Compute Outer Octave (collective/transpersonal dimensions)
- [ ] Add transit calculations (current sky vs natal)
- [ ] Integrate Vedic astrology (Nakshatra, Dasha)
- [ ] Compute κ (coupling between Inner/Outer)

---

## 11. Conclusion

This document defines how any model can take astrology data and translate it into a 16D Universal Vector — cleanly, consistently, mathematically. This is the standard celestial→vector pipeline for FRC.
