import { useStore } from '@nanostores/react';
import { $forecast, $nextWindow, type OptimalWindow } from '../../stores';
import { RiverCard, RiverDivider, RiverQuote } from './RiverCard';

interface RiverWindowsProps {
  className?: string;
}

// Poetic activity translations
const ACTIVITY_POETRY: Record<string, string> = {
  creative: 'the arts and making',
  analytical: 'study and discernment',
  social: 'communion with others',
  physical: 'movement and the body',
  spiritual: 'contemplation and prayer',
  practical: 'worldly tasks and duties',
  rest: 'stillness and recovery',
  communication: 'words spoken and written',
  planning: 'seeding future intentions',
  completion: 'finishing what was begun',
};

export function RiverWindows({ className = '' }: RiverWindowsProps) {
  const forecast = useStore($forecast);
  const nextWindow = useStore($nextWindow);

  if (forecast.optimalWindows.length === 0) {
    return (
      <RiverCard title="The Hours of Power" className={className}>
        <p className="river-body italic text-center">
          No particular windows call out from the weave today.
          Trust your own rhythm. The pattern supports all hours equally.
        </p>
      </RiverCard>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Introduction */}
      <RiverCard title="The Hours of Power">
        <p className="river-body italic text-center">
          Certain hours hold special charge. The cosmic loom weaves moments
          of heightened potential into each day. These are your windows of grace.
        </p>
      </RiverCard>

      {/* Next Window Highlight */}
      {nextWindow && <NextWindowPoetic window={nextWindow} />}

      {/* All Windows */}
      <RiverCard title="Today's Sacred Hours">
        <div className="space-y-4">
          {forecast.optimalWindows.map((window, i) => (
            <WindowRow key={i} window={window} isNext={window === nextWindow} />
          ))}
        </div>
      </RiverCard>
    </div>
  );
}

function NextWindowPoetic({ window }: { window: OptimalWindow }) {
  const start = new Date(window.start);
  const now = new Date();
  const hoursUntil = Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60));

  const timeDescription = getTimeDescription(hoursUntil);
  const activities = window.activities.map(a => ACTIVITY_POETRY[a.toLowerCase()] || a).join(', ');

  return (
    <RiverCard>
      <div className="text-center">
        <div className="river-caption mb-2">The Next Opening</div>
        <div className="river-h1 mb-2">{formatTime(start)}</div>
        <p className="river-body italic mb-4">{timeDescription}</p>

        <RiverDivider symbol="☉" />

        <div className="mt-4">
          <p className="river-body mb-2">
            The pattern favors: <span className="italic">{activities}</span>
          </p>
          <div className="river-caption">
            Coherence potential: {(window.kappa * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </RiverCard>
  );
}

function WindowRow({ window, isNext }: { window: OptimalWindow; isNext: boolean }) {
  const start = new Date(window.start);
  const end = new Date(window.end);
  const now = new Date();
  const isPast = start < now && end < now;
  const isActive = start <= now && end >= now;

  const activities = window.activities.slice(0, 3).map(a =>
    ACTIVITY_POETRY[a.toLowerCase()] || a
  );

  return (
    <div className={`
      p-3 border-l-2
      ${isNext ? 'border-river-accent bg-river-accent/5' : 'border-river-border'}
      ${isPast ? 'opacity-40' : ''}
      ${isActive ? 'border-river-accent animate-pulse' : ''}
    `}>
      <div className="flex items-start justify-between">
        <div>
          <div className="river-body">
            {formatTime(start)} — {formatTime(end)}
          </div>
          <div className="river-caption italic mt-1">
            Favors {activities.join(', ')}
          </div>
        </div>
        <div className="river-caption">
          {isActive && <span className="text-river-accent">NOW</span>}
          {!isActive && !isPast && `κ ${(window.kappa * 100).toFixed(0)}%`}
          {isPast && 'passed'}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getTimeDescription(hoursUntil: number): string {
  if (hoursUntil <= 0) {
    return 'The window opens now. Step through while the light is bright.';
  } else if (hoursUntil === 1) {
    return 'Within the hour, a door will open. Prepare yourself.';
  } else if (hoursUntil <= 3) {
    return `In ${hoursUntil} hours, the pattern aligns. Use this time to ready your intentions.`;
  } else if (hoursUntil <= 6) {
    return 'The opening comes later today. There is time to prepare.';
  } else {
    return 'The window waits in the distance. Let anticipation build.';
  }
}

export default RiverWindows;
