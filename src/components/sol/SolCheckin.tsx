import { useState, useEffect } from 'react';
import { updateForecast, setFailureMode } from '../../stores';
import { SolCard, SolButton, SolProgress, SolAlert, SolBadge } from './SolCard';
import { saveCheckin, getTodaysCheckin, getCheckinHistory, type CheckinEntry } from '../../lib/checkin-storage';

interface CheckinQuestion {
  id: string;
  emoji: string;
  question: string;
  options: { label: string; emoji: string; value: number }[];
  dimension: 'coherence' | 'energy' | 'focus' | 'embodiment';
  weight: number;
}

const CHECKIN_QUESTIONS: CheckinQuestion[] = [
  {
    id: 'mood',
    emoji: '😊',
    question: 'How are you feeling right now?',
    options: [
      { label: 'Struggling', emoji: '😔', value: 1 },
      { label: 'Meh', emoji: '😐', value: 2 },
      { label: 'Okay', emoji: '🙂', value: 3 },
      { label: 'Good', emoji: '😊', value: 4 },
      { label: 'Great!', emoji: '🌟', value: 5 },
    ],
    dimension: 'coherence',
    weight: 1.2,
  },
  {
    id: 'energy',
    emoji: '⚡',
    question: "What's your energy level?",
    options: [
      { label: 'Exhausted', emoji: '🪫', value: 1 },
      { label: 'Tired', emoji: '😴', value: 2 },
      { label: 'Normal', emoji: '🔋', value: 3 },
      { label: 'Energized', emoji: '⚡', value: 4 },
      { label: 'Supercharged', emoji: '🚀', value: 5 },
    ],
    dimension: 'energy',
    weight: 1.0,
  },
  {
    id: 'focus',
    emoji: '🎯',
    question: 'How focused do you feel?',
    options: [
      { label: 'Very scattered', emoji: '🌪️', value: 1 },
      { label: 'Distracted', emoji: '👀', value: 2 },
      { label: 'So-so', emoji: '😶', value: 3 },
      { label: 'Focused', emoji: '🎯', value: 4 },
      { label: 'Laser-sharp', emoji: '⚡', value: 5 },
    ],
    dimension: 'focus',
    weight: 1.1,
  },
  {
    id: 'body',
    emoji: '🧘',
    question: 'How connected do you feel to your body?',
    options: [
      { label: 'Disconnected', emoji: '🌫️', value: 1 },
      { label: 'A bit floaty', emoji: '☁️', value: 2 },
      { label: 'Normal', emoji: '🙂', value: 3 },
      { label: 'Grounded', emoji: '🌳', value: 4 },
      { label: 'Very present', emoji: '🧘', value: 5 },
    ],
    dimension: 'embodiment',
    weight: 0.8,
  },
  {
    id: 'direction',
    emoji: '🧭',
    question: 'Do you have a clear sense of direction today?',
    options: [
      { label: 'Totally lost', emoji: '❓', value: 1 },
      { label: 'Uncertain', emoji: '🤔', value: 2 },
      { label: 'Somewhat', emoji: '🙂', value: 3 },
      { label: 'Clear', emoji: '🧭', value: 4 },
      { label: 'Crystal clear', emoji: '✨', value: 5 },
    ],
    dimension: 'coherence',
    weight: 1.0,
  },
];

interface SolCheckinProps {
  onComplete?: (kappa: number) => void;
  className?: string;
}

export function SolCheckin({ onComplete, className = '' }: SolCheckinProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<{ kappa: number; message: string; emoji: string } | null>(null);

  const currentQuestion = CHECKIN_QUESTIONS[currentIndex];
  const progress = ((currentIndex) / CHECKIN_QUESTIONS.length) * 100;

  const handleSelect = (value: number) => {
    const newScores = { ...scores, [currentQuestion.id]: value };
    setScores(newScores);

    if (currentIndex < CHECKIN_QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Calculate result
      const kappa = calculateKappa(newScores);
      const resultInfo = getResultInfo(kappa);
      setResult({ kappa, ...resultInfo });
      setIsComplete(true);

      // Update global state
      updateForecast({ kappa });
      detectAndSetFailureMode(newScores);

      // Save to localStorage
      saveCheckin(newScores, kappa, 'sol');

      onComplete?.(kappa);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setScores({});
    setIsComplete(false);
    setResult(null);
  };

  if (isComplete && result) {
    return (
      <CheckinResult
        kappa={result.kappa}
        message={result.message}
        emoji={result.emoji}
        onReset={handleReset}
        className={className}
      />
    );
  }

  return (
    <div className={`${className}`}>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sol-caption text-sol-muted">Quick check-in</span>
          <span className="text-sol-caption text-sol-text font-medium">
            {currentIndex + 1} of {CHECKIN_QUESTIONS.length}
          </span>
        </div>
        <SolProgress value={progress} showValue={false} />
      </div>

      {/* Question Card */}
      <SolCard className="text-center">
        <span className="text-4xl mb-4 block">{currentQuestion.emoji}</span>
        <h3 className="text-sol-h2 text-sol-text mb-6">{currentQuestion.question}</h3>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full p-3 rounded-lg border border-sol-border bg-sol-surface hover:border-sol-accent hover:bg-sol-accent/5 transition-all flex items-center gap-3"
            >
              <span className="text-xl">{option.emoji}</span>
              <span className="text-sol-body text-sol-text">{option.label}</span>
            </button>
          ))}
        </div>
      </SolCard>

      {/* Skip hint */}
      <p className="text-sol-caption text-sol-muted text-center mt-4">
        Just go with your gut feeling! 💭
      </p>
    </div>
  );
}

