#!/usr/bin/env python3
"""
The Realm of Patterns - Content Generator

Production-ready content generation using Gemini 2.5 Flash.
Generates cosmic content for programmatic SEO and educational articles.

Usage:
    python generator.py --type daily_weather --date 2025-01-15 --lang en
    python generator.py --type dimension_guide --dimension phase --lang en
    python generator.py --type historical_figure --figure rumi --lang en
    python generator.py --type jungian_concept --concept shadow --lang en

Output:
    JSON file ready for publishing to CMS or static site.
"""

import os
import sys
import json
import time
import argparse
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, TypedDict, Literal
from dataclasses import dataclass, field, asdict
from pathlib import Path
from enum import Enum

# Add parent directory for imports
BASE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BASE_DIR))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('content-generator')


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


class MuDimension(str, Enum):
    PHASE = 'phase'
    EXISTENCE = 'existence'
    COGNITION = 'cognition'
    VALUE = 'value'
    EXPANSION = 'expansion'
    ACTION = 'action'
    RELATION = 'relation'
    FIELD = 'field'


@dataclass
class VoiceConfig:
    """Configuration for content voice and style."""
    name: str = 'River'
    personality: str = 'Wise yet approachable guide through cosmic patterns.'
    tone: List[str] = field(default_factory=lambda: [
        'warm', 'insightful', 'poetic without being flowery',
        'grounded mysticism', 'invitational not prescriptive'
    ])
    avoid: List[str] = field(default_factory=lambda: [
        'new age cliches', 'fortune-telling language',
        'deterministic predictions', 'fear-based messaging'
    ])
    signature_phrases: List[str] = field(default_factory=lambda: [
        'The field speaks...', 'Notice where...',
        'The pattern reveals...', 'Consider how...'
    ])
    sentence_length: str = 'varied'
    paragraph_structure: str = 'Start with hook, develop insight, land with actionable wisdom'
    use_metaphors: bool = True
    use_questions: bool = True
    formality: str = 'balanced'

    def to_prompt_section(self) -> str:
        """Serialize voice config to prompt section."""
        return f"""
## Writing Voice: {self.name}

**Personality:** {self.personality}

**Tone:** {', '.join(self.tone)}

**Avoid:** {', '.join(self.avoid)}

**Writing Style:**
- Sentence length: {self.sentence_length}
- Paragraph structure: {self.paragraph_structure}
- Use metaphors: {'Yes' if self.use_metaphors else 'No'}
- Use questions: {'Yes' if self.use_questions else 'No'}
- Formality: {self.formality}

**Signature phrases to naturally incorporate:** {' | '.join(self.signature_phrases)}
""".strip()


@dataclass
class GenerationRequest:
    """Request for content generation."""
    content_type: ContentType
    language: str
    params: Dict[str, Any]
    voice: Optional[VoiceConfig] = None
    options: Optional[Dict[str, Any]] = None


@dataclass
class GenerationResult:
    """Result from content generation."""
    success: bool
    content: Optional[Dict[str, Any]] = None
    tokens_used: int = 0
    generation_time_ms: int = 0
    error: Optional[str] = None


# ============================================
# Dimension Metadata
# ============================================

MU_DIMENSIONS: Dict[str, Dict[str, Any]] = {
    'phase': {
        'index': 0, 'symbol': 'P', 'name': 'Phase',
        'planet': 'Sun', 'planet_symbol': '\u2609',
        'domain': 'Identity, Will, Direction',
        'question': 'Who am I becoming?',
        'element': 'Fire', 'color': '#FFD700',
        'keywords': ['identity', 'will', 'self', 'purpose', 'direction']
    },
    'existence': {
        'index': 1, 'symbol': 'E', 'name': 'Existence',
        'planet': 'Saturn', 'planet_symbol': '\u2644',
        'domain': 'Structure, Stability, Form',
        'question': 'What grounds me?',
        'element': 'Earth', 'color': '#228B22',
        'keywords': ['structure', 'stability', 'foundation', 'discipline', 'reality']
    },
    'cognition': {
        'index': 2, 'symbol': 'mu', 'name': 'Cognition',
        'planet': 'Mercury', 'planet_symbol': '\u263F',
        'domain': 'Thought, Communication, Perception',
        'question': 'How do I understand?',
        'element': 'Air', 'color': '#C0C0C0',
        'keywords': ['thought', 'communication', 'learning', 'perception', 'analysis']
    },
    'value': {
        'index': 3, 'symbol': 'V', 'name': 'Value',
        'planet': 'Venus', 'planet_symbol': '\u2640',
        'domain': 'Beauty, Worth, Harmony',
        'question': 'What do I treasure?',
        'element': 'Water', 'color': '#FFB6C1',
        'keywords': ['beauty', 'harmony', 'aesthetics', 'values', 'attraction']
    },
    'expansion': {
        'index': 4, 'symbol': 'N', 'name': 'Expansion',
        'planet': 'Jupiter', 'planet_symbol': '\u2643',
        'domain': 'Growth, Meaning, Possibility',
        'question': 'Where am I growing?',
        'element': 'Ether', 'color': '#9370DB',
        'keywords': ['growth', 'expansion', 'optimism', 'meaning', 'wisdom']
    },
    'action': {
        'index': 5, 'symbol': 'Delta', 'name': 'Delta/Action',
        'planet': 'Mars', 'planet_symbol': '\u2642',
        'domain': 'Will, Drive, Transformation',
        'question': 'What am I doing?',
        'element': 'Fire', 'color': '#FF4500',
        'keywords': ['action', 'drive', 'energy', 'courage', 'transformation']
    },
    'relation': {
        'index': 6, 'symbol': 'R', 'name': 'Relation',
        'planet': 'Moon', 'planet_symbol': '\u263D',
        'domain': 'Connection, Emotion, Attunement',
        'question': 'Who do I love?',
        'element': 'Water', 'color': '#FF69B4',
        'keywords': ['connection', 'emotion', 'nurture', 'care', 'empathy']
    },
    'field': {
        'index': 7, 'symbol': 'Phi', 'name': 'Field',
        'planet': 'Neptune', 'planet_symbol': '\u2646',
        'domain': 'Presence, Transcendence, Unity',
        'question': 'What witnesses?',
        'element': 'Void', 'color': '#4B0082',
        'keywords': ['transcendence', 'unity', 'witness', 'spirituality', 'presence']
    }
}


