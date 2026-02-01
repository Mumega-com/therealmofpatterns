#!/usr/bin/env python3
"""
The Realm of Patterns - Content Publisher

Python module that takes generator.py output and publishes it to the
Cloudflare D1 database via the /api/publish endpoint.

Features:
- Takes GenerationResult from generator.py
- Transforms content to PublishRequest format
- Calls /api/publish endpoint
- Handles errors and implements retry logic
- Logs to generation_stats

Usage:
    from publisher import ContentPublisher

    publisher = ContentPublisher(api_url="https://therealmofpatterns.com")
    result = publisher.publish(generator_output)

    # Or from CLI:
    python publisher.py --input generated_content.json
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, TypedDict, Literal
from dataclasses import dataclass, field, asdict
from pathlib import Path
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('content-publisher')


# ============================================
# Type Definitions
# ============================================

class ContentType(str, Enum):
    DAILY_WEATHER = 'daily_weather'
    WEEKLY_FORECAST = 'weekly_forecast'
    DIMENSION_GUIDE = 'dimension_guide'
    ARCHETYPE_PROFILE = 'archetype_profile'
    HISTORICAL_FIGURE = 'historical_figure'
    HISTORICAL_ERA = 'historical_era'
    JUNGIAN_CONCEPT = 'jungian_concept'
    VEDIC_DASHA = 'vedic_dasha'
    TRANSIT_GUIDE = 'transit_guide'
    COMPATIBILITY_TYPE = 'compatibility_type'
    BLOG_POST = 'blog_post'


class ContentStatus(str, Enum):
    DRAFT = 'draft'
    REVIEW = 'review'
    PUBLISHED = 'published'
    ARCHIVED = 'archived'


@dataclass
class ContentBlock:
    """Base content block."""
    type: str
    content: Optional[str] = None
    items: Optional[List[str]] = None
    level: Optional[int] = None
    order: Optional[int] = None


@dataclass
class FAQ:
    """FAQ item."""
    question: str
    answer: str


@dataclass
class PublishRequest:
    """Request payload for /api/publish endpoint."""
    content_type: str
    language: str
    title: str
    content_blocks: List[Dict[str, Any]]
    meta_description: Optional[str] = None
    faqs: Optional[List[Dict[str, str]]] = None
    schema_markup: Optional[Dict[str, Any]] = None
    related_topics: Optional[List[str]] = None
    params: Optional[Dict[str, Any]] = None
    status: str = 'draft'
    expires_at: Optional[str] = None
    image_data: Optional[str] = None
    image_mime_type: Optional[str] = None
    raw_content: Optional[Dict[str, Any]] = None


@dataclass
class PublishResult:
    """Result from publishing operation."""
    success: bool
    id: Optional[str] = None
    slug: Optional[str] = None
    quality_score: int = 0
    r2_backup_key: Optional[str] = None
    created_at: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
    retry_count: int = 0


@dataclass
class GenerationStats:
    """Statistics for logging."""
    content_type: str
    language: str
    slug: str
    tokens_used: int
    generation_time_ms: int
    quality_score: int
    publish_status: str
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    published_at: Optional[str] = None


# ============================================
# Content Transformer
# ============================================

class ContentTransformer:
    """Transforms generator output to publish request format."""

    @staticmethod
    def transform(generator_output: Dict[str, Any]) -> PublishRequest:
        """Transform generator output to PublishRequest."""
        content_type = generator_output.get('type', 'blog_post')
        language = generator_output.get('language', 'en')
        content = generator_output.get('content', {})
        metadata = generator_output.get('metadata', {})
        image = generator_output.get('image', {})

        # Extract title
        title = ContentTransformer._extract_title(content_type, content)

        # Build content blocks
        content_blocks = ContentTransformer._build_content_blocks(content_type, content)

        # Extract FAQs
        faqs = ContentTransformer._extract_faqs(content)

        # Extract meta description
        meta_description = ContentTransformer._extract_meta(content_type, content)

        # Build schema markup
        schema_markup = ContentTransformer._build_schema(content_type, content, title)

        # Extract related topics
        related_topics = ContentTransformer._extract_related(content)

        # Build params for slug generation
        params = ContentTransformer._extract_params(content_type, content)

        # Handle image data
        image_data = None
        image_mime_type = None
        if image.get('generated') and image.get('data'):
            image_data = image['data']
            image_mime_type = image.get('mime_type', 'image/png')

        return PublishRequest(
            content_type=content_type,
            language=language,
            title=title,
            content_blocks=content_blocks,
            meta_description=meta_description,
            faqs=faqs,
            schema_markup=schema_markup,
            related_topics=related_topics,
            params=params,
            status='draft',  # Default to draft, can be overridden
            image_data=image_data,
            image_mime_type=image_mime_type,
            raw_content=content,
        )

    @staticmethod
    def _extract_title(content_type: str, content: Dict) -> str:
        """Extract title from content based on type."""
        if 'title' in content:
            return content['title']

        if content_type == 'daily_weather':
            date = content.get('date', datetime.now().strftime('%Y-%m-%d'))
            theme = content.get('theme', 'Cosmic Weather')
            return f"Cosmic Weather for {date}: {theme}"

        if content_type == 'dimension_guide':
            dim = content.get('dimension', 'Unknown')
            return f"Understanding the {dim.title()} Dimension"

        if content_type in ('historical_figure', 'archetype_profile'):
            return content.get('name', 'Historical Figure')

        if content_type == 'jungian_concept':
            concept = content.get('concept', 'concept')
            return f"Jung's Concept of the {concept.title()}"

        return 'Cosmic Insight'

    @staticmethod
    def _build_content_blocks(content_type: str, content: Dict) -> List[Dict[str, Any]]:
        """Build content blocks from raw content."""
        blocks: List[Dict[str, Any]] = []
        order = 0

        if content_type == 'daily_weather':
            blocks = ContentTransformer._build_weather_blocks(content)
        elif content_type == 'dimension_guide':
            blocks = ContentTransformer._build_dimension_blocks(content)
        elif content_type in ('historical_figure', 'archetype_profile'):
            blocks = ContentTransformer._build_figure_blocks(content)
        elif content_type == 'jungian_concept':
            blocks = ContentTransformer._build_concept_blocks(content)
        elif content_type == 'historical_era':
            blocks = ContentTransformer._build_era_blocks(content)
        elif content_type == 'blog_post':
            blocks = ContentTransformer._build_blog_blocks(content)
        else:
            # Generic fallback
            if 'overview' in content:
                blocks.append({
                    'type': 'text',
                    'content': content['overview'],
                    'order': 0,
                })

        # Add order if not present
        for i, block in enumerate(blocks):
            if 'order' not in block:
                block['order'] = i

        return blocks

    @staticmethod
    def _build_weather_blocks(content: Dict) -> List[Dict]:
        """Build blocks for daily weather content."""
        blocks = []

        if 'overview' in content:
            blocks.append({'type': 'text', 'content': content['overview']})

        if 'dimension_highlights' in content:
            for highlight in content['dimension_highlights']:
                blocks.append({
                    'type': 'dimension_highlight',
                    'dimension': highlight.get('dimension', ''),
                    'value': highlight.get('value', 0),
                    'guidance': highlight.get('guidance', ''),
                })

        # Time-based guidance
        for section in ['morning_focus', 'afternoon_energy', 'evening_reflection']:
            if section in content:
                blocks.append({
                    'type': 'heading',
                    'level': 2,
                    'content': section.replace('_', ' ').title(),
                })
                blocks.append({'type': 'text', 'content': content[section]})

        if 'practical_suggestions' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Practical Suggestions',
            })
            blocks.append({
                'type': 'list',
                'style': 'bullet',
                'items': content['practical_suggestions'],
            })

        if 'daily_question' in content:
            blocks.append({
                'type': 'quote',
                'content': content['daily_question'],
                'attribution': 'Daily Contemplation',
            })

        if 'affirmation' in content:
            blocks.append({
                'type': 'quote',
                'content': content['affirmation'],
                'attribution': 'Daily Affirmation',
            })

        return blocks

    @staticmethod
    def _build_dimension_blocks(content: Dict) -> List[Dict]:
        """Build blocks for dimension guide content."""
        blocks = []

        if 'subtitle' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': content['subtitle'],
            })

        if 'overview' in content:
            blocks.append({'type': 'text', 'content': content['overview']})

        sections = [
            ('mythology', 'Mythological Connections'),
            ('psychology', 'Psychological Perspective'),
            ('practical_expression', 'Practical Expression'),
            ('shadow_aspects', 'Shadow Aspects'),
            ('integration_path', 'Integration Path'),
        ]

        for key, title in sections:
            if key in content:
                blocks.append({'type': 'heading', 'level': 2, 'content': title})
                blocks.append({'type': 'text', 'content': content[key]})

        if 'related_figures' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Related Historical Figures',
            })
            blocks.append({
                'type': 'list',
                'style': 'bullet',
                'items': content['related_figures'],
            })

        if 'meditation' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Guided Meditation',
            })
            blocks.append({'type': 'text', 'content': content['meditation']})

        return blocks

    @staticmethod
    def _build_figure_blocks(content: Dict) -> List[Dict]:
        """Build blocks for historical figure content."""
        blocks = []

        if 'biography' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Biography',
            })
            blocks.append({'type': 'text', 'content': content['biography']})

        if 'cosmic_significance' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Cosmic Significance',
            })
            blocks.append({'type': 'text', 'content': content['cosmic_significance']})

        if 'key_teachings' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Key Teachings',
            })
            blocks.append({
                'type': 'list',
                'style': 'numbered',
                'items': content['key_teachings'],
            })

        if 'famous_quotes' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Famous Quotes',
            })
            for quote in content['famous_quotes']:
                blocks.append({
                    'type': 'quote',
                    'content': quote.get('text', ''),
                    'attribution': quote.get('context', ''),
                })

        if 'legacy' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Legacy',
            })
            blocks.append({'type': 'text', 'content': content['legacy']})

        if 'lessons_for_today' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Lessons for Today',
            })
            blocks.append({'type': 'text', 'content': content['lessons_for_today']})

        return blocks

    @staticmethod
    def _build_concept_blocks(content: Dict) -> List[Dict]:
        """Build blocks for Jungian concept content."""
        blocks = []

        if 'definition' in content:
            blocks.append({
                'type': 'text',
                'content': f"**Definition:** {content['definition']}",
            })

        sections = [
            ('jung_original', "Jung's Original Formulation"),
            ('modern_understanding', 'Modern Understanding'),
        ]

        for key, title in sections:
            if key in content:
                blocks.append({'type': 'heading', 'level': 2, 'content': title})
                blocks.append({'type': 'text', 'content': content[key]})

        if '8mu_mapping' in content:
            mapping = content['8mu_mapping']
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Mapping to the 8 Mu Dimensions',
            })
            if 'explanation' in mapping:
                blocks.append({'type': 'text', 'content': mapping['explanation']})
            if 'primary_dimensions' in mapping:
                blocks.append({
                    'type': 'list',
                    'style': 'bullet',
                    'items': [f"Primary: {d}" for d in mapping['primary_dimensions']],
                })

        if 'examples' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Examples',
            })
            blocks.append({
                'type': 'list',
                'style': 'numbered',
                'items': content['examples'],
            })

        if 'integration_practices' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Integration Practices',
            })
            blocks.append({
                'type': 'list',
                'style': 'numbered',
                'items': content['integration_practices'],
            })

        return blocks

    @staticmethod
    def _build_era_blocks(content: Dict) -> List[Dict]:
        """Build blocks for historical era content."""
        blocks = []

        if 'overview' in content:
            blocks.append({'type': 'text', 'content': content['overview']})

        if 'cosmic_signature' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Cosmic Signature',
            })
            blocks.append({'type': 'text', 'content': content['cosmic_signature']})

        if 'key_figures' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Key Figures',
            })
            items = [
                f"**{fig.get('name', '')}**: {fig.get('contribution', '')}"
                for fig in content['key_figures']
            ]
            blocks.append({'type': 'list', 'style': 'bullet', 'items': items})

        if 'major_developments' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Major Developments',
            })
            blocks.append({
                'type': 'list',
                'style': 'numbered',
                'items': content['major_developments'],
            })

        if 'shadow_aspects' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Shadow Aspects',
            })
            blocks.append({'type': 'text', 'content': content['shadow_aspects']})

        if 'lessons_for_today' in content:
            blocks.append({
                'type': 'heading',
                'level': 2,
                'content': 'Lessons for Today',
            })
            blocks.append({'type': 'text', 'content': content['lessons_for_today']})

        return blocks

    @staticmethod
    def _build_blog_blocks(content: Dict) -> List[Dict]:
        """Build blocks for blog post content."""
        blocks = []

        if 'excerpt' in content:
            blocks.append({'type': 'text', 'content': content['excerpt']})

        if 'content' in content:
            # Parse markdown content into blocks
            blocks.append({'type': 'text', 'content': content['content']})

        if 'cta' in content:
            cta = content['cta']
            blocks.append({
                'type': 'quote',
                'content': cta.get('text', ''),
                'attribution': cta.get('description', ''),
            })

        return blocks

    @staticmethod
    def _extract_faqs(content: Dict) -> Optional[List[Dict[str, str]]]:
        """Extract FAQs from content."""
        if 'faqs' not in content:
            return None

        faqs = content['faqs']
        if not isinstance(faqs, list):
            return None

        return [
            {'question': faq.get('question', ''), 'answer': faq.get('answer', '')}
            for faq in faqs
            if faq.get('question') and faq.get('answer')
        ]

    @staticmethod
    def _extract_meta(content_type: str, content: Dict) -> Optional[str]:
        """Extract or generate meta description."""
        if 'meta_description' in content:
            return content['meta_description']

        # Generate from overview
        if 'overview' in content:
            overview = content['overview']
            # Take first 155 characters
            if len(overview) > 155:
                return overview[:152] + '...'
            return overview

        if 'definition' in content:
            return content['definition'][:155]

        return None

    @staticmethod
    def _build_schema(content_type: str, content: Dict, title: str) -> Dict[str, Any]:
        """Build JSON-LD schema markup."""
        base_schema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': title,
            'author': {
                '@type': 'Organization',
                'name': 'The Realm of Patterns',
            },
            'publisher': {
                '@type': 'Organization',
                'name': 'The Realm of Patterns',
                'url': 'https://therealmofpatterns.com',
            },
        }

        if 'date' in content:
            base_schema['datePublished'] = content['date']

        if content.get('faqs'):
            base_schema['@type'] = 'Article'
            base_schema['mainEntity'] = {
                '@type': 'FAQPage',
                'mainEntity': [
                    {
                        '@type': 'Question',
                        'name': faq.get('question', ''),
                        'acceptedAnswer': {
                            '@type': 'Answer',
                            'text': faq.get('answer', ''),
                        }
                    }
                    for faq in content['faqs']
                ]
            }

        return base_schema

    @staticmethod
    def _extract_related(content: Dict) -> Optional[List[str]]:
        """Extract related topics."""
        related = []

        if 'related_figures' in content:
            related.extend(content['related_figures'][:3])

        if 'related_concepts' in content:
            related.extend(content['related_concepts'][:3])

        if 'related_dimensions' in content:
            related.extend(content['related_dimensions'][:3])

        if 'related_eras' in content:
            related.extend(content['related_eras'][:3])

        return related if related else None

    @staticmethod
    def _extract_params(content_type: str, content: Dict) -> Dict[str, Any]:
        """Extract params for slug generation."""
        params: Dict[str, Any] = {}

        if content_type == 'daily_weather':
            params['date'] = content.get('date', datetime.now().strftime('%Y-%m-%d'))

        elif content_type == 'dimension_guide':
            params['dimension'] = content.get('dimension', 'unknown')

        elif content_type in ('historical_figure', 'archetype_profile'):
            params['name'] = content.get('name', 'unknown')

        elif content_type == 'historical_era':
            params['era'] = content.get('era', 'unknown')

        elif content_type == 'jungian_concept':
            params['concept'] = content.get('concept', 'unknown')

        elif content_type in ('vedic_dasha', 'transit_guide'):
            params['planet'] = content.get('planet', 'unknown')

        elif content_type == 'compatibility_type':
            pair = content.get('dimension_pair', ['unknown', 'unknown'])
            params['dimension1'] = pair[0] if len(pair) > 0 else 'unknown'
            params['dimension2'] = pair[1] if len(pair) > 1 else 'unknown'

        elif content_type == 'blog_post':
            params['topic'] = content.get('slug', 'post')

        return params


# ============================================
# Content Publisher
# ============================================

class ContentPublisher:
    """Publishes content to The Realm of Patterns API."""

    def __init__(
        self,
        api_url: str = None,
        api_key: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        stats_file: Optional[str] = None,
    ):
        """Initialize publisher.

        Args:
            api_url: Base URL for the API (default: from env or localhost)
            api_key: Optional API key for authentication
            max_retries: Maximum number of retry attempts
            retry_delay: Base delay between retries (exponential backoff)
            stats_file: Path to stats log file
        """
        self.api_url = api_url or os.environ.get(
            'REALM_API_URL',
            'https://therealmofpatterns.com'
        )
        self.api_key = api_key or os.environ.get('REALM_API_KEY')
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.stats_file = stats_file or os.environ.get(
            'GENERATION_STATS_FILE',
            str(Path(__file__).parent / 'generation_stats.jsonl')
        )
        self.transformer = ContentTransformer()

    def publish(
        self,
        generator_output: Dict[str, Any],
        status: str = 'draft',
        auto_publish: bool = False,
    ) -> PublishResult:
        """Publish generated content.

        Args:
            generator_output: Output from generator.py
            status: Content status (draft, review, published)
            auto_publish: If True, set status to 'published'

        Returns:
            PublishResult with success/failure info
        """
        import requests

        # Transform to publish request
        try:
            request = self.transformer.transform(generator_output)
            request.status = 'published' if auto_publish else status
        except Exception as e:
            logger.error(f"Transform error: {e}")
            return PublishResult(success=False, error=f"Transform error: {e}")

        # Convert to dict for JSON
        request_data = {
            'content_type': request.content_type,
            'language': request.language,
            'title': request.title,
            'content_blocks': request.content_blocks,
            'meta_description': request.meta_description,
            'faqs': request.faqs,
            'schema_markup': request.schema_markup,
            'related_topics': request.related_topics,
            'params': request.params,
            'status': request.status,
            'expires_at': request.expires_at,
            'raw_content': request.raw_content,
        }

        # Include image if present
        if request.image_data:
            request_data['image_data'] = request.image_data
            request_data['image_mime_type'] = request.image_mime_type

        # Retry loop
        last_error = None
        for attempt in range(self.max_retries):
            try:
                headers = {
                    'Content-Type': 'application/json',
                }
                if self.api_key:
                    headers['Authorization'] = f'Bearer {self.api_key}'

                response = requests.post(
                    f"{self.api_url}/api/publish",
                    headers=headers,
                    json=request_data,
                    timeout=30,
                )

                if response.status_code == 200:
                    data = response.json()
                    result = PublishResult(
                        success=True,
                        id=data.get('id'),
                        slug=data.get('slug'),
                        quality_score=data.get('quality_score', 0),
                        r2_backup_key=data.get('r2_backup_key'),
                        created_at=data.get('created_at'),
                        message=data.get('message'),
                        retry_count=attempt,
                    )

                    # Log stats
                    self._log_stats(generator_output, result)

                    return result

                elif response.status_code >= 500:
                    # Server error - retry
                    last_error = f"Server error: {response.status_code}"
                    logger.warning(f"Attempt {attempt + 1} failed: {last_error}")

                else:
                    # Client error - don't retry
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                    except:
                        error_msg = response.text

                    result = PublishResult(
                        success=False,
                        error=f"API error ({response.status_code}): {error_msg}",
                        retry_count=attempt,
                    )
                    self._log_stats(generator_output, result)
                    return result

            except requests.exceptions.Timeout:
                last_error = "Request timeout"
                logger.warning(f"Attempt {attempt + 1} timed out")

            except requests.exceptions.RequestException as e:
                last_error = f"Request error: {e}"
                logger.warning(f"Attempt {attempt + 1} failed: {last_error}")

            # Exponential backoff
            if attempt < self.max_retries - 1:
                delay = self.retry_delay * (2 ** attempt)
                logger.info(f"Retrying in {delay:.1f}s...")
                time.sleep(delay)

        # All retries exhausted
        result = PublishResult(
            success=False,
            error=f"Max retries exceeded. Last error: {last_error}",
            retry_count=self.max_retries,
        )
        self._log_stats(generator_output, result)
        return result

    def publish_file(self, input_path: str, **kwargs) -> PublishResult:
        """Publish content from a JSON file.

        Args:
            input_path: Path to generator output JSON file
            **kwargs: Additional arguments passed to publish()

        Returns:
            PublishResult
        """
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                generator_output = json.load(f)
        except Exception as e:
            return PublishResult(success=False, error=f"Failed to read file: {e}")

        return self.publish(generator_output, **kwargs)

    def _log_stats(self, generator_output: Dict, result: PublishResult) -> None:
        """Log generation statistics."""
        try:
            metadata = generator_output.get('metadata', {})
            content = generator_output.get('content', {})

            stats = GenerationStats(
                content_type=generator_output.get('type', 'unknown'),
                language=generator_output.get('language', 'en'),
                slug=result.slug or 'unknown',
                tokens_used=metadata.get('tokens_used', 0),
                generation_time_ms=metadata.get('generation_time_ms', 0),
                quality_score=result.quality_score,
                publish_status='published' if result.success else 'failed',
                error_message=result.error,
                created_at=datetime.now(timezone.utc).isoformat(),
                published_at=result.created_at if result.success else None,
            )

            # Append to JSONL file
            stats_dict = asdict(stats)
            with open(self.stats_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(stats_dict) + '\n')

            logger.info(f"Stats logged: {stats.content_type}/{stats.slug} - "
                       f"score={stats.quality_score}, status={stats.publish_status}")

        except Exception as e:
            logger.error(f"Failed to log stats: {e}")


# ============================================
# CLI Interface
# ============================================

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Publish generated content to The Realm of Patterns'
    )

    parser.add_argument(
        '--input', '-i',
        type=str,
        required=True,
        help='Path to generator output JSON file'
    )

    parser.add_argument(
        '--api-url',
        type=str,
        default=None,
        help='API base URL (default: from env or https://therealmofpatterns.com)'
    )

    parser.add_argument(
        '--status',
        type=str,
        default='draft',
        choices=['draft', 'review', 'published', 'archived'],
        help='Content status (default: draft)'
    )

    parser.add_argument(
        '--auto-publish',
        action='store_true',
        help='Automatically set status to published'
    )

    parser.add_argument(
        '--max-retries',
        type=int,
        default=3,
        help='Maximum retry attempts (default: 3)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Transform and validate without publishing'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Load input file
    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f"Input file not found: {args.input}")
        sys.exit(1)

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            generator_output = json.load(f)
    except Exception as e:
        logger.error(f"Failed to parse input file: {e}")
        sys.exit(1)

    # Dry run - just transform and validate
    if args.dry_run:
        try:
            request = ContentTransformer.transform(generator_output)
            print(json.dumps({
                'content_type': request.content_type,
                'language': request.language,
                'title': request.title,
                'content_blocks_count': len(request.content_blocks),
                'has_faqs': request.faqs is not None and len(request.faqs) > 0,
                'has_schema': request.schema_markup is not None,
                'has_meta': request.meta_description is not None,
                'params': request.params,
            }, indent=2))
            logger.info("Dry run successful - content is valid")
            sys.exit(0)
        except Exception as e:
            logger.error(f"Transform failed: {e}")
            sys.exit(1)

    # Create publisher and publish
    publisher = ContentPublisher(
        api_url=args.api_url,
        max_retries=args.max_retries,
    )

    result = publisher.publish(
        generator_output,
        status=args.status,
        auto_publish=args.auto_publish,
    )

    if result.success:
        print(json.dumps({
            'success': True,
            'id': result.id,
            'slug': result.slug,
            'quality_score': result.quality_score,
            'r2_backup_key': result.r2_backup_key,
            'created_at': result.created_at,
            'message': result.message,
            'retry_count': result.retry_count,
        }, indent=2))
        logger.info(f"Published successfully: {result.slug} (score: {result.quality_score})")
        sys.exit(0)
    else:
        print(json.dumps({
            'success': False,
            'error': result.error,
            'retry_count': result.retry_count,
        }, indent=2))
        logger.error(f"Publish failed: {result.error}")
        sys.exit(1)


if __name__ == '__main__':
    main()
