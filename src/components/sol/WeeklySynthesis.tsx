// @ts-nocheck
'use client';

/**
 * WeeklySynthesis — shows Sol's longitudinal reading after 7 check-ins.
 * Mounts on the Sol dashboard when the user has enough data.
 * Pro gate: non-Pro users see a paywall card after 7+ entries.
 */

import { useState, useEffect } from 'react';
import { fetchWeeklySynthesis } from '../../lib/narrator-client';
import { getCheckinHistory } from '../../lib/checkin-storage';

function getIsPro(): boolean {
  try {
    const user = localStorage.getItem('rop_user');
    if (user) return JSON.parse(user).isPro === true;
  } catch { /* ignore */ }
  return false;
}

export function WeeklySynthesis() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'insufficient' | 'locked'>('idle');
  const [narrative, setNarrative] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [entryCount, setEntryCount] = useState(0);

  useEffect(() => {
    const history = getCheckinHistory();
    const count = history.entries.length;
    setEntryCount(count);

    if (count < 7) {
      setStatus('insufficient');
      return;
    }

    if (!getIsPro()) {
      setStatus('locked');
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

  // Don't render anything if not enough data
  if (status === 'insufficient') return null;

  return (
    <section className="ws-section">
      <div className="ws-header" onClick={() => status === 'ready' && setExpanded(e => !e)}>
        <span className="ws-icon">◑</span>
        <h2 className="ws-title">The arc of the week</h2>
        {status === 'ready' && (
          <span className="ws-toggle">{expanded ? '−' : '+'}</span>
        )}
        {status === 'locked' && (
          <span className="ws-lock">✦ Pro</span>
        )}
      </div>

      {/* Paywall state — user has data but isn't Pro */}
      {status === 'locked' && (
        <div className="ws-paywall">
          <div className="ws-paywall-preview">
            <p className="ws-paywall-teaser">
              Seven patterns of the field are ready to be read as one. Sol sees the thread connecting your energy, body, emotion, clarity, and ground across the week — where you moved, where you held back, and what the arc is asking of you now.
            </p>
            <div className="ws-blur-mask" aria-hidden="true">
              <p className="ws-blur-text">
                The week began with a contraction in your energy field, though your body held steadier than your thoughts. By midweek a shift emerged — something in the emotional dimension released, and clarity followed. The pattern suggests a cycle completing itself. What you've been resisting is not an obstacle; it is the threshold. The field is ready for you to cross it.
              </p>
            </div>
          </div>
          <div className="ws-paywall-cta">
            <p className="ws-paywall-hint">
              Your weekly synthesis is ready. Unlock it with Sol Pro.
            </p>
            <a href="/subscribe?plan=individual" className="ws-upgrade-btn">
              Unlock weekly synthesis — $9/month
            </a>
            <p className="ws-paywall-sub">7-day free trial · Cancel anytime</p>
          </div>
        </div>
      )}

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
        .ws-lock {
          font-size: 0.7rem;
          font-weight: 600;
          color: #d4a854;
          background: rgba(212, 168, 84, 0.12);
          border: 1px solid rgba(212, 168, 84, 0.25);
          border-radius: 6px;
          padding: 0.2rem 0.5rem;
          letter-spacing: 0.04em;
        }

        /* Paywall */
        .ws-paywall {
          padding: 0;
        }
        .ws-paywall-preview {
          position: relative;
          padding: 1.25rem 1.5rem 0;
        }
        .ws-paywall-teaser {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1rem;
          line-height: 1.75;
          color: rgba(240, 232, 216, 0.7);
          margin: 0 0 1rem;
          font-style: italic;
        }
        .ws-blur-mask {
          position: relative;
          overflow: hidden;
          max-height: 80px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
        }
        .ws-blur-text {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.05rem;
          line-height: 1.8;
          color: rgba(240, 232, 216, 0.5);
          margin: 0;
          filter: blur(4px);
          user-select: none;
        }
        .ws-paywall-cta {
          padding: 1.25rem 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
          border-top: 1px solid rgba(212, 168, 84, 0.08);
          margin-top: 1rem;
        }
        .ws-paywall-hint {
          font-size: 0.875rem;
          color: rgba(240, 232, 216, 0.55);
          margin: 0;
          line-height: 1.5;
        }
        .ws-upgrade-btn {
          display: inline-block;
          padding: 0.7rem 1.4rem;
          background: linear-gradient(135deg, #d4a854 0%, #c49a4a 100%);
          color: #0a0908;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          font-family: inherit;
          letter-spacing: 0.01em;
        }
        .ws-upgrade-btn:hover {
          background: linear-gradient(135deg, #e5b964 0%, #d4a854 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(212, 168, 84, 0.3);
        }
        .ws-paywall-sub {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.3);
          margin: 0;
        }

        /* Prompt / generate */
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
