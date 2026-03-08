'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { $mode, $forecast, updateForecast, setFailureMode } from '../../stores';
import { saveCheckin, getCheckinHistory } from '../../lib/checkin-storage';
import { fetchNarrative } from '../../lib/narrator-client';
import { BirthDataPrompt } from '../shared/BirthDataPrompt';
import { PredictionCard } from '../shared/PredictionCard';
import { hasPersonalizedData, getNatal16D, getTodayTransit16D } from '../../lib/personal-transit';
import { storeFeedback, getCalibrationStats } from '../../lib/prediction-calibration';

// ============================================
// Types
// ============================================

interface Question {
  id: string;
  kasra: string;
  river: string;
  sol: string;
  dimension: 'coherence' | 'energy' | 'focus' | 'embodiment';
  weight: number;
}

interface CheckinResults {
  kappa: number;
  scores: Record<string, number>;
  failureMode: 'healthy' | 'collapse' | 'inversion' | 'dissociation' | 'dispersion';
  timestamp: string;
  streak: number;
}

interface CheckinFlowEnhancedProps {
  onComplete?: (results: CheckinResults) => void;
  className?: string;
}

// ============================================
// Questions Data
// ============================================

const QUESTIONS: Question[] = [
  {
    id: 'clarity',
    kasra: 'RATE_MENTAL_CLARITY_CURRENT',
    river: 'How clear is your inner mirror right now?',
    sol: 'How clear does your mind feel?',
    dimension: 'coherence',
    weight: 1.2,
  },
  {
    id: 'energy',
    kasra: 'ENERGY_LEVEL_STATUS',
    river: 'What does your vital fire tell you today?',
    sol: 'How is your energy level?',
    dimension: 'energy',
    weight: 1.0,
  },
  {
    id: 'focus',
    kasra: 'FOCUS_CALIBRATION_INDEX',
    river: 'Can you hold a single flame without flickering?',
    sol: 'How focused do you feel?',
    dimension: 'focus',
    weight: 1.1,
  },
  {
    id: 'embodiment',
    kasra: 'EMBODIMENT_SENSOR_READING',
    river: 'How present are you in your vessel?',
    sol: 'How connected do you feel to your body?',
    dimension: 'embodiment',
    weight: 0.8,
  },
  {
    id: 'direction',
    kasra: 'DIRECTION_VECTOR_STRENGTH',
    river: 'Does the path ahead shimmer or fade?',
    sol: 'How clear is your sense of direction today?',
    dimension: 'coherence',
    weight: 1.0,
  },
  {
    id: 'alignment',
    kasra: 'ALIGNMENT_INTEGRITY_CHECK',
    river: 'Are your actions weaving true to your soul thread?',
    sol: 'How aligned do your actions feel with your values?',
    dimension: 'coherence',
    weight: 1.3,
  },
];

// ============================================
// Mode-specific Labels
// ============================================

const LABELS = {
  kasra: {
    low: 'CRITICAL',
    mid: 'NOMINAL',
    high: 'OPTIMAL',
    progress: 'ASSESSMENT_PROGRESS',
    skip: '[SKIP_USE_NEUTRAL]',
    complete: 'CALIBRATION_COMPLETE',
    kappa: 'κ_COEFFICIENT',
    coherence: 'FIELD_COHERENCE',
    retry: '[RECALIBRATE]',
    dashboard: '[VIEW_METRICS]',
    celebration: 'DATA_SYNCHRONIZED',
  },
  river: {
    low: 'Dim',
    mid: 'Steady',
    high: 'Bright',
    progress: 'Journey Progress',
    skip: 'Pass through neutral...',
    complete: 'Attunement Complete',
    kappa: 'κ (Soul Coherence)',
    coherence: 'Field Resonance',
    retry: 'Attune Again',
    dashboard: 'View Your Pattern',
    celebration: 'The pattern recognizes you',
  },
  sol: {
    low: 'Withdrawn',
    mid: 'Present',
    high: 'Coherent',
    progress: 'Field Reflection',
    skip: 'Pass through neutral',
    complete: 'The field is read',
    kappa: 'Field Coherence',
    coherence: 'Alignment with the current',
    retry: 'Reflect again',
    dashboard: 'Return to Sol',
    celebration: 'The field has been witnessed',
  },
};

// ============================================
// Main Component
// ============================================