# ============================================
# System Context for All Prompts
# ============================================

SYSTEM_CONTEXT = """
You are a content generator for "The Realm of Patterns," a platform that bridges ancient wisdom traditions with modern psychology through the FRC 16D framework.

## Core Concepts

### The 8 Mu Dimensions (Inner Octave)
The 8 Mu system maps planetary influences to eight fundamental dimensions of human experience:

1. **Phase (mu_1, P)** - Sun - Identity, Will, Direction - "Who am I becoming?"
2. **Existence (mu_2, E)** - Saturn - Structure, Stability, Form - "What grounds me?"
3. **Cognition (mu_3, mu)** - Mercury - Thought, Communication, Perception - "How do I understand?"
4. **Value (mu_4, V)** - Venus - Beauty, Worth, Harmony - "What do I treasure?"
5. **Expansion (mu_5, N)** - Jupiter - Growth, Meaning, Possibility - "Where am I growing?"
6. **Delta/Action (mu_6, Delta)** - Mars - Will, Drive, Transformation - "What am I doing?"
7. **Relation (mu_7, R)** - Moon - Connection, Emotion, Attunement - "Who do I love?"
8. **Field (mu_8, Phi)** - Neptune - Presence, Transcendence, Unity - "What witnesses?"

### Key Principles
- We describe patterns, not predictions
- We empower self-understanding, not dependency
- We honor all wisdom traditions without appropriation
- We integrate psychology (Jung) with cosmology (astrology)
- We use "resonance" not "compatibility"
- We speak of "tendencies" not "destinies"

## Output Format
Always return valid JSON matching the requested schema. Be precise with structure.
""".strip()


# ============================================
# Gemini Client with Key Rotation
# ============================================

class GeminiKeyRotator:
    """Manages rotation across multiple Gemini API keys for higher daily limits."""

    def __init__(self):
        self.keys: List[str] = []
        self.current_index = 0
        self.usage_counts: Dict[str, int] = {}
        self.error_counts: Dict[str, int] = {}

        # Load all available keys
        self._load_keys()

    def _load_keys(self) -> None:
        """Load API keys from environment variables."""
        # Primary key
        if key := os.environ.get('GEMINI_API_KEY'):
            self.keys.append(key)

        # Additional numbered keys (GEMINI_API_KEY_2 through GEMINI_API_KEY_10)
        for i in range(2, 11):
            if key := os.environ.get(f'GEMINI_API_KEY_{i}'):
                self.keys.append(key)

        if not self.keys:
            raise ValueError("No GEMINI_API_KEY environment variables found")

        logger.info(f"Loaded {len(self.keys)} Gemini API keys for rotation")

        # Initialize usage tracking
        for key in self.keys:
            key_id = key[-8:]  # Last 8 chars for identification
            self.usage_counts[key_id] = 0
            self.error_counts[key_id] = 0

    def get_next_key(self) -> str:
        """Get the next available API key using round-robin rotation."""
        if not self.keys:
            raise ValueError("No API keys available")

        # Skip keys with high error counts
        attempts = 0
        while attempts < len(self.keys):
            key = self.keys[self.current_index]
            key_id = key[-8:]

            # Rotate to next key
            self.current_index = (self.current_index + 1) % len(self.keys)

            # Skip if this key has too many errors (likely exhausted quota)
            if self.error_counts[key_id] >= 3:
                attempts += 1
                continue

            self.usage_counts[key_id] += 1
            return key

        # All keys exhausted, try first key anyway
        key = self.keys[0]
        self.usage_counts[key[-8:]] += 1
        return key

    def report_error(self, key: str) -> None:
        """Report an error for a specific key."""
        key_id = key[-8:]
        if key_id in self.error_counts:
            self.error_counts[key_id] += 1
            logger.warning(f"API key ...{key_id} error count: {self.error_counts[key_id]}")

    def reset_errors(self) -> None:
        """Reset error counts (call at start of new day)."""
        for key_id in self.error_counts:
            self.error_counts[key_id] = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            'total_keys': len(self.keys),
            'usage': self.usage_counts,
            'errors': self.error_counts
        }


