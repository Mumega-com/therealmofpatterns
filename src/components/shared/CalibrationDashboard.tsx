'use client';

import { useState, useEffect } from 'react';
import {
  getCalibrationStats,
  getCalibrationProfile,
  getDimensionInsights,
  getFeedbackHistory,
  type CalibrationStats,
  type CalibrationProfile,
} from '../../lib/prediction-calibration';

interface CalibrationDashboardProps {
  mode?: 'kasra' | 'river' | 'sol';
  compact?: boolean;
}

export function CalibrationDashboard({ mode = 'sol', compact = false }: CalibrationDashboardProps) {
  const [stats, setStats] = useState<CalibrationStats | null>(null);
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);
  const [insights, setInsights] = useState<ReturnType<typeof getDimensionInsights> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setStats(getCalibrationStats());
    setProfile(getCalibrationProfile());
    setInsights(getDimensionInsights());
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="calibration-dashboard loading">
        <div className="loading-pulse" />
        <style>{styles}</style>
      </div>
    );
  }

  if (!stats || stats.totalCheckins === 0) {
    return (
      <div className="calibration-dashboard empty">
        <div className="empty-state">
          <span className="empty-icon">
            {mode === 'kasra' ? '◇' : mode === 'river' ? '✧' : '○'}
          </span>
          <span className="empty-text">
            {mode === 'kasra' ? 'NO_CALIBRATION_DATA' :
             mode === 'river' ? 'The pattern awaits your first reflection' :
             'Complete check-ins to build your calibration profile'}
          </span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  const content = {
    kasra: {
      title: 'CALIBRATION_METRICS',
      checkins: 'DATA_POINTS',
      accuracy: 'ACCURACY',
      trend: 'TREND',
      quality: 'CALIBRATION_STATUS',
      sensitive: 'HIGH_SENSITIVITY',
      resistant: 'LOW_SENSITIVITY',
    },
    river: {
      title: 'Pattern Attunement',
      checkins: 'Reflections',
      accuracy: 'Oracle Clarity',
      trend: 'Journey',
      quality: 'Resonance Depth',
      sensitive: 'Soul Responds To',
      resistant: 'Soul Rests From',
    },
    sol: {
      title: 'How Well We Know You',
      checkins: 'Check-ins',
      accuracy: 'Accuracy',
      trend: 'Trend',
      quality: 'Calibration',
      sensitive: 'You Feel Most',
      resistant: 'You Feel Least',
    },
  }[mode];

  const qualityLabels = {
    kasra: {
      excellent: 'OPTIMIZED',
      good: 'STABLE',
      learning: 'CALIBRATING',
      insufficient: 'INSUFFICIENT_DATA',
    },
    river: {
      excellent: 'Deeply Attuned',
      good: 'Resonating Well',
      learning: 'Still Awakening',
      insufficient: 'Awaiting Patterns',
    },
    sol: {
      excellent: 'Excellent',
      good: 'Good',
      learning: 'Learning',
      insufficient: 'Need More Data',
    },
  }[mode];

  const trendLabels = {
    kasra: { improving: 'IMPROVING ↑', stable: 'STABLE →', declining: 'DECLINING ↓' },
    river: { improving: 'Ascending', stable: 'Flowing', declining: 'Descending' },
    sol: { improving: 'Getting better!', stable: 'Steady', declining: 'Needs attention' },
  }[mode];

  if (compact) {
    return (
      <div className="calibration-dashboard compact">
        <div className="compact-row">
          <span className="compact-label">{content.accuracy}:</span>
          <span className="compact-value">{Math.round(stats.averageAccuracy)}%</span>
          <span className={`compact-quality ${stats.calibrationQuality}`}>
            {qualityLabels[stats.calibrationQuality]}
          </span>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`calibration-dashboard ${mode}`}>
      <div className="dashboard-header">
        <h3 className="dashboard-title">{content.title}</h3>
        {stats.trend === 'improving' && (
          <span className="trend-badge improving">
            {mode === 'kasra' ? '↑' : mode === 'river' ? '✧' : '🎯'}
          </span>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-value">{stats.totalCheckins}</span>
          <span className="metric-label">{content.checkins}</span>
        </div>

        <div className="metric-card highlight">
          <span className="metric-value">{Math.round(stats.averageAccuracy)}%</span>
          <span className="metric-label">{content.accuracy}</span>
        </div>

        <div className="metric-card">
          <span className={`metric-value trend-${stats.trend}`}>
            {trendLabels[stats.trend]}
          </span>
          <span className="metric-label">{content.trend}</span>
        </div>

        <div className="metric-card">
          <span className={`metric-value quality-${stats.calibrationQuality}`}>
            {qualityLabels[stats.calibrationQuality]}
          </span>
          <span className="metric-label">{content.quality}</span>
        </div>
      </div>

      {insights && (insights.mostSensitive || insights.leastSensitive) && (
        <div className="insights-section">
          <div className="insights-header">
            {mode === 'kasra' ? 'DIMENSION_ANALYSIS' :
             mode === 'river' ? 'Soul Affinities' :
             'What affects you most'}
          </div>

          <div className="insights-grid">
            {insights.mostSensitive && (
              <div className="insight-card sensitive">
                <span className="insight-label">{content.sensitive}</span>
                <span className="insight-value">{insights.mostSensitive.name}</span>
                <span className="insight-detail">
                  {mode === 'kasra'
                    ? `${((insights.mostSensitive.sensitivity - 1) * 100).toFixed(0)}% above baseline`
                    : mode === 'river'
                    ? 'Your soul opens here'
                    : `${Math.round(insights.mostSensitive.sensitivity * 100)}% sensitivity`}
                </span>
              </div>
            )}

            {insights.leastSensitive && (
              <div className="insight-card resistant">
                <span className="insight-label">{content.resistant}</span>
                <span className="insight-value">{insights.leastSensitive.name}</span>
                <span className="insight-detail">
                  {mode === 'kasra'
                    ? `${((1 - insights.leastSensitive.sensitivity) * 100).toFixed(0)}% below baseline`
                    : mode === 'river'
                    ? 'Your soul shields here'
                    : `${Math.round(insights.leastSensitive.sensitivity * 100)}% sensitivity`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {stats.bestDay && (
        <div className="best-day">
          <span className="best-day-label">
            {mode === 'kasra' ? 'PEAK_ACCURACY:' :
             mode === 'river' ? 'Clearest Vision:' :
             'Best prediction:'}
          </span>
          <span className="best-day-value">
            {Math.round(stats.bestDay.accuracy)}% on {stats.bestDay.date}
          </span>
        </div>
      )}

      {profile && profile.sampleCount >= 7 && (
        <div className="calibration-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(profile.sampleCount / 30 * 100, 100)}%` }}
            />
          </div>
          <span className="progress-label">
            {profile.sampleCount < 14
              ? mode === 'kasra' ? 'CALIBRATING...' : mode === 'river' ? 'Learning your rhythms...' : 'Building your profile...'
              : profile.sampleCount < 30
              ? mode === 'kasra' ? 'APPROACHING_OPTIMAL' : mode === 'river' ? 'Patterns emerging...' : 'Getting accurate...'
              : mode === 'kasra' ? 'FULLY_CALIBRATED' : mode === 'river' ? 'Deeply attuned' : 'Fully calibrated!'}
          </span>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .calibration-dashboard {
    background: rgba(26, 26, 26, 0.8);
    border: 1px solid rgba(212, 168, 84, 0.2);
    border-radius: 16px;
    padding: 1.5rem;
  }

  .calibration-dashboard.loading,
  .calibration-dashboard.empty {
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-pulse {
    width: 40px;
    height: 40px;
    border: 2px solid rgba(212, 168, 84, 0.2);
    border-top-color: #d4a854;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: rgba(240, 232, 216, 0.4);
  }

  .empty-icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 0.85rem;
    text-align: center;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .dashboard-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #f0e8d8;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .trend-badge {
    font-size: 1rem;
  }

  .trend-badge.improving {
    color: #22c55e;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .metric-card {
    background: rgba(240, 232, 216, 0.03);
    border: 1px solid rgba(240, 232, 216, 0.08);
    border-radius: 10px;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .metric-card.highlight {
    border-color: rgba(212, 168, 84, 0.3);
    background: rgba(212, 168, 84, 0.08);
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f0e8d8;
  }

  .metric-label {
    font-size: 0.7rem;
    color: rgba(240, 232, 216, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .metric-value.trend-improving { color: #22c55e; }
  .metric-value.trend-declining { color: #f87171; }
  .metric-value.quality-excellent { color: #22c55e; }
  .metric-value.quality-good { color: #d4a854; }
  .metric-value.quality-learning { color: #fbbf24; }
  .metric-value.quality-insufficient { color: rgba(240, 232, 216, 0.4); }

  .insights-section {
    margin-bottom: 1.25rem;
  }

  .insights-header {
    font-size: 0.75rem;
    color: rgba(240, 232, 216, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  .insights-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .insight-card {
    background: rgba(240, 232, 216, 0.03);
    border-radius: 10px;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .insight-card.sensitive {
    border-left: 3px solid #22c55e;
  }

  .insight-card.resistant {
    border-left: 3px solid #64748b;
  }

  .insight-label {
    font-size: 0.65rem;
    color: rgba(240, 232, 216, 0.4);
    text-transform: uppercase;
  }

  .insight-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #f0e8d8;
  }

  .insight-detail {
    font-size: 0.7rem;
    color: rgba(240, 232, 216, 0.5);
  }

  .best-day {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: rgba(240, 232, 216, 0.6);
    margin-bottom: 1rem;
  }

  .best-day-label {
    color: rgba(240, 232, 216, 0.4);
  }

  .best-day-value {
    color: #d4a854;
  }

  .calibration-progress {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-bar {
    height: 4px;
    background: rgba(240, 232, 216, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #d4a854, #22c55e);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .progress-label {
    font-size: 0.7rem;
    color: rgba(240, 232, 216, 0.5);
    text-align: center;
  }

  /* Compact mode */
  .calibration-dashboard.compact {
    padding: 0.75rem 1rem;
    border-radius: 8px;
  }

  .compact-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .compact-label {
    font-size: 0.75rem;
    color: rgba(240, 232, 216, 0.5);
  }

  .compact-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: #f0e8d8;
  }

  .compact-quality {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    margin-left: auto;
  }

  .compact-quality.excellent { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
  .compact-quality.good { background: rgba(212, 168, 84, 0.15); color: #d4a854; }
  .compact-quality.learning { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
  .compact-quality.insufficient { background: rgba(240, 232, 216, 0.08); color: rgba(240, 232, 216, 0.4); }

  /* Mode-specific styling */
  .calibration-dashboard.kasra {
    border-color: rgba(34, 211, 238, 0.2);
  }

  .calibration-dashboard.kasra .dashboard-title {
    color: #22d3ee;
  }

  .calibration-dashboard.kasra .metric-card.highlight {
    border-color: rgba(34, 211, 238, 0.3);
    background: rgba(34, 211, 238, 0.08);
  }

  .calibration-dashboard.kasra .best-day-value,
  .calibration-dashboard.kasra .progress-fill {
    background: linear-gradient(90deg, #22d3ee, #22c55e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .calibration-dashboard.kasra .progress-fill {
    background: linear-gradient(90deg, #22d3ee, #22c55e);
    -webkit-text-fill-color: unset;
  }

  .calibration-dashboard.river {
    border-color: rgba(167, 139, 250, 0.2);
  }

  .calibration-dashboard.river .dashboard-title {
    color: #a78bfa;
  }

  .calibration-dashboard.river .metric-card.highlight {
    border-color: rgba(167, 139, 250, 0.3);
    background: rgba(167, 139, 250, 0.08);
  }

  .calibration-dashboard.river .best-day-value {
    color: #a78bfa;
  }

  .calibration-dashboard.river .progress-fill {
    background: linear-gradient(90deg, #a78bfa, #22c55e);
  }
`;

export default CalibrationDashboard;
