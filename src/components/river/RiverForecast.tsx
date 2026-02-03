import { useStore } from '@nanostores/react';
import {
  $forecast,
  $stage,
  $stageLabel,
  $isInFailure,
  type Stage,
  type FailureMode,
} from '../../stores';
import { RiverCard, RiverQuote, RiverInsight, RiverDivider, StageGlyph } from './RiverCard';

interface RiverForecastProps {
  className?: string;
}

// Poetic descriptions for each stage
const STAGE_POETRY: Record<Stage, {
  opening: string;
  guidance: string;
  closing: string;
}> = {
  nigredo: {
    opening: 'You walk now through the dark night of the soul, where old forms dissolve into fertile chaos.',
    guidance: 'Do not resist the dissolution. What falls away was never truly yours. In the blackening, seeds of transformation wait beneath the surface.',
    closing: 'Honor the darkness. It is the womb of all becoming.',
  },
  albedo: {
    opening: 'The waters begin to clear. What was confused now separates into its essential nature.',
    guidance: 'This is a time of purification and discernment. Wash away what no longer serves. The white light reveals truth that darkness concealed.',
    closing: 'In clarity, find your reflection. Know yourself as you are.',
  },
  citrinitas: {
    opening: 'The golden dawn rises within you. Illumination spreads through every chamber of your being.',
    guidance: 'This is a time of awakening wisdom. The sun of consciousness shines upon your work. Let its light guide your choices and actions.',
    closing: 'Carry this light forward. It is the treasure you have earned.',
  },
  rubedo: {
    opening: 'You stand at the threshold of integration. The red stone forms from all that has been transformed.',
    guidance: 'Now is the time to embody your realizations. What you have learned must become what you are. The philosopher\'s stone is your own unified being.',
    closing: 'The work completes itself in you. You are the opus.',
  },
};

// Poetic translations for failure modes
const FAILURE_POETRY: Record<FailureMode, {
  title: string;
  message: string;
  guidance: string;
}> = {
  healthy: {
    title: 'The Pattern Holds',
    message: 'Your field resonates in harmony with the greater dance.',
    guidance: 'Continue as you are. The way is open.',
  },
  collapse: {
    title: 'The Tower Falls',
    message: 'The structures you depended upon crumble. But remember: what falls was built on sand.',
    guidance: 'Surrender to the dissolution. From these ruins, a stronger foundation will rise. Rest now. Rebuild slowly.',
  },
  inversion: {
    title: 'The Mirror Turns',
    message: 'What was above is now below. The compass spins. Your north is not where you thought.',
    guidance: 'Do not trust familiar paths today. What seems right may lead astray. Wait for the polarity to stabilize.',
  },
  dissociation: {
    title: 'The Threads Loosen',
    message: 'Body, heart, and mind drift apart like ships on separate currents.',
    guidance: 'Return to breath. Return to flesh. Weave yourself back together through simple, embodied action.',
  },
  dispersion: {
    title: 'The Winds Scatter',
    message: 'Your attention is everywhere and therefore nowhere. The center cannot hold.',
    guidance: 'Choose one thing. Let all else fall away for now. In focus, find your anchor.',
  },
};