class GeminiClient:
    """Client for Gemini API with key rotation and image generation."""

    def __init__(self, api_key: Optional[str] = None):
        # If single key provided, use it; otherwise use key rotator
        if api_key:
            self._single_key = api_key
            self._rotator = None
        else:
            self._single_key = None
            self._rotator = GeminiKeyRotator()

        self.model = 'gemini-3-flash-preview'  # Best model: 1M context, thinking support
        self.image_model = 'gemini-2.0-flash-exp'  # Image generation (experimental)
        self.base_url = 'https://generativelanguage.googleapis.com/v1beta'

    def _get_key(self) -> str:
        """Get an API key (rotated or single)."""
        if self._single_key:
            return self._single_key
        return self._rotator.get_next_key()

    def _report_error(self, key: str) -> None:
        """Report an API error for quota tracking."""
        if self._rotator:
            self._rotator.report_error(key)

    def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> Dict[str, Any]:
        """Generate text content from Gemini API."""
        import requests

        api_key = self._get_key()
        url = f"{self.base_url}/models/{self.model}:generateContent"

        headers = {
            'Content-Type': 'application/json',
        }

        data = {
            'contents': [{
                'parts': [{'text': prompt}]
            }],
            'generationConfig': {
                'temperature': temperature,
                'maxOutputTokens': max_tokens,
                'responseMimeType': 'application/json'
            }
        }

        response = requests.post(
            f"{url}?key={api_key}",
            headers=headers,
            json=data,
            timeout=120
        )

        if response.status_code != 200:
            self._report_error(api_key)
            raise Exception(f"Gemini API error: {response.status_code} - {response.text}")

        result = response.json()

        # Extract text from response
        try:
            text = result['candidates'][0]['content']['parts'][0]['text']
            # Parse JSON from response
            content = json.loads(text)
            tokens = result.get('usageMetadata', {}).get('totalTokenCount', 0)
            return {'content': content, 'tokens': tokens}
        except (KeyError, json.JSONDecodeError) as e:
            raise Exception(f"Failed to parse Gemini response: {e}")

    def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        style: str = "cosmic mystical sacred geometry"
    ) -> Optional[Dict[str, Any]]:
        """Generate image using Gemini's native image generation.

        Args:
            prompt: Text description of the image to generate
            aspect_ratio: Image aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
            style: Style keywords to append to prompt

        Returns:
            Dict with 'image_data' (base64) and 'mime_type', or None on failure
        """
        import requests
        import base64

        api_key = self._get_key()

        # Use Gemini 2.0 Flash experimental for image generation
        url = f"{self.base_url}/models/{self.image_model}:generateContent"

        # Enhance prompt with style
        full_prompt = f"""Generate an image: {prompt}

Style: {style}
Aspect Ratio: {aspect_ratio}

Create a visually stunning, high-quality image suitable for a spiritual/cosmic platform."""

        headers = {
            'Content-Type': 'application/json',
        }

        data = {
            'contents': [{
                'parts': [{'text': full_prompt}]
            }],
            'generationConfig': {
                'responseModalities': ['image', 'text'],
                'temperature': 1.0
            }
        }

        try:
            response = requests.post(
                f"{url}?key={api_key}",
                headers=headers,
                json=data,
                timeout=180
            )

            if response.status_code != 200:
                self._report_error(api_key)
                logger.error(f"Image generation failed: {response.status_code} - {response.text}")
                return None

            result = response.json()

            # Look for image data in response
            for candidate in result.get('candidates', []):
                for part in candidate.get('content', {}).get('parts', []):
                    if 'inlineData' in part:
                        return {
                            'image_data': part['inlineData']['data'],
                            'mime_type': part['inlineData'].get('mimeType', 'image/png')
                        }

            logger.warning("No image data in response")
            return None

        except Exception as e:
            logger.error(f"Image generation error: {e}")
            return None

    def get_rotation_stats(self) -> Optional[Dict[str, Any]]:
        """Get key rotation statistics."""
        if self._rotator:
            return self._rotator.get_stats()
        return None


# ============================================
# Prompt Builders
# ============================================

def build_daily_weather_prompt(
    date: str,
    vector: List[float],
    dominant: Dict[str, Any],
    planetary_positions: Dict[str, float],
    language: str,
    voice: VoiceConfig
) -> str:
    """Build prompt for daily cosmic weather."""
    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Daily Cosmic Weather

**Date:** {date}
**Language:** {language}

**Current 8 Mu Vector:** [{', '.join(f'{v:.4f}' for v in vector)}]

**Dominant Dimension:** {dominant['name']} ({dominant['symbol']}) at {dominant['value']*100:.1f}%

**Planetary Positions (degrees):**
{chr(10).join(f"- {planet}: {deg:.2f}" for planet, deg in planetary_positions.items())}

## Generate JSON matching this structure:

{{
  "date": "{date}",
  "vector": [...],
  "dominant": {{"dimension": "...", "symbol": "...", "name": "...", "value": 0.0}},
  "planetary_positions": {{...}},
  "theme": "2-4 word theme",
  "overview": "2-3 paragraph overview (150-200 words)",
  "dimension_highlights": [
    {{"dimension": "...", "value": 0.0, "guidance": "1-2 sentences"}}
  ],
  "morning_focus": "2-3 sentences",
  "afternoon_energy": "2-3 sentences",
  "evening_reflection": "2-3 sentences",
  "daily_question": "One contemplative question",
  "practical_suggestions": ["3-5 actionable items"],
  "caution": "What to watch for (1-2 sentences)",
  "affirmation": "Daily affirmation"
}}

If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_dimension_guide_prompt(
    dimension: str,
    dimension_data: Dict[str, Any],
    language: str,
    voice: VoiceConfig,
    word_count_target: int = 2000
) -> str:
    """Build prompt for dimension guide article."""
    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Dimension Guide Article

**Dimension:** {dimension}
**Symbol:** {dimension_data['symbol']}
**Name:** {dimension_data['name']}
**Planet:** {dimension_data['planet']} ({dimension_data['planet_symbol']})
**Domain:** {dimension_data['domain']}
**Core Question:** {dimension_data['question']}
**Element:** {dimension_data['element']}
**Keywords:** {', '.join(dimension_data['keywords'])}

**Language:** {language}
**Target Word Count:** ~{word_count_target} words

## Generate JSON matching this structure:

