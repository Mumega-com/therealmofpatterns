'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

// ============================================
// Types
// ============================================

export type AlchemicalStage = 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';

interface StageConfig {
  name: string;
  symbol: string;
  element: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    bgDark: string;
  };
  description: {
    kasra: string;
    river: string;
    sol: string;
  };
  keywords: string[];
}

interface StageVisualizationProps {
  stage: AlchemicalStage;
  className?: string;
  interactive?: boolean;
  showInfo?: boolean;
}

// ============================================
// Stage Configuration
// ============================================

const STAGES: Record<AlchemicalStage, StageConfig> = {
  nigredo: {
    name: 'Nigredo',
    symbol: '☽',
    element: 'Earth',
    colors: {
      primary: '#1a1a2e',
      secondary: '#16213e',
      accent: '#4a4e69',
      bg: '#0a0a0f',
      bgDark: '#050508',
    },
    description: {
      kasra: 'DISSOLUTION_PHASE: Primary pattern decomposition. Baseline recalibration in progress.',
      river: 'The dark night of the soul. Here, old patterns dissolve into fertile darkness, preparing ground for what emerges.',
      sol: 'A time of letting go. Things may feel uncertain, but this is how transformation begins.',
    },
    keywords: ['dissolution', 'shadow', 'confrontation', 'breakdown', 'fertile darkness'],
  },
  albedo: {
    name: 'Albedo',
    symbol: '◯',
    element: 'Water',
    colors: {
      primary: '#e8e8e8',
      secondary: '#c5c5c5',
      accent: '#87ceeb',
      bg: '#f5f5f5',
      bgDark: '#1a1a2e',
    },
    description: {
      kasra: 'PURIFICATION_PHASE: Pattern clarity emerging. Signal-to-noise ratio improving.',
      river: 'The washing away. In the silvery light of reflection, clarity emerges from chaos.',
      sol: 'Things are starting to clear up. You can see more clearly now.',
    },
    keywords: ['purification', 'reflection', 'clarity', 'insight', 'silver light'],
  },
  citrinitas: {
    name: 'Citrinitas',
    symbol: '☀',
    element: 'Air',
    colors: {
      primary: '#ffd700',
      secondary: '#ffb347',
      accent: '#fff8dc',
      bg: '#fffbeb',
      bgDark: '#1a1510',
    },
    description: {
      kasra: 'ILLUMINATION_PHASE: Pattern recognition at peak efficiency. Golden ratio alignment.',
      river: 'The dawning of inner gold. Wisdom crystallizes from experience like morning light.',
      sol: 'Understanding is blooming. Your efforts are starting to shine through.',
    },
    keywords: ['illumination', 'wisdom', 'golden dawn', 'crystallization', 'awakening'],
  },
  rubedo: {
    name: 'Rubedo',
    symbol: '◈',
    element: 'Fire',
    colors: {
      primary: '#dc143c',
      secondary: '#8b0000',
      accent: '#ff6b6b',
      bg: '#fff5f5',
      bgDark: '#1a0a0a',
    },
    description: {
      kasra: 'INTEGRATION_PHASE: Full pattern synthesis achieved. Maximum coherence state.',
      river: 'The philosophers stone is realized. All parts unite in the sacred marriage of self.',
      sol: 'Everything is coming together. You are becoming whole.',
    },
    keywords: ['integration', 'completion', 'wholeness', 'mastery', 'sacred union'],
  },
};

// ============================================
// Main Component
// ============================================

