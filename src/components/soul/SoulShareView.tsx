// @ts-nocheck
'use client';

/**
 * SoulShareView — public shareable soul field.
 * Decodes a base64 token from the URL, computes the 16D vector client-side,
 * and renders the toroid. No login required.
 */

import { useState, useEffect, useMemo } from 'react';
import { SoulToroid, decodeShareToken } from '../charts/SoulToroid';
import { computeFromBirthData } from '../../lib/16d-engine';
import { assignArchetype } from '../../lib/archetype-engine';

interface SoulShareViewProps {
  token?: string;
}

export function SoulShareView({ token: tokenProp }: SoulShareViewProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [natal, setNatal]   = useState<number[] | null>(null);
  const [archetype, setArchetype] = useState<string | null>(null);
  const [birthLabel, setBirthLabel] = useState<string>('');
  const [token, setToken] = useState<string>(tokenProp || '');

  useEffect(() => {
    // If no token prop, read from URL path (e.g. /soul/TOKEN)
    const resolved = tokenProp || window.location.pathname.split('/soul/').pop()?.replace(/\/$/, '') || '';
    setToken(resolved);
    const bd = decodeShareToken(resolved);
    if (!bd) {
      setStatus('error');
      return;
    }

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    setBirthLabel(`${months[(bd.month - 1) ?? 0]} ${bd.day}, ${bd.year}`);

    try {
      const v16 = computeFromBirthData(bd);
      const v8  = Array.from(v16).slice(0, 8);
      const arc = assignArchetype(v8);
      setNatal(v8);
      setArchetype(arc?.primary.title ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="ssv-center">
        <div className="ssv-spinner" />
        <span className="ssv-hint">Reading the field…</span>
      </div>
    );
  }

  if (status === 'error' || !natal) {
    return (
      <div className="ssv-center">
        <p className="ssv-err">This field link is invalid or expired.</p>
        <a href="/" className="ssv-cta">Discover your own field →</a>
      </div>
    );
  }

  return (
    <div className="ssv-wrap">
      {/* Field */}
      <SoulToroid
        natal={natal}
        mode="full"
        archetypeName={archetype ?? undefined}
      />

      {/* Footer CTA */}
      <div className="ssv-footer">
        <span className="ssv-born">Born {birthLabel}</span>
        <span className="ssv-sep">·</span>
        <span className="ssv-name">{archetype ?? 'Unique Field'}</span>
        <span className="ssv-sep">·</span>
        <a href={`/soul/compare?a=${token}`} className="ssv-compare">
          Compare with my field →
        </a>
        <span className="ssv-sep">·</span>
        <a href="/discover" className="ssv-discover">
          Map your own field →
        </a>
      </div>

      <style>{`
        .ssv-wrap {
          position: fixed;
          inset: 0;
          background: #05060a;
          display: flex;
          flex-direction: column;
        }
        .ssv-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 296px; /* panel width */
          padding: 10px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          color: rgba(207,211,255,0.45);
          background: rgba(5,6,10,0.7);
          backdrop-filter: blur(8px);
          border-top: 1px solid rgba(100,140,255,0.08);
        }
        .ssv-born { color: rgba(207,211,255,0.55); }
        .ssv-name { color: rgba(207,211,255,0.7); font-style: italic; }
        .ssv-sep  { opacity: 0.3; }
        .ssv-compare {
          color: rgba(207, 211, 255, 0.6);
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .ssv-compare:hover { opacity: 0.7; }
        .ssv-discover {
          color: #d4a854;
          text-decoration: none;
          transition: opacity 0.2s;
          margin-left: auto;
        }
        .ssv-discover:hover { opacity: 0.7; }
        .ssv-center {
          position: fixed;
          inset: 0;
          background: #05060a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        .ssv-spinner {
          width: 36px;
          height: 36px;
          border: 2px solid rgba(100,140,255,0.15);
          border-top-color: rgba(100,140,255,0.6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ssv-hint {
          font-size: 12px;
          color: rgba(207,211,255,0.4);
          letter-spacing: 0.06em;
        }
        .ssv-err {
          color: rgba(207,211,255,0.5);
          font-size: 14px;
          margin: 0;
        }
        .ssv-cta {
          padding: 10px 24px;
          background: linear-gradient(135deg, #d4a854, #c49a4a);
          color: #0a0908;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