export function RiverForecast({ className = '' }: RiverForecastProps) {
  const forecast = useStore($forecast);
  const stage = useStore($stage);
  const isInFailure = useStore($isInFailure);

  const stagePoetry = STAGE_POETRY[stage];
  const failurePoetry = FAILURE_POETRY[forecast.failureMode];

  return (
    <div className={`river-forecast font-river ${className}`}>
      {/* Stage Header */}
      <div className="text-center mb-8">
        <StageGlyph className="mb-4" />
        <h2 className="river-h1">Today's Reading</h2>
      </div>

      {/* Failure Mode (if present) */}
      {isInFailure && (
        <>
          <RiverCard className="mb-6">
            <div className="text-center">
              <h3 className="river-h2 text-river-warning mb-3">{failurePoetry.title}</h3>
              <p className="river-body italic mb-4">{failurePoetry.message}</p>
              <RiverDivider symbol="⚠" />
              <p className="river-body mt-4">{failurePoetry.guidance}</p>
            </div>
          </RiverCard>
        </>
      )}

      {/* Stage Poetry */}
      <RiverCard title="The Stage You Walk">
        <p className="river-body italic mb-4">{stagePoetry.opening}</p>
        <p className="river-body mb-4">{stagePoetry.guidance}</p>
        <RiverQuote text={stagePoetry.closing} />
      </RiverCard>

      <RiverDivider className="my-6" />

      {/* Kappa as poetic metaphor */}
      <RiverCard title="The Thread of Coherence">
        <KappaPoetic kappa={forecast.kappa} />
      </RiverCard>

      <RiverDivider className="my-6" />

      {/* Mu-Level */}
      <RiverCard title="The Ladder of Being">
        <MuLevelPoetic muLevel={forecast.muLevel} />
      </RiverCard>
    </div>
  );
}

function KappaPoetic({ kappa }: { kappa: number }) {
  let description: string;
  let symbol: string;

  if (kappa >= 0.8) {
    description = 'The golden thread runs strong through your being. You are woven tightly into the pattern of meaning. Actions and intentions align like stars in constellation.';
    symbol = '✧✧✧';
  } else if (kappa >= 0.6) {
    description = 'The thread holds well, though some strands may fray. You are connected to your purpose, though distractions may tug at the weave.';
    symbol = '✧✧';
  } else if (kappa >= 0.4) {
    description = 'The thread is present but stretched thin. You sense the pattern but sometimes lose its shape. Attention to the weave will strengthen it.';
    symbol = '✧';
  } else if (kappa >= 0.2) {
    description = 'The thread weakens. The pattern grows hard to see. This is a time to step back, to rest, to let the loom reset itself.';
    symbol = '○';
  } else {
    description = 'The thread has nearly slipped away. But even in this moment, a single fiber remains. Hold to it. It is enough.';
    symbol = '·';
  }

  return (
    <div className="text-center">
      <div className="text-4xl mb-4">{symbol}</div>
      <div className="river-caption mb-2">Coherence: {(kappa * 100).toFixed(0)}%</div>
      <p className="river-body italic">{description}</p>
    </div>
  );
}

function MuLevelPoetic({ muLevel }: { muLevel: number }) {
  const levels = [
    { name: 'The Quantum Depths', desc: 'Below all form, pure potential stirs' },
    { name: 'The Molecular Dance', desc: 'Patterns begin to crystallize from chaos' },
    { name: 'The Cellular Pulse', desc: 'Life remembers itself through repetition' },
    { name: 'The Sentient Heart', desc: 'Feeling emerges from the great weave' },
    { name: 'The Conceptual Mind', desc: 'Thought illuminates the dark waters' },
    { name: 'The Archetypal Realm', desc: 'Ancient forms guide from behind the veil' },
    { name: 'The Noetic Heights', desc: 'Direct knowing beyond all symbol' },
    { name: 'The Unified Field', desc: 'All layers sing as one voice' },
  ];

  const currentLevel = levels[Math.min(Math.round(muLevel), 7)];
  const roundedLevel = Math.round(muLevel);

  return (
    <div>
      <div className="text-center mb-4">
        <div className="river-h2">{currentLevel.name}</div>
        <div className="river-caption">μ-Level {roundedLevel}</div>
      </div>
      <p className="river-body italic text-center mb-6">{currentLevel.desc}</p>

      {/* Visual representation */}
      <div className="flex flex-col items-center gap-1">
        {levels.map((level, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 w-full max-w-xs ${
              i === roundedLevel ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <span className="river-caption w-8 text-right">μ{i}</span>
            <div className={`flex-1 h-1 ${i <= roundedLevel ? 'bg-river-accent' : 'bg-river-border'}`} />
            <span className="river-caption w-8">{i === roundedLevel ? '←' : ''}</span>
          </div>
        )).reverse()}
      </div>
    </div>
  );
}

export default RiverForecast;
