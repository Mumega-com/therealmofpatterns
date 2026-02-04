'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

interface Prediction {
  id: string;
  date: string;
  type: 'daily' | 'window' | 'warning' | 'resonance';
  description: string;
  dimension?: string;
  outcome?: 'accurate' | 'inaccurate' | 'partial' | null;
  notes?: string;
}

interface AccuracyStats {
  total: number;
  accurate: number;
  inaccurate: number;
  partial: number;
  pending: number;
  rate: number;
}

// Local storage helpers
function getPredictions(): Prediction[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem('rop_predictions');
  return stored ? JSON.parse(stored) : [];
}

function savePredictions(predictions: Prediction[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('rop_predictions', JSON.stringify(predictions));
}

function getStats(): AccuracyStats {
  const predictions = getPredictions();
  const rated = predictions.filter(p => p.outcome !== null);
  const accurate = rated.filter(p => p.outcome === 'accurate').length;
  const inaccurate = rated.filter(p => p.outcome === 'inaccurate').length;
  const partial = rated.filter(p => p.outcome === 'partial').length;
  const pending = predictions.filter(p => p.outcome === null).length;

  return {
    total: predictions.length,
    accurate,
    inaccurate,
    partial,
    pending,
    rate: rated.length > 0 ? ((accurate + partial * 0.5) / rated.length) * 100 : 0,
  };
}

// Record a new prediction
export function recordPrediction(
  type: Prediction['type'],
  description: string,
  dimension?: string
): string {
  const predictions = getPredictions();
  const id = `pred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newPrediction: Prediction = {
    id,
    date: new Date().toISOString(),
    type,
    description,
    dimension,
    outcome: null,
  };

  predictions.push(newPrediction);
  savePredictions(predictions);

  return id;
}

// Rate a prediction's accuracy
export function ratePrediction(
  id: string,
  outcome: 'accurate' | 'inaccurate' | 'partial',
  notes?: string
) {
  const predictions = getPredictions();
  const index = predictions.findIndex(p => p.id === id);

  if (index !== -1) {
    predictions[index].outcome = outcome;
    if (notes) predictions[index].notes = notes;
    savePredictions(predictions);
  }
}

// Main component for accuracy display
interface AccuracyDisplayProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function AccuracyDisplay({ variant = 'compact', className = '' }: AccuracyDisplayProps) {
  const mode = useStore($mode);
  const [stats, setStats] = useState<AccuracyStats>({
    total: 0, accurate: 0, inaccurate: 0, partial: 0, pending: 0, rate: 0
  });

  useEffect(() => {
    setStats(getStats());
  }, []);

  if (stats.total === 0) {
    return null; // Don't show if no predictions tracked
  }

  const rateColor = stats.rate >= 70 ? '#22c55e' : stats.rate >= 50 ? '#d4a854' : '#ef4444';

  if (variant === 'compact') {
    return (
      <div className={`accuracy-compact ${className}`}>
        <span className="accuracy-rate" style={{ color: rateColor }}>
          {stats.rate.toFixed(0)}%
        </span>
        <span className="accuracy-label">
          {mode === 'kasra' ? 'ACCURACY' : mode === 'river' ? 'Accuracy' : 'Accuracy'}
        </span>
        <span className="accuracy-count">
          ({stats.accurate + stats.partial}/{stats.total - stats.pending} rated)
        </span>

        <style>{`
          .accuracy-compact {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            background: rgba(212, 168, 84, 0.08);
            border-radius: 4px;
            font-size: 0.85rem;
          }
          .accuracy-rate {
            font-weight: 600;
            font-family: 'Geist Mono', monospace;
          }
          .accuracy-label {
            color: rgba(240, 232, 216, 0.6);
          }
          .accuracy-count {
            color: rgba(240, 232, 216, 0.4);
            font-size: 0.75rem;
          }
        `}</style>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`accuracy-full ${className}`}>
      <div className="accuracy-header">
        <h4>
          {mode === 'kasra' ? 'PREDICTION_ACCURACY' : mode === 'river' ? 'Pattern Accuracy' : 'How Accurate?'}
        </h4>
        <span className="main-rate" style={{ color: rateColor }}>
          {stats.rate.toFixed(0)}%
        </span>
      </div>

      <div className="accuracy-bar">
        <div
          className="bar-accurate"
          style={{ width: `${(stats.accurate / stats.total) * 100}%` }}
        />
        <div
          className="bar-partial"
          style={{ width: `${(stats.partial / stats.total) * 100}%` }}
        />
        <div
          className="bar-inaccurate"
          style={{ width: `${(stats.inaccurate / stats.total) * 100}%` }}
        />
      </div>

      <div className="accuracy-breakdown">
        <div className="breakdown-item">
          <span className="dot accurate" />
          <span className="label">
            {mode === 'kasra' ? 'ACCURATE' : 'Accurate'}
          </span>
          <span className="value">{stats.accurate}</span>
        </div>
        <div className="breakdown-item">
          <span className="dot partial" />
          <span className="label">
            {mode === 'kasra' ? 'PARTIAL' : 'Partial'}
          </span>
          <span className="value">{stats.partial}</span>
        </div>
        <div className="breakdown-item">
          <span className="dot inaccurate" />
          <span className="label">
            {mode === 'kasra' ? 'INACCURATE' : 'Inaccurate'}
          </span>
          <span className="value">{stats.inaccurate}</span>
        </div>
        <div className="breakdown-item">
          <span className="dot pending" />
          <span className="label">
            {mode === 'kasra' ? 'PENDING' : 'Pending'}
          </span>
          <span className="value">{stats.pending}</span>
        </div>
      </div>

      <style>{`
        .accuracy-full {
          padding: 1.25rem;
          background: rgba(212, 168, 84, 0.05);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 8px;
        }
        .accuracy-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .accuracy-header h4 {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          font-weight: 500;
        }
        .main-rate {
          font-size: 1.5rem;
          font-weight: 600;
          font-family: 'Geist Mono', monospace;
        }
        .accuracy-bar {
          display: flex;
          height: 8px;
          background: rgba(240, 232, 216, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .bar-accurate {
          background: #22c55e;
        }
        .bar-partial {
          background: #d4a854;
        }
        .bar-inaccurate {
          background: #ef4444;
        }
        .accuracy-breakdown {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }
        .breakdown-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot.accurate { background: #22c55e; }
        .dot.partial { background: #d4a854; }
        .dot.inaccurate { background: #ef4444; }
        .dot.pending { background: rgba(240, 232, 216, 0.2); }
        .breakdown-item .label {
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .breakdown-item .value {
          font-size: 1rem;
          color: #f0e8d8;
          font-family: 'Geist Mono', monospace;
        }
        @media (max-width: 480px) {
          .accuracy-breakdown {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

// Feedback widget for rating a specific prediction
interface PredictionFeedbackProps {
  predictionId: string;
  description: string;
  onRate?: (outcome: 'accurate' | 'inaccurate' | 'partial') => void;
  className?: string;
}

export function PredictionFeedback({
  predictionId,
  description,
  onRate,
  className = '',
}: PredictionFeedbackProps) {
  const mode = useStore($mode);
  const [rated, setRated] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  const handleRate = (outcome: 'accurate' | 'inaccurate' | 'partial') => {
    ratePrediction(predictionId, outcome);
    setRated(true);
    setSelectedOutcome(outcome);
    onRate?.(outcome);
  };

  if (rated) {
    return (
      <div className={`feedback-thanks ${className}`}>
        <span className="thanks-icon">✓</span>
        <span className="thanks-text">
          {mode === 'kasra' ? 'FEEDBACK_LOGGED' : mode === 'river' ? 'Thank you' : 'Thanks!'}
        </span>
        <style>{`
          .feedback-thanks {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            background: rgba(34, 197, 94, 0.1);
            border-radius: 4px;
            color: #22c55e;
            font-size: 0.85rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`prediction-feedback ${className}`}>
      <p className="feedback-question">
        {mode === 'kasra'
          ? 'WAS_PREDICTION_ACCURATE?'
          : mode === 'river'
          ? 'Did this ring true?'
          : 'Was this accurate?'}
      </p>
      <div className="feedback-buttons">
        <button onClick={() => handleRate('accurate')} className="btn-accurate">
          {mode === 'kasra' ? 'YES' : mode === 'river' ? 'Yes' : 'Yes'}
        </button>
        <button onClick={() => handleRate('partial')} className="btn-partial">
          {mode === 'kasra' ? 'PARTIAL' : mode === 'river' ? 'Somewhat' : 'Kinda'}
        </button>
        <button onClick={() => handleRate('inaccurate')} className="btn-inaccurate">
          {mode === 'kasra' ? 'NO' : mode === 'river' ? 'No' : 'No'}
        </button>
      </div>

      <style>{`
        .prediction-feedback {
          padding: 1rem;
          background: rgba(212, 168, 84, 0.05);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 8px;
        }
        .feedback-question {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          margin-bottom: 0.75rem;
          text-align: center;
        }
        .feedback-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }
        .feedback-buttons button {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-family: inherit;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 4px;
        }
        .btn-accurate {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        .btn-accurate:hover {
          background: rgba(34, 197, 94, 0.3);
        }
        .btn-partial {
          background: rgba(212, 168, 84, 0.2);
          color: #d4a854;
        }
        .btn-partial:hover {
          background: rgba(212, 168, 84, 0.3);
        }
        .btn-inaccurate {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .btn-inaccurate:hover {
          background: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}

// Hook for managing predictions
export function usePredictionTracking() {
  const [stats, setStats] = useState<AccuracyStats>({
    total: 0, accurate: 0, inaccurate: 0, partial: 0, pending: 0, rate: 0
  });
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const refresh = () => {
    setStats(getStats());
    setPredictions(getPredictions());
  };

  useEffect(() => {
    refresh();
  }, []);

  const record = (
    type: Prediction['type'],
    description: string,
    dimension?: string
  ) => {
    const id = recordPrediction(type, description, dimension);
    refresh();
    return id;
  };

  const rate = (
    id: string,
    outcome: 'accurate' | 'inaccurate' | 'partial',
    notes?: string
  ) => {
    ratePrediction(id, outcome, notes);
    refresh();
  };

  const getPending = () => predictions.filter(p => p.outcome === null);

  return { stats, predictions, record, rate, getPending, refresh };
}
