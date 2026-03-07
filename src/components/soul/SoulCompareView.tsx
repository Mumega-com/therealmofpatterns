// @ts-nocheck
'use client';

/**
 * SoulCompareView — compare two soul fields side by side.
 * Accepts two base64 share tokens via URL query params (?a=TOKEN&b=TOKEN).
 * All computation is client-side. No server required.
 */

import { useState, useEffect } from 'react';
import { SoulToroid, decodeShareToken } from '../charts/SoulToroid';
import { computeFromBirthData } from '../../lib/16d-engine';
import { assignArchetype } from '../../lib/archetype-engine';

const DIMENSION_NAMES = ['Identity', 'Structure', 'Mind', 'Heart', 'Growth', 'Drive', 'Connection', 'Awareness'];

function cosineSimilarity(a: number[], b: number[]): number {
  const dot  = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

function resonanceLabel(score: number): { label: string; description: string } {
  if (score >= 0.92) return { label: 'Consonant', description: 'The two fields share a fundamental pattern — a mirroring that can be both clarifying and confronting.' };
  if (score >= 0.78) return { label: 'Resonant', description: 'Strong harmonic alignment. Where these fields meet, something amplifies — for better or otherwise.' };
  if (score >= 0.62) return { label: 'Complementary', description: 'The fields are different enough to complete each other, similar enough to understand each other.' };
  if (score >= 0.45) return { label: 'Contrapuntal', description: 'These fields move in different registers. What one overlooks, the other tends to see.' };
  return { label: 'Discordant', description: 'The fields are structured around very different psychological principles. The friction is real — and potentially instructive.' };
}

interface FieldData {
  natal: number[];
  archetype: string | null;
  birthLabel: string;
}

export function SoulCompareView() {
  const [fieldA, setFieldA] = useState<FieldData | null>(null);
  const [fieldB, setFieldB] = useState<FieldData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [resonance, setResonance] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenA = params.get('a');
    let tokenB = params.get('b');

    // If only one token, try to get viewer's own token from localStorage
    if (tokenA && !tokenB) {
      try {
        const stored = localStorage.getItem('rop_birth_data_full');
        if (stored) {
          const bd = JSON.parse(stored);
          // Encode the viewer's own birth data as token B
          const payload = { y: bd.year, m: bd.month, d: bd.day, h: bd.hour ?? 12, mn: bd.minute ?? 0 };
          tokenB = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
          // Update URL without navigation
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('b', tokenB);
          window.history.replaceState({}, '', newUrl.toString());
        }
      } catch { /* continue */ }
    }

    if (!tokenA || !tokenB) {
      setStatus('error');
      return;
    }

    const bdA = decodeShareToken(tokenA);
    const bdB = decodeShareToken(tokenB);

    if (!bdA || !bdB) {
      setStatus('error');
      return;
    }

    try {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const v8A = Array.from(computeFromBirthData(bdA)).slice(0, 8);
      const v8B = Array.from(computeFromBirthData(bdB)).slice(0, 8);
      const arcA = assignArchetype(v8A);
      const arcB = assignArchetype(v8B);

      setFieldA({
        natal: v8A,
        archetype: arcA?.primary.title ?? null,
        birthLabel: `${months[(bdA.month - 1)]} ${bdA.day}, ${bdA.year}`,
      });
      setFieldB({
        natal: v8B,
        archetype: arcB?.primary.title ?? null,
        birthLabel: `${months[(bdB.month - 1)]} ${bdB.day}, ${bdB.year}`,
      });
      setResonance(cosineSimilarity(v8A, v8B));
      setShareUrl(window.location.href);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  if (status === 'loading') {
    return (
      <div className="scv-center">
        <div className="scv-spinner" />
        <span className="scv-hint">Reading both fields…</span>
      </div>
    );
  }

  if (status === 'error' || !fieldA || !fieldB) {
    return (
      <div className="scv-center">
        <p className="scv-err">Two valid soul field tokens are required.</p>
        <p className="scv-err-sub">Format: /soul/compare?a=TOKEN&amp;b=TOKEN</p>
        <a href="/soul" className="scv-cta">View your own field →</a>
      </div>
    );
  }

  const { label, description } = resonanceLabel(resonance ?? 0);
  const score = Math.round((resonance ?? 0) * 100);

  function copyShareUrl() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
  }

  return (
    <div className="scv-wrap">
      {/* Resonance header */}
      <div className="scv-resonance">
        <span className="scv-resonance-score">{score}%</span>
        <span className="scv-resonance-label">{label}</span>
        <p className="scv-resonance-desc">{description}</p>
        <button className="scv-share-btn" onClick={copyShareUrl}>
          Copy comparison link
        </button>
      </div>

      {/* Two toroids */}
      <div className="scv-fields">
        <div className="scv-field">
          <SoulToroid natal={fieldA.natal} mode="widget" archetypeName={fieldA.archetype ?? undefined} />
          <div className="scv-field-label">
            <span className="scv-archetype">{fieldA.archetype ?? 'Field A'}</span>
            <span className="scv-birth">Born {fieldA.birthLabel}</span>
          </div>
        </div>
        <div className="scv-field">
          <SoulToroid natal={fieldB.natal} mode="widget" archetypeName={fieldB.archetype ?? undefined} />
          <div className="scv-field-label">
            <span className="scv-archetype">{fieldB.archetype ?? 'Field B'}</span>
            <span className="scv-birth">Born {fieldB.birthLabel}</span>
          </div>
        </div>
      </div>

      {/* Dimension comparison */}
      <div className="scv-dims">
        <h3 className="scv-dims-title">Dimension alignment</h3>
        {DIMENSION_NAMES.map((name, i) => {
          const a = fieldA.natal[i] ?? 0;
          const b = fieldB.natal[i] ?? 0;
          const diff = Math.abs(a - b);
          const alignment = 1 - diff;
          return (
            <div key={name} className="scv-dim-row">
              <span className="scv-dim-name">{name}</span>
              <div className="scv-dim-bars">
                <div className="scv-dim-bar scv-dim-bar-a" style={{ width: `${a * 100}%` }} />
                <div className="scv-dim-bar scv-dim-bar-b" style={{ width: `${b * 100}%` }} />
              </div>
              <span className={`scv-dim-align ${alignment > 0.8 ? 'high' : alignment > 0.6 ? 'mid' : 'low'}`}>
                {Math.round(alignment * 100)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="scv-footer">
        <a href="/discover" className="scv-discover">Map your own soul field →</a>
      </div>

      <style>{`
        .scv-wrap {
          min-height: 100vh;
          background: #05060a;
          color: #cfd3ff;
          padding: 2rem 1rem;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .scv-resonance {
          max-width: 600px;
          margin: 0 auto 2.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .scv-resonance-score {
          font-size: 3rem;
          font-weight: 700;
          color: #d4a854;
          line-height: 1;
        }
        .scv-resonance-label {
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(207,211,255,0.8);
          letter-spacing: 0.06em;
        }
        .scv-resonance-desc {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: 1.05rem;
          color: rgba(207,211,255,0.55);
          line-height: 1.7;
          max-width: 480px;
          margin: 0.5rem 0 0;
        }
        .scv-share-btn {
          margin-top: 0.75rem;
          padding: 0.5rem 1.25rem;
          background: rgba(212,168,84,0.1);
          border: 1px solid rgba(212,168,84,0.3);
          border-radius: 8px;
          color: #d4a854;
          font-size: 0.8rem;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
        }
        .scv-share-btn:hover { background: rgba(212,168,84,0.18); }

        .scv-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto 2.5rem;
        }
        @media (max-width: 640px) {
          .scv-fields { grid-template-columns: 1fr; }
        }
        .scv-field {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .scv-field-label {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .scv-archetype {
          font-size: 0.95rem;
          font-style: italic;
          color: rgba(207,211,255,0.75);
        }
        .scv-birth {
          font-size: 0.75rem;
          color: rgba(207,211,255,0.35);
        }

        .scv-dims {
          max-width: 600px;
          margin: 0 auto 2.5rem;
          padding: 1.5rem;
          background: rgba(207,211,255,0.03);
          border: 1px solid rgba(207,211,255,0.06);
          border-radius: 16px;
        }
        .scv-dims-title {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(207,211,255,0.3);
          margin: 0 0 1rem;
        }
        .scv-dim-row {
          display: grid;
          grid-template-columns: 90px 1fr 42px;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.625rem;
        }
        .scv-dim-name {
          font-size: 0.78rem;
          color: rgba(207,211,255,0.5);
        }
        .scv-dim-bars {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .scv-dim-bar {
          height: 4px;
          border-radius: 2px;
          min-width: 2px;
          transition: width 0.8s ease-out;
        }
        .scv-dim-bar-a { background: rgba(212,168,84,0.6); }
        .scv-dim-bar-b { background: rgba(100,140,255,0.5); }
        .scv-dim-align {
          font-size: 0.75rem;
          text-align: right;
        }
        .scv-dim-align.high { color: #d4a854; }
        .scv-dim-align.mid  { color: rgba(207,211,255,0.5); }
        .scv-dim-align.low  { color: rgba(207,211,255,0.3); }

        .scv-footer {
          text-align: center;
          padding: 1rem;
        }
        .scv-discover {
          color: #d4a854;
          font-size: 0.875rem;
          text-decoration: none;
          opacity: 0.75;
          transition: opacity 0.2s;
        }
        .scv-discover:hover { opacity: 1; }
        .scv-center {
          min-height: 100vh;
          background: #05060a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .scv-spinner {
          width: 36px; height: 36px;
          border: 2px solid rgba(100,140,255,0.15);
          border-top-color: rgba(100,140,255,0.6);
          border-radius: 50%;
          animation: scv-spin 1s linear infinite;
        }
        @keyframes scv-spin { to { transform: rotate(360deg); } }
        .scv-hint, .scv-err { font-size: 0.875rem; color: rgba(207,211,255,0.4); margin: 0; }
        .scv-err-sub { font-size: 0.8rem; color: rgba(207,211,255,0.25); margin: 0; font-family: monospace; }
        .scv-cta {
          padding: 0.625rem 1.5rem;
          background: linear-gradient(135deg, #d4a854, #c49a4a);
          color: #0a0908;
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
          border-radius: 10px;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