export function StageVisualization({
  stage,
  className = '',
  interactive = true,
  showInfo = true,
}: StageVisualizationProps) {
  const mode = useStore($mode);
  const config = STAGES[stage];
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = useState(false);

  // Mouse tracking for interactive effects
  useEffect(() => {
    if (!interactive || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    };

    const el = containerRef.current;
    el.addEventListener('mousemove', handleMouseMove);
    return () => el.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      className={`stage-viz stage-viz--${stage} stage-viz--${mode} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Layer */}
      <div className="stage-bg">
        {stage === 'nigredo' && <NigredoBackground mousePos={mousePos} active={isHovered} />}
        {stage === 'albedo' && <AlbedoBackground mousePos={mousePos} active={isHovered} />}
        {stage === 'citrinitas' && <CitrinitasBackground mousePos={mousePos} active={isHovered} />}
        {stage === 'rubedo' && <RubedoBackground mousePos={mousePos} active={isHovered} />}
      </div>

      {/* Symbol Layer */}
      <div className="stage-symbol">
        <div className="symbol-container">
          <span className="symbol-glyph">{config.symbol}</span>
          <div className="symbol-ring ring-1" />
          <div className="symbol-ring ring-2" />
          <div className="symbol-ring ring-3" />
        </div>
      </div>

      {/* Info Layer */}
      {showInfo && (
        <div className="stage-info">
          <h2 className="stage-name">{config.name}</h2>
          <p className="stage-description">{config.description[mode]}</p>
          <div className="stage-element">
            <span className="element-label">{mode === 'kasra' ? 'ELEMENT:' : 'Element:'}</span>
            <span className="element-value">{config.element}</span>
          </div>
          <div className="stage-keywords">
            {config.keywords.map((kw, i) => (
              <span key={i} className="keyword">{kw}</span>
            ))}
          </div>
        </div>
      )}

      <style>{getStyles(stage, mode, config)}</style>
    </div>
  );
}

// ============================================
// Nigredo Background - Dark dissolution
// ============================================

function NigredoBackground({ mousePos, active }: { mousePos: { x: number; y: number }; active: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="nigredo-bg">
      {/* Dark gradient */}
      <div
        className="nigredo-gradient"
        style={{
          background: `radial-gradient(ellipse at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(26,26,46,0.8) 0%, rgba(10,10,15,1) 60%)`,
        }}
      />

      {/* Dissolving particles */}
      <div className="nigredo-particles">
        {particles.map(p => (
          <div
            key={p.id}
            className={`nigredo-particle ${active ? 'dissolving' : ''}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Shadow tendrils */}
      <svg className="nigredo-tendrils" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="nigredo-blur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        {[0, 1, 2, 3].map(i => (
          <path
            key={i}
            d={`M ${20 + i * 20} 100 Q ${30 + i * 15 + mousePos.x * 10} ${50 + mousePos.y * 20} ${25 + i * 18} 0`}
            fill="none"
            stroke="rgba(74,78,105,0.3)"
            strokeWidth="3"
            filter="url(#nigredo-blur)"
            className="tendril"
          />
        ))}
      </svg>

      <style>{`
        .nigredo-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .nigredo-gradient {
          position: absolute;
          inset: 0;
          transition: background 0.5s ease;
        }

        .nigredo-particles {
          position: absolute;
          inset: 0;
        }

        .nigredo-particle {
          position: absolute;
          background: #4a4e69;
          border-radius: 50%;
          opacity: 0.6;
          animation: nigredo-float 8s ease-in-out infinite;
        }

        .nigredo-particle.dissolving {
          animation: nigredo-dissolve 3s ease-out forwards;
        }

        @keyframes nigredo-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-20px) scale(0.8); opacity: 0.3; }
        }

        @keyframes nigredo-dissolve {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(0) translateY(-50px); opacity: 0; }
        }

        .nigredo-tendrils {
          position: absolute;
          inset: 0;
          opacity: 0.5;
        }

        .tendril {
          animation: tendril-wave 6s ease-in-out infinite;
        }

        @keyframes tendril-wave {
          0%, 100% { stroke-dasharray: 0 200; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 200 200; stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Albedo Background - Ethereal whites and reflections
// ============================================

function AlbedoBackground({ mousePos, active }: { mousePos: { x: number; y: number }; active: boolean }) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const addRipple = () => {
    if (!active) return;
    const newRipple = {
      id: Date.now(),
      x: mousePos.x * 100,
      y: mousePos.y * 100,
    };
    setRipples(prev => [...prev.slice(-5), newRipple]);
  };

  useEffect(() => {
    if (active) {
      const interval = setInterval(addRipple, 1500);
      return () => clearInterval(interval);
    }
  }, [active, mousePos]);

  return (
    <div className="albedo-bg">
      {/* Silvery gradient */}
      <div className="albedo-gradient" />

      {/* Reflection surface */}
      <div className="albedo-reflection">
        <div
          className="reflection-highlight"
          style={{
            left: `${mousePos.x * 100}%`,
            top: `${mousePos.y * 100}%`,
          }}
        />
      </div>

      {/* Water ripples */}
      <div className="albedo-ripples">
        {ripples.map(r => (
          <div
            key={r.id}
            className="ripple"
            style={{ left: `${r.x}%`, top: `${r.y}%` }}
          />
        ))}
      </div>

      {/* Floating light motes */}
      <div className="albedo-motes">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="mote"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        .albedo-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 50%, #c5c5c5 100%);
        }

        .albedo-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 30%, rgba(135,206,235,0.2) 0%, transparent 50%);
        }

        .albedo-reflection {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%);
        }

        .reflection-highlight {
          position: absolute;
          width: 200px;
          height: 200px;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          transition: left 0.3s ease, top 0.3s ease;
          pointer-events: none;
        }

        .albedo-ripples {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .ripple {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(135,206,235,0.5);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: ripple-expand 2s ease-out forwards;
        }

        @keyframes ripple-expand {
          0% { width: 20px; height: 20px; opacity: 1; }
          100% { width: 200px; height: 200px; opacity: 0; }
        }

        .albedo-motes {
          position: absolute;
          inset: 0;
        }

        .mote {
          position: absolute;
          width: 4px;
          height: 4px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 10px white;
          animation: mote-float 4s ease-in-out infinite;
        }

        @keyframes mote-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Citrinitas Background - Golden sunrise
// ============================================

function CitrinitasBackground({ mousePos, active }: { mousePos: { x: number; y: number }; active: boolean }) {
  return (
    <div className="citrinitas-bg">
      {/* Golden gradient */}
      <div className="citrinitas-gradient" />

      {/* Sun */}
      <div className="citrinitas-sun">
        <div className="sun-core" />
        <div className="sun-corona" />
        {/* Light rays */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="sun-ray"
            style={{
              transform: `rotate(${i * 30}deg)`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Floating golden particles */}
      <div className="citrinitas-particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="gold-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Light beams */}
      <svg className="citrinitas-beams" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[15, 35, 55, 75, 90].map((x, i) => (
          <polygon
            key={i}
            points={`${x},0 ${x + 5},0 ${x + 15},100 ${x - 5},100`}
            fill="url(#beam-gradient)"
            className="light-beam"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </svg>

      <style>{`
        .citrinitas-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: linear-gradient(180deg, #fffbeb 0%, #fff8dc 50%, #ffb347 100%);
        }

        .citrinitas-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 20%, rgba(255,215,0,0.3) 0%, transparent 60%);
        }

        .citrinitas-sun {
          position: absolute;
          top: 10%;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 120px;
        }

        .sun-core {
          position: absolute;
          inset: 30px;
          background: radial-gradient(circle, #fff 0%, #ffd700 50%, #ffb347 100%);
          border-radius: 50%;
          box-shadow: 0 0 60px rgba(255,215,0,0.8);
          animation: sun-pulse 4s ease-in-out infinite;
        }

        @keyframes sun-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 60px rgba(255,215,0,0.8); }
          50% { transform: scale(1.1); box-shadow: 0 0 80px rgba(255,215,0,1); }
        }

        .sun-corona {
          position: absolute;
          inset: 10px;
          border: 2px solid rgba(255,215,0,0.3);
          border-radius: 50%;
          animation: corona-rotate 20s linear infinite;
        }

        @keyframes corona-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sun-ray {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 4px;
          background: linear-gradient(90deg, rgba(255,215,0,0.6) 0%, transparent 100%);
          transform-origin: left center;
          animation: ray-pulse 3s ease-in-out infinite;
        }

        @keyframes ray-pulse {
          0%, 100% { opacity: 0.6; width: 200px; }
          50% { opacity: 1; width: 250px; }
        }

        .citrinitas-particles {
          position: absolute;
          inset: 0;
        }

        .gold-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #ffd700;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(255,215,0,0.8);
          animation: gold-rise 3s ease-in-out infinite;
        }

        @keyframes gold-rise {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-40px) scale(1.3); opacity: 1; }
        }

        .citrinitas-beams {
          position: absolute;
          inset: 0;
        }

        .light-beam {
          animation: beam-shimmer 4s ease-in-out infinite;
        }

        @keyframes beam-shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Rubedo Background - Integrating reds, diamond crystallization