{{
  "dimension": "{dimension}",
  "title": "SEO-friendly title",
  "subtitle": "Evocative subtitle",
  "overview": "2-3 paragraphs introducing the dimension (300-400 words)",
  "mythology": "Cross-cultural mythological connections (200-300 words)",
  "psychology": "Jungian/depth psychology perspective (200-300 words)",
  "practical_expression": "How this manifests in daily life (200-300 words)",
  "shadow_aspects": "The shadow side and challenges (150-200 words)",
  "integration_path": "How to work with this dimension (200-300 words)",
  "related_figures": ["3-5 historical figures"],
  "related_concepts": ["3-5 Jungian/philosophical concepts"],
  "faqs": [
    {{"question": "...", "answer": "2-3 sentences"}}
  ],
  "meditation": "A short guided meditation (100-150 words)"
}}

If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_historical_figure_prompt(
    name: str,
    era: str,
    tradition: str,
    vector: List[float],
    language: str,
    voice: VoiceConfig,
    known_facts: Optional[Dict[str, Any]] = None
) -> str:
    """Build prompt for historical figure profile."""
    # Determine dominant dimensions
    dim_keys = list(MU_DIMENSIONS.keys())
    sorted_dims = sorted(
        [(dim, vector[i]) for i, dim in enumerate(dim_keys)],
        key=lambda x: x[1],
        reverse=True
    )[:3]
    dominant_dims = [d[0] for d in sorted_dims]

    facts_section = ""
    if known_facts:
        facts_section = f"""
**Known Facts:**
{f"- Birth: {known_facts['birth_date']}" if known_facts.get('birth_date') else ''}
{f"- Death: {known_facts['death_date']}" if known_facts.get('death_date') else ''}
{f"- Key Works: {', '.join(known_facts['key_works'])}" if known_facts.get('key_works') else ''}
"""

    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Historical Figure Profile

**Figure:** {name}
**Era:** {era}
**Tradition:** {tradition}
**Estimated 8 Mu Vector:** [{', '.join(f'{v:.2f}' for v in vector)}]
**Dominant Dimensions:** {', '.join(dominant_dims)}
{facts_section}

**Language:** {language}

## Generate JSON matching this structure:

{{
  "name": "{name}",
  "era": "{era}",
  "tradition": "{tradition}",
  "birth_date": "if known",
  "death_date": "if known",
  "vector": [...],
  "dominant_dimensions": {json.dumps(dominant_dims)},
  "biography": "3-4 paragraphs (400-500 words)",
  "cosmic_significance": "How their vector manifested (200-300 words)",
  "key_teachings": ["5-7 core teachings"],
  "famous_quotes": [
    {{"text": "quote", "context": "brief context"}}
  ],
  "legacy": "Their lasting impact (150-200 words)",
  "resonance_with_others": [
    {{"figure": "name", "resonance": 0.85, "insight": "what their connection teaches"}}
  ],
  "lessons_for_today": "How their wisdom applies now (150-200 words)"
}}

Only use quotes that are verifiable or widely attributed.
If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_jungian_concept_prompt(
    concept: str,
    language: str,
    voice: VoiceConfig
) -> str:
    """Build prompt for Jungian concept explainer."""
    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Jungian Concept Explainer

**Concept:** {concept}
**Language:** {language}

## Key Jungian Concepts Reference:
- Shadow: Repressed aspects of personality
- Anima/Animus: Contrasexual aspects of psyche
- Persona: Social mask we present
- Self: Center of total psyche, goal of individuation
- Individuation: Process of becoming whole
- Collective Unconscious: Shared psychic inheritance
- Archetypes: Universal patterns (Hero, Mother, Wise Old Man, etc.)
- Complex: Emotionally charged clusters
- Projection: Seeing inner contents in outer world
- Synchronicity: Meaningful coincidences

## Generate JSON matching this structure:

{{
  "concept": "{concept.lower().replace(' ', '-')}",
  "title": "Full title with concept name",
  "definition": "Clear 2-3 sentence definition",
  "jung_original": "Jung's original formulation (200-300 words)",
  "modern_understanding": "Contemporary interpretation (200-300 words)",
  "8mu_mapping": {{
    "primary_dimensions": ["1-3 dimension keys"],
    "explanation": "How this concept maps to 8 Mu (150-200 words)"
  }},
  "examples": ["4-6 concrete examples from life, art, culture"],
  "integration_practices": ["3-5 ways to work with this concept"],
  "related_concepts": ["4-6 related Jungian concepts"],
  "faqs": [
    {{"question": "...", "answer": "..."}}
  ]
}}

If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_compatibility_prompt(
    dimension1: str,
    dimension2: str,
    language: str,
    voice: VoiceConfig
) -> str:
    """Build prompt for compatibility guide."""
    dim1_data = MU_DIMENSIONS[dimension1]
    dim2_data = MU_DIMENSIONS[dimension2]

    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Compatibility Guide

**Dimension 1:** {dimension1}
- Symbol: {dim1_data['symbol']}
- Name: {dim1_data['name']}
- Planet: {dim1_data['planet']}
- Domain: {dim1_data['domain']}

**Dimension 2:** {dimension2}
- Symbol: {dim2_data['symbol']}
- Name: {dim2_data['name']}
- Planet: {dim2_data['planet']}
- Domain: {dim2_data['domain']}

**Language:** {language}

## Generate JSON matching this structure:

{{
  "type": "{dimension1}-{dimension2}",
  "dimension_pair": ["{dimension1}", "{dimension2}"],
  "title": "SEO-friendly title",
  "overview": "2-3 paragraphs on the dynamic (300-400 words)",
  "strengths": ["5-7 strengths of this pairing"],
  "challenges": ["4-6 challenges to navigate"],
  "growth_edges": ["3-5 opportunities for mutual growth"],
  "famous_examples": [
    {{"pair": "Name & Name", "insight": "What their dynamic teaches (2-3 sentences)"}}
  ],
  "advice": "Core guidance for this pairing (150-200 words)",
  "communication_tips": ["5-7 specific communication strategies"]
}}

