import { useStore } from '@nanostores/react';
import { $forecast, $activeAspects, type Aspect } from '../../stores';
import { RiverCard, RiverDivider, RiverInsight } from './RiverCard';

interface RiverAspectsProps {
  className?: string;
}

// Poetic names for operators (planets/celestial bodies)
const OPERATOR_POETRY: Record<string, { name: string; domain: string; symbol: string }> = {
  sun: { name: 'The Solar King', domain: 'vitality and purpose', symbol: '☉' },
  moon: { name: 'The Silver Queen', domain: 'emotion and instinct', symbol: '☽' },
  mercury: { name: 'The Swift Messenger', domain: 'thought and communication', symbol: '☿' },
  venus: { name: 'The Rose Bearer', domain: 'love and beauty', symbol: '♀' },
  mars: { name: 'The Red Warrior', domain: 'action and desire', symbol: '♂' },
  jupiter: { name: 'The Generous King', domain: 'expansion and wisdom', symbol: '♃' },
  saturn: { name: 'The Grim Teacher', domain: 'structure and limitation', symbol: '♄' },
  uranus: { name: 'The Awakener', domain: 'revolution and insight', symbol: '♅' },
  neptune: { name: 'The Veiled Dreamer', domain: 'dissolution and transcendence', symbol: '♆' },
  pluto: { name: 'The Dark Transformer', domain: 'death and rebirth', symbol: '♇' },
  node: { name: 'The Fated Path', domain: 'destiny and karma', symbol: '☊' },
  chiron: { name: 'The Wounded Healer', domain: 'healing through pain', symbol: '⚷' },
};

// Poetic descriptions of aspect types
const ASPECT_POETRY: Record<string, { name: string; quality: string; guidance: string }> = {
  conjunction: {
    name: 'The Union',
    quality: 'Two forces merge into one stream',
    guidance: 'What joins together now becomes inseparable. Pay attention to what seeds are being planted.',
  },
  opposition: {
    name: 'The Tension',
    quality: 'Two poles pull in opposite directions',
    guidance: 'Find the balance point between extremes. Neither side holds the whole truth alone.',
  },
  trine: {
    name: 'The Harmony',
    quality: 'Forces flow together in easy accord',
    guidance: 'Grace is available now. What you attempt finds support from unseen quarters.',
  },
  square: {
    name: 'The Challenge',
    quality: 'Friction generates heat and light',
    guidance: 'Difficulty is the teacher today. What resists you reveals where growth is needed.',
  },
  sextile: {
    name: 'The Opportunity',
    quality: 'A door stands open, waiting',
    guidance: 'Possibility presents itself. A small effort now yields larger returns.',
  },
};

export function RiverAspects({ className = '' }: RiverAspectsProps) {
  const forecast = useStore($forecast);
  const activeAspects = useStore($activeAspects);

  if (activeAspects.length === 0) {
    return (
      <RiverCard title="The Celestial Dance" className={className}>
        <p className="river-body italic text-center">
          The sky is quiet today. No major aspects weave their patterns through your field.
          This is a time of stillness between movements.
        </p>
      </RiverCard>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <RiverCard title="The Celestial Dance">
        <p className="river-body italic text-center mb-6">
          The heavens speak through angles of light. These are the conversations
          between powers that shape your day.
        </p>
      </RiverCard>

      {activeAspects.map((aspect, i) => (
        <AspectReading key={i} aspect={aspect} />
      ))}
    </div>
  );
}

function AspectReading({ aspect }: { aspect: Aspect }) {
  const transit = getOperatorPoetry(aspect.transitOperator);
  const natal = getOperatorPoetry(aspect.natalAnchor);
  const aspectType = ASPECT_POETRY[aspect.type] || ASPECT_POETRY.conjunction;

  const strengthWord =
    aspect.strength >= 0.8 ? 'powerfully' :
    aspect.strength >= 0.6 ? 'clearly' :
    aspect.strength >= 0.4 ? 'gently' : 'faintly';

  return (
    <RiverCard>
      {/* Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-4 text-3xl mb-2">
          <span title={transit.name}>{transit.symbol}</span>
          <span className="text-lg opacity-50">{getAspectSymbol(aspect.type)}</span>
          <span title={natal.name}>{natal.symbol}</span>
        </div>
        <div className="river-h2">{aspectType.name}</div>
        <div className="river-caption">
          {transit.name} meets your {natal.name}
        </div>
      </div>

      <RiverDivider symbol="·" />

      {/* Description */}
      <div className="mt-4 space-y-3">
        <p className="river-body">
          <span className="italic">{aspectType.quality}.</span>{' '}
          {transit.name}, who rules {transit.domain}, {strengthWord} engages
          with your natal {natal.name}, keeper of {natal.domain}.
        </p>

        <p className="river-body italic">
          {aspectType.guidance}
        </p>

        {/* Orb indicator */}
        <div className="river-caption text-center opacity-60">
          Exactitude: {aspect.orb.toFixed(1)}° from perfect aspect
        </div>
      </div>
    </RiverCard>
  );
}

function getOperatorPoetry(operator: string) {
  const key = operator.toLowerCase();
  return OPERATOR_POETRY[key] || {
    name: operator,
    domain: 'mysterious influences',
    symbol: '?',
  };
}

function getAspectSymbol(type: string): string {
  const symbols: Record<string, string> = {
    conjunction: '☌',
    opposition: '☍',
    trine: '△',
    square: '□',
    sextile: '⚹',
  };
  return symbols[type] || '·';
}

export default RiverAspects;
