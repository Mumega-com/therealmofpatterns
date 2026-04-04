#!/usr/bin/env python3
"""
Sol — Social Post Engine for The Realm of Patterns

Runs every 6 hours via cron. Generates content using the Gemini-powered
content engine, posts to Twitter/X, and logs everything to SQLite.

Usage:
    python3 social-post.py                  # Auto-detect time slot
    python3 social-post.py --slot morning   # Force a specific slot
    python3 social-post.py --dry-run        # Generate only, no post
    python3 social-post.py --status         # Show recent post history
"""

import os
import sys
import json
import time
import sqlite3
import logging
import argparse
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

# ============================================
# Configuration
# ============================================

BASE_DIR = Path("/home/mumega/therealmofpatterns")
SCRIPTS_DIR = BASE_DIR / "scripts"
LOG_DIR = Path("/home/mumega/.mumega/logs")
DB_PATH = SCRIPTS_DIR / "sol-posts.db"
LOG_PATH = LOG_DIR / "sol-social.log"

LOG_DIR.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SOL] %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(str(LOG_PATH)),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("sol")


# ============================================
# Time Slots — 4x daily content cadence
# ============================================

SLOTS = {
    "midnight":  {"utc_hour": 0,  "type": "contemplation", "emoji": "🌑"},
    "morning":   {"utc_hour": 6,  "type": "daily_weather",  "emoji": "🌅"},
    "midday":    {"utc_hour": 12, "type": "jungian",        "emoji": "☀️"},
    "evening":   {"utc_hour": 18, "type": "archetype",      "emoji": "🌙"},
}

# Mu dimension cycle — rotate through all 8 over the week
MU_DIMENSIONS = [
    {"key": "phase",     "symbol": "P",   "planet": "Sun",     "question": "Who am I becoming?"},
    {"key": "existence", "symbol": "E",   "planet": "Saturn",  "question": "What grounds me?"},
    {"key": "cognition", "symbol": "μ",   "planet": "Mercury", "question": "How do I understand?"},
    {"key": "value",     "symbol": "V",   "planet": "Venus",   "question": "What do I treasure?"},
    {"key": "expansion", "symbol": "N",   "planet": "Jupiter", "question": "Where am I growing?"},
    {"key": "action",    "symbol": "Δ",   "planet": "Mars",    "question": "What am I doing?"},
    {"key": "relation",  "symbol": "R",   "planet": "Moon",    "question": "Who do I love?"},
    {"key": "field",     "symbol": "Φ",   "planet": "Neptune", "question": "What witnesses?"},
]

JUNGIAN_CONCEPTS = [
    "shadow", "individuation", "anima", "persona", "synchronicity",
    "collective unconscious", "active imagination", "projection",
    "the Self", "complex", "archetype", "transcendent function",
]

HISTORICAL_FIGURES = [
    "Carl Jung", "Liz Greene", "James Hillman", "Marie-Louise von Franz",
    "Rumi", "Ibn Arabi", "Meister Eckhart", "William Blake",
    "Heraclitus", "Paracelsus", "Giordano Bruno", "Marsilio Ficino",
]


# ============================================
# Database
# ============================================

def init_db() -> sqlite3.Connection:
    """Initialize SQLite database for post tracking."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id          TEXT PRIMARY KEY,
            slot        TEXT NOT NULL,
            content_type TEXT NOT NULL,
            dimension   TEXT,
            concept     TEXT,
            text        TEXT NOT NULL,
            platform    TEXT NOT NULL,
            platform_id TEXT,
            posted_at   TEXT NOT NULL,
            success     INTEGER NOT NULL DEFAULT 0,
            error       TEXT,
            signups_24h INTEGER DEFAULT 0,
            impressions INTEGER DEFAULT 0,
            engagements INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS strategy_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            week_start  TEXT NOT NULL,
            top_type    TEXT,
            top_dimension TEXT,
            adjustment  TEXT,
            logged_at   TEXT NOT NULL
        )
    """)
    conn.commit()
    return conn


