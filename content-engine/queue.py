#!/usr/bin/env python3
"""
The Realm of Patterns - Content Priority Queue

Priority-based content generation queue for programmatic SEO.
Manages generation order based on language market size, content type value,
and dimension interest.

Usage:
    # Seed the queue
    python queue.py seed --languages en,es-mx --types dimension_guide,historical_figure

    # Get next batch
    python queue.py next --limit 10

    # Mark complete
    python queue.py complete --id <item_id> --success

    # View stats
    python queue.py stats
"""

import os
import sys
import json
import uuid
import argparse
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('content-queue')


# ============================================
# Configuration
# ============================================

# Language weights based on market size
LANGUAGE_WEIGHTS: Dict[str, int] = {
    'en': 10,      # English - largest market
    'es-mx': 8,    # Mexican Spanish - large Spanish market
    'es-ar': 7,    # Argentine Spanish - medium market
    'es-es': 6,    # Spain Spanish - medium market
    'pt-br': 7,    # Brazilian Portuguese - large Portuguese market
    'pt-pt': 5,    # Portugal Portuguese - smaller market
}

# Content type weights based on SEO value and evergreen nature
CONTENT_TYPE_WEIGHTS: Dict[str, int] = {
    'dimension_guide': 10,     # Evergreen, high SEO value
    'jungian_concept': 9,      # Educational, shareable
    'historical_figure': 8,    # Celebrity effect
    'historical_era': 7,       # Educational, unique content
    'compatibility_type': 7,   # Viral potential
    'vedic_dasha': 6,          # Niche but loyal audience
    'transit_guide': 6,        # Niche astronomy interest
    'daily_weather': 5,        # Daily engagement (ephemeral)
    'weekly_forecast': 5,      # Weekly engagement
    'blog_post': 4,            # General content
    'archetype_profile': 6,    # Character-based content
}

# Dimension weights based on search volume estimates
DIMENSION_WEIGHTS: Dict[str, int] = {
    'phase': 10,      # Identity - universal appeal
    'relation': 9,    # Relationships - high search
    'value': 8,       # Self-worth topics
    'field': 7,       # Spirituality seekers
    'action': 7,      # Action/motivation
    'expansion': 6,   # Growth topics
    'cognition': 6,   # Mental/communication
    'existence': 5,   # Structure/discipline
}

# All supported languages
ALL_LANGUAGES = list(LANGUAGE_WEIGHTS.keys())

# All content types
ALL_CONTENT_TYPES = list(CONTENT_TYPE_WEIGHTS.keys())

# All dimensions
ALL_DIMENSIONS = list(DIMENSION_WEIGHTS.keys())

# Historical figures from the project
HISTORICAL_FIGURES = [
    'rumi', 'jung', 'tesla', 'frida-kahlo', 'marcus-aurelius',
    'hildegard-of-bingen', 'pythagoras', 'hypatia', 'lao-tzu',
    'rabindranath-tagore', 'marie-curie', 'leonardo-da-vinci',
    'buddha', 'krishna', 'jesus', 'muhammad', 'moses',
    'plato', 'aristotle', 'socrates', 'confucius',
    'albert-einstein', 'carl-sagan', 'nikola-tesla',
    'mahatma-gandhi', 'martin-luther-king', 'nelson-mandela',
    'cleopatra', 'queen-elizabeth-i', 'joan-of-arc',
    'shakespeare', 'rainer-maria-rilke', 'hafiz', 'kabir',
    'ramana-maharshi', 'sri-aurobindo', 'thich-nhat-hanh',
    'alan-watts', 'terence-mckenna', 'ram-dass',
    'bach', 'mozart', 'beethoven',
    'michelangelo', 'rembrandt', 'salvador-dali',
    'maya-angelou', 'virginia-woolf', 'mary-shelley',
    'alexander-the-great', 'genghis-khan', 'napoleon',
]

# Jungian concepts
JUNGIAN_CONCEPTS = [
    'shadow', 'anima', 'animus', 'persona', 'self',
    'individuation', 'archetype', 'complex', 'projection', 'synchronicity',
]

# Historical eras
HISTORICAL_ERAS = [
    'ancient-origins',      # Pre-3000 BCE
    'classical-period',     # 800 BCE - 500 CE
    'islamic-golden-age',   # 750-1258 CE
    'renaissance-revival',  # 1400-1600 CE
    'modern-rebirth',       # 1900-present
]