// ============================================

function RubedoBackground({ mousePos, active }: { mousePos: { x: number; y: number }; active: boolean }) {
  return (
    <div className="rubedo-bg">
      {/* Deep red gradient */}
      <div
        className="rubedo-gradient"
        style={{
          background: `radial-gradient(ellipse at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(220,20,60,0.6) 0%, rgba(139,0,0,0.3) 50%, transparent 80%)`,
        }}
      />

      {/* Central diamond */}
      <div className="rubedo-diamond">
        <div className="diamond-shape">
          <div className="diamond-facet facet-1" />
          <div className="diamond-facet facet-2" />
          <div className="diamond-facet facet-3" />
          <div className="diamond-facet facet-4" />
          <div className="diamond-core" />
        </div>
        <div className="diamond-glow" />
      </div>

      {/* Crystallizing particles */}
      <div className="rubedo-crystals">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="crystal"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 4}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Fire particles */}
      <div className="rubedo-fire">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="ember"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        .rubedo-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: linear-gradient(180deg, #2d0a0a 0%, #1a0505 50%, #0f0303 100%);
        }

        .rubedo-gradient {
          position: absolute;
          inset: 0;
          transition: background 0.5s ease;
        }

        .rubedo-diamond {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .diamond-shape {
          width: 100px;
          height: 100px;
          position: relative;
          animation: diamond-rotate 20s linear infinite;
        }

        @keyframes diamond-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .diamond-facet {
          position: absolute;
          width: 0;
          height: 0;
        }

        .facet-1 {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          border-left: 35px solid transparent;
          border-right: 35px solid transparent;
          border-bottom: 50px solid rgba(220,20,60,0.6);
        }

        .facet-2 {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          border-left: 35px solid transparent;
          border-right: 35px solid transparent;
          border-top: 50px solid rgba(139,0,0,0.6);
        }

        .facet-3 {
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          border-top: 35px solid transparent;
          border-bottom: 35px solid transparent;
          border-right: 50px solid rgba(255,107,107,0.4);
        }

        .facet-4 {
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          border-top: 35px solid transparent;
          border-bottom: 35px solid transparent;
          border-left: 50px solid rgba(255,107,107,0.4);
        }

        .diamond-core {
          position: absolute;
          inset: 30%;
          background: radial-gradient(circle, #fff 0%, #dc143c 50%, #8b0000 100%);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          animation: core-pulse 3s ease-in-out infinite;
        }

        @keyframes core-pulse {
          0%, 100% { opacity: 0.8; filter: brightness(1); }
          50% { opacity: 1; filter: brightness(1.3); }
        }

        .diamond-glow {
          position: absolute;
          inset: -50px;
          background: radial-gradient(circle, rgba(220,20,60,0.4) 0%, transparent 60%);
          animation: glow-pulse 4s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        .rubedo-crystals {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .crystal {
          position: absolute;
          width: 8px;
          height: 16px;
          background: linear-gradient(180deg, #ff6b6b 0%, #dc143c 50%, #8b0000 100%);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          animation: crystal-form 4s ease-in-out infinite;
        }

        @keyframes crystal-form {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        .rubedo-fire {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100px;
          overflow: hidden;
        }

        .ember {
          position: absolute;
          bottom: 0;
          width: 6px;
          height: 6px;
          background: #ff6b6b;
          border-radius: 50%;
          animation: ember-rise 2s ease-out infinite;
        }

        @keyframes ember-rise {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Styles
// ============================================

function getStyles(stage: AlchemicalStage, mode: string, config: StageConfig): string {
  const isDark = mode === 'kasra' || mode === 'river';

  return `
    .stage-viz {
      position: relative;
      width: 100%;
      min-height: 500px;
      overflow: hidden;
      border-radius: ${mode === 'kasra' ? '0' : '16px'};
      font-family: ${mode === 'kasra' ? "'Geist Mono', monospace" : mode === 'river' ? "'Cormorant Garamond', serif" : "'Inter', sans-serif"};
    }

    .stage-bg {
      position: absolute;
      inset: 0;
    }

    /* Symbol */
    .stage-symbol {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
    }

    .symbol-container {
      position: relative;
      width: 150px;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .symbol-glyph {
      font-size: 4rem;
      color: ${config.colors.accent};
      text-shadow: 0 0 30px ${config.colors.primary};
      animation: symbol-breathe 4s ease-in-out infinite;
    }

    @keyframes symbol-breathe {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.1); opacity: 1; }
    }

    .symbol-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid ${config.colors.accent}40;
      animation: ring-expand 6s ease-out infinite;
    }

    .ring-1 { width: 80px; height: 80px; animation-delay: 0s; }
    .ring-2 { width: 110px; height: 110px; animation-delay: 2s; }
    .ring-3 { width: 140px; height: 140px; animation-delay: 4s; }

    @keyframes ring-expand {
      0% { transform: scale(0.8); opacity: 0; }
      50% { opacity: 0.5; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    /* Info */
    .stage-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 2rem;
      background: linear-gradient(180deg, transparent 0%, ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'} 30%);
      z-index: 3;
    }

    .stage-name {
      font-size: ${mode === 'river' ? '2.5rem' : '2rem'};
      font-weight: ${mode === 'kasra' ? '600' : '400'};
      color: ${config.colors.primary};
      margin-bottom: 0.5rem;
      ${mode === 'kasra' ? 'text-transform: uppercase; letter-spacing: 0.2em;' : ''}
      ${mode === 'river' ? 'font-style: italic;' : ''}
    }

    .stage-description {
      font-size: ${mode === 'river' ? '1.1rem' : '0.95rem'};
      color: ${isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'};
      line-height: 1.6;
      max-width: 600px;
      margin-bottom: 1rem;
    }

    .stage-element {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .element-label {
      font-size: 0.75rem;
      color: ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'};
      ${mode === 'kasra' ? 'text-transform: uppercase; letter-spacing: 0.1em;' : ''}
    }

    .element-value {
      font-size: 0.9rem;
      color: ${config.colors.primary};
      font-weight: 500;
    }

    .stage-keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .keyword {
      font-size: 0.7rem;
      padding: 0.25rem 0.75rem;
      background: ${config.colors.primary}20;
      border: 1px solid ${config.colors.primary}40;
      border-radius: ${mode === 'kasra' ? '0' : '20px'};
      color: ${config.colors.primary};
      ${mode === 'kasra' ? 'text-transform: uppercase; letter-spacing: 0.05em;' : ''}
    }
  `;
}

// ============================================
// Stage Card (Compact Version)
// ============================================

export function StageCard({ stage, className = '' }: { stage: AlchemicalStage; className?: string }) {
  const mode = useStore($mode);
  const config = STAGES[stage];

  return (
    <div className={`stage-card stage-card--${stage} stage-card--${mode} ${className}`}>
      <div className="card-symbol">{config.symbol}</div>
      <div className="card-content">
        <h3 className="card-name">{config.name}</h3>
        <p className="card-desc">{config.description[mode]}</p>
      </div>
      <style>{`
        .stage-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: ${config.colors.bg};
          border: 1px solid ${config.colors.primary}30;
          border-radius: ${mode === 'kasra' ? '0' : '12px'};
          transition: all 0.3s ease;
        }

        .stage-card:hover {
          border-color: ${config.colors.primary};
          transform: translateY(-2px);
          box-shadow: 0 8px 24px ${config.colors.primary}20;
        }

        .card-symbol {
          font-size: 2rem;
          color: ${config.colors.primary};
          line-height: 1;
        }

        .card-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: ${config.colors.primary};
          margin-bottom: 0.25rem;
          font-family: ${mode === 'kasra' ? "'Geist Mono', monospace" : mode === 'river' ? "'Cormorant Garamond', serif" : "'Inter', sans-serif"};
        }

        .card-desc {
          font-size: 0.85rem;
          color: ${mode === 'kasra' || mode === 'river' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'};
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

export default StageVisualization;
