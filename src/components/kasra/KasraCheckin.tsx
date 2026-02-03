import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $forecast, updateForecast, setFailureMode } from '../../stores';
import { KasraCard, KasraAlert } from './KasraCard';
import { KasraGauge } from './KasraGauge';
import { saveCheckin, getCheckinHistory, type CheckinEntry } from '../../lib/checkin-storage';

interface CheckinQuestion {
  id: string;
  text: string;
  dimension: 'coherence' | 'energy' | 'focus' | 'embodiment';
  weight: number;
}

const CHECKIN_QUESTIONS: CheckinQuestion[] = [
  {
    id: 'clarity',
    text: 'Rate your mental clarity right now',
    dimension: 'coherence',
    weight: 1.2,
  },
  {
    id: 'energy',
    text: 'How is your energy level?',
    dimension: 'energy',
    weight: 1.0,
  },
  {
    id: 'focus',
    text: 'How focused do you feel?',
    dimension: 'focus',
    weight: 1.1,
  },
  {
    id: 'embodiment',
    text: 'How connected do you feel to your body?',
    dimension: 'embodiment',
    weight: 0.8,
  },
  {
    id: 'direction',
    text: 'How clear is your sense of direction today?',
    dimension: 'coherence',
    weight: 1.0,
  },
  {
    id: 'alignment',
    text: 'How aligned do your actions feel with your values?',
    dimension: 'coherence',
    weight: 1.3,
  },
];

interface KasraCheckinProps {
  onComplete?: (results: CheckinResults) => void;
  className?: string;
}

interface CheckinResults {
  kappa: number;
  scores: Record<string, number>;
  failureMode: 'healthy' | 'collapse' | 'inversion' | 'dissociation' | 'dispersion';
  timestamp: string;
}

