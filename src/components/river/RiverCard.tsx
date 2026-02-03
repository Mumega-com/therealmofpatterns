import type { ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { $stage, type Stage } from '../../stores';

interface RiverCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  stage?: Stage;
}

export function RiverCard({ title, children, className = '', stage: propStage }: RiverCardProps) {
  const currentStage = useStore($stage);
  const stage = propStage || currentStage;

  return (
    <div className={`river-card river-card-${stage} ${className}`}>
      {title && (
        <h3 className="river-card-title">{title}</h3>
      )}
      <div className="river-card-content">
        {children}
      </div>
    </div>
  );
}

interface RiverQuoteProps {
  text: string;
  source?: string;
  className?: string;
}

export function RiverQuote({ text, source, className = '' }: RiverQuoteProps) {
  const stage = useStore($stage);

  return (
    <blockquote className={`river-quote river-quote-${stage} ${className}`}>
      <p className="river-quote-text">{text}</p>
      {source && (
        <cite className="river-quote-source">— {source}</cite>
      )}
    </blockquote>
  );
}

interface RiverInsightProps {
  title: string;
  body: string;
  symbol?: string;
  className?: string;
}

export function RiverInsight({ title, body, symbol, className = '' }: RiverInsightProps) {
  const stage = useStore($stage);

  return (
    <div className={`river-insight river-insight-${stage} ${className}`}>
      {symbol && (
        <div className="river-insight-symbol">{symbol}</div>
      )}
      <div className="river-insight-content">
        <h4 className="river-insight-title">{title}</h4>
        <p className="river-insight-body">{body}</p>
      </div>
    </div>
  );
}

interface RiverDividerProps {
  symbol?: string;
  className?: string;
}

export function RiverDivider({ symbol = '✧', className = '' }: RiverDividerProps) {
  return (
    <div className={`river-divider ${className}`}>
      <span className="river-divider-line" />
      <span className="river-divider-symbol">{symbol}</span>
      <span className="river-divider-line" />
    </div>
  );
}

// Stage-specific decorative elements
export function StageGlyph({ className = '' }: { className?: string }) {
  const stage = useStore($stage);

  const glyphs: Record<Stage, string> = {
    nigredo: '☽',  // Moon - dissolution
    albedo: '✧',   // Star - purification
    citrinitas: '☉', // Sun - illumination
    rubedo: '♦',   // Diamond - integration
  };

  const labels: Record<Stage, string> = {
    nigredo: 'Nigredo',
    albedo: 'Albedo',
    citrinitas: 'Citrinitas',
    rubedo: 'Rubedo',
  };

  return (
    <div className={`stage-glyph stage-glyph-${stage} ${className}`}>
      <span className="stage-glyph-symbol">{glyphs[stage]}</span>
      <span className="stage-glyph-label">{labels[stage]}</span>
    </div>
  );
}
