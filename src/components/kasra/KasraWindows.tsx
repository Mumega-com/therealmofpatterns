import { useStore } from '@nanostores/react';
import { $forecast, $nextWindow, type OptimalWindow } from '../../stores';
import { KasraCard, KasraMetric } from './KasraCard';

interface KasraWindowsProps {
  className?: string;
  maxWindows?: number;
}

export function KasraWindows({ className = '', maxWindows = 5 }: KasraWindowsProps) {
  const forecast = useStore($forecast);
  const nextWindow = useStore($nextWindow);

  const windows = forecast.optimalWindows.slice(0, maxWindows);

  if (windows.length === 0) {
    return (
      <KasraCard title="Optimal Windows" className={className}>
        <div className="text-kasra-body text-kasra-muted">
          No optimal windows calculated for current period.
        </div>
      </KasraCard>
    );
  }

  return (
    <KasraCard title="Optimal Windows" className={className}>
      {/* Next Window Highlight */}
      {nextWindow && (
        <div className="bg-kasra-accent/10 border border-kasra-accent p-3 mb-4">
          <div className="text-kasra-caption text-kasra-accent uppercase tracking-wider mb-1">
            Next Optimal Window
          </div>
          <div className="text-kasra-data text-kasra-text">
            {formatWindowTime(nextWindow)}
          </div>
          <div className="text-kasra-body text-kasra-muted mt-2">
            κ = {nextWindow.kappa.toFixed(3)}
          </div>
          {nextWindow.activities.length > 0 && (
            <div className="mt-2">
              <div className="text-kasra-caption text-kasra-muted uppercase">
                Recommended Activities:
              </div>
              <div className="text-kasra-body text-kasra-text">
                {nextWindow.activities.join(' • ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Windows */}
      <div className="space-y-2">
        {windows.map((window, i) => (
          <WindowRow key={i} window={window} isNext={window === nextWindow} />
        ))}
      </div>
    </KasraCard>
  );
}

function WindowRow({ window, isNext }: { window: OptimalWindow; isNext: boolean }) {
  const now = new Date();
  const start = new Date(window.start);
  const isPast = start < now;

  return (
    <div
      className={`flex items-center justify-between border-b border-kasra-border/50 py-2 last:border-0
        ${isNext ? 'bg-kasra-accent/5' : ''}
        ${isPast ? 'opacity-50' : ''}`}
    >
      <div className="flex-1">
        <div className="text-kasra-body text-kasra-text">
          {formatWindowTime(window)}
        </div>
        <div className="text-kasra-caption text-kasra-muted">
          {window.activities.slice(0, 3).join(' • ')}
        </div>
      </div>
      <div className="text-kasra-data text-kasra-accent ml-4">
        κ={window.kappa.toFixed(2)}
      </div>
    </div>
  );
}

// Compact view showing only next window
export function KasraNextWindow({ className = '' }: { className?: string }) {
  const nextWindow = useStore($nextWindow);

  if (!nextWindow) {
    return (
      <KasraMetric
        label="Next Window"
        value="—"
        sublabel="No windows scheduled"
        className={className}
      />
    );
  }

  const start = new Date(nextWindow.start);
  const now = new Date();
  const hoursUntil = Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <KasraMetric
      label="Next Window"
      value={hoursUntil > 0 ? `${hoursUntil}h` : 'NOW'}
      sublabel={`κ=${nextWindow.kappa.toFixed(2)} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      status={hoursUntil <= 1 ? 'warning' : 'normal'}
      className={className}
    />
  );
}

function formatWindowTime(window: OptimalWindow): string {
  const start = new Date(window.start);
  const end = new Date(window.end);

  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

  const startDate = start.toLocaleDateString(undefined, dateOpts);
  const startTime = start.toLocaleTimeString(undefined, timeOpts);
  const endTime = end.toLocaleTimeString(undefined, timeOpts);

  return `${startDate} ${startTime}–${endTime}`;
}

export default KasraWindows;
