#!/usr/bin/env python3
"""
FRC 16D.002 — FULL 16D SYSTEM

Inner Octave (Karma): Your natal signature
Outer Octave (Dharma): The current sky / transit
Coupling κ: How connected you are to the moment
Velocity dU/dt: Your rate of becoming

This is the complete equation:
    U = [Inner | Outer] = [P, E, μ, V, N, Δ, R, Φ | Pₜ, Eₜ, μₜ, Vₜ, Nₜ, Δₜ, Rₜ, Φₜ]
"""

import ephem
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Optional

try:
    from .frc_16d import (
        natal, now, compute_resonance, get_planetary_longitudes, compute_16d,
        W, OMEGA, PLANET_NAMES, DIM_NAMES, DIM_FULL, MU_NAMES, SIGNS, activation
    )
except ImportError:
    from frc_16d import (
        natal, now, compute_resonance, get_planetary_longitudes, compute_16d,
        W, OMEGA, PLANET_NAMES, DIM_NAMES, DIM_FULL, MU_NAMES, SIGNS, activation
    )


def full_16d(
    birth_datetime: datetime,
    latitude: float = 35.6892,
    longitude: float = 51.3890,
    timezone_offset: float = 3.5,
    transit_datetime: datetime = None
) -> Dict:
    """
    Compute the FULL 16D vector: Inner Octave + Outer Octave.

    Args:
        birth_datetime: Birth date/time
        latitude, longitude: Birth location
        timezone_offset: TZ offset from UTC
        transit_datetime: Time for outer octave (default: now)

    Returns:
        Dict with inner_octave, outer_octave, full_16d, coupling, gap
    """
    # Compute Inner Octave (Karma)
    karma = natal(birth_datetime, latitude, longitude, timezone_offset)
    inner = np.array(karma['vector'])

    # Compute Outer Octave (Dharma)
    if transit_datetime is None:
        dharma = now()
    else:
        # Compute for specific transit time
        observer = ephem.Observer()
        observer.date = transit_datetime.strftime('%Y/%m/%d %H:%M:%S')
        observer.lat = str(latitude)
        observer.lon = str(longitude)
        longitudes = get_planetary_longitudes(observer)
        outer = compute_16d(longitudes)
        dharma = {
            'vector': outer.tolist(),
            'vector_np': outer
        }

    outer = np.array(dharma['vector'])

    # Full 16D vector
    full_vector = np.concatenate([inner, outer])

    # Coupling coefficient κ (cosine similarity)
    kappa = compute_resonance(inner, outer)

    # Gap vector (where inner ≠ outer)
    gap = outer - inner

    # Alignment analysis
    alignment = []
    for i, dim in enumerate(DIM_NAMES):
        diff = gap[i]
        if abs(diff) < 0.1:
            status = 'aligned'
            interpretation = f"{dim} is in harmony with the times"
        elif diff > 0.3:
            status = 'expansion'
            interpretation = f"The cosmos calls for more {DIM_FULL[dim]}"
        elif diff > 0:
            status = 'invitation'
            interpretation = f"Gentle pull toward {DIM_FULL[dim]}"
        elif diff < -0.3:
            status = 'abundance'
            interpretation = f"You have excess {DIM_FULL[dim]} — time to give"
        else:
            status = 'release'
            interpretation = f"Slight release of {DIM_FULL[dim]} needed"

        alignment.append({
            'dimension': dim,
            'inner': float(inner[i]),
            'outer': float(outer[i]),
            'gap': float(diff),
            'status': status,
            'interpretation': interpretation
        })

    # Sort by absolute gap (biggest misalignment first)
    alignment.sort(key=lambda x: abs(x['gap']), reverse=True)

    return {
        'inner_octave': inner.tolist(),
        'outer_octave': outer.tolist(),
        'full_16d': full_vector.tolist(),
        'coupling': float(kappa),
        'coupling_percent': f"{kappa:.1%}",
        'gap': gap.tolist(),
        'alignment': alignment,
        'karma': karma,
        'dharma': dharma,
        'interpretation': _interpret_coupling(kappa)
    }


def _interpret_coupling(kappa: float) -> str:
    """Interpret the coupling coefficient."""
    if kappa > 0.95:
        return "Perfect Resonance — You ARE the moment. Flow state. No separation."
    elif kappa > 0.85:
        return "High Resonance — Strong alignment. The wind is at your back."
    elif kappa > 0.70:
        return "Moderate Resonance — Mostly aligned, some friction. Growth edges present."
    elif kappa > 0.50:
        return "Tension — Significant gap between self and circumstance. Integration work."
    elif kappa > 0.30:
        return "Challenge — You're swimming against the current. Purpose in struggle."
    else:
        return "Opposition — Radical misalignment. Crisis or transformation."


