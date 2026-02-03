import { useStore } from '@nanostores/react';
import { $kappaPercent, $forecast } from '../../stores';

interface KasraGaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  showBar?: boolean;
  className?: string;
}

export function KasraGauge({
  label,
  value,
  max = 100,
  unit = '%',
  showBar = true,
  className = '',
}: KasraGaugeProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const barWidth = `${percent}%`;

  return (
    <div className={`font-kasra ${className}`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-kasra-caption text-kasra-muted uppercase tracking-wider">
          {label}
        </span>
        <span className="text-kasra-data text-kasra-text">
          {typeof value === 'number' ? value.toFixed(2) : value}
          {unit && <span className="text-kasra-caption text-kasra-muted ml-1">{unit}</span>}
        </span>
      </div>
      {showBar && (
        <div className="gauge h-2 bg-kasra-border">
          <div
            className="gauge-fill bg-kasra-accent"
            style={{ width: barWidth }}
          />
        </div>
      )}
    </div>
  );
}

// Pre-configured gauges
export function KappaGauge({ className = '' }: { className?: string }) {
  const forecast = useStore($forecast);
  return (
    <KasraGauge
      label="κ (kappa)"
      value={forecast.kappa}
      max={1}
      unit=""
      className={className}
    />
  );
}

export function RUGauge({ className = '' }: { className?: string }) {
  const forecast = useStore($forecast);
  return (
    <KasraGauge
      label="RU (resonance)"
      value={forecast.RU}
      max={100}
      unit="RU"
      className={className}
    />
  );
}

export function MuLevelGauge({ className = '' }: { className?: string }) {
  const forecast = useStore($forecast);
  return (
    <KasraGauge
      label="μ (mu-level)"
      value={forecast.muLevel}
      max={7}
      unit=""
      showBar={false}
      className={className}
    />
  );
}
