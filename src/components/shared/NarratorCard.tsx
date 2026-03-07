'use client';

import { useState, useEffect } from 'react';
import { fetchNarrative, type NarratorResult } from '../../lib/narrator-client';

interface NarratorCardProps {
  /** Optional archetype title to display above the narrative */
  archetypeTitle?: string;
  /** Compact mode for dashboard embedding */
  compact?: boolean;
}

export function NarratorCard({ archetypeTitle, compact = false }: NarratorCardProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<NarratorResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Small delay for localStorage hydration
    const timer = setTimeout(async () => {
      try {
        const narrative = await fetchNarrative();
        if (!cancelled) {
          setResult(narrative);
          setState('ready');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="narrator-card narrator-loading">
        <div className="narrator-skeleton">
          <div className="skel-line skel-wide" />
          <div className="skel-line skel-full" />
          <div className="skel-line skel-full" />
          <div className="skel-line skel-medium" />
        </div>
        <p className="narrator-loading-text">Reading your patterns...</p>
        <style>{narratorStyles}</style>
      </div>
    );
  }

  if (state === 'error' || !result) {
    return null; // Silently fail — the rest of the page still works
  }

  const tierLabels: Record<string, string> = {
    intro: 'Introduction',
    early: 'Getting to know you',
    pattern: 'Pattern recognition',
    calibrated: 'Calibrated to you',
    deep: 'Deep insight',
  };

  return (
    <div className={`narrator-card ${compact ? 'narrator-compact' : ''}`}>
      {archetypeTitle && (
        <div className="narrator-archetype">{archetypeTitle}</div>
      )}

      <div className="narrator-body">
        {compact
          ? <p className="narrator-text">{result.narrative.slice(0, 280)}{result.narrative.length > 280 ? '…' : ''}</p>
          : <p className="narrator-text">{result.narrative}</p>
        }
      </div>

      {compact && (
        <a href="/reading" className="narrator-readmore">Read Sol's full reading &rarr;</a>
      )}

      <div className="narrator-meta">
        {result.fromFallback
          ? <span className="narrator-fallback">Template reading</span>
          : <span className="narrator-tier">{tierLabels[result.tier] || result.tier} · Personalized</span>
        }
      </div>

      <style>{narratorStyles}</style>
    </div>
  );
}

const narratorStyles = `
  .narrator-card {
    padding: 1.5rem;
    background: rgba(26, 24, 20, 0.5);
    border: 1px solid rgba(212, 168, 84, 0.12);
    border-radius: 12px;
  }

  .narrator-compact {
    padding: 1.25rem;
  }

  .narrator-archetype {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(212, 168, 84, 0.6);
    margin-bottom: 0.5rem;
  }

  .narrator-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.3rem;
    font-weight: 400;
    color: #d4a854;
    margin: 0 0 1rem;
  }

  .narrator-compact .narrator-title {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .narrator-body {
    margin-bottom: 1rem;
  }

  .narrator-text {
    font-size: 0.95rem;
    line-height: 1.75;
    color: rgba(240, 232, 216, 0.8);
    margin: 0;
    white-space: pre-wrap;
  }

  .narrator-compact .narrator-text {
    font-size: 0.9rem;
    line-height: 1.65;
  }

  .narrator-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(212, 168, 84, 0.08);
  }

  .narrator-tier {
    font-size: 0.75rem;
    color: rgba(240, 232, 216, 0.4);
    font-family: 'Inter', sans-serif;
  }

  .narrator-fallback {
    font-size: 0.7rem;
    color: rgba(240, 232, 216, 0.3);
    font-family: 'Inter', sans-serif;
    font-style: italic;
  }

  .narrator-readmore {
    display: inline-block;
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: #d4a854;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .narrator-readmore:hover {
    opacity: 0.8;
  }

  /* Loading state */
  .narrator-loading {
    min-height: 120px;
  }

  .narrator-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .skel-line {
    height: 12px;
    background: rgba(240, 232, 216, 0.05);
    border-radius: 4px;
    animation: narrator-pulse 1.5s ease-in-out infinite;
  }

  .skel-wide { width: 40%; }
  .skel-full { width: 100%; }
  .skel-medium { width: 65%; }

  .narrator-loading-text {
    font-size: 0.8rem;
    color: rgba(240, 232, 216, 0.3);
    font-style: italic;
    margin: 0;
  }

  @keyframes narrator-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
`;