function CheckinResult({
  kappa,
  message,
  emoji,
  onReset,
  className,
}: {
  kappa: number;
  message: string;
  emoji: string;
  onReset: () => void;
  className: string;
}) {
  const percent = Math.round(kappa * 100);
  const [history, setHistory] = useState<{ streak: number; entries: CheckinEntry[] }>({ streak: 0, entries: [] });

  useEffect(() => {
    const h = getCheckinHistory();
    setHistory({ streak: h.streak, entries: h.entries.slice(0, 7) });
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <SolCard variant="highlight" className="text-center">
        <span className="text-6xl mb-4 block">{emoji}</span>
        <h2 className="text-sol-h1 text-sol-text mb-2">Check-in Complete!</h2>
        <p className="text-sol-body text-sol-muted mb-4">{message}</p>

        <div className="py-4">
          <div className="text-sol-caption text-sol-muted mb-2">Your energy score</div>
          <div className="text-5xl font-bold text-sol-accent">{percent}%</div>
        </div>

        <SolProgress value={percent} showValue={false} className="mt-2" />

        {/* Streak badge */}
        {history.streak > 1 && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-sol-accent/10 rounded-full">
            <span>🔥</span>
            <span className="text-sol-caption text-sol-accent font-medium">
              {history.streak} day streak!
            </span>
          </div>
        )}
      </SolCard>

      {/* Recent check-ins mini chart */}
      {history.entries.length > 1 && (
        <SolCard className="!p-4">
          <div className="text-sol-caption text-sol-muted mb-3">Your week at a glance</div>
          <div className="flex items-end justify-between gap-1 h-16">
            {history.entries.slice(0, 7).reverse().map((entry, i) => (
              <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-sol-accent/80 rounded-t transition-all"
                  style={{ height: `${entry.kappa * 100}%` }}
                  title={`${Math.round(entry.kappa * 100)}%`}
                />
                <span className="text-[10px] text-sol-muted">
                  {new Date(entry.timestamp).toLocaleDateString('en', { weekday: 'short' }).charAt(0)}
                </span>
              </div>
            ))}
          </div>
        </SolCard>
      )}

      <SolAlert
        type="tip"
        title="What this means"
        message={getAdvice(kappa)}
      />

      <div className="flex gap-3">
        <SolButton variant="secondary" onClick={onReset} className="flex-1">
          Check in again
        </SolButton>
        <SolButton href="/sol" className="flex-1">
          View dashboard
        </SolButton>
      </div>
    </div>
  );
}

function calculateKappa(scores: Record<string, number>): number {
  let totalWeight = 0;
  let weightedSum = 0;

  CHECKIN_QUESTIONS.forEach((q) => {
    const score = scores[q.id] || 3;
    weightedSum += (score / 5) * q.weight;
    totalWeight += q.weight;
  });

  return weightedSum / totalWeight;
}

function detectAndSetFailureMode(scores: Record<string, number>) {
  const dims: Record<string, number[]> = {
    coherence: [],
    energy: [],
    focus: [],
    embodiment: [],
  };

  CHECKIN_QUESTIONS.forEach((q) => {
    dims[q.dimension].push(scores[q.id] || 3);
  });

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 3;

  const coherence = avg(dims.coherence);
  const energy = avg(dims.energy);
  const focus = avg(dims.focus);
  const embodiment = avg(dims.embodiment);

  if (coherence < 2 && energy < 2) {
    setFailureMode('collapse', 0.7);
  } else if (coherence < 2 && focus > 3) {
    setFailureMode('inversion', 0.5);
  } else if (embodiment < 2) {
    setFailureMode('dissociation', 0.5);
  } else if (focus < 2 && energy > 3) {
    setFailureMode('dispersion', 0.5);
  } else {
    setFailureMode('healthy', 0);
  }
}

function getResultInfo(kappa: number): { message: string; emoji: string } {
  if (kappa >= 0.8) {
    return { message: "You're having an amazing day! Keep riding this wave.", emoji: '🌟' };
  } else if (kappa >= 0.6) {
    return { message: "You're doing well! Good energy and focus today.", emoji: '😊' };
  } else if (kappa >= 0.4) {
    return { message: "A pretty normal day. Nothing wrong with that!", emoji: '🙂' };
  } else if (kappa >= 0.2) {
    return { message: "Not your best day, and that's okay. Be kind to yourself.", emoji: '🌱' };
  } else {
    return { message: "Tough day. Remember: every day is different. Rest if you can.", emoji: '🤗' };
  }
}

function getAdvice(kappa: number): string {
  if (kappa >= 0.8) {
    return "Great time for important tasks, creative work, or meaningful conversations!";
  } else if (kappa >= 0.6) {
    return "You've got good momentum. Tackle your priority tasks while you're in the zone.";
  } else if (kappa >= 0.4) {
    return "Pace yourself today. Focus on must-do's and don't overcommit.";
  } else if (kappa >= 0.2) {
    return "Keep things simple. It's okay to postpone non-urgent stuff.";
  } else {
    return "Focus on basics: rest, nourishment, maybe a walk. Tomorrow's another day.";
  }
}

export default SolCheckin;
