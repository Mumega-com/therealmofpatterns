import { useStore } from '@nanostores/react';
import { $forecast, $nextWindow, type OptimalWindow } from '../../stores';
import { SolCard, SolBadge, SolButton, SolAlert } from './SolCard';

interface SolWindowsProps {
  className?: string;
}

// Friendly activity icons
const ACTIVITY_ICONS: Record<string, string> = {
  creative: '🎨',
  analytical: '🧮',
  social: '👋',
  physical: '💪',
  spiritual: '🧘',
  practical: '📋',
  rest: '😴',
  communication: '💬',
  planning: '📅',
  completion: '✅',
};

// Friendly activity names
const ACTIVITY_NAMES: Record<string, string> = {
  creative: 'Creative work',
  analytical: 'Deep thinking',
  social: 'Social time',
  physical: 'Exercise',
  spiritual: 'Meditation',
  practical: 'Getting things done',
  rest: 'Rest & recovery',
  communication: 'Important talks',
  planning: 'Planning ahead',
  completion: 'Finishing tasks',
};

export function SolWindows({ className = '' }: SolWindowsProps) {
  const forecast = useStore($forecast);
  const nextWindow = useStore($nextWindow);

  if (forecast.optimalWindows.length === 0) {
    return (
      <SolCard icon="⏰" title="Best Times" className={className}>
        <p className="text-sol-body text-sol-muted">
          No specific peak times today - you've got flexibility!
          Trust your own rhythm and do what feels right.
        </p>
      </SolCard>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Next Window Highlight */}
      {nextWindow && <NextWindowCard window={nextWindow} />}

      {/* All Windows */}
      <SolCard icon="📅" title="Today's Peak Times">
        <div className="space-y-3">
          {forecast.optimalWindows.map((window, i) => (
            <WindowItem key={i} window={window} isNext={window === nextWindow} />
          ))}
        </div>
      </SolCard>
    </div>
  );
}

function NextWindowCard({ window }: { window: OptimalWindow }) {
  const start = new Date(window.start);
  const now = new Date();
  const minutesUntil = Math.round((start.getTime() - now.getTime()) / (1000 * 60));

  const timeText = getTimeUntilText(minutesUntil);
  const activities = window.activities.slice(0, 3);

  return (
    <SolCard variant="highlight">
      <div className="flex items-start gap-4">
        <div className="text-3xl">⭐</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sol-h2 text-sol-text font-semibold">Next Peak Time</h3>
            {minutesUntil <= 0 && minutesUntil > -60 && (
              <SolBadge variant="success">Now!</SolBadge>
            )}
          </div>

          <p className="text-sol-body text-sol-muted mb-3">
            {timeText}
          </p>

          <div className="text-2xl font-semibold text-sol-text mb-3">
            {formatTime(start)}
          </div>

          <div className="flex flex-wrap gap-2">
            {activities.map((activity, i) => (
              <SolBadge key={i}>
                {ACTIVITY_ICONS[activity.toLowerCase()] || '✨'}{' '}
                {ACTIVITY_NAMES[activity.toLowerCase()] || activity}
              </SolBadge>
            ))}
          </div>

          <div className="mt-3 text-sol-caption text-sol-muted">
            Energy potential: {Math.round(window.kappa * 100)}%
          </div>
        </div>
      </div>
    </SolCard>
  );
}

function WindowItem({ window, isNext }: { window: OptimalWindow; isNext: boolean }) {
  const start = new Date(window.start);
  const end = new Date(window.end);
  const now = new Date();
  const isPast = end < now;
  const isActive = start <= now && end >= now;

  const activities = window.activities.slice(0, 2);

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border
      ${isNext ? 'border-sol-accent bg-sol-accent/5' : 'border-sol-border'}
      ${isPast ? 'opacity-50' : ''}
      ${isActive ? 'border-sol-accent animate-pulse' : ''}
    `}>
      <div className="text-xl">
        {isActive ? '🔥' : isPast ? '✓' : '⏰'}
      </div>

      <div className="flex-1">
        <div className="text-sol-body text-sol-text font-medium">
          {formatTime(start)} - {formatTime(end)}
        </div>
        <div className="text-sol-caption text-sol-muted flex items-center gap-1 mt-0.5">
          {activities.map((a, i) => (
            <span key={i}>
              {ACTIVITY_ICONS[a.toLowerCase()] || '✨'}
            </span>
          ))}
          <span className="ml-1">
            {activities.map(a => ACTIVITY_NAMES[a.toLowerCase()] || a).join(', ')}
          </span>
        </div>
      </div>

      <div className="text-sol-caption text-sol-muted">
        {isActive ? (
          <span className="text-sol-accent font-medium">Now</span>
        ) : isPast ? (
          'Done'
        ) : (
          `${Math.round(window.kappa * 100)}%`
        )}
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

function getTimeUntilText(minutes: number): string {
  if (minutes <= 0) {
    return "It's happening now! Make the most of it.";
  } else if (minutes < 60) {
    return `Coming up in ${minutes} minutes. Get ready!`;
  } else if (minutes < 120) {
    return "About an hour away. Plan accordingly!";
  } else {
    const hours = Math.round(minutes / 60);
    return `In about ${hours} hours. Something to look forward to!`;
  }
}

export default SolWindows;
