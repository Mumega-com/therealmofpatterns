"""
FRC 16D Forecast Engine
Multi-timeframe predictions: daily, weekly, monthly, 6-month, yearly, 10-year

The forecast computes:
1. Outer Octave (Dharma) for each future date
2. Coupling coefficient κ between natal and transit
3. Dimensional emphasis shifts
4. Key windows of opportunity and integration periods
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

# Import the core 16D calculation
try:
    from .frc_16d import natal, now, W, OMEGA, DIM_NAMES, DIM_FULL, MU_NAMES
except ImportError:
    from frc_16d import natal, now, W, OMEGA, DIM_NAMES, DIM_FULL, MU_NAMES


def compute_coupling(v1: List[float], v2: List[float]) -> float:
    """Compute coupling coefficient κ (cosine similarity) between two vectors."""
    a = np.array(v1)
    b = np.array(v2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def get_transit_vector(target_date: datetime) -> List[float]:
    """Get the 16D transit vector for a specific date."""
    transit_data = now(transit_datetime=target_date)
    return transit_data['vector']


def interpret_coupling(kappa: float) -> Dict:
    """Interpret the coupling coefficient."""
    if kappa >= 0.95:
        return {
            'level': 'Peak Resonance',
            'emoji': '🌟',
            'description': 'Exceptional alignment. The cosmos amplifies your essence.',
            'advice': 'Major initiatives, important decisions, bold moves.',
            'color': '#FFD700'
        }
    elif kappa >= 0.85:
        return {
            'level': 'High Resonance',
            'emoji': '✨',
            'description': 'Strong alignment. The wind is at your back.',
            'advice': 'Great time for forward momentum and expansion.',
            'color': '#32CD32'
        }
    elif kappa >= 0.70:
        return {
            'level': 'Moderate Resonance',
            'emoji': '🌊',
            'description': 'Balanced alignment. Some friction, some flow.',
            'advice': 'Navigate consciously. Growth edges are active.',
            'color': '#4169E1'
        }
    elif kappa >= 0.55:
        return {
            'level': 'Integration Period',
            'emoji': '🌙',
            'description': 'Lower alignment. Integration and reflection time.',
            'advice': 'Inner work, preparation, building foundations.',
            'color': '#9370DB'
        }
    else:
        return {
            'level': 'Deep Integration',
            'emoji': '🌑',
            'description': 'Significant misalignment. The hero\'s journey territory.',
            'advice': 'Shadow work, patience, trust the process.',
            'color': '#4B0082'
        }


def get_phase(past_kappa: float, current_kappa: float, future_kappa: float) -> Dict:
    """Determine the Simurgh/Zahhak phase based on coupling trend."""
    trend = future_kappa - past_kappa

    if trend > 0.05:
        return {
            'phase': 'Simurgh Rising',
            'symbol': '🦅',
            'description': 'Alignment increasing. Expansion phase.',
            'color': '#FFD700'
        }
    elif trend < -0.05:
        return {
            'phase': 'Zahhak Phase',
            'symbol': '🐉',
            'description': 'Alignment decreasing. Integration phase.',
            'color': '#8B0000'
        }
    else:
        return {
            'phase': 'Plateau',
            'symbol': '⚖️',
            'description': 'Stable alignment. Maintenance phase.',
            'color': '#4169E1'
        }


def compute_dimensional_forecast(
    natal_vector: List[float],
    transit_vector: List[float]
) -> List[Dict]:
    """Analyze each dimension's forecast."""
    forecasts = []

    for i, (dim, name, mu) in enumerate(zip(DIM_NAMES, DIM_FULL, MU_NAMES)):
        inner = natal_vector[i]
        outer = transit_vector[i]
        gap = outer - inner

        if gap > 0.3:
            emphasis = 'Strong Call'
            advice = f'The cosmos invites you to expand your {name}.'
            opportunity = True
        elif gap > 0.1:
            emphasis = 'Gentle Call'
            advice = f'Opportunity to develop your {name} further.'
            opportunity = True
        elif gap < -0.3:
            emphasis = 'Rest Period'
            advice = f'Your {name} is overrepresented. Time to integrate.'
            opportunity = False
        elif gap < -0.1:
            emphasis = 'Consolidation'
            advice = f'Your {name} strength can rest. Focus elsewhere.'
            opportunity = False
        else:
            emphasis = 'Alignment'
            advice = f'Your {name} is well-matched to the moment.'
            opportunity = None

        forecasts.append({
            'dimension': dim,
            'name': name,
            'mu': mu,
            'inner': inner,
            'outer': outer,
            'gap': gap,
            'emphasis': emphasis,
            'advice': advice,
            'opportunity': opportunity
        })

    return forecasts