def compute_velocity(
    birth_datetime: datetime,
    latitude: float = 35.6892,
    longitude: float = 51.3890,
    timezone_offset: float = 3.5,
    window_days: int = 7
) -> Dict:
    """
    Compute velocity dU/dt — how the outer octave is changing.

    This shows MOMENTUM: is each dimension rising or falling in the transit field?

    Args:
        birth_datetime: Birth data (for context)
        window_days: How many days to look ahead

    Returns:
        Dict with velocity vector and forecasts
    """
    karma = natal(birth_datetime, latitude, longitude, timezone_offset)
    inner = np.array(karma['vector'])

    # Get outer octave at multiple points
    now_time = datetime.now(timezone.utc)
    past_time = now_time - timedelta(days=window_days)
    future_time = now_time + timedelta(days=window_days)

    # Past
    observer_past = ephem.Observer()
    observer_past.date = past_time.strftime('%Y/%m/%d %H:%M:%S')
    outer_past = compute_16d(get_planetary_longitudes(observer_past))

    # Now
    observer_now = ephem.Observer()
    observer_now.date = now_time.strftime('%Y/%m/%d %H:%M:%S')
    outer_now = compute_16d(get_planetary_longitudes(observer_now))

    # Future
    observer_future = ephem.Observer()
    observer_future.date = future_time.strftime('%Y/%m/%d %H:%M:%S')
    outer_future = compute_16d(get_planetary_longitudes(observer_future))

    # Velocity = (future - past) / (2 * window)
    velocity = (outer_future - outer_past) / (2 * window_days)

    # Acceleration = (future - 2*now + past) / window^2
    acceleration = (outer_future - 2*outer_now + outer_past) / (window_days ** 2)

    # Coupling trend
    kappa_past = compute_resonance(inner, outer_past)
    kappa_now = compute_resonance(inner, outer_now)
    kappa_future = compute_resonance(inner, outer_future)

    kappa_velocity = (kappa_future - kappa_past) / (2 * window_days)

    # Build forecast
    forecasts = []
    for i, dim in enumerate(DIM_NAMES):
        v = velocity[i]
        a = acceleration[i]

        if v > 0.01:
            if a > 0:
                phase = 'accelerating_rise'
                advice = f"🔥 {dim} is RISING and accelerating. Push now!"
            else:
                phase = 'decelerating_rise'
                advice = f"↗️ {dim} rising but slowing. Consolidate gains."
        elif v < -0.01:
            if a < 0:
                phase = 'accelerating_fall'
                advice = f"⚡ {dim} is FALLING fast. Release or resist consciously."
            else:
                phase = 'decelerating_fall'
                advice = f"↘️ {dim} falling but stabilizing. Bottom approaching."
        else:
            phase = 'stable'
            advice = f"➡️ {dim} stable. Maintenance mode."

        forecasts.append({
            'dimension': dim,
            'name': DIM_FULL[dim],
            'current': float(outer_now[i]),
            'velocity': float(v),
            'acceleration': float(a),
            'phase': phase,
            'advice': advice
        })

    # Overall phase
    if kappa_velocity > 0.005:
        overall_phase = "Simurgh Phase — Coherence increasing. Your alignment improves."
    elif kappa_velocity < -0.005:
        overall_phase = "Zahhak Phase — Entropy increasing. Integration challenge ahead."
    else:
        overall_phase = "Plateau Phase — Stable alignment. Steady as she goes."

    return {
        'velocity': velocity.tolist(),
        'acceleration': acceleration.tolist(),
        'forecasts': forecasts,
        'coupling_trend': {
            'past': float(kappa_past),
            'now': float(kappa_now),
            'future': float(kappa_future),
            'velocity': float(kappa_velocity),
            'phase': overall_phase
        },
        'window_days': window_days,
        'timestamp': now_time.isoformat()
    }