# Vedic Dasha planets
VEDIC_PLANETS = [
    'sun', 'moon', 'mars', 'rahu', 'jupiter',
    'saturn', 'mercury', 'ketu', 'venus',
]

# Transit guide planets
TRANSIT_PLANETS = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
]


# ============================================
# Data Classes
# ============================================

class QueueStatus(str, Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'


@dataclass
class QueueItem:
    """Represents an item in the content queue."""
    id: str
    content_type: str
    language: str
    params: Dict[str, Any]
    priority_score: int
    status: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'content_type': self.content_type,
            'language': self.language,
            'params': self.params,
            'priority_score': self.priority_score,
            'status': self.status,
            'created_at': self.created_at,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'error_message': self.error_message,
        }


@dataclass
class QueueStats:
    """Queue statistics."""
    total: int
    pending: int
    processing: int
    completed: int
    failed: int
    avg_priority: float
    by_language: Dict[str, int]
    by_content_type: Dict[str, int]


# ============================================
# Priority Calculation
# ============================================

def calculate_priority(
    language: str,
    content_type: str,
    dimension: Optional[str] = None,
    figure: Optional[str] = None
) -> int:
    """
    Calculate priority score for a content item.

    Args:
        language: Language code (e.g., 'en', 'es-mx')
        content_type: Content type (e.g., 'dimension_guide')
        dimension: Optional dimension key (e.g., 'phase')
        figure: Optional figure slug (for historical_figure type)

    Returns:
        Priority score (0-30+)

    Example:
        >>> calculate_priority('en', 'dimension_guide', dimension='phase')
        30  # 10 (en) + 10 (dimension_guide) + 10 (phase)

        >>> calculate_priority('pt-pt', 'daily_weather')
        10  # 5 (pt-pt) + 5 (daily_weather)
    """
    score = 0

    # Language weight (market size)
    score += LANGUAGE_WEIGHTS.get(language, 3)

    # Content type weight (evergreen value)
    score += CONTENT_TYPE_WEIGHTS.get(content_type, 3)

    # Dimension weight (if applicable)
    if dimension:
        score += DIMENSION_WEIGHTS.get(dimension, 5)

    # Figure popularity bonus (if applicable)
    if figure and content_type == 'historical_figure':
        # Top-tier figures get a bonus
        top_figures = ['rumi', 'jung', 'buddha', 'jesus', 'leonardo-da-vinci', 'einstein']
        if figure in top_figures:
            score += 3

    return score


# ============================================
# Queue Database Interface
# ============================================

