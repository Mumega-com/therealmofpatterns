// @ts-nocheck
'use client';

/**
 * WeeklySynthesis — shows Sol's longitudinal reading after 7 check-ins.
 * Mounts on the Sol dashboard when the user has enough data.
 */

import { useState, useEffect } from 'react';
import { fetchWeeklySynthesis } from '../../lib/narrator-client';
import { getCheckinHistory } from '../../lib/checkin-storage';

export function WeeklySynthesis() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'insufficient'>('idle');
  const [narrative, setNarrative] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const history = getCheckinHistory();
    if (history.entries.length < 7) {
      setStatus('insufficient');
      return;
    }
    setStatus('idle');
  }, []);

  async function generate() {
    setStatus('loading');
    try {
      const result = await fetchWeeklySynthesis();
      if (result) {
        setNarrative(result.narrative);
        setStatus('ready');
        setExpanded(true);
      } else {
        setStatus('insufficient');
      }
    } catch {
      setStatus('idle');
    }
  }

  if (status === 'insufficient') return null;

  return (
    <section className="ws-section">
      <div className="ws-header" onClick={() => status === 'ready' && setExpanded(e => !e)}>
        <span className="ws-icon">◑</span>
        <h2 className="ws-title">The arc of the week</h2>
        {status === 'ready' && (
          <span className="ws-toggle">{expanded ? '−' : '+'}</span>
        )}
      </div>

      {status === 'idle' && (
        <div className="ws-prompt">
          <p className="ws-hint">Seven days of field data gathered. Sol can read the week as a whole.</p>
          <button className="ws-btn" onClick={generate}>
            Read the week
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="ws-loading">
          <span className="ws-spinner" />
          <span className="ws-loading-text">Sol is reading the arc…</span>
        </div>
      )}

      {status === 'ready' && expanded && narrative && (
        <div className="ws-narrative">
          {narrative.split('\n\n').map((para, i) => (
            <p key={i} className="ws-para">{para}</p>
          ))}
        </div>
      )}

      <style>{`
        .ws-section {
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.12);
          border-radius: 20px;
          overflow: hidden;
          margin-top: 1.5rem;
        }
        .ws-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(212, 168, 84, 0.08);
          cursor: default;
        }
        .ws-header[style*="pointer"] { cursor: pointer; }
        .ws-icon {
          font-size: 1.25rem;
          color: rgba(212, 168, 84, 0.6);
        }
        .ws-title {
          font-size: 1rem;
          font-weight: 600;
          color: #f0e8d8;
          flex: 1;
          margin: 0;
        }
        .ws-toggle {
          font-size: 1.2rem;
          color: rgba(212, 168, 84, 0.5);
          line-height: 1;
        }
        .ws-prompt {
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ws-hint {
          font-size: 0.875rem;
          color: rgba(240, 232, 216, 0.5);
          font-style: italic;
          margin: 0;
          line-height: 1.6;
        }
        .ws-btn {
          align-self: flex-start;
          padding: 0.625rem 1.25rem;
          background: rgba(212, 168, 84, 0.1);
          border: 1px solid rgba(212, 168, 84, 0.3);
          border-radius: 10px;
          color: #d4a854;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .ws-btn:hover {
          background: rgba(212, 168, 84, 0.18);
        }
        .ws-loading {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .ws-spinner {
          width: 18px;
          height: 18px;
          border: 1.5px solid rgba(212, 168, 84, 0.2);
          border-top-color: rgba(212, 168, 84, 0.7);
          border-radius: 50%;
          animation: ws-spin 1s linear infinite;
          flex-shrink: 0;
        }
        @keyframes ws-spin { to { transform: rotate(360deg); } }
        .ws-loading-text {
          font-size: 0.875rem;
          color: rgba(240, 232, 216, 0.4);
          font-style: italic;
        }
        .ws-narrative {
          padding: 1.5rem;
          border-top: 1px solid rgba(212, 168, 84, 0.06);
          animation: ws-fade-in 0.6s ease-out;
        }
        @keyframes ws-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ws-para {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.05rem;
          line-height: 1.8;
          color: rgba(240, 232, 216, 0.82);
          margin: 0 0 1.1em;
        }
        .ws-para:last-child { margin-bottom: 0; }
      `}</style>
    </section>
  );
}