Focus on how someone strong in Dim1 relates to someone strong in Dim2.
Use "resonance" language, not "compatibility".
If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_vedic_dasha_prompt(
    planet: str,
    language: str,
    voice: VoiceConfig
) -> str:
    """Build prompt for Vedic Dasha guide."""
    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Vedic Dasha Guide

**Planetary Period:** {planet} Mahadasha
**Language:** {language}

## Generate JSON matching this structure:

{{
  "planet": "{planet}",
  "sanskrit_name": "Original Sanskrit name",
  "duration": "Standard duration (e.g., 19 years)",
  "title": "SEO-friendly title",
  "overview": "3-4 paragraphs (400-500 words)",
  "8mu_alignment": {{
    "primary_dimension": "Which mu dimension aligns",
    "explanation": "How this dasha relates to 8 Mu (150-200 words)"
  }},
  "themes": ["6-8 major themes"],
  "opportunities": ["5-7 opportunities"],
  "challenges": ["4-6 challenges"],
  "remedies": {{
    "mantras": ["2-3 traditional mantras"],
    "gemstones": ["associated gemstones"],
    "practices": ["3-5 spiritual practices"],
    "lifestyle": ["3-5 lifestyle suggestions"]
  }},
  "sub_periods": [
    {{"planet": "...", "duration": "...", "theme": "1-2 sentences"}}
  ],
  "famous_examples": ["3-5 people who thrived/struggled in this dasha"],
  "faqs": [
    {{"question": "...", "answer": "..."}}
  ]
}}

Respect Vedic tradition while making it accessible.
Avoid fear-based language about challenging dashas.
If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_transit_guide_prompt(
    planet: str,
    language: str,
    voice: VoiceConfig
) -> str:
    """Build prompt for transit guide."""
    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Transit Guide

**Planet:** {planet}
**Language:** {language}

## Generate JSON matching this structure:

{{
  "planet": "{planet}",
  "symbol": "Astrological symbol",
  "title": "SEO-friendly title",
  "overview": "3-4 paragraphs on this planet's transits (400-500 words)",
  "8mu_dimension": "Primary associated dimension",
  "orbit_period": "How long to transit zodiac",
  "sign_duration": "Average time in each sign",
  "transit_themes": ["6-8 common themes"],
  "house_meanings": [
    {{"house": 1, "theme": "2-3 sentences"}}
  ],
  "aspects": [
    {{"type": "Conjunction", "effect": "2-3 sentences"}}
  ],
  "retrograde": {{
    "frequency": "How often",
    "duration": "How long",
    "themes": ["4-6 retrograde themes"],
    "guidance": "150-200 words"
  }},
  "working_with": ["5-7 ways to work with this transit"],
  "faqs": [
    {{"question": "...", "answer": "..."}}
  ]
}}

If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_blog_post_prompt(
    topic: str,
    keywords: List[str],
    language: str,
    voice: VoiceConfig,
    word_count_target: int = 1500
) -> str:
    """Build prompt for blog post."""
    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Blog Post

**Topic:** {topic}
**Keywords:** {', '.join(keywords)}
**Language:** {language}
**Target Word Count:** ~{word_count_target} words

## Generate JSON matching this structure:

{{
  "slug": "url-safe-slug",
  "title": "SEO-optimized title",
  "meta_description": "150-160 characters",
  "excerpt": "2-3 sentence excerpt for previews",
  "content": "Full markdown content with proper headings",
  "headings": ["H2 headings used (for TOC)"],
  "related_dimensions": ["Which 8 Mu dimensions relate"],
  "tags": ["5-8 tags"],
  "faqs": [
    {{"question": "...", "answer": "..."}}
  ],
  "cta": {{
    "text": "Call to action text",
    "description": "CTA description"
  }}
}}

Content should be in markdown format with at least 3 H2 sections.
Naturally incorporate keywords without stuffing.
If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


def build_historical_era_prompt(
    era: str,
    timespan: str,
    language: str,
    voice: VoiceConfig
) -> str:
    """Build prompt for historical era profile."""
    return f"""
{SYSTEM_CONTEXT}

{voice.to_prompt_section()}

## Task: Generate Historical Era Profile

**Era:** {era}
**Timespan:** {timespan}
**Language:** {language}

## Generate JSON matching this structure:

{{
  "era": "{era}",
  "slug": "url-safe-slug",
  "timespan": "{timespan}",
  "title": "SEO-friendly title",
  "overview": "3-4 paragraphs (400-500 words)",
  "collective_vector": [8 floats representing the era's 8 Mu vector],
  "dominant_dimensions": ["Top 3 dimensions"],
  "cosmic_signature": "200-300 words on the era's cosmic character",
  "key_figures": [
    {{"name": "...", "contribution": "1-2 sentences"}}
  ],
  "major_developments": ["6-10 major developments"],
  "cultural_expressions": ["5-7 how the vector expressed culturally"],
  "shadow_aspects": "150-200 words on the era's shadow",
  "lessons_for_today": "200-300 words",
  "related_eras": ["2-3 related eras"],
  "faqs": [
    {{"question": "...", "answer": "..."}}
  ]
}}

If language is not English, translate all content naturally.
Return ONLY valid JSON.
""".strip()


# ============================================
# Content Generator
# ============================================

@dataclass
class ImageResult:
    """Result from image generation."""
    success: bool
    image_data: Optional[str] = None  # Base64 encoded
    mime_type: str = 'image/png'
    error: Optional[str] = None


