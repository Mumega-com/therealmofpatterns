#!/usr/bin/env python3
"""
MUMEGA Forecast Generator CLI

Generate FRC 16D forecasts for different subscription tiers.

Usage:
    python generate_forecast.py --name "Name" --birth "1990-11-29 17:20" --tier annual

Subscription Tiers:
    daily   - Today only ($9/mo value)
    weekly  - Today + This Week ($19/mo value)
    monthly - Today + Week + Month ($39/mo value)
    annual  - All timeframes including 10-year ($299/yr value)

Output:
    /mnt/Hadi/AI-Family/mumega/output/Name_forecast_TIER.pdf
"""

import os
import sys
import argparse
from datetime import datetime, timezone

# Add paths for imports
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from core.forecast import generate_full_forecast
from forecast_pdf import generate_forecast_pdf


def main():
    parser = argparse.ArgumentParser(
        description='Generate MUMEGA FRC 16D Forecast',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Subscription Tiers:
  daily   - Today's coupling and guidance
  weekly  - Today + 7-day forecast with key windows
  monthly - Today + Week + 30-day deep forecast
  annual  - Full forecast: day/week/month/6mo/year/10year

Examples:
  python generate_forecast.py --name "John Doe" --birth "1985-03-15 14:30" --tier weekly
  python generate_forecast.py --name "Jane Doe" --birth "1990-07-22 08:00" --tier annual
        """
    )

    parser.add_argument('--name', type=str, required=True, help='Person name')
    parser.add_argument('--birth', type=str, required=True,
                       help='Birth datetime (YYYY-MM-DD HH:MM)')
    parser.add_argument('--lat', type=float, default=35.6892,
                       help='Birth latitude (default: Tehran)')
    parser.add_argument('--lon', type=float, default=51.389,
                       help='Birth longitude (default: Tehran)')
    parser.add_argument('--tz', type=float, default=3.5,
                       help='Birth timezone offset (default: 3.5 for Tehran)')
    parser.add_argument('--tier', type=str, default='annual',
                       choices=['daily', 'weekly', 'monthly', 'annual'],
                       help='Subscription tier (default: annual)')
    parser.add_argument('--output', type=str, default=None,
                       help='Output directory')

    args = parser.parse_args()

    # Parse birth datetime
    birth_dt = datetime.strptime(args.birth, '%Y-%m-%d %H:%M')
    birth_dt = birth_dt.replace(tzinfo=timezone.utc)

    # Output directory
    output_dir = args.output or os.path.join(BASE_DIR, 'output')
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"MUMEGA FORECAST GENERATOR")
    print(f"{'='*60}")
    print(f"\nGenerating forecast for: {args.name}")
    print(f"Birth: {birth_dt.strftime('%Y-%m-%d %H:%M')}")
    print(f"Subscription Tier: {args.tier.upper()}")

    # Generate forecast data
    print(f"\n[1/2] Computing multi-timeframe forecasts...")
    forecast_data = generate_full_forecast(
        name=args.name,
        birth_datetime=birth_dt,
        latitude=args.lat,
        longitude=args.lon,
        timezone_offset=args.tz
    )

    # Show quick summary
    day = forecast_data['forecasts']['day']
    print(f"  Today's κ: {day['current_kappa_percent']}")
    print(f"  Phase: {day['phase']['symbol']} {day['phase']['phase']}")
    print(f"  {day['interpretation']['description']}")

    # Generate PDF
    print(f"\n[2/2] Generating {args.tier} forecast PDF...")

    safe_name = args.name.replace(' ', '_').replace('/', '-')
    output_path = os.path.join(output_dir, f"{safe_name}_forecast_{args.tier}.pdf")

    result = generate_forecast_pdf(
        forecast_data,
        output_path,
        subscription_tier=args.tier
    )

    print(f"\n{'='*60}")
    print(f"FORECAST COMPLETE!")
    print(f"{'='*60}")
    print(f"\nOutput: {result}")

    # Show tier-specific summary
    tier_content = {
        'daily': "Contains: Today's coupling, phase, and guidance",
        'weekly': "Contains: Today + 7-day forecast with peak/valley windows",
        'monthly': "Contains: Today + Week + 30-day deep forecast",
        'annual': "Contains: All timeframes through 10-year vision"
    }
    print(f"\n{tier_content[args.tier]}")

    # Pricing reminder
    tier_pricing = {
        'daily': "$9/month",
        'weekly': "$19/month",
        'monthly': "$39/month",
        'annual': "$299/year (includes Premium Report)"
    }
    print(f"Tier Value: {tier_pricing[args.tier]}")

    return result


if __name__ == "__main__":
    main()