def find_key_windows(
    natal_vector: List[float],
    start_date: datetime,
    days: int,
    sample_interval: int = 1
) -> Dict:
    """Find key windows of high and low resonance in a period."""
    dates = []
    couplings = []

    for day_offset in range(0, days, sample_interval):
        target_date = start_date + timedelta(days=day_offset)
        transit = get_transit_vector(target_date)
        kappa = compute_coupling(natal_vector, transit)
        dates.append(target_date)
        couplings.append(kappa)

    # Find peaks and valleys
    peak_idx = np.argmax(couplings)
    valley_idx = np.argmin(couplings)

    # Find sustained high periods (above 85%)
    high_windows = []
    in_high = False
    high_start = None

    for i, k in enumerate(couplings):
        if k >= 0.85 and not in_high:
            in_high = True
            high_start = dates[i]
        elif k < 0.85 and in_high:
            in_high = False
            high_windows.append({
                'start': high_start,
                'end': dates[i-1] if i > 0 else dates[i],
                'type': 'high_resonance'
            })

    if in_high:
        high_windows.append({
            'start': high_start,
            'end': dates[-1],
            'type': 'high_resonance'
        })

    # Find integration periods (below 70%)
    integration_windows = []
    in_low = False
    low_start = None

    for i, k in enumerate(couplings):
        if k < 0.70 and not in_low:
            in_low = True
            low_start = dates[i]
        elif k >= 0.70 and in_low:
            in_low = False
            integration_windows.append({
                'start': low_start,
                'end': dates[i-1] if i > 0 else dates[i],
                'type': 'integration'
            })

    if in_low:
        integration_windows.append({
            'start': low_start,
            'end': dates[-1],
            'type': 'integration'
        })

    return {
        'dates': dates,
        'couplings': couplings,
        'peak': {
            'date': dates[peak_idx],
            'kappa': couplings[peak_idx]
        },
        'valley': {
            'date': dates[valley_idx],
            'kappa': couplings[valley_idx]
        },
        'high_windows': high_windows,
        'integration_windows': integration_windows,
        'average_kappa': np.mean(couplings),
        'volatility': np.std(couplings)
    }


def generate_timeframe_forecast(
    natal_vector: List[float],
    birth_datetime: datetime,
    latitude: float,
    longitude: float,
    timezone_offset: float,
    timeframe: str,  # 'day', 'week', 'month', '6month', 'year', '10year'
    reference_date: datetime = None
) -> Dict:
    """Generate a forecast for a specific timeframe."""

    if reference_date is None:
        reference_date = datetime.utcnow()

    # Define timeframe parameters
    TIMEFRAMES = {
        'day': {'days': 1, 'sample_interval': 1, 'label': 'Today'},
        'week': {'days': 7, 'sample_interval': 1, 'label': 'This Week'},
        'month': {'days': 30, 'sample_interval': 1, 'label': 'This Month'},
        '6month': {'days': 180, 'sample_interval': 3, 'label': 'Next 6 Months'},
        'year': {'days': 365, 'sample_interval': 7, 'label': 'This Year'},
        '10year': {'days': 3650, 'sample_interval': 30, 'label': 'Next 10 Years'}
    }

    params = TIMEFRAMES.get(timeframe, TIMEFRAMES['month'])

    # Get current transit
    current_transit = get_transit_vector(reference_date)
    current_kappa = compute_coupling(natal_vector, current_transit)

    # Get past reference (same period ago)
    past_date = reference_date - timedelta(days=params['days'])
    past_transit = get_transit_vector(past_date)
    past_kappa = compute_coupling(natal_vector, past_transit)

    # Get future reference (end of period)
    future_date = reference_date + timedelta(days=params['days'])
    future_transit = get_transit_vector(future_date)
    future_kappa = compute_coupling(natal_vector, future_transit)

    # Find key windows
    windows = find_key_windows(
        natal_vector,
        reference_date,
        params['days'],
        params['sample_interval']
    )

    # Dimensional forecast
    dim_forecast = compute_dimensional_forecast(natal_vector, current_transit)

    # Get phase
    phase = get_phase(past_kappa, current_kappa, future_kappa)

    # Interpretation
    interpretation = interpret_coupling(current_kappa)

    # Find dimensions being called
    opportunities = [d for d in dim_forecast if d['opportunity'] == True]
    rest_periods = [d for d in dim_forecast if d['opportunity'] == False]

    return {
        'timeframe': timeframe,
        'label': params['label'],
        'reference_date': reference_date,
        'period_end': reference_date + timedelta(days=params['days']),

        # Current state
        'current_kappa': current_kappa,
        'current_kappa_percent': f"{current_kappa:.1%}",
        'interpretation': interpretation,

        # Trend
        'past_kappa': past_kappa,
        'future_kappa': future_kappa,
        'trend': future_kappa - past_kappa,
        'phase': phase,

        # Windows
        'peak': windows['peak'],
        'valley': windows['valley'],
        'high_windows': windows['high_windows'],
        'integration_windows': windows['integration_windows'],
        'average_kappa': windows['average_kappa'],
        'volatility': windows['volatility'],

        # Time series for charts
        'dates': windows['dates'],
        'couplings': windows['couplings'],

        # Dimensional
        'dimensions': dim_forecast,
        'opportunities': opportunities,
        'rest_periods': rest_periods,

        # Transit vector
        'transit_vector': current_transit
    }