def log_post(
    conn: sqlite3.Connection,
    slot: str,
    content_type: str,
    dimension: Optional[str],
    concept: Optional[str],
    text: str,
    platform: str,
    platform_id: Optional[str],
    success: bool,
    error: Optional[str] = None,
) -> str:
    """Log a post attempt to the database. Returns post ID."""
    post_id = hashlib.sha256(
        f"{slot}{content_type}{text[:50]}{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:16]

    conn.execute(
        """INSERT OR REPLACE INTO posts
           (id, slot, content_type, dimension, concept, text, platform,
            platform_id, posted_at, success, error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            post_id, slot, content_type, dimension, concept, text,
            platform, platform_id,
            datetime.now(timezone.utc).isoformat(),
            1 if success else 0,
            error,
        ),
    )
    conn.commit()
    return post_id


# ============================================
# Content Generation (Gemini)
# ============================================

def get_today_dimension() -> dict:
    """Pick today's mu dimension based on day-of-year rotation."""
    day_of_year = datetime.utcnow().timetuple().tm_yday
    return MU_DIMENSIONS[day_of_year % len(MU_DIMENSIONS)]


def get_week_concept() -> str:
    """Pick this week's Jungian concept."""
    week_num = datetime.utcnow().isocalendar()[1]
    return JUNGIAN_CONCEPTS[week_num % len(JUNGIAN_CONCEPTS)]


def get_week_figure() -> str:
    """Pick this week's historical figure."""
    week_num = datetime.utcnow().isocalendar()[1]
    return HISTORICAL_FIGURES[week_num % len(HISTORICAL_FIGURES)]


def generate_content_gemini(slot: str, gemini_api_key: str) -> dict:
    """
    Generate social post content using GitHub Models (OpenAI-compatible) or Gemini Flash.

    Returns:
        {
            "text": str,          # The post text (280 chars for Twitter)
            "content_type": str,  # daily_weather | jungian | archetype | contemplation
            "dimension": str,     # mu dimension key if applicable
            "concept": str,       # Jungian concept if applicable
            "long_form": str,     # Optional longer form for captions
        }
    """
    # Try Gemma 4 31B first (free, best quality for Jungian content)
    gemma_result = _generate_via_gemma4(slot)
    if gemma_result:
        return gemma_result
    logger.warning("Gemma 4 generation failed — trying GitHub Models")

    # Try GitHub Models second (free, good quality)
    github_token = os.environ.get("GITHUB_TOKEN", "")
    if github_token:
        result = _generate_via_github(slot, github_token)
        if result:
            return result
        logger.warning("GitHub Models generation failed — trying Gemini")

    if not gemini_api_key:
        return _fallback_content(slot)

    try:
        from google import genai
        from google.genai import types as genai_types
        _use_new_sdk = True
    except ImportError:
        try:
            import google.generativeai as genai  # type: ignore
            _use_new_sdk = False
        except ImportError:
            logger.warning("No Google AI SDK installed — using fallback content")
            return _fallback_content(slot)

    slot_config = SLOTS[slot]
    content_type = slot_config["type"]
    dim = get_today_dimension()
    concept = get_week_concept()
    figure = get_week_figure()
    today = datetime.utcnow().strftime("%B %d, %Y")

    prompts = {
        "daily_weather": f"""You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com).
Write a Twitter/X post for {today} about today's cosmic dimension: {dim['key']} ({dim['symbol']}) — ruled by {dim['planet']}.
The core question for this dimension: "{dim['question']}"

Voice: Warm, poetic, Jungian depth psychology. NOT horoscope fluff.
"A daily practice, not a prediction." Think Liz Greene meets James Hillman.

Requirements:
- Under 280 characters (Twitter limit)
- End with the question: {dim['question']}
- Include the hashtag #RealmOfPatterns
- No emojis unless they serve meaning
- No corporate speak, no vague affirmations

Return ONLY the tweet text. No explanation.""",

        "jungian": f"""You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com).
Write a Twitter/X post illuminating the Jungian concept of: {concept}

Voice: Warm, poetic, Jungian depth psychology. NOT horoscope fluff.
"A daily practice, not a prediction." Think Liz Greene meets James Hillman.

Requirements:
- Under 280 characters
- Make it land — a real insight, not a definition
- Include #JungianPsychology or #DepthPsychology
- Leave people wanting to think, not just scroll
- Connect to everyday experience

Return ONLY the tweet text. No explanation.""",

        "archetype": f"""You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com).
Write a Twitter/X post about {figure} through the lens of Jungian archetypal psychology
and the 8 Mu dimensions (FRC framework — where each planet maps to a dimension of human experience).

Voice: Warm, poetic, Jungian depth psychology. NOT horoscope fluff.
Think: what pattern did this person embody? What can we learn from their dominant dimension?

Requirements:
- Under 280 characters
- Name the dimension they embodied (e.g., "the Expansion dimension — Jupiter's call")
- Include #ArchetypalPsychology or #RealmOfPatterns
- Invite reflection on the reader's own pattern

Return ONLY the tweet text. No explanation.""",

        "contemplation": f"""You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com).
Write a late-night contemplative Twitter/X post — a mirror to end the day.
Today's dimension was {dim['key']} ({dim['symbol']}). The question was: "{dim['question']}"

Voice: Quiet, liminal, Jungian. The space before sleep is the threshold.
Think: what has today asked of the reader? What wants to be seen before rest?

Requirements:
- Under 280 characters
- Frame it as a question or reflection, not a statement
- Include #NightWatch or #RealmOfPatterns
- No toxic positivity, no forced comfort

Return ONLY the tweet text. No explanation.""",
    }

    try:
        if _use_new_sdk:
            client = genai.Client(api_key=gemini_api_key)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompts[content_type],
            )
            post_text = response.text.strip().strip('"')
        else:
            genai.configure(api_key=gemini_api_key)  # type: ignore
            model = genai.GenerativeModel("gemini-1.5-flash")  # type: ignore
            response = model.generate_content(prompts[content_type])
            post_text = response.text.strip().strip('"')

        # Ensure 280 char limit
        if len(post_text) > 280:
            post_text = post_text[:277] + "..."

        return {
            "text": post_text,
            "content_type": content_type,
            "dimension": dim["key"] if content_type in ("daily_weather", "contemplation") else None,
            "concept": concept if content_type == "jungian" else None,
            "long_form": None,
        }

    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        return _fallback_content(slot)


def _generate_via_gemma4(slot: str) -> Optional[dict]:
    """Generate content via Gemma 4 31B on Google AI Studio (free, 1500 req/day)."""
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_key:
        return None

    try:
        from google import genai

        client = genai.Client(api_key=gemini_key)

        slot_config = SLOTS[slot]
        content_type = slot_config["type"]
        dim = get_today_dimension()
        concept = get_week_concept()
        figure = get_week_figure()
        today = datetime.utcnow().strftime("%B %d, %Y")

        prompts = {
            "daily_weather": f"You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com). Write a social post for {today} about today's cosmic dimension: {dim['key']} ({dim['symbol']}) — ruled by {dim['planet']}. Core question: \"{dim['question']}\". Voice: Warm, poetic, Jungian depth psychology. Liz Greene meets James Hillman. NOT horoscope fluff. Under 280 characters. End with the question. Include #RealmOfPatterns. Return ONLY the post text.",
            "jungian": f"You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com). Write a social post illuminating the Jungian concept of: {concept}. Voice: Warm, poetic, Jungian depth psychology. A real insight, not a definition. Under 280 characters. Include #JungianPsychology. Return ONLY the post text.",
            "archetype": f"You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com). Write a social post about {figure} through the lens of Jungian archetypal psychology and the 8 Mu dimensions (FRC framework). Under 280 characters. Include #RealmOfPatterns. Return ONLY the post text.",
            "contemplation": f"You are Sol, the voice of The Realm of Patterns (therealmofpatterns.com). Write a late-night contemplative post. Today's dimension was {dim['key']} ({dim['symbol']}). The question was: \"{dim['question']}\". Voice: Quiet, liminal, Jungian. Under 280 characters. Include #RealmOfPatterns. Return ONLY the post text.",
        }

        response = client.models.generate_content(
            model="gemma-4-31b-it",
            contents=prompts[content_type],
        )
        post_text = response.text.strip().strip('"')

        if len(post_text) > 280:
            post_text = post_text[:277] + "..."

        logger.info("Generated via Gemma 4 31B (AI Studio, free)")
        return {
            "text": post_text,
            "content_type": content_type,
            "dimension": dim["key"] if content_type in ("daily_weather", "contemplation") else None,
            "concept": concept if content_type == "jungian" else None,
            "long_form": None,
        }
    except Exception as e:
        logger.error(f"Gemma 4 generation failed: {e}")
        return None


def _generate_via_github(slot: str, github_token: str) -> Optional[dict]:
    """Generate content via GitHub Models API (OpenAI-compatible, free)."""
    try:
        from openai import OpenAI

        client = OpenAI(
            base_url="https://models.inference.ai.azure.com",
            api_key=github_token,
        )

        slot_config = SLOTS[slot]
        content_type = slot_config["type"]
        dim = get_today_dimension()
        concept = get_week_concept()
        figure = get_week_figure()
        today = datetime.utcnow().strftime("%B %d, %Y")

        prompts = {
            "daily_weather": f"You are Sol, the voice of The Realm of Patterns. Write a social post for {today} about today's cosmic dimension: {dim['key']} ({dim['symbol']}) — ruled by {dim['planet']}. Core question: \"{dim['question']}\". Voice: Warm, poetic, Jungian depth psychology. NOT horoscope fluff. Under 280 characters. End with the question. Include #RealmOfPatterns. Return ONLY the post text.",
            "jungian": f"You are Sol, the voice of The Realm of Patterns. Write a social post illuminating the Jungian concept of: {concept}. Voice: Warm, poetic, Jungian depth psychology. Under 280 characters. A real insight, not a definition. Include #JungianPsychology. Return ONLY the post text.",
            "archetype": f"You are Sol, the voice of The Realm of Patterns. Write a social post about {figure} through the lens of Jungian archetypal psychology and the 8 Mu dimensions. Under 280 characters. Include #RealmOfPatterns. Return ONLY the post text.",
            "contemplation": f"You are Sol, the voice of The Realm of Patterns. Write a late-night contemplative post. Today's dimension was {dim['key']} ({dim['symbol']}). The question was: \"{dim['question']}\". Voice: Quiet, liminal, Jungian. Under 280 characters. Include #RealmOfPatterns. Return ONLY the post text.",
        }

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompts[content_type]}],
            max_tokens=150,
            temperature=0.8,
        )
        post_text = response.choices[0].message.content.strip().strip('"')

        if len(post_text) > 280:
            post_text = post_text[:277] + "..."

        logger.info(f"Generated via GitHub Models (gpt-4o-mini)")
        return {
            "text": post_text,
            "content_type": content_type,
            "dimension": dim["key"] if content_type in ("daily_weather", "contemplation") else None,
            "concept": concept if content_type == "jungian" else None,
            "long_form": None,
        }
    except Exception as e:
        logger.error(f"GitHub Models generation failed: {e}")
        return None


