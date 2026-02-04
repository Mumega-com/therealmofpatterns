'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';
import {
  computePersonalPrediction,
  hasPersonalizedData,
  type PersonalPrediction,
} from '../../lib/personal-transit';

interface PredictionCardProps {
  /** Called when user starts check-in after seeing prediction */
  onStartCheckin?: () => void;
  /** Show in compact mode (for inline display) */
  compact?: boolean;
}

/**
 * PredictionCard - Shows personalized prediction BEFORE check-in
 *
 * This creates the feedback loop:
 * 1. User sees prediction
 * 2. User does check-in
 * 3. System compares predicted vs actual
 * 4. System learns and improves
 */
export function PredictionCard({ onStartCheckin, compact = false }: PredictionCardProps) {
  const mode = useStore($mode);
  const [prediction, setPrediction] = useState<PersonalPrediction | null>(null);
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    // Check if user has birth data
    const hasPersonalized = hasPersonalizedData();
    setHasData(hasPersonalized);

    if (hasPersonalized) {
      const pred = computePersonalPrediction();
      setPrediction(pred);

      // Store prediction for later comparison
      if (pred) {
        localStorage.setItem(
          'rop_today_prediction',
          JSON.stringify({
            ...pred,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0],
          })
        );
      }
    }

    setIsLoading(false);
  }, []);

  // Mode-specific content
  const defaultContent = {
    title: "Today's Forecast",
    subtitle: "Here's what we predict for you today",
    predictedLabel: 'Expected Energy',
    confidenceLabel: 'Confidence',
    windowsTitle: 'Best Times Today',
    startBtn: 'Start Check-in',
    noBirthData: 'Add Birthday for Personal Forecasts',
    noBirthDataDesc: "Once you add your birthday, we'll give you personalized predictions",
  };

  const modeContent: Record<string, typeof defaultContent> = {
    kasra: {
      title: 'DAILY_FORECAST',
      subtitle: 'System prediction based on natal-transit resonance',
      predictedLabel: 'PREDICTED_KAPPA',
      confidenceLabel: 'CONFIDENCE',
      windowsTitle: 'OPTIMAL_WINDOWS',
      startBtn: 'BEGIN_CHECK_IN',
      noBirthData: 'NATAL_DATA_REQUIRED',
      noBirthDataDesc: 'Add birth parameters to enable personalized predictions',
    },
    river: {
      title: "Today's Oracle",
      subtitle: 'What the stars whisper for your journey',
      predictedLabel: 'Expected Resonance',
      confidenceLabel: 'Clarity',
      windowsTitle: 'Sacred Windows',
      startBtn: 'Begin Check-in',
      noBirthData: 'Birth Signature Awaited',
      noBirthDataDesc: 'Share your birth moment to receive personalized guidance',
    },
    sol: defaultContent,
  };

  const content = modeContent[mode] || defaultContent;

  if (isLoading) {
    return (
      <div className={`prediction-card loading ${compact ? 'compact' : ''}`}>
        <div className="loading-pulse" />
        <style>{styles}</style>
      </div>
    );
  }

  // No birth data - show teaser
  if (!hasData) {
    return (
      <div className={`prediction-card no-data ${compact ? 'compact' : ''}`}>
        <div className="no-data-content">
          <span className="icon">
            {mode === 'kasra' ? '⌘' : mode === 'river' ? '✧' : '✨'}
          </span>
          <div className="text">
            <h4>{content.noBirthData}</h4>
            <p>{content.noBirthDataDesc}</p>
          </div>
        </div>
        {onStartCheckin && (
          <button className="start-btn" onClick={onStartCheckin}>
            {content.startBtn}
          </button>
        )}
        <style>{styles}</style>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const kappaPercent = Math.round(prediction.predictedKappa * 100);
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div className={`prediction-card ${compact ? 'compact' : ''}`}>
      <div className="card-header">
        <div className="header-text">
          <h3>{content.title}</h3>
          {!compact && <p>{content.subtitle}</p>}
        </div>
        <div className="confidence-badge">
          {mode === 'kasra' ? `${confidencePercent}%` : `${confidencePercent}% sure`}
        </div>
      </div>

      <div className="prediction-main">
        <div className="kappa-display">
          <div className="kappa-ring" style={{ '--kappa': kappaPercent } as React.CSSProperties}>
            <svg viewBox="0 0 100 100">
              <circle className="ring-bg" cx="50" cy="50" r="45" />
              <circle
                className="ring-fill"
                cx="50"
                cy="50"
                r="45"
                strokeDasharray={`${kappaPercent * 2.83} 283`}
              />
            </svg>
            <div className="kappa-value">
              <span className="number">{kappaPercent}</span>
              <span className="unit">%</span>
            </div>
          </div>
          <div className="kappa-label">{content.predictedLabel}</div>
        </div>

        <div className="prediction-details">
          {/* Dominant transit */}
          <div className="detail-item">
            <span className="detail-label">
              {mode === 'kasra' ? 'DOMINANT_TRANSIT' : mode === 'river' ? 'Primary Energy' : 'Main Influence'}
            </span>
            <span className={`detail-value effect-${prediction.dominantTransit.effect}`}>
              {prediction.dominantTransit.symbol} {prediction.dominantTransit.name}
            </span>
          </div>

          {/* Warnings */}
          {prediction.warnings.length > 0 && (
            <div className="detail-item warning">
              <span className="detail-label">
                {mode === 'kasra' ? 'ALERTS' : mode === 'river' ? 'Cautions' : 'Heads Up'}
              </span>
              {prediction.warnings.map((w, i) => (
                <span key={i} className="detail-value">{w}</span>
              ))}
            </div>
          )}

          {/* Opportunities */}
          {prediction.opportunities.length > 0 && (
            <div className="detail-item opportunity">
              <span className="detail-label">
                {mode === 'kasra' ? 'OPPORTUNITIES' : mode === 'river' ? 'Openings' : 'Good For'}
              </span>
              {prediction.opportunities.map((o, i) => (
                <span key={i} className="detail-value">{o}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Optimal Windows */}
      {!compact && prediction.optimalWindows.length > 0 && (
        <div className="windows-section">
          <h4>{content.windowsTitle}</h4>
          <div className="windows-list">
            {prediction.optimalWindows.map((window, i) => (
              <div key={i} className="window-item">
                <span className="window-time">{window.start} - {window.end}</span>
                <span className="window-activity">
                  {activityLabel(window.activity, mode)}
                </span>
                <span className="window-quality" style={{ '--quality': window.quality } as React.CSSProperties}>
                  {Math.round(window.quality * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="card-footer">
        <p className="footer-text">
          {mode === 'kasra'
            ? "Let's see if this matches your experience"
            : mode === 'river'
            ? 'How does this resonate with your felt sense?'
            : "Let's check how you're actually feeling"}
        </p>
        {onStartCheckin && (
          <button className="start-btn" onClick={onStartCheckin}>
            {content.startBtn}
          </button>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

function activityLabel(activity: string, mode: string): string {
  const labels: Record<string, Record<string, string>> = {
    focused_work: { kasra: 'DEEP_WORK', river: 'Concentrated creation', sol: 'Focus time' },
    creative: { kasra: 'CREATIVE_OPS', river: 'Creative flow', sol: 'Creative work' },
    social: { kasra: 'SOCIAL_PROTOCOLS', river: 'Heart connections', sol: 'Social time' },
    rest: { kasra: 'RECOVERY_MODE', river: 'Sacred rest', sol: 'Rest & recharge' },
    important_decisions: { kasra: 'CRITICAL_DECISIONS', river: 'Weighty choices', sol: 'Big decisions' },
  };
  return labels[activity]?.[mode] || activity;
}

const styles = `
  .prediction-card {
    background: linear-gradient(135deg, rgba(212, 168, 84, 0.08) 0%, rgba(147, 51, 234, 0.04) 100%);
    border: 1px solid rgba(212, 168, 84, 0.2);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .prediction-card.compact {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .prediction-card.loading {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-pulse {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(212, 168, 84, 0.3);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 1; }
  }

  /* Header */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .header-text h3 {
    font-size: 1.1rem;
    font-weight: 500;
    color: #f0e8d8;
    margin: 0 0 0.25rem;
  }

  .header-text p {
    font-size: 0.85rem;
    color: rgba(240, 232, 216, 0.5);
    margin: 0;
  }

  .confidence-badge {
    padding: 0.25rem 0.6rem;
    background: rgba(212, 168, 84, 0.15);
    border-radius: 100px;
    font-size: 0.75rem;
    color: #d4a854;
  }

  /* Main prediction area */
  .prediction-main {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.25rem;
  }

  .compact .prediction-main {
    gap: 1rem;
    margin-bottom: 1rem;
  }

  /* Kappa ring */
  .kappa-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .kappa-ring {
    position: relative;
    width: 100px;
    height: 100px;
  }

  .compact .kappa-ring {
    width: 70px;
    height: 70px;
  }

  .kappa-ring svg {
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(212, 168, 84, 0.1);
    stroke-width: 8;
  }

  .ring-fill {
    fill: none;
    stroke: #d4a854;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dasharray 1s ease-out;
  }

  .kappa-value {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .kappa-value .number {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f0e8d8;
  }

  .compact .kappa-value .number {
    font-size: 1.2rem;
  }

  .kappa-value .unit {
    font-size: 0.9rem;
    color: rgba(240, 232, 216, 0.5);
  }

  .kappa-label {
    font-size: 0.75rem;
    color: rgba(240, 232, 216, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Details */
  .prediction-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .detail-label {
    font-size: 0.7rem;
    color: rgba(240, 232, 216, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    font-size: 0.9rem;
    color: #f0e8d8;
  }

  .detail-value.effect-amplify {
    color: #22c55e;
  }

  .detail-value.effect-challenge {
    color: #f59e0b;
  }

  .detail-item.warning .detail-value {
    color: #f59e0b;
    font-size: 0.85rem;
  }

  .detail-item.opportunity .detail-value {
    color: #22c55e;
    font-size: 0.85rem;
  }

  /* Windows */
  .windows-section {
    border-top: 1px solid rgba(212, 168, 84, 0.1);
    padding-top: 1rem;
    margin-bottom: 1rem;
  }

  .windows-section h4 {
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(240, 232, 216, 0.6);
    margin: 0 0 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .windows-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .window-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(10, 9, 8, 0.3);
    border-radius: 8px;
  }

  .window-time {
    font-size: 0.85rem;
    color: #d4a854;
    font-family: monospace;
    min-width: 100px;
  }

  .window-activity {
    flex: 1;
    font-size: 0.85rem;
    color: #f0e8d8;
  }

  .window-quality {
    font-size: 0.8rem;
    color: rgba(240, 232, 216, 0.5);
  }

  /* Footer */
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-top: 1px solid rgba(212, 168, 84, 0.1);
    padding-top: 1rem;
  }

  .footer-text {
    font-size: 0.9rem;
    color: rgba(240, 232, 216, 0.6);
    margin: 0;
    font-style: italic;
  }

  .start-btn {
    padding: 0.6rem 1.25rem;
    background: rgba(212, 168, 84, 0.2);
    border: 1px solid rgba(212, 168, 84, 0.3);
    border-radius: 8px;
    color: #d4a854;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .start-btn:hover {
    background: rgba(212, 168, 84, 0.3);
    border-color: #d4a854;
  }

  /* No data state */
  .no-data-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .no-data-content .icon {
    font-size: 1.5rem;
    color: rgba(212, 168, 84, 0.5);
  }

  .no-data-content .text h4 {
    font-size: 1rem;
    color: #f0e8d8;
    margin: 0 0 0.25rem;
  }

  .no-data-content .text p {
    font-size: 0.85rem;
    color: rgba(240, 232, 216, 0.5);
    margin: 0;
  }

  /* Mode-specific colors */
  [data-mode="kasra"] .prediction-card {
    border-color: rgba(34, 211, 238, 0.2);
    background: linear-gradient(135deg, rgba(34, 211, 238, 0.06) 0%, rgba(6, 182, 212, 0.02) 100%);
  }

  [data-mode="kasra"] .ring-fill {
    stroke: #22d3ee;
  }

  [data-mode="kasra"] .confidence-badge,
  [data-mode="kasra"] .window-time,
  [data-mode="kasra"] .start-btn {
    color: #22d3ee;
  }

  [data-mode="kasra"] .start-btn {
    background: rgba(34, 211, 238, 0.15);
    border-color: rgba(34, 211, 238, 0.3);
  }

  [data-mode="river"] .prediction-card {
    border-color: rgba(167, 139, 250, 0.2);
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.06) 0%, rgba(139, 92, 246, 0.02) 100%);
  }

  [data-mode="river"] .ring-fill {
    stroke: #a78bfa;
  }

  [data-mode="river"] .confidence-badge,
  [data-mode="river"] .window-time,
  [data-mode="river"] .start-btn {
    color: #a78bfa;
  }

  [data-mode="river"] .start-btn {
    background: rgba(167, 139, 250, 0.15);
    border-color: rgba(167, 139, 250, 0.3);
  }

  @media (max-width: 480px) {
    .prediction-main {
      flex-direction: column;
      align-items: center;
    }

    .card-footer {
      flex-direction: column;
      text-align: center;
    }

    .footer-text {
      order: 2;
    }

    .start-btn {
      order: 1;
      width: 100%;
    }
  }
`;
