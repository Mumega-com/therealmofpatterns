'use client';

/**
 * SolReading — the full Sol daily reading page component.
 * Fetches the personalized narrative and displays it with the carry question.
 */

import { useState, useEffect } from 'react';
import { fetchNarrative, type NarratorResult } from '../../lib/narrator-client';
import { getTodaysCheckin } from '../../lib/checkin-storage';

function getCarryQuestion(scores: Record<string, number>): string {
  const dims = {
    coherence: ((scores.mood || 3) + (scores.direction || 3)) / 2,
    energy: scores.energy || 3,
    focus: scores.focus || 3,
    embodiment: scores.body || 3,
  };
  const lowestDim = Object.entries(dims).sort((a, b) => a[1] - b[1])[0][0];
  const questions: Record<string, string> = {
    coherence: "What in you is seeking coherence right now that you have not yet found words for?",
    energy: "Where is your vitality actually going — not where you direct it, but where you notice it leaving?",
    focus: "What are you avoiding giving your full attention to, and what does that avoidance protect?",
    embodiment: "What is your body already knowing that your thinking has not yet caught up with?",
  };
  return questions[lowestDim] || questions.coherence;
}

const TIER_DEPTH: Record<string, string> = {
  intro: 'First reading',
  early: 'Early field',
  pattern: 'Pattern emerging',
  calibrated: 'Calibrated',
  deep: 'Deep contact',
};

export function SolReading() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<NarratorResult | null>(null);
  const [carryQuestion, setCarryQuestion] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Get carry question from today's check-in
      const todayEntry = getTodaysCheckin();
      if (todayEntry?.scores) {
        setCarryQuestion(getCarryQuestion(todayEntry.scores));
      }

      try {
        const narrative = await fetchNarrative();
        setResult(narrative);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  if (status === 'loading') {
    return (
      <div className="sr-loading">
        <div className="sr-spinner" />
        <p className="sr-loading-text">Sol is reading the field…</p>
        <style>{styles}</style>
      </div>
    );
  }

  if (status === 'error' || !result) {
    return (
      <div className="sr-error">
        <p className="sr-error-text">The field is quiet. Return when you are ready.</p>
        <a href="/sol/checkin" className="sr-error-link">Begin today's reflection →</a>
        <style>{styles}</style>
      </div>
    );
  }

  const paragraphs = result.narrative.split('\n\n').filter(Boolean);
  const depth = TIER_DEPTH[result.tier] || result.tier;

  return (
    <div className="sr-wrap">
      {/* Date */}
      <p className="sr-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

      {/* Narrative */}
      <div className="sr-narrative">
        {paragraphs.map((para, i) => (
          <p key={i} className="sr-para">{para}</p>
        ))}
      </div>

      {/* Carry question */}
      {carryQuestion && (
        <div className="sr-carry">
          <span className="sr-carry-label">A question to carry today</span>
          <p className="sr-carry-q">{carryQuestion}</p>
        </div>
      )}

      {/* Meta */}
      <div className="sr-meta">
        {result.fromFallback
          ? <span className="sr-tier">Template reading</span>
          : <span className="sr-tier">{depth}{result.tier !== 'intro' ? ' · Personalized' : ''}</span>
        }
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .sr-loading, .sr-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 280px;
    gap: 1rem;
    text-align: center;
  }
  .sr-spinner {
    width: 28px; height: 28px;
    border: 1.5px solid rgba(212, 168, 84, 0.15);
    border-top-color: rgba(212, 168, 84, 0.6);
    border-radius: 50%;
    animation: sr-spin 1s linear infinite;
  }
  @keyframes sr-spin { to { transform: rotate(360deg); } }
  .sr-loading-text {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 0.95rem;
    color: rgba(240, 232, 216, 0.35);
    margin: 0;
  }
  .sr-error-text {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    color: rgba(240, 232, 216, 0.4);
    margin: 0;
  }
  .sr-error-link {
    font-size: 0.875rem;
    color: #d4a854;
    text-decoration: none;
  }

  .sr-wrap {
    animation: sr-fade 0.8s ease-out;
  }
  @keyframes sr-fade {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .sr-date {
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(212, 168, 84, 0.4);
    margin: 0 0 2rem;
  }

  .sr-narrative {
    margin-bottom: 2.5rem;
  }
  .sr-para {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.2rem;
    line-height: 1.9;
    color: rgba(240, 232, 216, 0.88);
    margin: 0 0 1.5em;
  }
  .sr-para:last-child { margin-bottom: 0; }

  .sr-carry {
    padding: 1.25rem 1.5rem;
    border-left: 2px solid rgba(212, 168, 84, 0.3);
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sr-carry-label {
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(212, 168, 84, 0.45);
  }
  .sr-carry-q {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 1.05rem;
    line-height: 1.7;
    color: rgba(240, 232, 216, 0.65);
    margin: 0;
  }

  .sr-meta {
    padding-top: 1.5rem;
    border-top: 1px solid rgba(212, 168, 84, 0.06);
  }
  .sr-tier {
    font-size: 0.7rem;
    color: rgba(240, 232, 216, 0.22);
    letter-spacing: 0.06em;
  }
`;