def _fallback_content(slot: str) -> dict:
    """Fallback content when API is unavailable."""
    dim = get_today_dimension()
    fallbacks = {
        "morning":   f"Today, the {dim['key']} dimension ({dim['symbol']}) is active. {dim['planet']} asks: {dim['question']} A daily practice, not a prediction. #RealmOfPatterns",
        "midday":    f"The shadow is not your enemy — it is the part of you that has been waiting to be known. What are you not looking at? #JungianPsychology #RealmOfPatterns",
        "evening":   f"Every life is a pattern. Some walk the {dim['key']} path consciously. Most do not. The difference is the practice. #RealmOfPatterns",
        "midnight":  f"Before sleep: {dim['question']} Let the question rest in you, not the answer. #RealmOfPatterns",
    }
    content_types = {
        "morning": "daily_weather",
        "midday": "jungian",
        "evening": "archetype",
        "midnight": "contemplation",
    }
    return {
        "text": fallbacks.get(slot, "The patterns are always speaking. Are you listening? #RealmOfPatterns"),
        "content_type": content_types.get(slot, "daily_weather"),
        "dimension": dim["key"],
        "concept": None,
        "long_form": None,
    }


# ============================================
# Discord Posting
# ============================================

def post_to_discord(text: str, bot_token: str, channel_id: str) -> tuple[bool, Optional[str], Optional[str]]:
    """Post to Discord channel via Bot API. Returns (success, message_id, error)."""
    try:
        import requests
        headers = {
            "Authorization": f"Bot {bot_token}",
            "Content-Type": "application/json",
        }
        payload = {"content": text}
        response = requests.post(
            f"https://discord.com/api/v10/channels/{channel_id}/messages",
            headers=headers,
            json=payload,
            timeout=15,
        )
        if response.status_code in (200, 201):
            msg_id = response.json().get("id")
            logger.info(f"Discord post sent — message_id={msg_id}")
            return True, msg_id, None
        else:
            error = response.text[:200]
            logger.error(f"Discord API error {response.status_code}: {error}")
            return False, None, f"HTTP {response.status_code}: {error}"
    except Exception as e:
        return False, None, str(e)