export function CheckinFlowEnhanced({ onComplete, className = '' }: CheckinFlowEnhancedProps) {
  const mode = useStore($mode);
  const labels = LABELS[mode];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<CheckinResults | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPrediction, setShowPrediction] = useState(true);
  const [hasBirthData, setHasBirthData] = useState(false);

  // Check for birth data on mount
  useEffect(() => {
    setHasBirthData(hasPersonalizedData());
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentQuestion = QUESTIONS[currentIndex];
  const progress = (currentIndex / QUESTIONS.length) * 100;

  // Haptic feedback simulation
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy') => {
    if ('vibrate' in navigator) {
      const patterns = { light: [10], medium: [20], heavy: [30, 10, 30] };
      navigator.vibrate(patterns[intensity]);
    }
  }, []);

  // Handle score selection
  const handleScore = useCallback((score: number) => {
    setSelectedScore(score);
    triggerHaptic('medium');

    // Animate selection
    setTimeout(() => {
      const newScores = { ...scores, [currentQuestion.id]: score };
      setScores(newScores);

      if (currentIndex < QUESTIONS.length - 1) {
        // Transition to next question
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
          setSelectedScore(null);
          setIsTransitioning(false);
        }, 400);
      } else {
        // Complete check-in
        const calculatedResults = calculateResults(newScores);
        setResults(calculatedResults);
        setShowCelebration(true);
        triggerHaptic('heavy');

        // Show celebration, then results
        setTimeout(() => {
          setShowCelebration(false);
          setIsComplete(true);
        }, 2000);

        // Update global store
        updateForecast({
          kappa: calculatedResults.kappa,
          computedAt: calculatedResults.timestamp,
        });
        setFailureMode(calculatedResults.failureMode, calculatedResults.kappa < 0.3 ? 0.7 : 0.3);

        // Save to localStorage
        saveCheckin(calculatedResults.scores, calculatedResults.kappa, mode);

        onComplete?.(calculatedResults);
      }
    }, 200);
  }, [scores, currentIndex, currentQuestion, mode, triggerHaptic, onComplete]);

  // Reset handler
  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setScores({});
    setIsComplete(false);
    setResults(null);
    setSelectedScore(null);
    setShowCelebration(false);
  }, []);

  // Get question text for current mode
  const questionText = currentQuestion?.[mode] || currentQuestion?.sol;

  // Celebration overlay
  if (showCelebration) {
    return (
      <CelebrationOverlay mode={mode} kappa={results?.kappa || 0} label={labels.celebration} />
    );
  }

  // Results view
  if (isComplete && results) {
    return (
      <ResultsView
        mode={mode}
        results={results}
        labels={labels}
        onReset={handleReset}
        className={className}
        hasBirthData={hasBirthData}
        onBirthDataComplete={() => setHasBirthData(true)}
      />
    );
  }

  // Pre-check-in prediction view (only if user has birth data)
  if (showPrediction && hasBirthData) {
    return (
      <div className={`checkin-flow checkin-flow--${mode} ${className}`}>
        <PredictionCard onStartCheckin={() => setShowPrediction(false)} />
        <style>{getStyles(mode)}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`checkin-flow checkin-flow--${mode} ${className}`}
    >
      {/* Progress Indicator */}
      <ProgressIndicator
        mode={mode}
        current={currentIndex}
        total={QUESTIONS.length}
        progress={progress}
        label={labels.progress}
      />

      {/* Question Card */}
      <div className={`question-container ${isTransitioning ? 'transitioning' : ''}`}>
        <QuestionCard
          mode={mode}
          dimension={currentQuestion.dimension}
          text={questionText}
          selectedScore={selectedScore}
        />

        {/* Score Selection */}
        <ScoreSelector
          mode={mode}
          selectedScore={selectedScore}
          onSelect={handleScore}
          labels={{ low: labels.low, mid: labels.mid, high: labels.high }}
        />

        {/* Skip Option */}
        <button
          onClick={() => handleScore(3)}
          className="skip-button"
        >
          {labels.skip}
        </button>
      </div>

      <style>{getStyles(mode)}</style>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function ProgressIndicator({
  mode,
  current,
  total,
  progress,
  label,
}: {
  mode: string;
  current: number;
  total: number;
  progress: number;
  label: string;
}) {
  return (
    <div className="progress-indicator">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className="progress-count">{current + 1}/{total}</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
        {/* Step dots */}
        <div className="progress-dots">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${i < current ? 'completed' : i === current ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  mode,
  dimension,
  text,
  selectedScore,
}: {
  mode: string;
  dimension: string;
  text: string;
  selectedScore: number | null;
}) {
  return (
    <div className={`question-card ${selectedScore !== null ? 'answered' : ''}`}>
      <div className="dimension-badge">
        <span className="dimension-icon">{getDimensionIcon(dimension, mode)}</span>
        <span className="dimension-label">{dimension.toUpperCase()}</span>
      </div>
      <h2 className="question-text">{text}</h2>
    </div>
  );
}

function ScoreSelector({
  mode,
  selectedScore,
  onSelect,
  labels,
}: {
  mode: string;
  selectedScore: number | null;
  onSelect: (score: number) => void;
  labels: { low: string; mid: string; high: string };
}) {
  return (
    <div className="score-selector">
      <div className="score-buttons">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => onSelect(score)}
            className={`score-button ${selectedScore === score ? 'selected' : ''}`}
          >
            <span className="score-number">{score}</span>
            <span className="score-label">
              {score === 1 ? labels.low : score === 5 ? labels.high : score === 3 ? labels.mid : ''}
            </span>
            {/* Ripple effect */}
            <span className="score-ripple" />
          </button>
        ))}
      </div>
      <div className="score-range">
        <span>{labels.low}</span>
        <span>{labels.high}</span>
      </div>
    </div>
  );
}

