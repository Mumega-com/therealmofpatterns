"""
The Realm of Patterns - Content Engine

Cosmic content generation system for programmatic SEO and educational articles.
Uses Gemini 2.5 Flash API for AI-powered content generation.

Usage:
    from content_engine.generator import ContentGenerator, GenerationRequest, ContentType

    generator = ContentGenerator()
    request = GenerationRequest(
        content_type=ContentType.DAILY_WEATHER,
        language='en',
        params={'date': '2025-01-15'}
    )
    result = generator.generate(request)
"""

from .generator import (
    ContentGenerator,
    ContentType,
    MuDimension,
    VoiceConfig,
    GenerationRequest,
    GenerationResult,
    MU_DIMENSIONS,
    GeminiClient,
)

__all__ = [
    'ContentGenerator',
    'ContentType',
    'MuDimension',
    'VoiceConfig',
    'GenerationRequest',
    'GenerationResult',
    'MU_DIMENSIONS',
    'GeminiClient',
]

__version__ = '1.0.0'