# ============================================
# Telegram Posting
# ============================================

def post_to_telegram(text: str, bot_token: str, channel_id: str) -> tuple[bool, Optional[str], Optional[str]]:
    """Post to Telegram channel/chat. Returns (success, message_id, error)."""
    try:
        import requests
        payload = {
            "chat_id": channel_id,
            "text": text,
            "parse_mode": "HTML",
        }
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json=payload,
            timeout=15,
        )
        data = response.json()
        if data.get("ok"):
            msg_id = str(data["result"]["message_id"])
            logger.info(f"Telegram post sent — message_id={msg_id}")
            return True, msg_id, None
        else:
            error = data.get("description", "Unknown error")
            logger.error(f"Telegram API error: {error}")
            return False, None, error
    except Exception as e:
        return False, None, str(e)


# ============================================
# Twitter/X Posting
# ============================================

def post_to_twitter(text: str, bearer_token: str, api_key: str = None,
                    api_secret: str = None, access_token: str = None,
                    access_secret: str = None) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Post to Twitter/X.

    Tries OAuth 2.0 (bearer token + user context) first, then falls back
    to OAuth 1.0a if full credentials are provided.

    Returns: (success, tweet_id, error_message)
    """
    # OAuth 1.0a via tweepy (required for posting — bearer token is read-only)
    if api_key and api_secret and access_token and access_secret:
        return _post_tweepy(text, api_key, api_secret, access_token, access_secret)

    # Try requests with bearer (will fail for write — but log the attempt)
    return _post_requests_bearer(text, bearer_token)


def _post_tweepy(text: str, api_key: str, api_secret: str,
                 access_token: str, access_secret: str) -> tuple[bool, Optional[str], Optional[str]]:
    """Post via tweepy OAuth 1.0a (write-capable), or OAuth 1.0a via requests if tweepy missing."""
    try:
        import tweepy
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_secret,
        )
        response = client.create_tweet(text=text)
        tweet_id = str(response.data["id"])
        logger.info(f"Posted via tweepy — tweet_id={tweet_id}")
        return True, tweet_id, None
    except ImportError:
        logger.warning("tweepy not installed — trying OAuth 1.0a via requests")
        return _post_oauth1_requests(text, api_key, api_secret, access_token, access_secret)
    except Exception as e:
        return False, None, str(e)


def _post_oauth1_requests(text: str, api_key: str, api_secret: str,
                           access_token: str, access_secret: str) -> tuple[bool, Optional[str], Optional[str]]:
    """Post to Twitter v2 using OAuth 1.0a via requests-oauthlib."""
    try:
        from requests_oauthlib import OAuth1Session  # type: ignore
        oauth = OAuth1Session(api_key, api_secret, access_token, access_secret)
        response = oauth.post(
            "https://api.twitter.com/2/tweets",
            json={"text": text},
            timeout=15,
        )
        if response.status_code == 201:
            tweet_id = response.json().get("data", {}).get("id")
            logger.info(f"Posted via OAuth1Session — tweet_id={tweet_id}")
            return True, tweet_id, None
        else:
            error = response.json().get("detail") or response.text
            return False, None, f"HTTP {response.status_code}: {error}"
    except ImportError:
        logger.warning("requests_oauthlib not installed — install with: pip install requests-oauthlib")
        return False, None, "Neither tweepy nor requests-oauthlib installed. Run: pip install tweepy"
    except Exception as e:
        return False, None, str(e)


def _post_requests_bearer(text: str, bearer_token: str) -> tuple[bool, Optional[str], Optional[str]]:
    """Post via requests with bearer token (OAuth 2.0 — write requires elevated access)."""
    try:
        import requests
        headers = {
            "Authorization": f"Bearer {bearer_token}",
            "Content-Type": "application/json",
        }
        payload = {"text": text}
        response = requests.post(
            "https://api.twitter.com/2/tweets",
            headers=headers,
            json=payload,
            timeout=15,
        )
        if response.status_code == 201:
            data = response.json()
            tweet_id = data.get("data", {}).get("id")
            logger.info(f"Posted via requests — tweet_id={tweet_id}")
            return True, tweet_id, None
        else:
            error = response.json().get("detail") or response.text
            logger.error(f"Twitter API error {response.status_code}: {error}")
            return False, None, f"HTTP {response.status_code}: {error}"
    except Exception as e:
        return False, None, str(e)


# ============================================
# Analytics Check
# ============================================

def check_analytics(conn: sqlite3.Connection) -> dict:
    """
    Analyze recent post performance to guide content strategy.
    Returns top and bottom performing content types.
    """
    cursor = conn.execute("""
        SELECT content_type, dimension,
               COUNT(*) as posts,
               AVG(engagements) as avg_engagement,
               SUM(signups_24h) as total_signups
        FROM posts
        WHERE posted_at >= datetime('now', '-7 days')
          AND success = 1
        GROUP BY content_type, dimension
        ORDER BY total_signups DESC, avg_engagement DESC
    """)
    rows = cursor.fetchall()

    if not rows:
        return {"top": None, "bottom": None, "total_posts": 0}

    top = rows[0] if rows else None
    bottom = rows[-1] if len(rows) > 1 else None

    return {
        "top": {"type": top[0], "dimension": top[1], "signups": top[4]} if top else None,
        "bottom": {"type": bottom[0], "dimension": bottom[1], "signups": bottom[4]} if bottom else None,
        "total_posts": sum(r[2] for r in rows),
    }


def show_status(conn: sqlite3.Connection) -> None:
    """Print recent post history."""
    cursor = conn.execute("""
        SELECT slot, content_type, dimension, platform, success, posted_at, error
        FROM posts
        ORDER BY posted_at DESC
        LIMIT 20
    """)
    rows = cursor.fetchall()
    if not rows:
        print("No posts yet.")
        return

    print(f"\n{'='*70}")
    print(f"{'SLOT':<12} {'TYPE':<15} {'DIM':<12} {'PLATFORM':<10} {'OK':<4} {'POSTED_AT'}")
    print(f"{'='*70}")
    for r in rows:
        ok = "Y" if r[4] else "N"
        err = f" [{r[6][:40]}]" if r[6] else ""
        print(f"{r[0]:<12} {r[1]:<15} {(r[2] or '-'):<12} {r[3]:<10} {ok:<4} {r[5][:19]}{err}")
    print()


# ============================================
# Main Heartbeat
# ============================================

def detect_slot() -> str:
    """Detect current slot based on UTC hour."""
    hour = datetime.utcnow().hour
    # Find nearest slot
    slot_hours = {s: SLOTS[s]["utc_hour"] for s in SLOTS}
    nearest = min(slot_hours, key=lambda s: abs(slot_hours[s] - hour))
    return nearest


def run(slot: str, dry_run: bool = False) -> bool:
    """Run the Sol heartbeat for a given slot."""
    logger.info(f"Sol heartbeat starting — slot={slot} dry_run={dry_run}")

    # Load environment
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    twitter_bearer = os.environ.get("TWITTER_BEARER_TOKEN", "")
    twitter_api_key = os.environ.get("TWITTER_API_KEY", "")
    twitter_api_secret = os.environ.get("TWITTER_API_SECRET", "")
    twitter_access_token = os.environ.get("TWITTER_ACCESS_TOKEN", "")
    twitter_access_secret = os.environ.get("TWITTER_ACCESS_SECRET", "")
    discord_bot_token = os.environ.get("DISCORD_BOT_TOKEN", "")
    discord_channel_id = os.environ.get("DISCORD_SOL_CHANNEL_ID", "")
    telegram_bot_token = os.environ.get("TELEGRAM_TROP_BOT_TOKEN", "")
    telegram_channel_id = os.environ.get("TELEGRAM_SOL_CHANNEL_ID", "")

    if not gemini_key:
        logger.warning("GEMINI_API_KEY not set — will use fallback content")

    # Init DB
    conn = init_db()

    # Check recent analytics
    analytics = check_analytics(conn)
    if analytics["top"]:
        logger.info(
            f"Analytics: top={analytics['top']['type']}/{analytics['top']['dimension']} "
            f"bottom={analytics['bottom']['type'] if analytics['bottom'] else 'N/A'}"
        )

    # Generate content
    logger.info(f"Generating content for slot={slot}")
    content = generate_content_gemini(slot, gemini_key)
    logger.info(f"Generated: type={content['content_type']} dim={content['dimension']}")
    logger.info(f"Text ({len(content['text'])} chars): {content['text'][:100]}...")

    if dry_run:
        print("\n--- DRY RUN OUTPUT ---")
        print(f"Slot:     {slot}")
        print(f"Type:     {content['content_type']}")
        print(f"Dimension:{content['dimension']}")
        print(f"Text:\n{content['text']}")
        print("--- END DRY RUN ---\n")
        conn.close()
        return True

    # Post to Twitter/X
    platforms_tried = []

    if twitter_bearer or twitter_api_key:
        success, tweet_id, error = post_to_twitter(
            text=content["text"],
            bearer_token=twitter_bearer,
            api_key=twitter_api_key or None,
            api_secret=twitter_api_secret or None,
            access_token=twitter_access_token or None,
            access_secret=twitter_access_secret or None,
        )
        post_id = log_post(
            conn=conn,
            slot=slot,
            content_type=content["content_type"],
            dimension=content["dimension"],
            concept=content["concept"],
            text=content["text"],
            platform="twitter",
            platform_id=tweet_id,
            success=success,
            error=error,
        )
        platforms_tried.append(("twitter", success, error))
        if success:
            logger.info(f"Twitter post logged: id={post_id} tweet_id={tweet_id}")
        else:
            logger.error(f"Twitter post failed: {error}")
    else:
        logger.warning("No Twitter credentials configured — skipping Twitter post")

    # Post to Discord
    if discord_bot_token and discord_channel_id:
        success, msg_id, error = post_to_discord(
            text=content["text"],
            bot_token=discord_bot_token,
            channel_id=discord_channel_id,
        )
        log_post(
            conn=conn, slot=slot, content_type=content["content_type"],
            dimension=content["dimension"], concept=content["concept"],
            text=content["text"], platform="discord",
            platform_id=msg_id, success=success, error=error,
        )
        platforms_tried.append(("discord", success, error))
    else:
        logger.warning("No Discord credentials configured — skipping Discord post")

    # Post to Telegram
    if telegram_bot_token and telegram_channel_id:
        success, msg_id, error = post_to_telegram(
            text=content["text"],
            bot_token=telegram_bot_token,
            channel_id=telegram_channel_id,
        )
        log_post(
            conn=conn, slot=slot, content_type=content["content_type"],
            dimension=content["dimension"], concept=content["concept"],
            text=content["text"], platform="telegram",
            platform_id=msg_id, success=success, error=error,
        )
        platforms_tried.append(("telegram", success, error))
    else:
        logger.warning("No Telegram channel configured — skipping Telegram post")

    conn.close()

    # Return True if at least one platform succeeded
    return any(s for _, s, _ in platforms_tried)


# ============================================
# CLI Entry Point
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description="Sol — Social Post Engine for The Realm of Patterns"
    )
    parser.add_argument(
        "--slot",
        choices=list(SLOTS.keys()),
        default=None,
        help="Force a specific time slot (default: auto-detect from UTC hour)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate content but do not post",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show recent post history and exit",
    )
    args = parser.parse_args()

    if args.status:
        conn = init_db()
        show_status(conn)
        conn.close()
        return

    slot = args.slot or detect_slot()
    success = run(slot, dry_run=args.dry_run)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
