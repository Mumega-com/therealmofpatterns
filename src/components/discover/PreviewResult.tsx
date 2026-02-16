'use client';

import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';
import { ShareButtons } from '../shared/SocialShare';
import { RadarChart } from '../charts/RadarChart';
import { NatalWheel } from '../charts/NatalWheel';
import type { LocalPreviewResult, ArchetypeMatch } from '../../lib/preview-compute';
import type { BirthData } from '../../types';

interface PreviewResultProps {
  preview: LocalPreviewResult;
  archetype: ArchetypeMatch | null;
  archetypeLoading: boolean;
  onContinueToCheckin: () => void;
  birthData?: BirthData;
}

export function PreviewResult({ preview, archetype, archetypeLoading, onContinueToCheckin, birthData }: PreviewResultProps) {
  const mode = useStore($mode);

  const headers = {
    sol: 'Your Energy Profile',
    river: 'Your Birth Signature Revealed',
    kasra: 'NATAL_MATRIX_COMPUTED',
  };

  const ctaText = {
    sol: 'Go Deeper: 1-Min Check-in',
    river: 'Attune Your Pattern',
    kasra: 'BEGIN_CALIBRATION',
  };

  const ctaSub = {
    sol: "Compare today's energy with your birth pattern",
    river: 'Let the daily transit illuminate your path',
    kasra: 'Cross-reference transit vector with natal matrix',
  };

  return (
    <div className="preview-result">
      {/* Header */}
      <div className="preview-header">
        <span className="header-icon">
          {mode === 'kasra' ? '>' : mode === 'river' ? '~' : ''}
        </span>
        <h2 className="header-title">{headers[mode]}</h2>
        <p className="header-teaser">{preview.teaser}</p>
      </div>

      {/* Charts */}
      <div className="charts-section">
        <div className="charts-row">
          <div className="chart-card">
            <h3 className="section-label">
              {mode === 'kasra' ? '8D_VECTOR_OUTPUT' : mode === 'river' ? 'The Eight Resonances' : 'Your 8 Dimensions'}
            </h3>
            <RadarChart
              values={preview.vector}
              dominantIndex={preview.dominant.index}
              size={240}
            />
          </div>
          {birthData && (
            <div className="chart-card">
              <h3 className="section-label">
                {mode === 'kasra' ? 'NATAL_CHART' : mode === 'river' ? 'Your Birth Sky' : 'Your Birth Chart'}
              </h3>
              <NatalWheel
                birthData={birthData}
                size={240}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dimension Details */}
      <div className="dimensions-section">
        <div className="dimension-bars">
          {preview.dimensions.map((dim) => {
            const isDominant = dim.index === preview.dominant.index;
            return (
              <div key={dim.index} className={`dim-row ${isDominant ? 'dominant' : ''}`}>
                <div className="dim-label">
                  <span className="dim-symbol">{dim.symbol}</span>
                  <span className="dim-name">{dim.name}</span>
                </div>
                <div className="dim-bar-track">
                  <div
                    className="dim-bar-fill"
                    style={{ width: `${dim.value * 100}%` }}
                  />
                </div>
                <span className="dim-value">{(dim.value * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dominant Dimension Card */}
      <div className="dominant-card">
        <div className="dominant-symbol">{preview.dominant.symbol}</div>
        <div className="dominant-info">
          <h3>{preview.dominant.name}</h3>
          <p className="dominant-domain">{preview.dominant.domain}</p>
          <p className="dominant-desc">
            {mode === 'kasra'
              ? `Primary dimension at ${(preview.dominant.value * 100).toFixed(1)}% activation. Ruler: ${preview.dominant.ruler}.`
              : mode === 'river'
              ? `${preview.dominant.ruler} whispers through your ${preview.dominant.name.toLowerCase()} — this is the lens through which you meet the world.`
              : `Your strongest dimension! ${preview.dominant.name} shapes how you experience life.`}
          </p>
        </div>
      </div>

      {/* Archetype Match */}
      {archetypeLoading && (
        <div className="archetype-card loading">
          <div className="archetype-loading">
            {mode === 'kasra' ? 'SEARCHING_HISTORICAL_FIGURES...' : mode === 'river' ? 'Seeking your kindred spirit...' : 'Finding your match...'}
          </div>
        </div>
      )}
      {archetype && (
        <div className="archetype-card">
          <div className="archetype-header">
            <h3>
              {mode === 'kasra' ? 'ARCHETYPE_MATCH' : mode === 'river' ? 'Your Kindred Spirit' : 'You Match With'}
            </h3>
            <span className="resonance-badge">{(archetype.resonance * 100).toFixed(0)}% match</span>
          </div>
          <div className="archetype-body">
            <div className="archetype-name">{archetype.name}</div>
            <div className="archetype-era">{archetype.era}</div>
            {archetype.quote && (
              <blockquote className="archetype-quote">"{archetype.quote}"</blockquote>
            )}
          </div>
        </div>
      )}

      {/* Share */}
      <div className="share-section">
        <p className="share-label">
          {mode === 'kasra' ? 'SHARE_PATTERN_DATA' : mode === 'river' ? 'Share your birth signature' : 'Share your pattern'}
        </p>
        <ShareButtons
          content={{
            title: `I'm a ${preview.dominant.name} type${archetype ? ` with ${(archetype.resonance * 100).toFixed(0)}% match to ${archetype.name}` : ''}!`,
            description: `${preview.teaser} Discover yours at The Realm of Patterns.`,
            url: 'https://therealmofpatterns.com/discover',
            hashtags: ['RealmOfPatterns', preview.dominant.name],
          }}
          variant="inline"
        />
      </div>

      {/* CTA */}
      <div className="cta-section">
        <button className="cta-button" onClick={onContinueToCheckin}>
          {ctaText[mode]}
          <span className="cta-arrow">&rarr;</span>
        </button>
        <p className="cta-sub">{ctaSub[mode]}</p>
      </div>

      <style>{`
        .preview-result {
          max-width: 500px;
          margin: 0 auto;
          animation: fade-in 0.6s ease-out;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .preview-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .header-icon {
          font-size: 1rem;
          color: rgba(240, 232, 216, 0.4);
          font-family: 'Geist Mono', monospace;
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 400;
          color: #d4a854;
          margin: 0.5rem 0;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        [data-mode="kasra"] .header-title {
          font-family: 'Geist Mono', monospace;
          font-size: 1.25rem;
          color: #22d3ee;
        }

        .header-teaser {
          font-size: 0.95rem;
          color: rgba(240, 232, 216, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        /* Charts */
        .charts-section {
          margin-bottom: 2rem;
        }

        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .charts-row:has(> :only-child) {
          grid-template-columns: 1fr;
          max-width: 280px;
          margin: 0 auto;
        }

        .chart-card {
          text-align: center;
        }

        @media (max-width: 540px) {
          .charts-row {
            grid-template-columns: 1fr;
            max-width: 280px;
            margin: 0 auto;
          }
        }

        /* Dimensions */
        .dimensions-section {
          margin-bottom: 2rem;
        }

        .section-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(240, 232, 216, 0.4);
          margin-bottom: 1rem;
        }

        .dimension-bars {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .dim-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .dim-row.dominant {
          background: rgba(212, 168, 84, 0.08);
          margin: 0 -0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
        }

        .dim-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 120px;
        }

        .dim-symbol {
          font-size: 0.9rem;
          color: #d4a854;
          font-family: 'Geist Mono', monospace;
          width: 20px;
          text-align: center;
        }

        [data-mode="kasra"] .dim-symbol { color: #22d3ee; }
        [data-mode="river"] .dim-symbol { color: #a78bfa; }

        .dim-name {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.7);
        }

        .dim-bar-track {
          flex: 1;
          height: 6px;
          background: rgba(240, 232, 216, 0.08);
          border-radius: 3px;
          overflow: hidden;
        }

        .dim-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(212, 168, 84, 0.4), #d4a854);
          border-radius: 3px;
          transition: width 0.8s ease-out;
        }

        [data-mode="kasra"] .dim-bar-fill {
          background: linear-gradient(90deg, rgba(34, 211, 238, 0.4), #22d3ee);
        }

        [data-mode="river"] .dim-bar-fill {
          background: linear-gradient(90deg, rgba(167, 139, 250, 0.4), #a78bfa);
        }

        .dim-row.dominant .dim-bar-fill {
          box-shadow: 0 0 8px rgba(212, 168, 84, 0.3);
        }

        .dim-value {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.5);
          font-family: 'Geist Mono', monospace;
          min-width: 36px;
          text-align: right;
        }

        .dim-row.dominant .dim-value {
          color: #d4a854;
          font-weight: 600;
        }

        /* Dominant Card */
        .dominant-card {
          display: flex;
          gap: 1.25rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.1) 0%, rgba(147, 51, 234, 0.05) 100%);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        [data-mode="kasra"] .dominant-card {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%);
          border-color: rgba(34, 211, 238, 0.2);
        }

        [data-mode="river"] .dominant-card {
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%);
          border-color: rgba(167, 139, 250, 0.2);
        }

        .dominant-symbol {
          font-size: 2.5rem;
          color: #d4a854;
          font-family: 'Geist Mono', monospace;
          line-height: 1;
          flex-shrink: 0;
        }

        [data-mode="kasra"] .dominant-symbol { color: #22d3ee; }
        [data-mode="river"] .dominant-symbol { color: #a78bfa; }

        .dominant-info h3 {
          font-size: 1.1rem;
          color: #f0e8d8;
          margin: 0 0 0.25rem;
        }

        .dominant-domain {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.5);
          margin: 0 0 0.5rem;
        }

        .dominant-desc {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          line-height: 1.5;
          margin: 0;
        }

        /* Archetype Card */
        .archetype-card {
          padding: 1.25rem;
          background: rgba(10, 9, 8, 0.5);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .archetype-card.loading {
          text-align: center;
        }

        .archetype-loading {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.5);
          padding: 1rem 0;
          animation: pulse-text 1.5s ease-in-out infinite;
        }

        @keyframes pulse-text {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .archetype-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .archetype-header h3 {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(240, 232, 216, 0.4);
          margin: 0;
        }

        .resonance-badge {
          padding: 0.2rem 0.6rem;
          background: rgba(212, 168, 84, 0.15);
          border: 1px solid rgba(212, 168, 84, 0.3);
          border-radius: 12px;
          font-size: 0.8rem;
          color: #d4a854;
          font-family: 'Geist Mono', monospace;
        }

        .archetype-name {
          font-size: 1.25rem;
          color: #f0e8d8;
          font-family: 'Cormorant Garamond', Georgia, serif;
          margin-bottom: 0.25rem;
        }

        .archetype-era {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.4);
          margin-bottom: 0.75rem;
        }

        .archetype-quote {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.6);
          font-style: italic;
          line-height: 1.5;
          margin: 0;
          padding-left: 1rem;
          border-left: 2px solid rgba(212, 168, 84, 0.3);
        }

        /* Share */
        .share-section {
          margin-bottom: 2rem;
        }

        .share-label {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.5);
          margin-bottom: 0.75rem;
        }

        /* CTA */
        .cta-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #d4a854, #b8924a);
          border: none;
          border-radius: 12px;
          color: #0a0908;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 24px rgba(212, 168, 84, 0.3);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(212, 168, 84, 0.4);
        }

        [data-mode="kasra"] .cta-button {
          background: linear-gradient(135deg, #22d3ee, #06b6d4);
        }

        [data-mode="kasra"] .cta-button {
          box-shadow: 0 4px 24px rgba(34, 211, 238, 0.3);
        }

        [data-mode="river"] .cta-button {
          background: linear-gradient(135deg, #a78bfa, #8b5cf6);
          box-shadow: 0 4px 24px rgba(167, 139, 250, 0.3);
        }

        .cta-arrow {
          font-size: 1.2rem;
        }

        .cta-sub {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.5);
          margin-top: 0.75rem;
        }

        @media (max-width: 480px) {
          .dim-label {
            min-width: 90px;
          }

          .dim-name {
            font-size: 0.7rem;
          }

          .dominant-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .cta-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
