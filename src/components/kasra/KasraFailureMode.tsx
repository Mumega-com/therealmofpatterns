import { useStore } from '@nanostores/react';
import { $forecast, $isHealthy, $isInFailure, type FailureMode } from '../../stores';
import { KasraCard, KasraMetric, KasraAlert } from './KasraCard';
import { KasraGauge } from './KasraGauge';

interface KasraFailureModeProps {
  className?: string;
  showDetails?: boolean;
}

const FAILURE_DATA: Record<FailureMode, {
  title: string;
  description: string;
  symptoms: string[];
  recovery: string[];
  color: string;
}> = {
  healthy: {
    title: 'System Nominal',
    description: 'All parameters within operational bounds. Coherence coupling stable.',
    symptoms: [],
    recovery: [],
    color: 'text-kasra-accent',
  },
  collapse: {
    title: 'Field Collapse',
    description: 'Coherence has dropped below critical threshold. Pattern field integrity compromised.',
    symptoms: [
      'Sudden loss of motivation or direction',
      'Overwhelming fatigue or numbness',
      'Difficulty maintaining focus',
      'Sense of disconnection from self',
    ],
    recovery: [
      'Reduce external stimulation immediately',
      'Focus on basic physical needs (rest, food, hydration)',
      'Avoid major decisions for 24-48 hours',
      'Engage grounding exercises (physical movement, nature)',
    ],
    color: 'text-kasra-critical',
  },
  inversion: {
    title: 'Polarity Inversion',
    description: 'Field polarity has reversed. Normal responses are inverted.',
    symptoms: [
      'Actions produce opposite of intended results',
      'Strong attraction to usually avoided patterns',
      'Difficulty recognizing familiar situations',
      'Sense of being "out of phase"',
    ],
    recovery: [
      'Pause all major initiatives',
      'Review recent decisions for reversed assumptions',
      'Seek external perspective from trusted sources',
      'Wait for natural re-alignment (typically 72h)',
    ],
    color: 'text-kasra-warning',
  },
  dissociation: {
    title: 'Layer Dissociation',
    description: 'Coupling between μ-levels has weakened. Pattern integration failing.',
    symptoms: [
      'Thoughts disconnected from feelings',
      'Actions not aligned with values',
      'Difficulty feeling embodied',
      'Sense of watching self from outside',
    ],
    recovery: [
      'Engage somatic practices (body scan, movement)',
      'Journal to reconnect thought and feeling',
      'Practice presence-oriented activities',
      'Reduce abstract thinking, increase concrete action',
    ],
    color: 'text-kasra-warning',
  },
  dispersion: {
    title: 'Field Dispersion',
    description: 'Pattern energy is scattering across too many focal points.',
    symptoms: [
      'Unable to maintain focus on single task',
      'Energy spread thin across many projects',
      'Starting many things, completing few',
      'Constant sense of distraction',
    ],
    recovery: [
      'Ruthlessly prioritize: choose ONE focus',
      'Eliminate or pause non-essential commitments',
      'Create physical containment (clean space, lists)',
      'Set strict time boundaries for activities',
    ],
    color: 'text-kasra-warning',
  },
};

export function KasraFailureMode({ className = '', showDetails = true }: KasraFailureModeProps) {
  const forecast = useStore($forecast);
  const isHealthy = useStore($isHealthy);

  const data = FAILURE_DATA[forecast.failureMode];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status Card */}
      <KasraCard title="System Status">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-kasra-data ${data.color} uppercase`}>
              {data.title}
            </div>
            <div className="text-kasra-body text-kasra-muted mt-1">
              {data.description}
            </div>
          </div>
          <StatusIndicator mode={forecast.failureMode} severity={forecast.failureSeverity} />
        </div>

        {!isHealthy && (
          <KasraGauge
            label="Severity"
            value={forecast.failureSeverity * 100}
            max={100}
            unit="%"
            className="mt-4"
          />
        )}
      </KasraCard>

      {/* Details (if in failure and showDetails) */}
      {!isHealthy && showDetails && (
        <>
          <KasraCard title="Symptoms">
            <ul className="space-y-2">
              {data.symptoms.map((symptom, i) => (
                <li key={i} className="text-kasra-body text-kasra-text flex items-start gap-2">
                  <span className="text-kasra-muted">›</span>
                  {symptom}
                </li>
              ))}
            </ul>
          </KasraCard>

          <KasraCard title="Recovery Protocol">
            <ol className="space-y-2">
              {data.recovery.map((step, i) => (
                <li key={i} className="text-kasra-body text-kasra-text flex items-start gap-2">
                  <span className="text-kasra-accent font-mono">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </KasraCard>
        </>
      )}
    </div>
  );
}

function StatusIndicator({ mode, severity }: { mode: FailureMode; severity: number }) {
  const isHealthy = mode === 'healthy';

  if (isHealthy) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-kasra-accent rounded-full animate-pulse" />
        <span className="text-kasra-caption text-kasra-accent uppercase">ONLINE</span>
      </div>
    );
  }

  const severityLevel = severity >= 0.7 ? 'CRITICAL' : severity >= 0.4 ? 'WARNING' : 'ALERT';
  const severityColor = severity >= 0.7 ? 'bg-kasra-critical' : 'bg-kasra-warning';

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 ${severityColor} rounded-full animate-pulse`} />
      <span className="text-kasra-caption text-kasra-critical uppercase">{severityLevel}</span>
    </div>
  );
}

// Compact status badge
export function KasraStatusBadge({ className = '' }: { className?: string }) {
  const forecast = useStore($forecast);
  const isHealthy = useStore($isHealthy);

  if (isHealthy) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 bg-kasra-accent/20 text-kasra-accent text-kasra-caption uppercase ${className}`}>
        <span className="w-2 h-2 bg-kasra-accent rounded-full" />
        NOMINAL
      </div>
    );
  }

  const color = forecast.failureSeverity >= 0.7 ? 'kasra-critical' : 'kasra-warning';

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-${color}/20 text-${color} text-kasra-caption uppercase ${className}`}>
      <span className={`w-2 h-2 bg-${color} rounded-full animate-pulse`} />
      {forecast.failureMode.toUpperCase()}
    </div>
  );
}

export default KasraFailureMode;
