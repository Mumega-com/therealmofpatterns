'use client';

import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';
import { ShareButtons } from '../shared/SocialShare';
import { EmailCapture } from '../shared/EmailCapture';
import { RadarChart } from '../charts/RadarChart';
import { NatalWheel } from '../charts/NatalWheel';
import { assignArchetype } from '../../lib/archetype-engine';
import { startJourney } from '../../lib/journey-engine';
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

      {/* Hero's Journey Archetype */}
      {mode === 'sol' && (() => {
        const result = assignArchetype(preview.vector);
        startJourney();
        return (
          <div className="journey-card">
            <div className="journey-card-header">
              <h3 className="journey-card-label">Your Archetype</h3>
              <a href="/journey" className="journey-link">View your journey →</a>
            </div>
            <div className="journey-card-body">
              <span className="journey-archetype-name">{result.primary.title}</span>
              <p className="journey-archetype-gift">{result.primary.gift}</p>
              <p className="journey-archetype-quest">
                <span className="quest-label">Your quest:</span> {result.primary.quest}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Email Capture */}
      <div className="email-section">
        <EmailCapture
          variant="inline"
          headline="Get your daily reading"
          subheadline="Your pattern changes daily — stay in tune. We'll send a personalized energy forecast each morning."
          className="discover-email"
        />
        <p className="email-disclaimer">No spam. Unsubscribe anytime.</p>
      </div>

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
        <a href="/dashboard" className="cta-button dashboard-btn">
          {mode === 'kasra' ? 'VIEW_DASHBOARD' : mode === 'river' ? 'Enter Your Sanctuary' : 'Go to Dashboard'}
          <span className="cta-arrow">&rarr;</span>
        </a>
        <p className="cta-sub-alt">
          <button className="cta-link" onClick={onContinueToCheckin}>
            {ctaText[mode]}
          </button>
          <span className="cta-divider">&bull;</span>
          <a href="/reading" className="cta-link">Daily Reading</a>
          <span className="cta-divider">&bull;</span>
          <a href="/journey" className="cta-link">Journey Map</a>
        </p>
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

        /* Journey Card */
        .journey-card {
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.08), rgba(167, 139, 250, 0.05));
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }
        .journey-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .journey-card-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(240, 232, 216, 0.4);
          margin: 0;
        }
        .journey-link {
          font-size: 0.8rem;
          color: #d4a854;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .journey-link:hover { opacity: 0.7; }
        .journey-archetype-name {
          display: block;
          font-size: 1.3rem;
          color: #d4a854;
          font-family: 'Cormorant Garamond', Georgia, serif;
          margin-bottom: 0.5rem;
        }
        .journey-archetype-gift {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          line-height: 1.5;
          margin: 0 0 0.5rem;
        }
        .journey-archetype-quest {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.5);
          margin: 0;
          font-style: italic;
        }
        .quest-label {
          color: rgba(212, 168, 84, 0.6);
          font-style: normal;
        }

        /* Email Capture */
        .email-section {
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.06), rgba(167, 139, 250, 0.03));
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }
        .email-section .discover-email p {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.6);
          margin-bottom: 0.75rem;
        }
        .email-section .discover-email .flex {
          display: flex;
        }
        .email-section .discover-email .gap-2 {
          gap: 0.5rem;
        }
        .email-section .discover-email .mb-2 {
          margin-bottom: 0.5rem;
        }
        .email-section .discover-email .input {
          flex: 1;
          padding: 0.6rem 0.75rem;
          background: rgba(10, 9, 8, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 8px;
          color: #f0e8d8;
          font-size: 0.9rem;
          outline: none;
        }
        .email-section .discover-email .input:focus {
          border-color: rgba(212, 168, 84, 0.5);
        }
        .email-section .discover-email .btn-primary {
          padding: 0.6rem 1.25rem;
          background: linear-gradient(135deg, #d4a854, #b8924a);
          border: none;
          border-radius: 8px;
          color: #0a0908;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .email-section .discover-email .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(212, 168, 84, 0.3);
        }
        .email-disclaimer {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.3);
          text-align: center;
          margin: 0.75rem 0 0;
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

        .dashboard-btn {
          text-decoration: none;
        }

        .cta-sub-alt {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .cta-link {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.5);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.2s;
          font-family: inherit;
          padding: 0;
        }

        .cta-link:hover {
          color: #d4a854;
        }

        .cta-divider {
          color: rgba(240, 232, 216, 0.2);
          font-size: 0.75rem;
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
