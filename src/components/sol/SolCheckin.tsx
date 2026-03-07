import { useState, useEffect } from 'react';
import { updateForecast, setFailureMode } from '../../stores';
import { SolCard, SolButton, SolProgress, SolAlert, SolBadge } from './SolCard';
import { saveCheckin, getTodaysCheckin, getCheckinHistory, getYesterdaysKappa, type CheckinEntry } from '../../lib/checkin-storage';
import { fetchNarrative, type NarratorResult } from '../../lib/narrator-client';

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
    emoji: '○',
    question: 'What is the dominant tone in you right now?',
    options: [
      { label: 'Contracted', emoji: '◦', value: 1 },
      { label: 'Restless', emoji: '○', value: 2 },
      { label: 'Muted', emoji: '◎', value: 3 },
      { label: 'Present', emoji: '●', value: 4 },
      { label: 'Open', emoji: '◉', value: 5 },
    ],
    dimension: 'coherence',
    weight: 1.2,
  },
  {
    id: 'energy',
    emoji: '◈',
    question: 'What in you wants to move today?',
    options: [
      { label: 'Nothing stirs', emoji: '◦', value: 1 },
      { label: 'Something reluctant', emoji: '○', value: 2 },
      { label: 'A slow current', emoji: '◎', value: 3 },
      { label: 'A clear impulse', emoji: '●', value: 4 },
      { label: 'Strong momentum', emoji: '◉', value: 5 },
    ],
    dimension: 'energy',
    weight: 1.0,
  },
  {
    id: 'focus',
    emoji: '◉',
    question: 'Where does your attention rest when you stop directing it?',
    options: [
      { label: 'It scatters immediately', emoji: '◦', value: 1 },
      { label: 'It drifts and circles', emoji: '○', value: 2 },
      { label: 'It settles loosely', emoji: '◎', value: 3 },
      { label: 'It finds a natural anchor', emoji: '●', value: 4 },
      { label: 'It rests with clarity', emoji: '◉', value: 5 },
    ],
    dimension: 'focus',
    weight: 1.1,
  },
  {
    id: 'body',
    emoji: '◌',
    question: 'How present is your body to what the day is asking?',
    options: [
      { label: 'Absent — I am elsewhere', emoji: '◦', value: 1 },
      { label: 'Numb or disconnected', emoji: '○', value: 2 },
      { label: 'Dimly aware', emoji: '◎', value: 3 },
      { label: 'Grounded and present', emoji: '●', value: 4 },
      { label: 'Fully awake in it', emoji: '◉', value: 5 },
    ],
    dimension: 'embodiment',
    weight: 0.8,
  },
  {
    id: 'direction',
    emoji: '◎',
    question: 'What does the day feel like it wants from you?',
    options: [
      { label: 'Nothing — silence', emoji: '◦', value: 1 },
      { label: 'I cannot read it', emoji: '○', value: 2 },
      { label: 'A quiet direction', emoji: '◎', value: 3 },
      { label: 'Something specific', emoji: '●', value: 4 },
      { label: 'An unmistakable pull', emoji: '◉', value: 5 },
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
        scores={scores}
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

      {/* Hint */}
      <p className="text-sol-caption text-sol-muted text-center mt-4">
        First response. No analysis needed.
      </p>
    </div>
  );
}

