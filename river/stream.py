"""
MUMEGA River: The Content Stream

The River is a living feed that combines:
1. Cosmic weather (current 8 Mu field)
2. World events (RSS feeds, news)
3. Anticipating events (astronomical ephemeris)
4. Cultural moments (holidays, seasons)

The River flows through the Lambda Field, carrying
meaning from the cosmos to the individual.
"""

import asyncio
import feedparser
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
import ephem
import math

# Import our 8 Mu system
import sys
sys.path.insert(0, '..')
from core.eight_mu import field as mu_field, MU_FREQUENCIES


class CosmicCalendar:
    """
    Track astronomical events and their Mu significance.
    """

    def get_upcoming_events(self, days: int = 30) -> List[Dict]:
        """Get astronomical events for the next N days."""
        events = []
        now = datetime.now(timezone.utc)

        for day_offset in range(days):
            date = now + timedelta(days=day_offset)
            date_ephem = ephem.Date(date)

            # Check for significant planetary events
            events.extend(self._check_moon_phase(date_ephem, date))
            events.extend(self._check_sign_changes(date_ephem, date))

        return sorted(events, key=lambda x: x['date'])

    def _check_moon_phase(self, date_ephem, date: datetime) -> List[Dict]:
        """Check for moon phases."""
        events = []

        # Get moon phase
        moon = ephem.Moon(date_ephem)
        moon_phase = moon.phase  # 0-100

        # New Moon (0-5%)
        if moon_phase < 5:
            next_new = ephem.next_new_moon(date_ephem)
            if abs(float(next_new) - float(date_ephem)) < 1:
                events.append({
                    'date': date.isoformat(),
                    'type': 'lunar',
                    'event': 'New Moon',
                    'mu_affected': ['μ₇'],  # Moon = Relation
                    'significance': 'New beginnings in relationships. Plant seeds of connection.',
                    'intensity': 'high'
                })

        # Full Moon (95-100%)
        if moon_phase > 95:
            next_full = ephem.next_full_moon(date_ephem)
            if abs(float(next_full) - float(date_ephem)) < 1:
                events.append({
                    'date': date.isoformat(),
                    'type': 'lunar',
                    'event': 'Full Moon',
                    'mu_affected': ['μ₇', 'μ₈'],
                    'significance': 'Illumination. What was hidden becomes visible.',
                    'intensity': 'high'
                })

        return events

    def _check_sign_changes(self, date_ephem, date: datetime) -> List[Dict]:
        """Check for planets changing signs."""
        events = []

        # This is simplified - full implementation would track exact ingress times
        planets = {
            'Sun': (ephem.Sun, 'μ₁', 'Identity shifts. New chapter begins.'),
            'Mercury': (ephem.Mercury, 'μ₃', 'Communication style changes.'),
            'Venus': (ephem.Venus, 'μ₄', 'Values and aesthetics shift.'),
            'Mars': (ephem.Mars, 'μ₆', 'Action energy transforms.'),
        }

        signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']

        for planet_name, (planet_class, mu, meaning) in planets.items():
            planet = planet_class(date_ephem)
            lon = math.degrees(float(ephem.Ecliptic(planet).lon)) % 360
            sign_idx = int(lon // 30)
            sign_degree = lon % 30

            # Check if near sign boundary (within 1 degree)
            if sign_degree < 1:
                events.append({
                    'date': date.isoformat(),
                    'type': 'ingress',
                    'event': f'{planet_name} enters {signs[sign_idx]}',
                    'mu_affected': [mu],
                    'significance': meaning,
                    'intensity': 'medium'
                })

        return events


class NewsRiver:
    """
    Stream of world events from RSS feeds.
    Categorized by Mu relevance.
    """

    # RSS feeds categorized by Mu
    FEEDS = {
        'μ₁': [  # Identity/Politics
            'http://feeds.bbci.co.uk/news/world/rss.xml',
        ],
        'μ₂': [  # Structure/Economy
            'http://feeds.bbci.co.uk/news/business/rss.xml',
        ],
        'μ₃': [  # Cognition/Science
            'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
        ],
        'μ₄': [  # Value/Arts
            'http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
        ],
        'μ₅': [  # Expansion/Education
            'http://feeds.bbci.co.uk/news/education/rss.xml',
        ],
        'μ₆': [  # Action/Sports
            'http://feeds.bbci.co.uk/sport/rss.xml',
        ],
        'μ₇': [  # Relation/Health
            'http://feeds.bbci.co.uk/news/health/rss.xml',
        ],
        'μ₈': [  # Field/Technology
            'http://feeds.bbci.co.uk/news/technology/rss.xml',
        ]
    }

    async def get_stories(self, mu_filter: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get news stories, optionally filtered by Mu."""
        stories = []

        feeds_to_check = self.FEEDS.get(mu_filter, {mu_filter: self.FEEDS[mu_filter]}) if mu_filter else self.FEEDS

        for mu, feed_urls in feeds_to_check.items():
            for url in feed_urls:
                try:
                    feed = feedparser.parse(url)
                    for entry in feed.entries[:limit // len(feeds_to_check)]:
                        stories.append({
                            'mu': mu,
                            'title': entry.get('title', ''),
                            'summary': entry.get('summary', '')[:200],
                            'link': entry.get('link', ''),
                            'published': entry.get('published', ''),
                            'source': feed.feed.get('title', 'Unknown')
                        })
                except Exception as e:
                    print(f"Error fetching {url}: {e}")

        return stories[:limit]


class SeasonalCycle:
    """
    Track seasonal and cultural cycles.
    """

    SEASONS = {
        'spring_equinox': {
            'month': 3, 'day': 20,
            'mu_peak': ['μ₁', 'μ₅'],
            'theme': 'Rebirth. Identity emerges from winter darkness.'
        },
        'summer_solstice': {
            'month': 6, 'day': 21,
            'mu_peak': ['μ₁', 'μ₆'],
            'theme': 'Maximum light. Full expression of will.'
        },
        'autumn_equinox': {
            'month': 9, 'day': 22,
            'mu_peak': ['μ₄', 'μ₇'],
            'theme': 'Harvest. Balance between self and other.'
        },
        'winter_solstice': {
            'month': 12, 'day': 21,
            'mu_peak': ['μ₂', 'μ₈'],
            'theme': 'Deepest dark. Turn inward. Structure meets field.'
        }
    }

    def get_current_season(self) -> Dict:
        """Get current seasonal context."""
        now = datetime.now()
        month, day = now.month, now.day

        # Determine season
        if (month == 3 and day >= 20) or (month > 3 and month < 6) or (month == 6 and day < 21):
            season = 'spring'
            data = self.SEASONS['spring_equinox']
        elif (month == 6 and day >= 21) or (month > 6 and month < 9) or (month == 9 and day < 22):
            season = 'summer'
            data = self.SEASONS['summer_solstice']
        elif (month == 9 and day >= 22) or (month > 9 and month < 12) or (month == 12 and day < 21):
            season = 'autumn'
            data = self.SEASONS['autumn_equinox']
        else:
            season = 'winter'
            data = self.SEASONS['winter_solstice']

        return {
            'season': season,
            'mu_peak': data['mu_peak'],
            'theme': data['theme']
        }


class River:
    """
    The main River class - combines all streams into one flow.
    """

    def __init__(self):
        self.cosmic = CosmicCalendar()
        self.news = NewsRiver()
        self.seasons = SeasonalCycle()

    async def get_daily_flow(self) -> Dict:
        """Get the complete daily river flow."""

        # Current Mu weather
        mu_weather = mu_field.now()

        # Seasonal context
        season = self.seasons.get_current_season()

        # Upcoming cosmic events
        cosmic_events = self.cosmic.get_upcoming_events(days=7)

        # News aligned with dominant Mu
        dominant_mu = mu_weather['dominant']['symbol']
        # Skip news for now to avoid async issues
        # aligned_news = await self.news.get_stories(mu_filter=dominant_mu, limit=5)

        return {
            'date': datetime.now(timezone.utc).isoformat(),
            'mu_weather': {
                'dominant': mu_weather['dominant'],
                'message': mu_weather['weather']['message'],
                'question': mu_weather['weather']['question_of_the_day'],
                'vector': mu_weather['vector']
            },
            'season': season,
            'cosmic_events': cosmic_events[:5],
            # 'aligned_news': aligned_news,
            'river_message': self._compose_message(mu_weather, season, cosmic_events)
        }

    def _compose_message(self, mu_weather: Dict, season: Dict, events: List[Dict]) -> str:
        """Compose the daily river message."""
        dominant = mu_weather['dominant']
        mu_info = MU_FREQUENCIES.get(dominant['symbol'], {})

        message = f"""
Today's Field: {dominant['symbol']} {dominant['name']} ({dominant['value']:.0%})

{mu_weather['weather']['message']}

Season: {season['season'].title()} — {season['theme']}

Question to carry: "{dominant['question']}"
"""

        if events:
            message += f"\n\nUpcoming: {events[0]['event']} — {events[0]['significance']}"

        return message.strip()


# ============ TEST ============

async def test_river():
    """Test the river flow."""
    print("=" * 60)
    print("MUMEGA RIVER FLOW")
    print("=" * 60)

    river = River()
    flow = await river.get_daily_flow()

    print(f"\nDate: {flow['date'][:10]}")
    print(f"\n{flow['river_message']}")

    print("\n" + "-" * 40)
    print("Cosmic Events This Week:")
    for event in flow['cosmic_events']:
        print(f"  • {event['event']}: {event['significance']}")


if __name__ == "__main__":
    asyncio.run(test_river())