function CelebrationOverlay({
  mode,
  kappa,
  label,
}: {
  mode: string;
  kappa: number;
  label: string;
}) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className={`celebration-overlay celebration-overlay--${mode}`}>
      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="celebration-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Central icon */}
      <div className="celebration-center">
        <div className="celebration-ring ring-1" />
        <div className="celebration-ring ring-2" />
        <div className="celebration-ring ring-3" />
        <div className="celebration-icon">
          {mode === 'kasra' ? '✓' : mode === 'river' ? '◈' : '◉'}
        </div>
      </div>

      {/* Text */}
      <div className="celebration-text">
        <div className="celebration-kappa">{(kappa * 100).toFixed(0)}%</div>
        <div className="celebration-label">{label}</div>
      </div>

      <style>{getCelebrationStyles(mode)}</style>
    </div>
  );
}

function ResultsView({
  mode,
  results,
  labels,
  onReset,
  className,
  hasBirthData,
  onBirthDataComplete,
}: {
  mode: string;
  results: CheckinResults;
  labels: typeof LABELS.kasra;
  onReset: () => void;
  className: string;
  hasBirthData: boolean;
  onBirthDataComplete: () => void;
}) {
  const kappaPercent = Math.round(results.kappa * 100);
  const isHealthy = results.failureMode === 'healthy';
  const dimensionScores = getDimensionScores(results.scores);

  // Sol's reading
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeStatus, setNarrativeStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (mode !== 'sol') return;
    fetchNarrative()
      .then(r => { setNarrative(r.narrative); setNarrativeStatus('ready'); })
      .catch(() => setNarrativeStatus('error'));
  }, [mode]);

  return (
    <div className={`results-view results-view--${mode} ${className}`}>
      {/* Warning if not healthy */}
      {!isHealthy && (
        <div className="failure-alert">
          <span className="alert-icon">⚠</span>
          <div className="alert-content">
            <div className="alert-title">
              {mode === 'kasra' ? `DETECTED: ${results.failureMode.toUpperCase()}` :
               mode === 'river' ? `Pattern disturbance: ${results.failureMode}` :
               `Something feels off: ${
                 results.failureMode === 'collapse' ? 'energy drop' :
                 results.failureMode === 'inversion' ? 'off-balance' :
                 results.failureMode === 'dissociation' ? 'disconnected' :
                 results.failureMode === 'dispersion' ? 'scattered' :
                 results.failureMode}`}
            </div>
            <div className="alert-desc">
              {getFailureModeAdvice(results.failureMode, mode)}
            </div>
          </div>
        </div>
      )}

      {/* Main Result */}
      <div className="result-card main-result">
        <div className="result-header">{labels.complete}</div>
        <div className="result-body">
          <div className="kappa-display">
            <div className="kappa-label">{labels.kappa}</div>
            <div className={`kappa-value ${getKappaClass(results.kappa)}`}>
              {results.kappa.toFixed(3)}
            </div>
            <div className="kappa-percent">{kappaPercent}% {labels.coherence}</div>
          </div>

          {/* Animated Gauge */}
          <div className="kappa-gauge">
            <svg viewBox="0 0 120 60" className="gauge-svg">
              <path
                d="M 10 55 A 50 50 0 0 1 110 55"
                fill="none"
                stroke="var(--gauge-track)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 10 55 A 50 50 0 0 1 110 55"
                fill="none"
                stroke="var(--gauge-fill)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${results.kappa * 157} 157`}
                className="gauge-fill-path"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Dimension Breakdown */}
      <div className="result-card dimensions">
        <div className="result-header">
          {mode === 'kasra' ? 'DIMENSION_ANALYSIS' : mode === 'river' ? 'The Four Waters' : 'Breakdown'}
        </div>
        <div className="dimensions-list">
          {Object.entries(dimensionScores).map(([dim, score]) => (
            <div key={dim} className="dimension-row">
              <span className="dim-icon">{getDimensionIcon(dim, mode)}</span>
              <span className="dim-name">{dim}</span>
              <div className="dim-bar">
                <div
                  className="dim-fill"
                  style={{ width: `${(score / 5) * 100}%` }}
                />
              </div>
              <span className="dim-score">{score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      {results.streak > 1 && (
        <div className="streak-badge">
          <span className="streak-icon">🔥</span>
          <span className="streak-text">
            {mode === 'kasra' ? `STREAK_COUNT: ${results.streak}` :
             mode === 'river' ? `${results.streak} days of attunement` :
             `${results.streak} day streak!`}
          </span>
        </div>
      )}

      {/* Prediction Comparison - if user had a prediction */}
      <PredictionComparison mode={mode} actualKappa={results.kappa} />

      {/* Birth Data Prompt - if user doesn't have birth data */}
      {!hasBirthData && (
        <BirthDataPrompt
          timing="after-checkin"
          onComplete={() => onBirthDataComplete()}
        />
      )}

      {/* Sol's reading - sol mode only */}
      {mode === 'sol' && (
        <div className="result-card sol-reading">
          <div className="result-header" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '0.12em', fontSize: '0.65rem' }}>
            Sol's reading
          </div>
          {narrativeStatus === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
              <span style={{
                display: 'inline-block', width: '14px', height: '14px',
                border: '1.5px solid rgba(212,168,84,0.2)', borderTopColor: 'rgba(212,168,84,0.7)',
                borderRadius: '50%', animation: 'sol-spin 1s linear infinite', flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.875rem', color: 'rgba(240,232,216,0.4)', fontStyle: 'italic' }}>
                Sol is reading the field…
              </span>
              <style>{`@keyframes sol-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          {narrativeStatus === 'ready' && narrative && (
            <div style={{ animation: 'sol-fade 0.7s ease-out' }}>
              <style>{`@keyframes sol-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`}</style>
              {narrative.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '1.05rem', lineHeight: '1.85',
                  color: 'rgba(240,232,216,0.88)', marginBottom: '1.1em',
                }}>{para}</p>
              ))}
            </div>
          )}
          {narrativeStatus === 'error' && (
            <p style={{ fontSize: '0.875rem', color: 'rgba(240,232,216,0.4)', fontStyle: 'italic', margin: 0 }}>
              The field is quiet today.
            </p>
          )}
        </div>
      )}

      {/* Save prompt */}
      <SavePrompt />

      {/* Actions */}
      <div className="result-actions">
        <button onClick={onReset} className="action-btn secondary">
          {labels.retry}
        </button>
        <a href={`/${mode}`} className="action-btn primary">
          {labels.dashboard}
        </a>
      </div>

      {/* Timestamp */}
      <div className="result-timestamp">
        {new Date(results.timestamp).toLocaleString()}
      </div>

      <style>{getResultStyles(mode)}</style>
    </div>
  );
}

// ============================================
// Prediction Comparison Component
// ============================================

function PredictionComparison({ mode, actualKappa }: { mode: string; actualKappa: number }) {
  const [prediction, setPrediction] = useState<{ predictedKappa: number; date: string } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getCalibrationStats> | null>(null);

  useEffect(() => {
    // Load today's prediction
    const stored = localStorage.getItem('rop_today_prediction');
    if (stored) {
      try {
        const pred = JSON.parse(stored);
        const today = new Date().toISOString().split('T')[0];

        // Only show if prediction was for today
        if (pred.date === today) {
          setPrediction(pred);

          // Calculate accuracy
          const error = Math.abs(pred.predictedKappa - actualKappa);
          const acc = Math.max(0, 1 - error) * 100;
          setAccuracy(Math.round(acc));

          // Store feedback with dimension tracking for calibration
          const natal16D = getNatal16D();
          const transit16D = getTodayTransit16D();
          storeFeedback(pred.predictedKappa, actualKappa, transit16D, natal16D ?? undefined);

          // Get updated calibration stats
          setStats(getCalibrationStats());
        }
      } catch {}
    }
  }, [actualKappa]);

  if (!prediction || accuracy === null) return null;

  const predictedPercent = Math.round(prediction.predictedKappa * 100);
  const actualPercent = Math.round(actualKappa * 100);
  const isAccurate = accuracy >= 80;

  return (
    <div className={`prediction-comparison ${isAccurate ? 'accurate' : ''}`}>
      <div className="comparison-header">
        {mode === 'kasra' ? 'PREDICTION_VALIDATION' :
         mode === 'river' ? 'Oracle Verification' :
         'How accurate were we?'}
      </div>

      <div className="comparison-values">
        <div className="value-item predicted">
          <span className="value-label">
            {mode === 'kasra' ? 'PREDICTED' : 'Predicted'}
          </span>
          <span className="value-number">{predictedPercent}%</span>
        </div>

        <div className="comparison-arrow">→</div>

        <div className="value-item actual">
          <span className="value-label">
            {mode === 'kasra' ? 'ACTUAL' : 'Actual'}
          </span>
          <span className="value-number">{actualPercent}%</span>
        </div>
      </div>

      <div className={`accuracy-result ${isAccurate ? 'good' : 'learning'}`}>
        {isAccurate ? (
          <>
            <span className="accuracy-icon">✓</span>
            <span className="accuracy-text">
              {mode === 'kasra' ? `${accuracy}% ACCURACY` :
               mode === 'river' ? `${accuracy}% resonance with the oracle` :
               `${accuracy}% accurate!`}
            </span>
          </>
        ) : (
          <>
            <span className="accuracy-icon">◐</span>
            <span className="accuracy-text">
              {mode === 'kasra' ? `${accuracy}% - CALIBRATING` :
               mode === 'river' ? `${accuracy}% - The pattern is learning you` :
               `${accuracy}% - We're still learning your patterns`}
            </span>
          </>
        )}
      </div>

      {stats && stats.totalCheckins >= 7 && (
        <div className="calibration-info">
          <span className="calibration-label">
            {mode === 'kasra' ? 'CALIBRATION_STATUS:' :
             mode === 'river' ? 'Pattern attunement:' :
             'Our accuracy is'}
          </span>
          <span className="calibration-value">
            {stats.calibrationQuality === 'excellent' ? (
              mode === 'kasra' ? 'OPTIMIZED' :
              mode === 'river' ? 'deeply attuned' :
              'excellent'
            ) : stats.calibrationQuality === 'good' ? (
              mode === 'kasra' ? 'STABLE' :
              mode === 'river' ? 'resonating well' :
              'good'
            ) : (
              mode === 'kasra' ? 'LEARNING' :
              mode === 'river' ? 'still awakening' :
              'improving'
            )}
          </span>
          {stats.trend === 'improving' && (
            <span className="calibration-trend">↑</span>
          )}
        </div>
      )}

      <style>{`
        .prediction-comparison {
          background: rgba(212, 168, 84, 0.08);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 12px;
          padding: 1rem;
          margin: 1rem 0;
        }

        .prediction-comparison.accurate {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.08);
        }

        .comparison-header {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
        }

        .comparison-values {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .value-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .value-label {
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.4);
          margin-bottom: 0.25rem;
        }

        .value-number {
          font-size: 1.25rem;
          font-weight: 600;
          color: #f0e8d8;
        }

        .value-item.predicted .value-number {
          color: rgba(240, 232, 216, 0.6);
        }

        .comparison-arrow {
          color: rgba(240, 232, 216, 0.3);
          font-size: 1.25rem;
        }

        .accuracy-result {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .accuracy-result.good {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
        }

        .accuracy-result.learning {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }

        .accuracy-icon {
          font-size: 1rem;
        }

        [data-mode="kasra"] .prediction-comparison {
          border-color: rgba(34, 211, 238, 0.15);
          background: rgba(34, 211, 238, 0.05);
        }

        [data-mode="river"] .prediction-comparison {
          border-color: rgba(167, 139, 250, 0.15);
          background: rgba(167, 139, 250, 0.05);
        }

        .calibration-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(240, 232, 216, 0.1);
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.5);
        }

        .calibration-value {
          color: #d4a854;
        }

        .calibration-trend {
          color: #22c55e;
          font-weight: bold;
        }

        [data-mode="kasra"] .calibration-value {
          color: #22d3ee;
        }

        [data-mode="river"] .calibration-value {
          color: #a78bfa;
        }
      `}</style>
    </div>
  );
}

// ============================================
// Utilities
// ============================================

function calculateResults(scores: Record<string, number>): CheckinResults {
  let totalWeight = 0;
  let weightedSum = 0;

  QUESTIONS.forEach((q) => {
    const score = scores[q.id] || 3;
    weightedSum += (score / 5) * q.weight;
    totalWeight += q.weight;
  });

  const kappa = weightedSum / totalWeight;
  const dims = getDimensionScores(scores);

  let failureMode: CheckinResults['failureMode'] = 'healthy';
  if (kappa < 0.3) {
    failureMode = 'collapse';
  } else if (dims.coherence < 2 && dims.focus > 3) {
    failureMode = 'inversion';
  } else if (dims.embodiment < 2) {
    failureMode = 'dissociation';
  } else if (dims.focus < 2 && dims.energy > 3) {
    failureMode = 'dispersion';
  }

  const history = getCheckinHistory();

  return {
    kappa,
    scores,
    failureMode,
    timestamp: new Date().toISOString(),
    streak: history.streak + 1,
  };
}

function getDimensionScores(scores: Record<string, number>): Record<string, number> {
  const dims: Record<string, { sum: number; count: number }> = {
    coherence: { sum: 0, count: 0 },
    energy: { sum: 0, count: 0 },
    focus: { sum: 0, count: 0 },
    embodiment: { sum: 0, count: 0 },
  };

  QUESTIONS.forEach((q) => {
    const score = scores[q.id] || 3;
    dims[q.dimension].sum += score;
    dims[q.dimension].count += 1;
  });

  return Object.fromEntries(
    Object.entries(dims).map(([key, val]) => [
      key,
      val.count > 0 ? val.sum / val.count : 3,
    ])
  );
}

function getDimensionIcon(dimension: string, mode: string): string {
  const icons: Record<string, Record<string, string>> = {
    kasra: { coherence: '◈', energy: '⚡', focus: '◉', embodiment: '▣' },
    river: { coherence: '☽', energy: '☀', focus: '★', embodiment: '⬡' },
    sol: { coherence: '◎', energy: '◈', focus: '◉', embodiment: '○' },
  };
  return icons[mode]?.[dimension] || '○';
}

function getKappaClass(kappa: number): string {
  if (kappa >= 0.7) return 'optimal';
  if (kappa >= 0.4) return 'nominal';
  return 'critical';
}

// ============================================
// SavePrompt — replaces SyncPrompt
// Email field: schedules reminder + sends magic link silently
// ============================================

function SavePrompt() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rop_reminder_email');
    if (saved) setEmail(saved);
    if (saved && localStorage.getItem('rop_reminder_active') === 'true') {
      setIsActive(true);
      // Silently reschedule
      fetch('/api/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: saved, timezoneOffset: new Date().getTimezoneOffset() }),
      }).catch(() => {});
    }
  }, []);

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    setStatus('saving');

    try {
      const res = await fetch('/api/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, timezoneOffset: new Date().getTimezoneOffset() }),
      });
      if (!res.ok) throw new Error();

      localStorage.setItem('rop_reminder_email', trimmed);
      localStorage.setItem('rop_reminder_active', 'true');
      setIsActive(true);
      setStatus('done');

      // Background: magic link so clicking reminder email logs them in
      fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, redirect: '/sol/checkin' }),
      }).catch(() => {});
    } catch {
      setStatus('error');
    }
  }

  if (isActive || status === 'done') {
    return (
      <div style={{
        margin: '1rem 0',
        padding: '0.875rem 1.25rem',
        background: 'rgba(212,168,84,0.04)',
        border: '1px solid rgba(212,168,84,0.12)',
        borderRadius: '12px',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <span style={{ color: 'rgba(212,168,84,0.6)', fontSize: '1rem' }}>◎</span>
        <span style={{ fontSize: '0.875rem', color: 'rgba(240,232,216,0.45)', fontStyle: 'italic' }}>
          Sol will reach out tomorrow morning.
        </span>
      </div>
    );
  }

  return (
    <div style={{
      margin: '1rem 0',
      padding: '1rem 1.25rem',
      background: 'rgba(212,168,84,0.04)',
      border: '1px solid rgba(212,168,84,0.12)',
      borderRadius: '12px',
    }}>
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(212,168,84,0.45)', marginBottom: '0.5rem' }}>
        Save your practice
      </div>
      <p style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', color: 'rgba(240,232,216,0.5)', lineHeight: '1.5' }}>
        Get tomorrow's reminder from Sol and carry your practice across any device.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{
            flex: 1, minWidth: '160px',
            padding: '0.6rem 0.875rem',
            background: 'rgba(5,6,10,0.8)',
            border: '1px solid rgba(212,168,84,0.2)',
            borderRadius: '8px',
            color: '#f0e8d8', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={status === 'saving'}
          style={{
            padding: '0.6rem 1rem',
            background: 'rgba(212,168,84,0.12)',
            border: '1px solid rgba(212,168,84,0.3)',
            borderRadius: '8px',
            color: '#d4a854', fontSize: '0.875rem', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap' as const,
            opacity: status === 'saving' ? 0.6 : 1,
          }}
        >
          {status === 'saving' ? '…' : 'Remind me →'}
        </button>
      </div>
      {status === 'error' && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'rgba(240,100,100,0.6)' }}>
          Couldn't save. Try again later.
        </p>
      )}
    </div>
  );
}