function CheckinResult({
  kappa,
  message,
  emoji,
  scores,
  onReset,
  className,
}: {
  kappa: number;
  message: string;
  emoji: string;
  scores: Record<string, number>;
  onReset: () => void;
  className: string;
}) {
  const percent = Math.round(kappa * 100);
  const [history, setHistory] = useState<{ streak: number; entries: CheckinEntry[] }>({ streak: 0, entries: [] });
  const [delta, setDelta] = useState<number | null>(null);
  const [reading, setReading] = useState<NarratorResult | null>(null);
  const [readingStatus, setReadingStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Reminder opt-in state
  const [reminderEmail, setReminderEmail] = useState('');
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'saving' | 'set' | 'error'>('idle');
  const [isReminderActive, setIsReminderActive] = useState(false);

  useEffect(() => {
    const h = getCheckinHistory();
    setHistory({ streak: h.streak, entries: h.entries.slice(0, 7) });
    const yk = getYesterdaysKappa();
    if (yk !== null) setDelta(Math.round((kappa - yk) * 100));

    // Fetch Sol's reading immediately — will be ready by the time they finish reading the score
    fetchNarrative()
      .then((result) => {
        setReading(result);
        setReadingStatus('ready');
      })
      .catch(() => setReadingStatus('error'));

    // Pre-fill email if previously entered
    const savedEmail = localStorage.getItem('rop_reminder_email');
    if (savedEmail) setReminderEmail(savedEmail);

    // If already opted in, silently reschedule for tomorrow
    if (savedEmail && localStorage.getItem('rop_reminder_active') === 'true') {
      setIsReminderActive(true);
      scheduleReminder(savedEmail); // fire and forget
    }
  }, []);

  async function scheduleReminder(email: string) {
    try {
      const res = await fetch('/api/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          timezoneOffset: new Date().getTimezoneOffset(),
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function handleReminderSubmit() {
    const email = reminderEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    setReminderStatus('saving');
    const ok = await scheduleReminder(email);
    if (ok) {
      localStorage.setItem('rop_reminder_email', email);
      localStorage.setItem('rop_reminder_active', 'true');
      setIsReminderActive(true);
      setReminderStatus('set');
      // Background: send magic link so clicking tomorrow's reminder logs them in
      fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect: '/sol/checkin' }),
      }).catch(() => {});
    } else {
      setReminderStatus('error');
    }
  }

  const carryQuestion = getCarryQuestion(scores);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Coherence score */}
      <SolCard variant="highlight" className="text-center">
        <span className="text-4xl mb-3 block" style={{ fontFamily: 'monospace' }}>{emoji}</span>
        <div className="py-3">
          <div className="text-sol-caption text-sol-muted mb-1">Field coherence</div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-bold text-sol-accent">{percent}%</span>
            {delta !== null && (
              <span className={`text-lg font-normal ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {delta >= 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
              </span>
            )}
          </div>
          {delta !== null && (
            <div className="text-sol-caption text-sol-muted mt-0.5">vs. yesterday</div>
          )}
        </div>
        <SolProgress value={percent} showValue={false} className="mt-2" />
        <p className="text-sol-body text-sol-muted mt-4 leading-relaxed">{message}</p>
      </SolCard>

      {/* Sol's reading — inline, fetched immediately on mount */}
      <SolCard className="!p-5">
        <div className="text-[0.7rem] tracking-widest uppercase text-sol-muted mb-4">Sol's reading</div>

        {readingStatus === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
            <span style={{
              display: 'inline-block',
              width: '16px', height: '16px',
              border: '1.5px solid rgba(212,168,84,0.2)',
              borderTopColor: 'rgba(212,168,84,0.7)',
              borderRadius: '50%',
              animation: 'sol-spin 1s linear infinite',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.875rem', color: 'rgba(240,232,216,0.4)', fontStyle: 'italic' }}>
              Sol is reading the field…
            </span>
            <style>{`@keyframes sol-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {readingStatus === 'ready' && reading && (
          <div style={{ animation: 'sol-fade 0.7s ease-out' }}>
            <style>{`@keyframes sol-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`}</style>
            {reading.narrative.split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i} style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '1.1rem',
                lineHeight: '1.85',
                color: 'rgba(240,232,216,0.88)',
                marginBottom: '1.2em',
              }}>{para}</p>
            ))}
          </div>
        )}

        {readingStatus === 'error' && (
          <p style={{ fontSize: '0.875rem', color: 'rgba(240,232,216,0.4)', fontStyle: 'italic', margin: 0 }}>
            The field is quiet today.{' '}
            <a href="/reading" style={{ color: '#d4a854', textDecoration: 'none' }}>Open reading →</a>
          </p>
        )}
      </SolCard>

      {/* Carry question */}
      <SolCard className="!p-5">
        <div className="text-[0.7rem] tracking-widest uppercase text-sol-muted mb-2">A question to carry today</div>
        <p className="text-sol-body text-sol-text italic leading-relaxed">{carryQuestion}</p>
      </SolCard>

      {/* Reminder opt-in */}
      {!isReminderActive && reminderStatus !== 'set' && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(212,168,84,0.04)',
          border: '1px solid rgba(212,168,84,0.12)',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(212,168,84,0.45)', marginBottom: '0.6rem' }}>
            Save your practice
          </div>
          <p style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', color: 'rgba(240,232,216,0.5)', lineHeight: '1.5' }}>
            Get tomorrow's reminder from Sol and carry your practice across any device.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={reminderEmail}
              onChange={(e) => setReminderEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReminderSubmit()}
              style={{
                flex: 1,
                minWidth: '160px',
                padding: '0.6rem 0.875rem',
                background: 'rgba(5,6,10,0.8)',
                border: '1px solid rgba(212,168,84,0.2)',
                borderRadius: '8px',
                color: '#f0e8d8',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={handleReminderSubmit}
              disabled={reminderStatus === 'saving'}
              style={{
                padding: '0.6rem 1rem',
                background: 'rgba(212,168,84,0.12)',
                border: '1px solid rgba(212,168,84,0.3)',
                borderRadius: '8px',
                color: '#d4a854',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap' as const,
                opacity: reminderStatus === 'saving' ? 0.6 : 1,
              }}
            >
              {reminderStatus === 'saving' ? '…' : 'Remind me →'}
            </button>
          </div>
          {reminderStatus === 'error' && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'rgba(240,100,100,0.6)' }}>
              Couldn't set reminder. Try again later.
            </p>
          )}
        </div>
      )}

      {/* Reminder confirmed */}
      {(isReminderActive || reminderStatus === 'set') && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'rgba(212,168,84,0.04)',
          border: '1px solid rgba(212,168,84,0.12)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ color: 'rgba(212,168,84,0.6)', fontSize: '1rem' }}>◎</span>
          <span style={{ fontSize: '0.875rem', color: 'rgba(240,232,216,0.45)', fontStyle: 'italic' }}>
            Sol will reach out tomorrow morning.
          </span>
        </div>
      )}

      {/* Arc of the week */}
      {history.entries.length > 1 && (
        <SolCard className="!p-4">
          <div className="text-sol-caption text-sol-muted mb-3">The arc of your week</div>
          <div className="flex items-end justify-between gap-1 h-14">
            {history.entries.slice(0, 7).reverse().map((entry) => (
              <div key={entry.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-sol-accent/70 rounded-t transition-all"
                  style={{ height: `${entry.kappa * 100}%` }}
                  title={`${Math.round(entry.kappa * 100)}%`}
                />
                <span className="text-[9px] text-sol-muted">
                  {new Date(entry.timestamp).toLocaleDateString('en', { weekday: 'short' }).charAt(0)}
                </span>
              </div>
            ))}
          </div>
        </SolCard>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <SolButton variant="secondary" onClick={onReset} className="flex-1">
          Reflect again
        </SolButton>
        <SolButton href="/sol" className="flex-1">
          Return to Sol
        </SolButton>
      </div>
    </div>
  );
}

function getCarryQuestion(scores: Record<string, number>): string {
  const dims: Record<string, number> = {
    coherence: ((scores.mood || 3) + (scores.direction || 3)) / 2,
    energy: scores.energy || 3,
    focus: scores.focus || 3,
    embodiment: scores.body || 3,
  };
  const lowestDim = Object.entries(dims).sort((a, b) => a[1] - b[1])[0][0];
  const questions: Record<string, string> = {
    coherence: "What in you is seeking coherence right now that you have not yet found words for?",
    energy: "Where is your vitality actually going — not where you direct it, but where you notice it leaving?",
    focus: "What are you avoiding giving your full attention to, and what does that avoidance protect?",
    embodiment: "What is your body already knowing that your thinking has not yet caught up with?",
  };
  return questions[lowestDim];
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
    return { message: "The field shows strong coherence. Something in you is aligned with the current moment.", emoji: '◉' };
  } else if (kappa >= 0.6) {
    return { message: "The currents are favorable. The parts of you that usually pull in different directions have found a temporary accord.", emoji: '◎' };
  } else if (kappa >= 0.4) {
    return { message: "A day of mixed signals — neither collapse nor clarity. The psyche is processing something it has not yet named.", emoji: '○' };
  } else if (kappa >= 0.2) {
    return { message: "The field shows tension. What is not working in you is asking to be seen. This is not disorder — it is information.", emoji: '◌' };
  } else {
    return { message: "Something has withdrawn. When the field collapses this far, it is rarely random. What does the withdrawal know that the conscious mind does not?", emoji: '·' };
  }
}

function getAdvice(kappa: number): string {
  if (kappa >= 0.8) {
    return "High coherence days often carry a shadow: the temptation to avoid what disrupts the feeling of flow. Notice what you are deferring.";
  } else if (kappa >= 0.6) {
    return "The alignment you feel is real, but partial. Where is it absent? That gap is the most interesting thing about today.";
  } else if (kappa >= 0.4) {
    return "The mid-range is where most genuine psychological work happens — not in crisis, not in ease. What is the field consolidating?";
  } else if (kappa >= 0.2) {
    return "Low coherence often precedes a shift. Something that no longer fits is losing its grip. What have you been carrying that does not belong to you?";
  } else {
    return "The psyche sometimes needs to contract before it can expand. What the field shows as depletion may be preparation. Rest is not absence — it is a different kind of movement.";
  }
}

export default SolCheckin;