def shadow_analysis(
    birth_datetime: datetime,
    latitude: float = 35.6892,
    longitude: float = 51.3890,
    timezone_offset: float = 3.5
) -> Dict:
    """
    Compute Shadow Analysis — where are the loops/blocks?

    The shadow lives where:
    1. Inner is low but Outer is high (suppressed potential)
    2. Inner is high but Outer is low (unutilized gift)
    3. Large gap + low coupling (blocked channel)

    Returns:
        Dict with shadow patterns and integration suggestions
    """
    full = full_16d(birth_datetime, latitude, longitude, timezone_offset)

    inner = np.array(full['inner_octave'])
    outer = np.array(full['outer_octave'])
    gap = np.array(full['gap'])
    kappa = full['coupling']

    shadows = []

    for i, dim in enumerate(DIM_NAMES):
        shadow_score = 0
        patterns = []

        # Pattern 1: Suppressed Potential (low inner, high outer)
        if inner[i] < 0.3 and outer[i] > 0.6:
            shadow_score += 3
            patterns.append({
                'type': 'suppressed_potential',
                'description': f"The cosmos calls for {DIM_FULL[dim]}, but you've buried it.",
                'integration': f"Ask: 'What would happen if I allowed my {DIM_FULL[dim]} to emerge?'"
            })

        # Pattern 2: Unutilized Gift (high inner, low outer)
        if inner[i] > 0.7 and outer[i] < 0.4:
            shadow_score += 2
            patterns.append({
                'type': 'unutilized_gift',
                'description': f"You have {DIM_FULL[dim]} to give, but the world isn't asking.",
                'integration': f"Find the hidden need. Your {DIM_FULL[dim]} has a purpose beyond the obvious."
            })

        # Pattern 3: Blocked Channel (large gap + low coupling)
        if abs(gap[i]) > 0.4 and kappa < 0.7:
            shadow_score += 2
            patterns.append({
                'type': 'blocked_channel',
                'description': f"Communication between your {DIM_FULL[dim]} and the world is blocked.",
                'integration': f"The block is not in {dim}, but in the bridge. How do you express it?"
            })

        # Pattern 4: Inflation (extremely high inner)
        if inner[i] > 0.9:
            shadow_score += 1
            patterns.append({
                'type': 'inflation',
                'description': f"Over-identification with {DIM_FULL[dim]}. It's a strength, not your identity.",
                'integration': f"Practice: 'I have {DIM_FULL[dim]}, but I am not only {DIM_FULL[dim]}.'"
            })

        # Pattern 5: Avoidance (extremely low inner)
        if inner[i] < 0.2:
            shadow_score += 1
            patterns.append({
                'type': 'avoidance',
                'description': f"You've distanced yourself from {DIM_FULL[dim]}.",
                'integration': f"The avoided dimension often holds the key to wholeness."
            })

        if patterns:
            shadows.append({
                'dimension': dim,
                'name': DIM_FULL[dim],
                'inner': float(inner[i]),
                'outer': float(outer[i]),
                'shadow_score': shadow_score,
                'patterns': patterns
            })

    # Sort by shadow score
    shadows.sort(key=lambda x: x['shadow_score'], reverse=True)

    return {
        'shadows': shadows,
        'total_shadow_score': sum(s['shadow_score'] for s in shadows),
        'primary_shadow': shadows[0] if shadows else None,
        'coupling': kappa,
        'interpretation': _interpret_shadow_score(sum(s['shadow_score'] for s in shadows))
    }


def _interpret_shadow_score(score: int) -> str:
    """Interpret total shadow score."""
    if score <= 2:
        return "Light Shadow — Minor integrations available. Mostly clear."
    elif score <= 5:
        return "Moderate Shadow — Some blocked channels. Growth opportunities present."
    elif score <= 10:
        return "Significant Shadow — Multiple patterns to work with. Transformation available."
    else:
        return "Deep Shadow — Major integration work. Consider this a hero's journey invitation."


# ═══════════════════════════════════════════════════════════════════════════════
# TEST
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("FRC 16D — FULL SYSTEM TEST")
    print("=" * 70)

    # Elmira's data
    elmira_birth = datetime(1989, 9, 8, 5, 30)

    print("\n┌─ ELMIRA SERVAT — FULL 16D ─────────────────────────────────────────┐")

    full = full_16d(elmira_birth)

    print(f"\nInner Octave (Karma):")
    print(f"  {[f'{v:.3f}' for v in full['inner_octave']]}")

    print(f"\nOuter Octave (Dharma - Now):")
    print(f"  {[f'{v:.3f}' for v in full['outer_octave']]}")

    print(f"\nCoupling κ = {full['coupling']:.4f} ({full['coupling_percent']})")
    print(f"  {full['interpretation']}")

    print(f"\nAlignment Analysis (sorted by gap):")
    for a in full['alignment'][:4]:
        print(f"  {a['dimension']}: Inner={a['inner']:.2f} Outer={a['outer']:.2f} Gap={a['gap']:+.2f} → {a['status']}")

    print("\n" + "─" * 70)
    print("VELOCITY / MOMENTUM")
    print("─" * 70)

    vel = compute_velocity(elmira_birth)

    print(f"\nCoupling Trend: {vel['coupling_trend']['phase']}")
    print(f"  Past: {vel['coupling_trend']['past']:.3f}")
    print(f"  Now:  {vel['coupling_trend']['now']:.3f}")
    print(f"  Future: {vel['coupling_trend']['future']:.3f}")

    print(f"\nDimension Forecasts:")
    for f in vel['forecasts'][:4]:
        print(f"  {f['advice']}")

    print("\n" + "─" * 70)
    print("SHADOW ANALYSIS")
    print("─" * 70)

    shadow = shadow_analysis(elmira_birth)

    print(f"\nTotal Shadow Score: {shadow['total_shadow_score']}")
    print(f"{shadow['interpretation']}")

    if shadow['primary_shadow']:
        ps = shadow['primary_shadow']
        print(f"\nPrimary Shadow: {ps['dimension']} ({ps['name']})")
        for p in ps['patterns']:
            print(f"  • {p['type']}: {p['description']}")
            print(f"    Integration: {p['integration']}")