function getFailureModeAdvice(mode: string, uiMode: string): string {
  const advice: Record<string, Record<string, string>> = {
    collapse: {
      kasra: 'System resources depleted. Prioritize recovery protocols.',
      river: 'The vessel needs rest. Return to stillness.',
      sol: 'You might be running on empty. Take it easy today.',
    },
    inversion: {
      kasra: 'Direction vector corrupted. Realign with base parameters.',
      river: 'The compass needle spins. Seek your true north.',
      sol: 'Your goals might feel unclear. That\'s okay - take small steps.',
    },
    dissociation: {
      kasra: 'Body sensor offline. Reinitialize somatic connection.',
      river: 'The spirit drifts from the vessel. Ground yourself.',
      sol: 'You might feel disconnected. Try some movement or deep breaths.',
    },
    dispersion: {
      kasra: 'Focus matrix fragmented. Consolidate processing threads.',
      river: 'Energy scatters like wind. Gather your flame.',
      sol: 'Energy\'s high but scattered. Try focusing on one thing.',
    },
  };
  return advice[mode]?.[uiMode] || '';
}

// ============================================
// Styles
// ============================================

function getStyles(mode: string): string {
  const modeVars: Record<string, string> = {
    kasra: `
      --checkin-bg: #0a0a0a;
      --checkin-accent: #00ff88;
      --checkin-text: #ffffff;
      --checkin-muted: rgba(255,255,255,0.5);
      --checkin-border: rgba(0,255,136,0.3);
      --checkin-card-bg: rgba(0,255,136,0.05);
      --checkin-font: 'Geist Mono', monospace;
    `,
    river: `
      --checkin-bg: #0f0c1a;
      --checkin-accent: #a78bfa;
      --checkin-text: #f0e8d8;
      --checkin-muted: rgba(240,232,216,0.5);
      --checkin-border: rgba(167,139,250,0.3);
      --checkin-card-bg: rgba(167,139,250,0.05);
      --checkin-font: 'Cormorant Garamond', serif;
    `,
    sol: `
      --checkin-bg: #0a0908;
      --checkin-accent: #d4a854;
      --checkin-text: #f0e8d8;
      --checkin-muted: rgba(240,232,216,0.5);
      --checkin-border: rgba(212,168,84,0.25);
      --checkin-card-bg: rgba(212,168,84,0.05);
      --checkin-font: 'Inter', system-ui, sans-serif;
    `,
  };

  return `
    .checkin-flow {
      ${modeVars[mode] || modeVars.sol}
      font-family: var(--checkin-font);
      max-width: 500px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Progress */
    .progress-indicator { margin-bottom: 2rem; }
    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--checkin-muted);
      text-transform: ${mode === 'kasra' ? 'uppercase' : 'none'};
      letter-spacing: ${mode === 'kasra' ? '0.1em' : 'normal'};
      margin-bottom: 0.5rem;
    }
    .progress-track {
      position: relative;
      height: 4px;
      background: var(--checkin-border);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      position: absolute;
      height: 100%;
      background: var(--checkin-accent);
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      ${mode === 'kasra' ? 'box-shadow: 0 0 10px var(--checkin-accent);' : ''}
    }
    .progress-dots {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px;
    }
    .progress-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--checkin-border);
      transition: all 0.3s ease;
    }
    .progress-dot.completed { background: var(--checkin-accent); transform: scale(1.2); }
    .progress-dot.active { background: var(--checkin-accent); animation: pulse-dot 1s ease-in-out infinite; }

    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.7; }
    }

    /* Question Container */
    .question-container {
      opacity: 1;
      transform: translateX(0);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .question-container.transitioning {
      opacity: 0;
      transform: translateX(-20px);
    }

    /* Question Card */
    .question-card {
      background: var(--checkin-card-bg);
      border: 1px solid var(--checkin-border);
      border-radius: ${mode === 'kasra' ? '0' : '12px'};
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      transition: all 0.3s ease;
    }
    .question-card.answered {
      transform: scale(0.98);
      opacity: 0.8;
    }
    .dimension-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.7rem;
      color: var(--checkin-accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 1rem;
    }
    .dimension-icon {
      font-size: 1rem;
    }
    .question-text {
      font-size: ${mode === 'river' ? '1.4rem' : '1.2rem'};
      color: var(--checkin-text);
      line-height: 1.5;
      font-weight: ${mode === 'kasra' ? '500' : '400'};
      ${mode === 'river' ? 'font-style: italic;' : ''}
    }

    /* Score Selector */
    .score-selector { margin-bottom: 1.5rem; }
    .score-buttons {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.5rem;
    }
    .score-button {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem 0.5rem;
      background: transparent;
      border: 1px solid var(--checkin-border);
      border-radius: ${mode === 'kasra' ? '0' : '8px'};
      color: var(--checkin-text);
      cursor: pointer;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .score-button:hover {
      border-color: var(--checkin-accent);
      background: var(--checkin-card-bg);
    }
    .score-button:active {
      transform: scale(0.95);
    }
    .score-button.selected {
      background: var(--checkin-accent);
      border-color: var(--checkin-accent);
      color: ${mode === 'sol' ? '#0a0908' : 'var(--checkin-bg)'};
    }
    .score-number {
      font-size: 1.5rem;
      font-weight: 600;
    }
    .score-label {
      font-size: 0.65rem;
      color: var(--checkin-muted);
      margin-top: 0.25rem;
      min-height: 1rem;
    }
    .score-button.selected .score-label {
      color: inherit;
      opacity: 0.8;
    }
    .score-ripple {
      position: absolute;
      inset: 0;
      background: var(--checkin-accent);
      opacity: 0;
      transform: scale(0);
      border-radius: 50%;
      transition: all 0.5s ease;
    }
    .score-button.selected .score-ripple {
      opacity: 0.2;
      transform: scale(2);
    }
    .score-range {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--checkin-muted);
      margin-top: 0.5rem;
    }

    /* Skip Button */
    .skip-button {
      display: block;
      width: 100%;
      padding: 0.75rem;
      background: transparent;
      border: none;
      color: var(--checkin-muted);
      font-size: 0.8rem;
      cursor: pointer;
      transition: color 0.2s ease;
      ${mode === 'kasra' ? 'text-transform: uppercase; letter-spacing: 0.1em;' : ''}
    }
    .skip-button:hover {
      color: var(--checkin-text);
    }
  `;
}