class QueueDatabase:
    """
    Database interface for the content queue.
    Uses SQLite locally, can be swapped for Cloudflare D1 in production.
    """

    def __init__(self, db_path: Optional[str] = None):
        """Initialize database connection."""
        import sqlite3

        if db_path is None:
            # Default path in project directory
            base_dir = Path(__file__).parent.parent
            db_path = str(base_dir / '.data' / 'content_queue.db')

        # Ensure directory exists
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row

        # Initialize schema
        self._init_schema()

    def _init_schema(self) -> None:
        """Create tables if they don't exist."""
        self.conn.executescript("""
            -- Content generation queue
            CREATE TABLE IF NOT EXISTS content_queue (
                id TEXT PRIMARY KEY,
                content_type TEXT NOT NULL,
                language TEXT NOT NULL,
                params TEXT NOT NULL,
                priority_score INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                started_at TEXT,
                completed_at TEXT,
                error_message TEXT
            );

            -- Create indexes for efficient queries
            CREATE INDEX IF NOT EXISTS idx_queue_status ON content_queue(status);
            CREATE INDEX IF NOT EXISTS idx_queue_priority ON content_queue(priority_score DESC);
            CREATE INDEX IF NOT EXISTS idx_queue_language ON content_queue(language);
            CREATE INDEX IF NOT EXISTS idx_queue_type ON content_queue(content_type);

            -- Unique constraint on content type + language + params hash
            CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_unique
                ON content_queue(content_type, language, params);
        """)
        self.conn.commit()

    def add_item(
        self,
        content_type: str,
        language: str,
        params: Dict[str, Any],
        priority_score: int
    ) -> Optional[str]:
        """
        Add an item to the queue.

        Returns:
            Item ID if added, None if already exists
        """
        item_id = str(uuid.uuid4())
        params_json = json.dumps(params, sort_keys=True)
        created_at = datetime.now(timezone.utc).isoformat()

        try:
            self.conn.execute("""
                INSERT INTO content_queue
                (id, content_type, language, params, priority_score, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
            """, (item_id, content_type, language, params_json, priority_score, created_at))
            self.conn.commit()
            return item_id
        except Exception as e:
            # Likely duplicate
            if 'UNIQUE constraint' in str(e):
                logger.debug(f"Item already exists: {content_type}/{language}")
                return None
            raise

    def get_next_batch(self, limit: int = 10) -> List[QueueItem]:
        """
        Get the next batch of items to process.

        Orders by priority_score DESC, then created_at ASC.
        Updates status to 'processing' for returned items.
        """
        cursor = self.conn.execute("""
            SELECT * FROM content_queue
            WHERE status = 'pending'
            ORDER BY priority_score DESC, created_at ASC
            LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        items = []

        started_at = datetime.now(timezone.utc).isoformat()

        for row in rows:
            # Update status to processing
            self.conn.execute("""
                UPDATE content_queue
                SET status = 'processing', started_at = ?
                WHERE id = ?
            """, (started_at, row['id']))

            items.append(QueueItem(
                id=row['id'],
                content_type=row['content_type'],
                language=row['language'],
                params=json.loads(row['params']),
                priority_score=row['priority_score'],
                status='processing',
                created_at=row['created_at'],
                started_at=started_at,
                completed_at=row['completed_at'],
                error_message=row['error_message'],
            ))

        self.conn.commit()
        return items

    def mark_complete(
        self,
        item_id: str,
        success: bool = True,
        error: Optional[str] = None
    ) -> bool:
        """
        Mark an item as completed or failed.

        Returns:
            True if item was updated, False if not found
        """
        completed_at = datetime.now(timezone.utc).isoformat()
        status = 'completed' if success else 'failed'

        cursor = self.conn.execute("""
            UPDATE content_queue
            SET status = ?, completed_at = ?, error_message = ?
            WHERE id = ?
        """, (status, completed_at, error, item_id))

        self.conn.commit()
        return cursor.rowcount > 0

    def reset_stale_processing(self, max_age_hours: int = 1) -> int:
        """
        Reset items that have been processing for too long.

        Returns:
            Number of items reset
        """
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=max_age_hours)).isoformat()

        cursor = self.conn.execute("""
            UPDATE content_queue
            SET status = 'pending', started_at = NULL
            WHERE status = 'processing' AND started_at < ?
        """, (cutoff,))

        self.conn.commit()
        return cursor.rowcount

    def get_stats(self) -> QueueStats:
        """Get queue statistics."""
        # Status counts
        cursor = self.conn.execute("""
            SELECT status, COUNT(*) as count
            FROM content_queue
            GROUP BY status
        """)
        status_counts = {row['status']: row['count'] for row in cursor.fetchall()}

        # Total and average priority
        cursor = self.conn.execute("""
            SELECT COUNT(*) as total, AVG(priority_score) as avg_priority
            FROM content_queue
        """)
        row = cursor.fetchone()
        total = row['total'] or 0
        avg_priority = row['avg_priority'] or 0.0

        # By language
        cursor = self.conn.execute("""
            SELECT language, COUNT(*) as count
            FROM content_queue
            WHERE status = 'pending'
            GROUP BY language
        """)
        by_language = {row['language']: row['count'] for row in cursor.fetchall()}

        # By content type
        cursor = self.conn.execute("""
            SELECT content_type, COUNT(*) as count
            FROM content_queue
            WHERE status = 'pending'
            GROUP BY content_type
        """)
        by_content_type = {row['content_type']: row['count'] for row in cursor.fetchall()}

        return QueueStats(
            total=total,
            pending=status_counts.get('pending', 0),
            processing=status_counts.get('processing', 0),
            completed=status_counts.get('completed', 0),
            failed=status_counts.get('failed', 0),
            avg_priority=avg_priority,
            by_language=by_language,
            by_content_type=by_content_type,
        )

    def get_item(self, item_id: str) -> Optional[QueueItem]:
        """Get a specific queue item by ID."""
        cursor = self.conn.execute("""
            SELECT * FROM content_queue WHERE id = ?
        """, (item_id,))

        row = cursor.fetchone()
        if not row:
            return None

        return QueueItem(
            id=row['id'],
            content_type=row['content_type'],
            language=row['language'],
            params=json.loads(row['params']),
            priority_score=row['priority_score'],
            status=row['status'],
            created_at=row['created_at'],
            started_at=row['started_at'],
            completed_at=row['completed_at'],
            error_message=row['error_message'],
        )

    def exists(self, content_type: str, language: str, params: Dict[str, Any]) -> bool:
        """Check if an item already exists in the queue."""
        params_json = json.dumps(params, sort_keys=True)
        cursor = self.conn.execute("""
            SELECT 1 FROM content_queue
            WHERE content_type = ? AND language = ? AND params = ?
            LIMIT 1
        """, (content_type, language, params_json))
        return cursor.fetchone() is not None

    def close(self) -> None:
        """Close the database connection."""
        self.conn.close()


# ============================================
# Queue Seeding
# ============================================

def seed_queue(
    languages: Optional[List[str]] = None,
    content_types: Optional[List[str]] = None,
    db: Optional[QueueDatabase] = None
) -> int:
    """
    Seed the queue with content generation tasks.

    Generates all combinations of:
    - Languages x Content Types x Params (dimensions, figures, etc.)

    Skips items that already exist in the queue with pending status.

    Args:
        languages: List of language codes (default: all)
        content_types: List of content types (default: all)
        db: Database instance (creates new if not provided)

    Returns:
        Number of items added to queue
    """
    if languages is None:
        languages = ALL_LANGUAGES
    if content_types is None:
        content_types = ALL_CONTENT_TYPES

    if db is None:
        db = QueueDatabase()

    count = 0

    for lang in languages:
        for ctype in content_types:
            # Generate parameter combinations based on content type
            param_sets = _get_param_combinations(ctype)

            for params in param_sets:
                # Calculate priority
                dimension = params.get('dimension')
                figure = params.get('figure')
                priority = calculate_priority(lang, ctype, dimension=dimension, figure=figure)

                # Try to add to queue
                item_id = db.add_item(ctype, lang, params, priority)
                if item_id:
                    count += 1
                    logger.debug(f"Added: {ctype}/{lang} with priority {priority}")

    logger.info(f"Seeded {count} items to queue")
    return count


def _get_param_combinations(content_type: str) -> List[Dict[str, Any]]:
    """Get all parameter combinations for a content type."""
    if content_type == 'dimension_guide':
        return [{'dimension': dim} for dim in ALL_DIMENSIONS]

    elif content_type == 'historical_figure':
        return [{'figure': fig} for fig in HISTORICAL_FIGURES]

    elif content_type == 'jungian_concept':
        return [{'concept': concept} for concept in JUNGIAN_CONCEPTS]

    elif content_type == 'historical_era':
        return [{'era': era} for era in HISTORICAL_ERAS]

    elif content_type == 'vedic_dasha':
        return [{'planet': planet} for planet in VEDIC_PLANETS]

    elif content_type == 'transit_guide':
        return [{'planet': planet} for planet in TRANSIT_PLANETS]

    elif content_type == 'compatibility_type':
        # Generate all unique dimension pairs
        pairs = []
        for i, dim1 in enumerate(ALL_DIMENSIONS):
            for dim2 in ALL_DIMENSIONS[i+1:]:  # Avoid duplicates and self-pairs
                pairs.append({'dimension1': dim1, 'dimension2': dim2})
        return pairs

    elif content_type in ('daily_weather', 'weekly_forecast'):
        # For daily/weekly, we don't seed specific dates
        # They're generated by cron on demand
        return []

    elif content_type == 'blog_post':
        # Blog posts are typically manually created
        return []

    elif content_type == 'archetype_profile':
        # Same as historical figures
        return [{'figure': fig} for fig in HISTORICAL_FIGURES]

    else:
        return [{}]


# ============================================
# Batch Processing
# ============================================

def get_next_batch(limit: int = 10, db: Optional[QueueDatabase] = None) -> List[QueueItem]:
    """
    Get the next batch of items to process.

    Args:
        limit: Maximum number of items to return
        db: Database instance

    Returns:
        List of QueueItem objects
    """
    if db is None:
        db = QueueDatabase()

    return db.get_next_batch(limit)


def mark_complete(
    item_id: str,
    success: bool = True,
    error: Optional[str] = None,
    db: Optional[QueueDatabase] = None
) -> bool:
    """
    Mark a queue item as completed or failed.

    Args:
        item_id: The queue item ID
        success: True for completed, False for failed
        error: Optional error message (for failures)
        db: Database instance

    Returns:
        True if item was found and updated
    """
    if db is None:
        db = QueueDatabase()

    return db.mark_complete(item_id, success, error)


def get_stats(db: Optional[QueueDatabase] = None) -> QueueStats:
    """Get queue statistics."""
    if db is None:
        db = QueueDatabase()

    return db.get_stats()


# ============================================
# CLI Interface
# ============================================

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Content Priority Queue Management'
    )

    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # Seed command
    seed_parser = subparsers.add_parser('seed', help='Seed the queue with content tasks')
    seed_parser.add_argument(
        '--languages', '-l',
        type=str,
        default=None,
        help='Comma-separated language codes (default: all)'
    )
    seed_parser.add_argument(
        '--types', '-t',
        type=str,
        default=None,
        help='Comma-separated content types (default: all)'
    )

    # Next command
    next_parser = subparsers.add_parser('next', help='Get next batch of items')
    next_parser.add_argument(
        '--limit', '-n',
        type=int,
        default=10,
        help='Maximum number of items (default: 10)'
    )

    # Complete command
    complete_parser = subparsers.add_parser('complete', help='Mark item as complete')
    complete_parser.add_argument('--id', required=True, help='Item ID')
    complete_parser.add_argument('--success', action='store_true', help='Mark as success')
    complete_parser.add_argument('--error', type=str, help='Error message (implies failure)')

    # Stats command
    subparsers.add_parser('stats', help='Show queue statistics')

    # Reset command
    reset_parser = subparsers.add_parser('reset', help='Reset stale processing items')
    reset_parser.add_argument('--hours', type=int, default=1, help='Max age in hours')

    # Priority command (for testing)
    priority_parser = subparsers.add_parser('priority', help='Calculate priority score')
    priority_parser.add_argument('--lang', required=True, help='Language code')
    priority_parser.add_argument('--type', required=True, help='Content type')
    priority_parser.add_argument('--dimension', help='Dimension (optional)')
    priority_parser.add_argument('--figure', help='Figure slug (optional)')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    db = QueueDatabase()

    try:
        if args.command == 'seed':
            languages = args.languages.split(',') if args.languages else None
            types = args.types.split(',') if args.types else None
            count = seed_queue(languages=languages, content_types=types, db=db)
            print(f"Seeded {count} items to queue")

        elif args.command == 'next':
            items = get_next_batch(limit=args.limit, db=db)
            print(json.dumps([item.to_dict() for item in items], indent=2))

        elif args.command == 'complete':
            success = args.success and not args.error
            result = mark_complete(args.id, success=success, error=args.error, db=db)
            if result:
                print(f"Item {args.id} marked as {'completed' if success else 'failed'}")
            else:
                print(f"Item {args.id} not found")
                sys.exit(1)

        elif args.command == 'stats':
            stats = get_stats(db=db)
            print(json.dumps(asdict(stats), indent=2))

        elif args.command == 'reset':
            count = db.reset_stale_processing(max_age_hours=args.hours)
            print(f"Reset {count} stale processing items")

        elif args.command == 'priority':
            score = calculate_priority(
                language=args.lang,
                content_type=args.type,
                dimension=args.dimension,
                figure=args.figure
            )
            print(f"Priority score: {score}")
            print(f"  Language ({args.lang}): {LANGUAGE_WEIGHTS.get(args.lang, 3)}")
            print(f"  Type ({args.type}): {CONTENT_TYPE_WEIGHTS.get(args.type, 3)}")
            if args.dimension:
                print(f"  Dimension ({args.dimension}): {DIMENSION_WEIGHTS.get(args.dimension, 5)}")

    finally:
        db.close()


if __name__ == '__main__':
    main()
