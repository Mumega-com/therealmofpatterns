import { useStore } from '@nanostores/react';
import {
  $forecast,
  $kappaPercent,
  $stageLabel,
  $muLevelLabel,
  $isInFailure
} from '../../stores';
import { KasraGauge, KappaGauge, RUGauge, MuLevelGauge } from './KasraGauge';
import { KasraCard, KasraMetric, KasraAlert } from './KasraCard';

interface KasraForecastProps {
  className?: string;
}

export function KasraForecast({ className = '' }: KasraForecastProps) {
  const forecast = useStore($forecast);
  const kappaPercent = useStore($kappaPercent);
  const stageLabel = useStore($stageLabel);
  const muLevelLabel = useStore($muLevelLabel);
  const isInFailure = useStore($isInFailure);

  return (
    <div className={`font-kasra space-y-4 ${className}`}>
      {/* Failure Mode Alert */}
      {isInFailure && (
        <KasraAlert
          type="critical"
          title={`FAILURE MODE: ${forecast.failureMode.toUpperCase()}`}
          message={getFailureModeMessage(forecast.failureMode)}
          action={{
            label: 'View Recovery Protocol',
            onClick: () => window.location.href = '/recovery',
          }}
        />
      )}

      {/* Primary Metrics */}
      <KasraCard title="Core Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KappaGauge />
          <RUGauge />
          <MuLevelGauge />
        </div>
      </KasraCard>

      {/* Stage Display */}
      <KasraCard title="Current Stage">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-kasra-data text-kasra-text uppercase">
              {forecast.stage}
            </div>
            <div className="text-kasra-caption text-kasra-muted mt-1">
              {stageLabel}
            </div>
          </div>
          <StageIndicator stage={forecast.stage} />
        </div>
      </KasraCard>

      {/* μ-Level Display */}
      <KasraCard title="μ-Level">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-kasra-data text-kasra-text">
              μ{forecast.muLevel.toFixed(1)}
            </div>
            <div className="text-kasra-caption text-kasra-muted mt-1">
              {muLevelLabel}
            </div>
          </div>
          <MuLevelBar level={forecast.muLevel} />
        </div>
      </KasraCard>

      {/* Timestamp */}
      {forecast.computedAt && (
        <div className="text-kasra-caption text-kasra-muted text-right">
          Computed: {new Date(forecast.computedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

// Stage indicator visualization
function StageIndicator({ stage }: { stage: string }) {
  const stages = ['nigredo', 'albedo', 'citrinitas', 'rubedo'];
  const colors = {
    nigredo: 'bg-gray-800',
    albedo: 'bg-gray-300',
    citrinitas: 'bg-yellow-500',
    rubedo: 'bg-red-600',
  };

  return (
    <div className="flex gap-1">
      {stages.map((s) => (
        <div
          key={s}
          className={`w-3 h-3 ${s === stage ? colors[s as keyof typeof colors] : 'bg-kasra-border'}`}
          title={s}
        />
      ))}
    </div>
  );
}

// μ-Level bar visualization
function MuLevelBar({ level }: { level: number }) {
  const maxLevel = 7;
  const segments = Array.from({ length: maxLevel + 1 }, (_, i) => i);

  return (
    <div className="flex gap-0.5">
      {segments.map((i) => (
        <div
          key={i}
          className={`w-2 h-6 ${i <= level ? 'bg-kasra-accent' : 'bg-kasra-border'}`}
          title={`μ${i}`}
        />
      ))}
    </div>
  );
}

// Failure mode messages
function getFailureModeMessage(mode: string): string {
  const messages: Record<string, string> = {
    collapse: 'System coherence has fallen below critical threshold. Immediate recalibration required.',
    inversion: 'Field polarity has inverted. Oppositional dynamics detected.',
    dissociation: 'Coupling between pattern layers has weakened. Integration protocols recommended.',
    dispersion: 'Field energy is scattering. Containment and focusing exercises advised.',
  };
  return messages[mode] || 'Unknown failure mode detected.';
}

export default KasraForecast;
