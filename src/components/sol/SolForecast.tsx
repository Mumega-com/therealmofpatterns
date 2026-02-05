import { useStore } from '@nanostores/react';
import {
  $forecast,
  $kappaPercent,
  $stageLabel,
  $isInFailure,
  type Stage,
  type FailureMode,
} from '../../stores';
import { SolCard, SolStat, SolProgress, SolAlert, SolBadge, SolButton } from './SolCard';

interface SolForecastProps {
  className?: string;
  nextDate?: string;
}

// Friendly stage descriptions
const STAGE_INFO: Record<Stage, {
  emoji: string;
  title: string;
  description: string;
  tip: string;
}> = {
  nigredo: {
    emoji: '🌑',
    title: 'Processing Time',
    description: "You're going through a transition period. Old patterns are breaking down to make room for new growth.",
    tip: "Be gentle with yourself today. It's okay to slow down and let things settle.",
  },
  albedo: {
    emoji: '🌙',
    title: 'Clearing Phase',
    description: "Things are starting to become clearer. You're sorting through what matters and what doesn't.",
    tip: 'Good time for reflection and organizing your thoughts. Trust your instincts.',
  },
  citrinitas: {
    emoji: '☀️',
    title: 'Bright & Energized',
    description: "You're in a great flow state! Ideas come easily and things feel aligned.",
    tip: 'Take advantage of this energy. Great time for creative work or important conversations.',
  },
  rubedo: {
    emoji: '✨',
    title: 'Peak Performance',
    description: "Everything is coming together beautifully. You're operating at your best.",
    tip: 'This is your moment! Take on those big projects or make important decisions.',
  },
};

// Friendly failure mode descriptions
const FAILURE_INFO: Record<FailureMode, {
  emoji: string;
  title: string;
  description: string;
  tips: string[];
}> = {
  healthy: {
    emoji: '💚',
    title: "You're doing great!",
    description: 'Everything looks balanced and healthy.',
    tips: [],
  },
  collapse: {
    emoji: '🔋',
    title: 'Running on Empty',
    description: "Your energy is really low right now. That's okay - everyone has these days.",
    tips: [
      'Take a break if you can',
      'Avoid big decisions today',
      'Focus on basics: rest, food, water',
      "Don't be hard on yourself",
    ],
  },
  inversion: {
    emoji: '🔄',
    title: 'Things Feel Backwards',
    description: "What usually works might not work today. Your usual patterns are a bit scrambled.",
    tips: [
      'Try a different approach than usual',
      'Double-check important communications',
      'Ask for a second opinion',
      'This will pass - usually within a day',
    ],
  },
  dissociation: {
    emoji: '🧘',
    title: 'Feeling Disconnected',
    description: "You might feel a bit spacey or disconnected from yourself. That's your mind's way of coping.",
    tips: [
      'Do something physical (walk, stretch)',
      'Eat something grounding',
      'Connect with someone you trust',
      'Limit screen time if possible',
    ],
  },
  dispersion: {
    emoji: '🎯',
    title: 'Scattered Energy',
    description: "Your attention is going in too many directions. It's hard to focus on any one thing.",
    tips: [
      'Pick ONE thing to focus on',
      'Make a short list (3 items max)',
      'Turn off notifications',
      'Take things one step at a time',
    ],
  },
};

export function SolForecast({ className = '', nextDate }: SolForecastProps) {
  const forecast = useStore($forecast);
  const kappaPercent = useStore($kappaPercent);
  const isInFailure = useStore($isInFailure);

  const stageInfo = STAGE_INFO[forecast.stage];
  const failureInfo = FAILURE_INFO[forecast.failureMode];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Status Card */}
      <SolCard variant="highlight" className="text-center">
        <div className="text-4xl mb-2">{stageInfo.emoji}</div>
        <h2 className="text-sol-h1 text-sol-text mb-2">{stageInfo.title}</h2>
        <p className="text-sol-body text-sol-muted">{stageInfo.description}</p>

        <SolProgress
          value={kappaPercent}
          label="Energy Level"
          className="mt-4"
        />
      </SolCard>

      {/* Tip of the Day */}
      <SolAlert
        type="tip"
        title="Today's Tip"
        message={stageInfo.tip}
      />

      {/* Warning if in failure mode */}
      {isInFailure && (
        <SolCard>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{failureInfo.emoji}</span>
            <div>
              <h3 className="text-sol-h2 text-sol-text font-semibold">
                {failureInfo.title}
              </h3>
              <p className="text-sol-body text-sol-muted mt-1">
                {failureInfo.description}
              </p>

              <div className="mt-4">
                <div className="text-sol-caption text-sol-muted mb-2">Things that might help:</div>
                <ul className="space-y-1">
                  {failureInfo.tips.map((tip, i) => (
                    <li key={i} className="text-sol-body text-sol-text flex items-center gap-2">
                      <span className="text-sol-accent">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </SolCard>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <SolCard>
          <SolStat
            icon="⚡"
            label="Energy Score"
            value={`${kappaPercent}%`}
            description={getEnergyDescription(kappaPercent)}
          />
        </SolCard>
        <SolCard>
          <SolStat
            icon="🎯"
            label="Focus Level"
            value={`μ${forecast.muLevel.toFixed(0)}`}
            description={getFocusDescription(forecast.muLevel)}
          />
        </SolCard>
      </div>
    </div>
  );
}

function getEnergyDescription(percent: number): string {
  if (percent >= 80) return 'Feeling great!';
  if (percent >= 60) return 'Good energy';
  if (percent >= 40) return 'Moderate';
  if (percent >= 20) return 'Running low';
  return 'Needs rest';
}

function getFocusDescription(mu: number): string {
  if (mu >= 6) return 'Sharp & clear';
  if (mu >= 4) return 'Good focus';
  if (mu >= 2) return 'A bit scattered';
  return 'Need grounding';
}

export default SolForecast;
