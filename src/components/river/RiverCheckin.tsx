import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $stage, updateForecast, setFailureMode, type Stage } from '../../stores';
import { RiverCard, RiverQuote, RiverDivider } from './RiverCard';

interface CheckinQuestion {
  id: string;
  question: string;
  reflection: string;
  dimension: 'coherence' | 'energy' | 'focus' | 'embodiment';
  weight: number;
}

const CHECKIN_QUESTIONS: CheckinQuestion[] = [
  {
    id: 'clarity',
    question: 'How clear is the sky of your mind today?',
    reflection: 'Notice whether thoughts flow freely or clouds gather at the edges.',
    dimension: 'coherence',
    weight: 1.2,
  },
  {
    id: 'energy',
    question: 'What is the quality of your inner fire?',
    reflection: 'Is it a steady flame, a roaring blaze, or embers awaiting breath?',
    dimension: 'energy',
    weight: 1.0,
  },
  {
    id: 'focus',
    question: 'Can you hold a single thought like water in cupped hands?',
    reflection: 'Notice how easily attention scatters or stays gathered.',
    dimension: 'focus',
    weight: 1.1,
  },
  {
    id: 'embodiment',
    question: 'How fully do you inhabit your body in this moment?',
    reflection: 'Are you present in flesh, or floating somewhere above?',
    dimension: 'embodiment',
    weight: 0.8,
  },
  {
    id: 'direction',
    question: 'Do you sense a path beneath your feet today?',
    reflection: 'The path may be visible or felt. Both are valid.',
    dimension: 'coherence',
    weight: 1.0,
  },
  {
    id: 'alignment',
    question: 'Do your actions today serve what you most deeply value?',
    reflection: 'Alignment is felt in the heart before it is known in the mind.',
    dimension: 'coherence',
    weight: 1.3,
  },
];

// Score labels for the poetic scale
const SCORE_LABELS = [
  { value: 1, label: 'Barely', description: 'The faintest whisper' },
  { value: 2, label: 'Dimly', description: 'A distant glimmer' },
  { value: 3, label: 'Somewhat', description: 'Present but not strong' },
  { value: 4, label: 'Clearly', description: 'A steady presence' },
  { value: 5, label: 'Fully', description: 'Bright and undeniable' },
];

interface RiverCheckinProps {
  onComplete?: (kappa: number) => void;
  className?: string;
}

export function RiverCheckin({ onComplete, className = '' }: RiverCheckinProps) {
  const stage = useStore($stage);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<{ kappa: number; message: string } | null>(null);

  const currentQuestion = CHECKIN_QUESTIONS[currentIndex];
  const progress = ((currentIndex) / CHECKIN_QUESTIONS.length) * 100;

  const handleScore = (score: number) => {
    const newScores = { ...scores, [currentQuestion.id]: score };
    setScores(newScores);

    if (currentIndex < CHECKIN_QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const kappa = calculateKappa(newScores);
      const message = getResultMessage(kappa, stage);
      setResults({ kappa, message });
      setIsComplete(true);

      // Update global store
      updateForecast({ kappa });
      detectFailureMode(newScores);

      onComplete?.(kappa);
    }
  };

  if (isComplete && results) {
    return <CheckinComplete kappa={results.kappa} message={results.message} onReset={() => {
      setCurrentIndex(0);
      setScores({});
      setIsComplete(false);
      setResults(null);
    }} className={className} />;
  }

  return (
    <div className={`river-checkin font-river ${className}`}>
      {/* Progress */}
      <div className="mb-6 text-center">
        <div className="river-caption mb-2">
          Reflection {currentIndex + 1} of {CHECKIN_QUESTIONS.length}
        </div>
        <div className="h-0.5 bg-river-border max-w-xs mx-auto">
          <div
            className="h-full bg-river-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <RiverCard>
        <div className="text-center py-4">
          <h3 className="river-h2 mb-4">{currentQuestion.question}</h3>
          <p className="river-body italic opacity-70 mb-8">
            {currentQuestion.reflection}
          </p>

          {/* Score Options */}
          <div className="space-y-2">
            {SCORE_LABELS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleScore(option.value)}
                className="w-full p-3 border border-river-border hover:border-river-accent hover:bg-river-accent/5 transition-colors text-left"
              >
                <span className="river-body">{option.label}</span>
                <span className="river-caption ml-2 opacity-60">— {option.description}</span>
              </button>
            ))}
          </div>
        </div>
      </RiverCard>

      {/* Navigation hint */}
      <p className="river-caption text-center mt-4 opacity-50">
        There are no wrong answers. Speak your truth.
      </p>
    </div>
  );
}