function getCelebrationStyles(mode: string): string {
  const colors: Record<string, { primary: string; secondary: string; bg: string }> = {
    kasra: { primary: '#00ff88', secondary: '#00d4ff', bg: '#0a0a0a' },
    river: { primary: '#a78bfa', secondary: '#ec4899', bg: '#0f0c1a' },
    sol: { primary: '#d4a854', secondary: '#c49a4a', bg: '#0a0908' },
  };
  const c = colors[mode] || colors.sol;

  return `
    .celebration-overlay {
      position: fixed;
      inset: 0;
      background: ${c.bg};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .celebration-particle {
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${c.primary};
      border-radius: 50%;
      animation: particle-float 2s ease-out forwards;
    }

    @keyframes particle-float {
      0% { opacity: 0; transform: scale(0); }
      20% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: translateY(-100px) scale(0.5); }
    }

    .celebration-center {
      position: relative;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .celebration-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid ${c.primary};
      opacity: 0;
      animation: ring-expand 1.5s ease-out forwards;
    }
    .ring-1 { width: 60px; height: 60px; animation-delay: 0s; }
    .ring-2 { width: 90px; height: 90px; animation-delay: 0.2s; }
    .ring-3 { width: 120px; height: 120px; animation-delay: 0.4s; }

    @keyframes ring-expand {
      0% { transform: scale(0.5); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .celebration-icon {
      font-size: 3rem;
      color: ${c.primary};
      animation: icon-appear 0.5s ease-out 0.3s forwards;
      opacity: 0;
      transform: scale(0);
    }

    @keyframes icon-appear {
      0% { opacity: 0; transform: scale(0) rotate(-180deg); }
      100% { opacity: 1; transform: scale(1) rotate(0); }
    }

    .celebration-text {
      margin-top: 2rem;
      text-align: center;
      animation: text-appear 0.5s ease-out 0.6s forwards;
      opacity: 0;
    }

    @keyframes text-appear {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    .celebration-kappa {
      font-size: 3rem;
      font-weight: 700;
      color: ${c.primary};
      text-shadow: 0 0 20px ${c.primary}40;
    }

    .celebration-label {
      font-size: 1rem;
      color: ${mode === 'sol' ? '#f0e8d8' : '#ffffff'}80;
      margin-top: 0.5rem;
    }
  `;
}