export function KasraCheckin({ onComplete, className = '' }: KasraCheckinProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<CheckinResults | null>(null);

  const currentQuestion = CHECKIN_QUESTIONS[currentIndex];
  const progress = ((currentIndex) / CHECKIN_QUESTIONS.length) * 100;

  const handleScore = (score: number) => {
    const newScores = { ...scores, [currentQuestion.id]: score };
    setScores(newScores);

    if (currentIndex < CHECKIN_QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Calculate results
      const calculatedResults = calculateResults(newScores);
      setResults(calculatedResults);
      setIsComplete(true);

      // Update global store
      updateForecast({
        kappa: calculatedResults.kappa,
        computedAt: calculatedResults.timestamp,
      });
      setFailureMode(calculatedResults.failureMode, calculatedResults.kappa < 0.3 ? 0.7 : 0.3);

      // Save to localStorage
      saveCheckin(calculatedResults.scores, calculatedResults.kappa, 'kasra');

      onComplete?.(calculatedResults);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setScores({});
    setIsComplete(false);
    setResults(null);
  };

  if (isComplete && results) {
    return (
      <CheckinResults results={results} onReset={handleReset} className={className} />
    );
  }

  return (
    <div className={`font-kasra ${className}`}>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-kasra-caption text-kasra-muted mb-2">
          <span>CHECK-IN PROGRESS</span>
          <span>{currentIndex + 1}/{CHECKIN_QUESTIONS.length}</span>
        </div>
        <div className="h-1 bg-kasra-border">
          <div
            className="h-full bg-kasra-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <KasraCard>
        <div className="text-kasra-caption text-kasra-muted uppercase tracking-wider mb-2">
          {currentQuestion.dimension}
        </div>
        <div className="text-kasra-h2 text-kasra-text mb-6">
          {currentQuestion.text}
        </div>

        {/* Score Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => handleScore(score)}
              className="p-4 border border-kasra-border hover:border-kasra-accent hover:bg-kasra-accent/10 transition-colors"
            >
              <div className="text-kasra-data text-kasra-text">{score}</div>
              <div className="text-kasra-caption text-kasra-muted mt-1">
                {score === 1 ? 'LOW' : score === 5 ? 'HIGH' : ''}
              </div>
            </button>
          ))}
        </div>

        {/* Score Labels */}
        <div className="flex justify-between text-kasra-caption text-kasra-muted mt-2">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
      </KasraCard>

      {/* Skip Option */}
      <div className="mt-4 text-center">
        <button
          onClick={() => handleScore(3)}
          className="text-kasra-caption text-kasra-muted hover:text-kasra-text uppercase tracking-wider"
        >
          [Skip - Use Neutral]
        </button>
      </div>
    </div>
  );
}

function CheckinResults({
  results,
  onReset,
  className = '',
}: {
  results: CheckinResults;
  onReset: () => void;
  className?: string;
}) {
  const isHealthy = results.failureMode === 'healthy';
  const kappaPercent = Math.round(results.kappa * 100);

  return (
    <div className={`font-kasra space-y-4 ${className}`}>
      {/* Alert if in failure */}
      {!isHealthy && (
        <KasraAlert
          type="warning"
          title={`Detected: ${results.failureMode.toUpperCase()}`}
          message="Review the detailed analysis and recovery recommendations below."
        />
      )}

      {/* Main Result */}
      <KasraCard title="Check-in Complete">
        <div className="text-center py-4">
          <div className="text-kasra-caption text-kasra-muted uppercase mb-2">
            Current κ (Kappa)
          </div>
          <div className={`text-6xl font-mono ${
            results.kappa >= 0.7 ? 'text-kasra-accent' :
            results.kappa >= 0.4 ? 'text-kasra-warning' :
            'text-kasra-critical'
          }`}>
            {results.kappa.toFixed(3)}
          </div>
          <div className="text-kasra-body text-kasra-muted mt-2">
            {kappaPercent}% coherence
          </div>
        </div>

        <KasraGauge
          label="Field Coherence"
          value={results.kappa}
          max={1}
          unit=""
          className="mt-4"
        />
      </KasraCard>

      {/* Dimension Breakdown */}
      <KasraCard title="Dimension Analysis">
        <div className="space-y-3">
          {Object.entries(getDimensionScores(results.scores)).map(([dim, score]) => (
            <div key={dim} className="flex items-center justify-between">
              <span className="text-kasra-body text-kasra-muted uppercase">{dim}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-kasra-border">
                  <div
                    className="h-full bg-kasra-accent"
                    style={{ width: `${score * 20}%` }}
                  />
                </div>
                <span className="text-kasra-data text-kasra-text w-8">{score.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </KasraCard>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onReset}
          className="flex-1 p-3 border border-kasra-border text-kasra-text hover:border-kasra-accent transition-colors"
        >
          <span className="text-kasra-caption uppercase tracking-wider">[Check In Again]</span>
        </button>
        <a
          href="/kasra"
          className="flex-1 p-3 bg-kasra-accent text-kasra-bg text-center hover:bg-kasra-accent/90 transition-colors"
        >
          <span className="text-kasra-caption uppercase tracking-wider">[View Dashboard]</span>
        </a>
      </div>

      {/* Timestamp */}
      <div className="text-kasra-caption text-kasra-muted text-center">
        Recorded: {new Date(results.timestamp).toLocaleString()}
      </div>
    </div>
  );
}

function calculateResults(scores: Record<string, number>): CheckinResults {
  // Calculate weighted average
  let totalWeight = 0;
  let weightedSum = 0;

  CHECKIN_QUESTIONS.forEach((q) => {
    const score = scores[q.id] || 3;
    weightedSum += (score / 5) * q.weight;
    totalWeight += q.weight;
  });

  const kappa = weightedSum / totalWeight;

  // Detect failure mode based on dimension analysis
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

  return {
    kappa,
    scores,
    failureMode,
    timestamp: new Date().toISOString(),
  };
}

function getDimensionScores(scores: Record<string, number>): Record<string, number> {
  const dims: Record<string, { sum: number; count: number }> = {
    coherence: { sum: 0, count: 0 },
    energy: { sum: 0, count: 0 },
    focus: { sum: 0, count: 0 },
    embodiment: { sum: 0, count: 0 },
  };

  CHECKIN_QUESTIONS.forEach((q) => {
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

export default KasraCheckin;