class ContentGenerator:
    """Main content generation orchestrator."""

    def __init__(self, api_key: Optional[str] = None):
        self.client = GeminiClient(api_key)
        self.voice = VoiceConfig()

    def set_voice(self, voice: VoiceConfig) -> None:
        """Set the voice configuration."""
        self.voice = voice

    def generate_image(
        self,
        content_type: ContentType,
        params: Dict[str, Any]
    ) -> ImageResult:
        """Generate an image for the given content type."""
        try:
            # Build image prompt based on content type
            if content_type == ContentType.DAILY_WEATHER:
                prompt = build_cosmic_weather_image_prompt(
                    date=params.get('date', datetime.now().strftime('%Y-%m-%d')),
                    dominant_dimension=params.get('dominant_dimension', 'phase'),
                    theme=params.get('theme', 'Cosmic Alignment')
                )
            elif content_type == ContentType.DIMENSION_GUIDE:
                prompt = build_dimension_image_prompt(
                    dimension=params.get('dimension', 'phase')
                )
            elif content_type in (ContentType.HISTORICAL_FIGURE, ContentType.ARCHETYPE_PROFILE):
                prompt = build_archetype_image_prompt(
                    figure_name=params.get('name', 'Unknown'),
                    dominant_dimensions=params.get('dominant_dimensions', ['phase', 'field'])
                )
            else:
                # Generic cosmic image
                prompt = """Abstract cosmic sacred geometry scene.
                Deep space with flowing energy patterns, subtle mandalas,
                ethereal light. Mystical, contemplative, beautiful.
                No text in the image."""

            # Generate image
            result = self.client.generate_image(prompt)

            if result:
                return ImageResult(
                    success=True,
                    image_data=result['image_data'],
                    mime_type=result['mime_type']
                )
            else:
                return ImageResult(
                    success=False,
                    error="Image generation returned no data"
                )

        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return ImageResult(success=False, error=str(e))

    def generate_with_image(
        self,
        request: GenerationRequest,
        include_image: bool = True
    ) -> tuple[GenerationResult, Optional[ImageResult]]:
        """Generate content and optionally an accompanying image."""
        # Generate text content first
        text_result = self.generate(request)

        image_result = None
        if include_image and text_result.success:
            # Extract info from generated content for image prompt
            content = text_result.content or {}
            image_params = dict(request.params)

            # Add generated content info to image params
            if request.content_type == ContentType.DAILY_WEATHER:
                image_params['theme'] = content.get('theme', 'Cosmic Flow')
                dominant = content.get('dominant', {})
                image_params['dominant_dimension'] = dominant.get('dimension', 'phase')

            image_result = self.generate_image(request.content_type, image_params)

        return text_result, image_result

    def generate(self, request: GenerationRequest) -> GenerationResult:
        """Generate content based on request."""
        start_time = time.time()

        try:
            # Build prompt based on content type
            prompt = self._build_prompt(request)

            # Call Gemini API
            result = self.client.generate(prompt)

            # Calculate timing
            generation_time_ms = int((time.time() - start_time) * 1000)

            return GenerationResult(
                success=True,
                content=result['content'],
                tokens_used=result['tokens'],
                generation_time_ms=generation_time_ms
            )

        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return GenerationResult(
                success=False,
                error=str(e),
                generation_time_ms=int((time.time() - start_time) * 1000)
            )

    def _build_prompt(self, request: GenerationRequest) -> str:
        """Build prompt for the given request."""
        voice = request.voice or self.voice
        params = request.params
        lang = request.language

        if request.content_type == ContentType.DAILY_WEATHER:
            # Get vector from 8 Mu system
            vector, dominant, positions = self._get_daily_vector(params.get('date'))
            return build_daily_weather_prompt(
                date=params.get('date', datetime.now().strftime('%Y-%m-%d')),
                vector=vector,
                dominant=dominant,
                planetary_positions=positions,
                language=lang,
                voice=voice
            )

        elif request.content_type == ContentType.DIMENSION_GUIDE:
            dimension = params.get('dimension', 'phase')
            return build_dimension_guide_prompt(
                dimension=dimension,
                dimension_data=MU_DIMENSIONS[dimension],
                language=lang,
                voice=voice,
                word_count_target=params.get('word_count', 2000)
            )

        elif request.content_type in (ContentType.HISTORICAL_FIGURE, ContentType.ARCHETYPE_PROFILE):
            return build_historical_figure_prompt(
                name=params.get('name', 'Unknown'),
                era=params.get('era', 'Unknown'),
                tradition=params.get('tradition', 'Unknown'),
                vector=params.get('vector', [0.5] * 8),
                language=lang,
                voice=voice,
                known_facts=params.get('known_facts')
            )

        elif request.content_type == ContentType.JUNGIAN_CONCEPT:
            return build_jungian_concept_prompt(
                concept=params.get('concept', 'shadow'),
                language=lang,
                voice=voice
            )

        elif request.content_type == ContentType.COMPATIBILITY_TYPE:
            return build_compatibility_prompt(
                dimension1=params.get('dimension1', 'phase'),
                dimension2=params.get('dimension2', 'value'),
                language=lang,
                voice=voice
            )

        elif request.content_type == ContentType.VEDIC_DASHA:
            return build_vedic_dasha_prompt(
                planet=params.get('planet', 'Saturn'),
                language=lang,
                voice=voice
            )

        elif request.content_type == ContentType.TRANSIT_GUIDE:
            return build_transit_guide_prompt(
                planet=params.get('planet', 'Jupiter'),
                language=lang,
                voice=voice
            )

        elif request.content_type == ContentType.BLOG_POST:
            return build_blog_post_prompt(
                topic=params.get('topic', ''),
                keywords=params.get('keywords', []),
                language=lang,
                voice=voice,
                word_count_target=params.get('word_count', 1500)
            )

        elif request.content_type == ContentType.HISTORICAL_ERA:
            return build_historical_era_prompt(
                era=params.get('era', 'Renaissance'),
                timespan=params.get('timespan', '1400-1600 CE'),
                language=lang,
                voice=voice
            )

        else:
            raise ValueError(f"Unknown content type: {request.content_type}")

    def _get_daily_vector(self, date_str: Optional[str] = None) -> tuple:
        """Get 8 Mu vector for a given date."""
        try:
            # Try to import from core module
            from core.eight_mu import compute_8mu, get_planetary_positions

            if date_str:
                dt = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            else:
                dt = datetime.now(timezone.utc)

            result = compute_8mu(dt)
            positions = get_planetary_positions(dt)

            dominant_idx = result['vector'].index(max(result['vector']))
            dim_keys = list(MU_DIMENSIONS.keys())

            return (
                result['vector'],
                {
                    'dimension': dim_keys[dominant_idx],
                    'symbol': MU_DIMENSIONS[dim_keys[dominant_idx]]['symbol'],
                    'name': MU_DIMENSIONS[dim_keys[dominant_idx]]['name'],
                    'value': result['vector'][dominant_idx]
                },
                positions
            )
        except ImportError:
            # Fallback with mock data
            logger.warning("Could not import core.eight_mu, using mock data")
            import random
            vector = [random.uniform(0.3, 0.9) for _ in range(8)]
            dominant_idx = vector.index(max(vector))
            dim_keys = list(MU_DIMENSIONS.keys())

            return (
                vector,
                {
                    'dimension': dim_keys[dominant_idx],
                    'symbol': MU_DIMENSIONS[dim_keys[dominant_idx]]['symbol'],
                    'name': MU_DIMENSIONS[dim_keys[dominant_idx]]['name'],
                    'value': vector[dominant_idx]
                },
                {'Sun': 280.5, 'Moon': 45.2, 'Mercury': 275.1, 'Venus': 310.5,
                 'Mars': 120.3, 'Jupiter': 85.7, 'Saturn': 340.2, 'Neptune': 25.6}
            )