function getResultStyles(mode: string): string {
  const modeVars: Record<string, string> = {
    kasra: `
      --result-bg: #0a0a0a;
      --result-accent: #00ff88;
      --result-text: #ffffff;
      --result-muted: rgba(255,255,255,0.5);
      --result-border: rgba(0,255,136,0.3);
      --result-card-bg: rgba(0,255,136,0.05);
      --gauge-track: rgba(0,255,136,0.2);
      --gauge-fill: #00ff88;
    `,
    river: `
      --result-bg: #0f0c1a;
      --result-accent: #a78bfa;
      --result-text: #f0e8d8;
      --result-muted: rgba(240,232,216,0.5);
      --result-border: rgba(167,139,250,0.3);
      --result-card-bg: rgba(167,139,250,0.05);
      --gauge-track: rgba(167,139,250,0.2);
      --gauge-fill: #a78bfa;
    `,
    sol: `
      --result-bg: #0a0908;
      --result-accent: #d4a854;
      --result-text: #f0e8d8;
      --result-muted: rgba(240,232,216,0.5);
      --result-border: rgba(212,168,84,0.25);
      --result-card-bg: rgba(212,168,84,0.05);
      --gauge-track: rgba(212,168,84,0.2);
      --gauge-fill: #d4a854;
    `,
  };

  return `
    .results-view {
      ${modeVars[mode] || modeVars.sol}
      font-family: ${mode === 'kasra' ? "'Geist Mono', monospace" : mode === 'river' ? "'Cormorant Garamond', serif" : "'Inter', sans-serif"};
      max-width: 500px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Failure Alert */
    .failure-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: ${mode === 'kasra' ? '0' : '8px'};
      margin-bottom: 1.5rem;
    }
    .alert-icon { font-size: 1.25rem; }
    .alert-title {
      font-weight: 600;
      color: #ef4444;
      font-size: 0.9rem;
    }
    .alert-desc {
      color: var(--result-muted);
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }

    /* Result Cards */
    .result-card {
      background: var(--result-card-bg);
      border: 1px solid var(--result-border);
      border-radius: ${mode === 'kasra' ? '0' : '12px'};
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .result-header {
      font-size: 0.75rem;
      color: var(--result-accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 1rem;
    }

    /* Kappa Display */
    .kappa-display { text-align: center; }
    .kappa-label {
      font-size: 0.8rem;
      color: var(--result-muted);
      margin-bottom: 0.5rem;
    }
    .kappa-value {
      font-size: 3.5rem;
      font-weight: 700;
      font-family: 'Geist Mono', monospace;
      line-height: 1;
      animation: kappa-reveal 1s ease-out forwards;
    }
    .kappa-value.optimal { color: var(--result-accent); }
    .kappa-value.nominal { color: #eab308; }
    .kappa-value.critical { color: #ef4444; }
    .kappa-percent {
      font-size: 0.9rem;
      color: var(--result-muted);
      margin-top: 0.5rem;
    }

    @keyframes kappa-reveal {
      0% { opacity: 0; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* Gauge */
    .kappa-gauge {
      margin-top: 1.5rem;
    }
    .gauge-svg {
      width: 100%;
      max-width: 200px;
      margin: 0 auto;
      display: block;
    }
    .gauge-fill-path {
      animation: gauge-fill 1.5s ease-out forwards;
      stroke-dashoffset: 157;
    }

    @keyframes gauge-fill {
      from { stroke-dashoffset: 157; }
    }

    /* Dimensions */
    .dimensions-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .dimension-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .dim-icon {
      font-size: 1rem;
      width: 1.5rem;
      text-align: center;
    }
    .dim-name {
      flex: 1;
      font-size: 0.85rem;
      color: var(--result-muted);
      text-transform: capitalize;
    }
    .dim-bar {
      width: 80px;
      height: 6px;
      background: var(--result-border);
      border-radius: 3px;
      overflow: hidden;
    }
    .dim-fill {
      height: 100%;
      background: var(--result-accent);
      transition: width 1s ease-out;
    }
    .dim-score {
      font-size: 0.85rem;
      font-family: 'Geist Mono', monospace;
      color: var(--result-text);
      width: 2rem;
      text-align: right;
    }

    /* Streak */
    .streak-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--result-card-bg);
      border: 1px solid var(--result-border);
      border-radius: ${mode === 'kasra' ? '0' : '20px'};
      margin-bottom: 1rem;
    }
    .streak-icon { font-size: 1.25rem; }
    .streak-text {
      font-size: 0.9rem;
      color: var(--result-text);
    }

    /* Actions */
    .result-actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .action-btn {
      flex: 1;
      padding: 0.875rem;
      font-size: 0.85rem;
      font-weight: 500;
      text-align: center;
      text-decoration: none;
      border-radius: ${mode === 'kasra' ? '0' : '8px'};
      cursor: pointer;
      transition: all 0.2s ease;
      ${mode === 'kasra' ? 'text-transform: uppercase; letter-spacing: 0.05em;' : ''}
    }
    .action-btn.secondary {
      background: transparent;
      border: 1px solid var(--result-border);
      color: var(--result-text);
    }
    .action-btn.secondary:hover {
      border-color: var(--result-accent);
    }
    .action-btn.primary {
      background: var(--result-accent);
      border: none;
      color: ${mode === 'sol' ? '#0a0908' : 'var(--result-bg)'};
    }
    .action-btn.primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    /* Timestamp */
    .result-timestamp {
      text-align: center;
      font-size: 0.75rem;
      color: var(--result-muted);
    }
  `;
}

export default CheckinFlowEnhanced;