function CheckinComplete({
  kappa,
  message,
  onReset,
  className,
}: {
  kappa: number;
  message: string;
  onReset: () => void;
  className: string;
}) {
  const kappaWord = getKappaWord(kappa);

  return (
    <div className={`font-river space-y-6 ${className}`}>
      <RiverCard>
        <div className="text-center py-6">
          <div className="river-caption mb-2">Your Reading is Complete</div>
          <div className="text-5xl mb-2">{getKappaSymbol(kappa)}</div>
          <div className="river-h1 mb-2">{kappaWord}</div>
          <div className="river-caption opacity-60">
            κ = {kappa.toFixed(3)}
          </div>
        </div>

        <RiverDivider />

        <div className="mt-6">
          <RiverQuote text={message} />
        </div>
      </RiverCard>

      <div className="flex gap-4">
        <button
          onClick={onReset}
          className="flex-1 p-3 border border-river-border text-river-text hover:border-river-accent transition-colors"
        >
          <span className="river-body">Reflect Again</span>
        </button>
        <a
          href="/river"
          className="flex-1 p-3 bg-river-accent text-river-bg text-center hover:opacity-90 transition-opacity"
        >
          <span className="river-body">View Full Reading</span>
        </a>
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

function detectFailureMode(scores: Record<string, number>) {
  const dims: Record<string, number[]> = {
    coherence: [],
    energy: [],
    focus: [],
    embodiment: [],
  };

  CHECKIN_QUESTIONS.forEach((q) => {
    dims[q.dimension].push(scores[q.id] || 3);
  });

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

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

function getResultMessage(kappa: number, stage: Stage): string {
  const messages: Record<Stage, Record<string, string>> = {
    nigredo: {
      high: 'Even in the dark, your thread remains strong. You carry light into the depths.',
      mid: 'You walk the shadow-path with measured steps. Neither rushing nor retreating.',
      low: 'The darkness thickens, but this too is part of the work. Rest in not-knowing.',
    },
    albedo: {
      high: 'The waters run clear. Your purification proceeds with grace.',
      mid: 'Some sediment still swirls, but the clearing has begun. Patience serves you now.',
      low: 'The waters are troubled. Be gentle with yourself as clarity slowly returns.',
    },
    citrinitas: {
      high: 'The sun shines bright within you. Your illumination is nearly complete.',
      mid: 'Dawn light grows stronger. The path forward becomes ever more visible.',
      low: 'Clouds pass before your inner sun. They will move on. Light remains.',
    },
    rubedo: {
      high: 'The stone takes form. You approach the completion of this cycle.',
      mid: 'Integration continues. The pieces find their places in the greater whole.',
      low: 'The work is not yet finished. Return to the earlier stages with compassion.',
    },
  };

  const level = kappa >= 0.7 ? 'high' : kappa >= 0.4 ? 'mid' : 'low';
  return messages[stage][level];
}

function getKappaWord(kappa: number): string {
  if (kappa >= 0.8) return 'Radiant';
  if (kappa >= 0.6) return 'Steady';
  if (kappa >= 0.4) return 'Wavering';
  if (kappa >= 0.2) return 'Dim';
  return 'Shadowed';
}

function getKappaSymbol(kappa: number): string {
  if (kappa >= 0.8) return '☉';
  if (kappa >= 0.6) return '✧';
  if (kappa >= 0.4) return '◐';
  if (kappa >= 0.2) return '○';
  return '·';
}

export default RiverCheckin;