# ============================================
# Image Generation Prompts
# ============================================

def build_cosmic_weather_image_prompt(
    date: str,
    dominant_dimension: str,
    theme: str
) -> str:
    """Build prompt for daily cosmic weather image."""
    dim_data = MU_DIMENSIONS.get(dominant_dimension, MU_DIMENSIONS['phase'])
    return f"""A mystical cosmic scene representing the energy of {date}.

Theme: "{theme}"
Dominant energy: {dim_data['name']} ({dim_data['planet']})
Color palette: {dim_data['color']}, deep space blues, stellar golds

Style: Sacred geometry meets cosmic art. Ethereal, luminous, spiritually evocative.
Elements: Planetary symbols, constellation patterns, flowing energy waves, subtle mandalas.
Mood: Contemplative, inspiring, transcendent.

No text or words in the image."""


def build_dimension_image_prompt(dimension: str) -> str:
    """Build prompt for dimension guide image."""
    dim_data = MU_DIMENSIONS.get(dimension, MU_DIMENSIONS['phase'])
    return f"""Abstract cosmic representation of the {dim_data['name']} dimension.

Planet: {dim_data['planet']} ({dim_data['planet_symbol']})
Element: {dim_data['element']}
Domain: {dim_data['domain']}
Primary color: {dim_data['color']}

Style: Sacred geometry, ethereal cosmic art, luminous.
Include subtle planetary symbols and flowing energy patterns.
Mood: {dim_data['keywords'][0]}, transcendent, powerful yet peaceful.

No text or words in the image."""


def build_archetype_image_prompt(
    figure_name: str,
    dominant_dimensions: List[str]
) -> str:
    """Build prompt for historical figure/archetype image."""
    colors = [MU_DIMENSIONS[d]['color'] for d in dominant_dimensions if d in MU_DIMENSIONS]
    return f"""Abstract spiritual portrait representing the cosmic essence of {figure_name}.

Dominant energies: {', '.join(dominant_dimensions)}
Color palette: {', '.join(colors)}, cosmic purples, ethereal whites

Style: Ethereal, symbolic, sacred geometry elements.
Not a literal portrait - abstract representation of their cosmic pattern.
Include subtle mandalas, energy patterns, celestial elements.
Mood: Wise, timeless, luminous.

No text, no literal face, abstract symbolic only."""


