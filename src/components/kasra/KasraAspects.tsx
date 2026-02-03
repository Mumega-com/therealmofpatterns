import { useStore } from '@nanostores/react';
import { $forecast, $activeAspects, type Aspect } from '../../stores';
import { KasraCard, KasraTable } from './KasraCard';

interface KasraAspectsProps {
  className?: string;
  showAll?: boolean;
}

export function KasraAspects({ className = '', showAll = false }: KasraAspectsProps) {
  const forecast = useStore($forecast);
  const activeAspects = useStore($activeAspects);

  const aspects = showAll ? forecast.aspects : activeAspects;

  if (aspects.length === 0) {
    return (
      <KasraCard title="Active Aspects" className={className}>
        <div className="text-kasra-body text-kasra-muted">
          No significant aspects detected for current period.
        </div>
      </KasraCard>
    );
  }

  return (
    <KasraCard title="Active Aspects" className={className}>
      <div className="space-y-3">
        {aspects.map((aspect, i) => (
          <AspectRow key={i} aspect={aspect} />
        ))}
      </div>
    </KasraCard>
  );
}

function AspectRow({ aspect }: { aspect: Aspect }) {
  const typeSymbols: Record<string, string> = {
    conjunction: '☌',
    opposition: '☍',
    trine: '△',
    square: '□',
    sextile: '⚹',
  };

  const strengthPercent = Math.round(aspect.strength * 100);
  const strengthColor =
    strengthPercent >= 80 ? 'text-kasra-critical' :
    strengthPercent >= 60 ? 'text-kasra-warning' :
    'text-kasra-accent';

  return (
    <div className="flex items-center justify-between border-b border-kasra-border/50 pb-2 last:border-0 last:pb-0">
      <div className="flex items-center gap-2">
        <span className="text-kasra-data text-kasra-text w-8">
          {typeSymbols[aspect.type] || '?'}
        </span>
        <div>
          <div className="text-kasra-body text-kasra-text">
            {aspect.transitOperator} → {aspect.natalAnchor}
          </div>
          <div className="text-kasra-caption text-kasra-muted">
            {aspect.type} (orb: {aspect.orb.toFixed(1)}°)
          </div>
        </div>
      </div>
      <div className={`text-kasra-data ${strengthColor}`}>
        {strengthPercent}%
      </div>
    </div>
  );
}

// Compact table view for aspects
export function KasraAspectsTable({ className = '' }: { className?: string }) {
  const forecast = useStore($forecast);

  if (forecast.aspects.length === 0) {
    return null;
  }

  const headers = ['Type', 'Transit', 'Natal', 'Str%', 'Orb'];
  const rows = forecast.aspects.map((a) => [
    a.type.slice(0, 4).toUpperCase(),
    a.transitOperator,
    a.natalAnchor,
    Math.round(a.strength * 100),
    a.orb.toFixed(1) + '°',
  ]);

  return (
    <KasraCard title="Aspects Matrix" className={className}>
      <KasraTable headers={headers} rows={rows} />
    </KasraCard>
  );
}

export default KasraAspects;