def generate_full_forecast(
    name: str,
    birth_datetime: datetime,
    latitude: float = 35.6892,
    longitude: float = 51.3890,
    timezone_offset: float = 3.5,
    reference_date: datetime = None
) -> Dict:
    """Generate forecasts for all timeframes."""

    if reference_date is None:
        reference_date = datetime.utcnow()

    # Get natal data
    natal_data = natal(birth_datetime, latitude, longitude, timezone_offset)
    natal_vector = natal_data['vector']

    # Generate forecasts for each timeframe
    timeframes = ['day', 'week', 'month', '6month', 'year', '10year']
    forecasts = {}

    for tf in timeframes:
        forecasts[tf] = generate_timeframe_forecast(
            natal_vector,
            birth_datetime,
            latitude,
            longitude,
            timezone_offset,
            tf,
            reference_date
        )

    # Overall summary
    current_kappa = forecasts['day']['current_kappa']
    year_avg = forecasts['year']['average_kappa']

    if current_kappa > year_avg + 0.1:
        overall_assessment = "You're currently in a PEAK period relative to your yearly average. Make the most of it!"
    elif current_kappa < year_avg - 0.1:
        overall_assessment = "You're currently in an INTEGRATION period. Focus on inner work and preparation."
    else:
        overall_assessment = "You're at your baseline resonance. Steady as she goes."

    return {
        'name': name,
        'birth_datetime': birth_datetime,
        'generated_at': reference_date,
        'natal_vector': natal_vector,
        'natal_signature': natal_data['signature'],
        'forecasts': forecasts,
        'overall_assessment': overall_assessment,
        'subscription_tier_value': {
            'daily': ['day'],
            'weekly': ['day', 'week'],
            'monthly': ['day', 'week', 'month'],
            'annual': ['day', 'week', 'month', '6month', 'year', '10year']
        }
    }


# CLI test
if __name__ == "__main__":
    from datetime import timezone as tz

    # Test with Elmira
    birth = datetime(1989, 9, 8, 5, 30, tzinfo=tz.utc)

    forecast = generate_full_forecast(
        name="Elmira Servat",
        birth_datetime=birth,
        latitude=35.6892,
        longitude=51.3890
    )

    print(f"\n{'='*60}")
    print(f"FORECAST FOR {forecast['name']}")
    print(f"{'='*60}")
    print(f"Natal Signature: {forecast['natal_signature']}")
    print(f"\n{forecast['overall_assessment']}")

    for tf, data in forecast['forecasts'].items():
        print(f"\n--- {data['label'].upper()} ---")
        print(f"  Coupling κ: {data['current_kappa_percent']}")
        print(f"  Phase: {data['phase']['phase']} {data['phase']['symbol']}")
        print(f"  {data['interpretation']['description']}")
        if data['opportunities']:
            opps = [o['dimension'] for o in data['opportunities'][:3]]
            print(f"  Focus areas: {', '.join(opps)}")