# ============================================
# CLI Interface
# ============================================

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Generate cosmic content using Gemini 2.5 Flash'
    )

    parser.add_argument(
        '--type', '-t',
        type=str,
        required=True,
        choices=[ct.value for ct in ContentType],
        help='Content type to generate'
    )

    parser.add_argument(
        '--lang', '-l',
        type=str,
        default='en',
        help='Output language (default: en)'
    )

    parser.add_argument(
        '--output', '-o',
        type=str,
        help='Output file path (default: stdout)'
    )

    # Type-specific arguments
    parser.add_argument('--date', type=str, help='Date for daily weather (YYYY-MM-DD)')
    parser.add_argument('--dimension', type=str, help='Dimension for guide')
    parser.add_argument('--figure', type=str, help='Historical figure name')
    parser.add_argument('--era', type=str, help='Historical era name')
    parser.add_argument('--timespan', type=str, help='Era timespan')
    parser.add_argument('--concept', type=str, help='Jungian concept')
    parser.add_argument('--planet', type=str, help='Planet for transit/dasha')
    parser.add_argument('--dim1', type=str, help='First dimension for compatibility')
    parser.add_argument('--dim2', type=str, help='Second dimension for compatibility')
    parser.add_argument('--topic', type=str, help='Blog post topic')
    parser.add_argument('--keywords', type=str, help='Comma-separated keywords')

    # Image generation options
    parser.add_argument('--with-image', action='store_true', help='Generate accompanying image')
    parser.add_argument('--image-only', action='store_true', help='Generate only an image')
    parser.add_argument('--image-output', type=str, help='Output path for image file')

    # Stats
    parser.add_argument('--stats', action='store_true', help='Show API key rotation stats')

    args = parser.parse_args()

    # Handle stats request
    if args.stats:
        generator = ContentGenerator()
        stats = generator.client.get_rotation_stats()
        if stats:
            print(json.dumps(stats, indent=2))
        else:
            print("Single key mode - no rotation stats")
        sys.exit(0)

    # Build params based on content type
    params: Dict[str, Any] = {}

    content_type = ContentType(args.type)

    if content_type == ContentType.DAILY_WEATHER:
        params['date'] = args.date or datetime.now().strftime('%Y-%m-%d')

    elif content_type == ContentType.DIMENSION_GUIDE:
        if not args.dimension:
            parser.error("--dimension required for dimension_guide")
        params['dimension'] = args.dimension

    elif content_type in (ContentType.HISTORICAL_FIGURE, ContentType.ARCHETYPE_PROFILE):
        if not args.figure:
            parser.error("--figure required for historical_figure")
        params['name'] = args.figure
        params['era'] = args.era or 'Unknown'
        params['tradition'] = 'Unknown'
        params['vector'] = [0.7, 0.5, 0.8, 0.6, 0.7, 0.5, 0.9, 0.6]

    elif content_type == ContentType.HISTORICAL_ERA:
        if not args.era:
            parser.error("--era required for historical_era")
        params['era'] = args.era
        params['timespan'] = args.timespan or 'Unknown'

    elif content_type == ContentType.JUNGIAN_CONCEPT:
        if not args.concept:
            parser.error("--concept required for jungian_concept")
        params['concept'] = args.concept

    elif content_type == ContentType.VEDIC_DASHA:
        if not args.planet:
            parser.error("--planet required for vedic_dasha")
        params['planet'] = args.planet

    elif content_type == ContentType.TRANSIT_GUIDE:
        if not args.planet:
            parser.error("--planet required for transit_guide")
        params['planet'] = args.planet

    elif content_type == ContentType.COMPATIBILITY_TYPE:
        if not args.dim1 or not args.dim2:
            parser.error("--dim1 and --dim2 required for compatibility_type")
        params['dimension1'] = args.dim1
        params['dimension2'] = args.dim2

    elif content_type == ContentType.BLOG_POST:
        if not args.topic:
            parser.error("--topic required for blog_post")
        params['topic'] = args.topic
        params['keywords'] = args.keywords.split(',') if args.keywords else []

    # Create request
    request = GenerationRequest(
        content_type=content_type,
        language=args.lang,
        params=params
    )

    generator = ContentGenerator()

    # Handle image-only mode
    if args.image_only:
        logger.info(f"Generating image for {content_type.value}...")
        image_result = generator.generate_image(content_type, params)

        if not image_result.success:
            logger.error(f"Image generation failed: {image_result.error}")
            sys.exit(1)

        # Save image
        if args.image_output and image_result.image_data:
            import base64
            image_path = Path(args.image_output)
            image_path.parent.mkdir(parents=True, exist_ok=True)
            image_bytes = base64.b64decode(image_result.image_data)
            image_path.write_bytes(image_bytes)
            logger.info(f"Image saved to {args.image_output}")
        else:
            # Output base64 as JSON
            print(json.dumps({
                'success': True,
                'image_data': image_result.image_data,
                'mime_type': image_result.mime_type
            }))

        sys.exit(0)

    # Generate content (with optional image)
    logger.info(f"Generating {content_type.value} content in {args.lang}...")

    if args.with_image:
        result, image_result = generator.generate_with_image(request, include_image=True)
    else:
        result = generator.generate(request)
        image_result = None

    if not result.success:
        logger.error(f"Generation failed: {result.error}")
        sys.exit(1)

    # Output result
    output_data = {
        'success': True,
        'type': content_type.value,
        'language': args.lang,
        'content': result.content,
        'metadata': {
            'tokens_used': result.tokens_used,
            'generation_time_ms': result.generation_time_ms,
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    }

    # Add image data if generated
    if image_result and image_result.success:
        output_data['image'] = {
            'generated': True,
            'mime_type': image_result.mime_type
        }
        # Save image if path provided
        if args.image_output and image_result.image_data:
            import base64
            image_path = Path(args.image_output)
            image_path.parent.mkdir(parents=True, exist_ok=True)
            image_bytes = base64.b64decode(image_result.image_data)
            image_path.write_bytes(image_bytes)
            output_data['image']['saved_to'] = args.image_output
            logger.info(f"Image saved to {args.image_output}")
        elif image_result.image_data:
            output_data['image']['data'] = image_result.image_data

    output_json = json.dumps(output_data, indent=2, ensure_ascii=False)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output_json, encoding='utf-8')
        logger.info(f"Output written to {args.output}")
    else:
        print(output_json)

    logger.info(f"Generated in {result.generation_time_ms}ms, {result.tokens_used} tokens")

    # Show rotation stats if available
    stats = generator.client.get_rotation_stats()
    if stats:
        logger.info(f"API key rotation: {stats['total_keys']} keys, usage: {stats['usage']}")


if __name__ == '__main__':
    main()
