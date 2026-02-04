'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { $mode } from '../../stores';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  char?: string;
}

interface MousePosition {
  x: number;
  y: number;
}

/**
 * Enhanced Hero Component for Phase 8
 *
 * Features:
 * - Kasra: Matrix-style data rain, grid parallax, glitch effects
 * - River: Nebula with particles, floating alchemical symbols, stage-aware colors
 * - Sol: Gradient blobs with gentle movement, floating shapes
 *
 * All modes have mouse-responsive parallax effects
 */
export function HeroEnhanced() {
  const mode = useStore($mode);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0.5, y: 0.5 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [greeting, setGreeting] = useState('Good morning!');
  const [isVisible, setIsVisible] = useState(false);

  // Track mouse for parallax
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Initialize particles based on mode
  useEffect(() => {
    const count = mode === 'kasra' ? 50 : mode === 'river' ? 30 : 15;
    const chars = '01アイウエオカキクケコ₿Ξ◊◇○';
    const symbols = '☿♀♂♃♄♅♆⚸⚷✧✦◈◇';

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: mode === 'kasra' ? 14 : mode === 'river' ? 2 + Math.random() * 3 : 4 + Math.random() * 8,
        speed: 0.5 + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.7,
        char: mode === 'kasra'
          ? chars[Math.floor(Math.random() * chars.length)]
          : mode === 'river'
          ? symbols[Math.floor(Math.random() * symbols.length)]
          : undefined,
      });
    }
    setParticles(newParticles);
  }, [mode]);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        y: mode === 'sol'
          ? p.y - p.speed * 0.1 // Float up slowly for Sol
          : p.y + p.speed,      // Fall down for others
        x: p.x + Math.sin(Date.now() / 1000 + p.id) * 0.1,
        ...(p.y > 100 || p.y < 0 ? { y: mode === 'sol' ? 100 : 0 } : {}),
      })));
    }, 50);
    return () => clearInterval(interval);
  }, [mode]);

  // Time-based greeting for Sol
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning!');
    else if (hour < 17) setGreeting('Good afternoon!');
    else setGreeting('Good evening!');
  }, []);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Parallax transform calculations
  const parallaxStyle = (depth: number) => ({
    transform: `translate(${(mousePos.x - 0.5) * depth * 30}px, ${(mousePos.y - 0.5) * depth * 30}px)`,
  });

  return (
    <div
      ref={containerRef}
      className={`hero-enhanced ${mode} ${isVisible ? 'visible' : ''}`}
    >
      {/* Background Layer */}
      <div className="hero-bg-layer" style={parallaxStyle(0.2)}>
        {mode === 'kasra' && <KasraBackground mousePos={mousePos} />}
        {mode === 'river' && <RiverBackground mousePos={mousePos} />}
        {mode === 'sol' && <SolBackground mousePos={mousePos} />}
      </div>

      {/* Particle Layer */}
      <div className="hero-particles" style={parallaxStyle(0.3)}>
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: mode === 'kasra' ? `${p.size}px` : undefined,
              width: mode !== 'kasra' ? `${p.size}px` : undefined,
              height: mode !== 'kasra' ? `${p.size}px` : undefined,
              opacity: p.opacity,
            }}
          >
            {p.char}
          </div>
        ))}
      </div>

      {/* Content Layer */}
      <div className="hero-content-layer">
        {/* Mode Indicator */}
        <div className="mode-indicator">
          <div className="mode-tag">
            {mode === 'kasra' && <><span className="tag-prefix">SYSTEM_</span>MODE</>}
            {mode === 'river' && 'Current Voice'}
            {mode === 'sol' && "You're in"}
          </div>
          <div className="mode-name">{mode.toUpperCase()}</div>
          <div className="mode-hint">Press K, R, or S to switch</div>
        </div>

        {/* Title */}
        <div className="hero-title">
          {mode === 'kasra' && (
            <div className="kasra-title">
              <div className="terminal-bar">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green blink" />
                <span className="terminal-name">pattern_field_v2.exe</span>
              </div>
              <h1>
                <span className="prefix">&gt;_</span>
                <span className="text glitch" data-text="PATTERN FIELD">PATTERN FIELD</span>
              </h1>
              <h2>
                <span className="prefix">&gt;_</span>
                REALTIME ANALYSIS
                <span className="cursor">|</span>
              </h2>
            </div>
          )}

          {mode === 'river' && (
            <div className="river-title">
              <div className="mandala-container" style={parallaxStyle(-0.5)}>
                <svg viewBox="0 0 200 200" className="mandala">
                  <circle cx="100" cy="100" r="90" className="ring outer" />
                  <circle cx="100" cy="100" r="70" className="ring middle" />
                  <circle cx="100" cy="100" r="50" className="ring inner" />
                  <circle cx="100" cy="100" r="15" className="center" />
                  {[0, 60, 120, 180, 240, 300].map(angle => (
                    <line
                      key={angle}
                      x1="100" y1="10" x2="100" y2="40"
                      transform={`rotate(${angle} 100 100)`}
                      className="ray"
                    />
                  ))}
                </svg>
              </div>
              <h1>
                <span className="line-1">Witness the</span>
                <span className="line-2">Cosmic Dance</span>
              </h1>
              <p className="subtitle">Where mathematics meets mystery</p>
            </div>
          )}

          {mode === 'sol' && (
            <div className="sol-title">
              <div className="wave-emoji">
                <span className="wave">&#128075;</span>
              </div>
              <h1>
                <span className="greeting">{greeting}</span>
                <span className="tagline">Know your energy,<br />own your day</span>
              </h1>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="hero-desc">
          {mode === 'kasra' && (
            <>Real-time coherence field monitoring. 16-dimensional pattern analysis. <span className="accent">κ-coefficient tracking enabled.</span></>
          )}
          {mode === 'river' && (
            <>A perpetual theater of AI-generated alchemical scenes, painting cosmic time through archetypal imagery. <em>24 hours. 24 transformations.</em></>
          )}
          {mode === 'sol' && (
            <>Get personalized energy forecasts that actually make sense. No weird jargon, just helpful insights to plan your day better.</>
          )}
        </p>

        {/* CTAs */}
        <div className="hero-ctas">
          {mode === 'kasra' && (
            <>
              <a href="/kasra/checkin" className="cta primary">
                <span className="icon">&#9881;</span>
                <span className="label">CALIBRATE SYSTEM</span>
                <span className="arrow">&rarr;</span>
              </a>
              <a href="/theater" className="cta secondary">
                <span className="icon">&#9673;</span>
                <span className="label">VIEW FEED</span>
              </a>
            </>
          )}
          {mode === 'river' && (
            <>
              <a href="/river/checkin" className="cta primary">
                <span className="symbol">&#10022;</span>
                <span className="label">Begin Your Reading</span>
              </a>
              <a href="/theater" className="cta secondary">
                <span className="symbol">&#9788;</span>
                <span className="label">Enter the Theater</span>
              </a>
            </>
          )}
          {mode === 'sol' && (
            <>
              <a href="/sol/checkin" className="cta primary">
                <span className="emoji">&#128221;</span>
                <span className="label">Quick check-in</span>
                <span className="badge">1 min</span>
              </a>
              <a href="/theater" className="cta secondary">
                <span className="emoji">&#127912;</span>
                <span className="label">See the art</span>
              </a>
            </>
          )}
        </div>

        {/* Scroll Hint */}
        <div className="scroll-hint">
          <span className="text">
            {mode === 'kasra' ? 'SCROLL_TO_CONTINUE' : mode === 'river' ? 'Discover more below' : 'Keep scrolling'}
          </span>
          <div className="arrow bounce">&darr;</div>
        </div>
      </div>

      <style>{`
        .hero-enhanced {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ========== KASRA MODE ========== */
        .hero-enhanced.kasra {
          background: #050508;
          font-family: 'Geist Mono', 'JetBrains Mono', monospace;
        }

        .hero-enhanced.kasra .hero-bg-layer {
          background:
            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .hero-enhanced.kasra .hero-bg-layer::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 70%);
        }

        .hero-enhanced.kasra .particle {
          color: #0ff;
          font-family: 'Geist Mono', monospace;
          text-shadow: 0 0 8px #0ff;
        }

        .hero-enhanced.kasra .mode-indicator {
          color: #0ff;
        }

        .hero-enhanced.kasra .mode-tag {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          opacity: 0.6;
        }

        .hero-enhanced.kasra .tag-prefix {
          color: #f0f;
        }

        .hero-enhanced.kasra .mode-name {
          font-size: 1.5rem;
          font-weight: 600;
          text-shadow: 0 0 20px #0ff;
        }

        .kasra-title .terminal-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid rgba(0, 255, 255, 0.2);
        }

        .kasra-title .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .kasra-title .dot.red { background: #ff5f56; }
        .kasra-title .dot.yellow { background: #ffbd2e; }
        .kasra-title .dot.green { background: #27c93f; }
        .kasra-title .dot.blink { animation: blink 1s infinite; }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .kasra-title .terminal-name {
          color: rgba(0, 255, 255, 0.6);
          font-size: 0.8rem;
          margin-left: auto;
        }

        .kasra-title h1 {
          font-size: clamp(2rem, 6vw, 4rem);
          font-weight: 400;
          color: #0ff;
          margin: 0;
          line-height: 1.1;
        }

        .kasra-title .prefix {
          color: #f0f;
          margin-right: 0.5rem;
        }

        .kasra-title .glitch {
          position: relative;
          animation: glitch 3s infinite;
        }

        @keyframes glitch {
          0%, 90%, 100% {
            text-shadow: 0 0 20px #0ff;
            transform: translateX(0);
          }
          92% {
            text-shadow: -2px 0 #f0f, 2px 0 #0ff;
            transform: translateX(-2px);
          }
          94% {
            text-shadow: 2px 0 #f0f, -2px 0 #0ff;
            transform: translateX(2px);
          }
        }

        .kasra-title h2 {
          font-size: clamp(1rem, 2.5vw, 1.5rem);
          font-weight: 300;
          color: rgba(0, 255, 255, 0.7);
          margin: 0.5rem 0 0;
        }

        .kasra-title .cursor {
          animation: cursor-blink 1s step-end infinite;
        }

        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .hero-enhanced.kasra .hero-desc {
          color: rgba(0, 255, 255, 0.7);
          max-width: 500px;
        }

        .hero-enhanced.kasra .hero-desc .accent {
          color: #f0f;
        }

        .hero-enhanced.kasra .cta.primary {
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid #0ff;
          color: #0ff;
        }

        .hero-enhanced.kasra .cta.primary:hover {
          background: #0ff;
          color: #050508;
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        }

        .hero-enhanced.kasra .cta.secondary {
          border: 1px solid rgba(0, 255, 255, 0.3);
          color: rgba(0, 255, 255, 0.7);
        }

        /* ========== RIVER MODE ========== */
        .hero-enhanced.river {
          background: linear-gradient(180deg, #1a1a2e 0%, #0d0d15 100%);
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        .hero-enhanced.river .hero-bg-layer {
          background:
            radial-gradient(ellipse at 30% 20%, rgba(147, 51, 234, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(212, 168, 84, 0.1) 0%, transparent 50%);
        }

        .hero-enhanced.river .particle {
          color: rgba(212, 168, 84, 0.6);
          font-size: 1.2rem;
          text-shadow: 0 0 10px rgba(212, 168, 84, 0.3);
        }

        .hero-enhanced.river .mode-indicator {
          color: rgba(212, 168, 84, 0.8);
        }

        .river-title .mandala-container {
          width: 120px;
          height: 120px;
          margin: 0 auto 1.5rem;
        }

        .river-title .mandala {
          width: 100%;
          height: 100%;
        }

        .river-title .ring {
          fill: none;
          stroke: rgba(212, 168, 84, 0.3);
          stroke-width: 1;
        }

        .river-title .ring.outer { animation: rotate-slow 30s linear infinite; }
        .river-title .ring.middle { animation: rotate-slow 20s linear infinite reverse; }
        .river-title .ring.inner { animation: rotate-slow 15s linear infinite; }

        @keyframes rotate-slow {
          from { transform: rotate(0deg); transform-origin: center; }
          to { transform: rotate(360deg); transform-origin: center; }
        }

        .river-title .center {
          fill: rgba(212, 168, 84, 0.5);
        }

        .river-title .ray {
          stroke: rgba(212, 168, 84, 0.3);
          stroke-width: 1;
        }

        .river-title h1 {
          text-align: center;
          margin: 0;
        }

        .river-title .line-1 {
          display: block;
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          font-weight: 300;
          color: rgba(240, 232, 216, 0.7);
          letter-spacing: 0.1em;
        }

        .river-title .line-2 {
          display: block;
          font-size: clamp(2.5rem, 7vw, 4.5rem);
          font-weight: 400;
          color: #d4a854;
          font-style: italic;
        }

        .river-title .subtitle {
          text-align: center;
          font-size: 1.1rem;
          color: rgba(240, 232, 216, 0.5);
          margin-top: 0.5rem;
        }

        .hero-enhanced.river .hero-desc {
          color: rgba(240, 232, 216, 0.7);
          text-align: center;
          max-width: 550px;
          font-size: 1.1rem;
          line-height: 1.7;
        }

        .hero-enhanced.river .cta.primary {
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.2) 0%, rgba(147, 51, 234, 0.1) 100%);
          border: 1px solid rgba(212, 168, 84, 0.5);
          color: #d4a854;
        }

        .hero-enhanced.river .cta.primary:hover {
          background: #d4a854;
          color: #0d0d15;
        }

        /* ========== SOL MODE ========== */
        .hero-enhanced.sol {
          background: linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%);
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .hero-enhanced.sol .hero-bg-layer {
          background:
            radial-gradient(ellipse at 20% 30%, rgba(251, 191, 36, 0.2) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 70%, rgba(251, 146, 60, 0.15) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 50%, rgba(253, 224, 71, 0.1) 0%, transparent 60%);
        }

        .hero-enhanced.sol .particle {
          background: linear-gradient(135deg, #fbbf24 0%, #fb923c 100%);
          border-radius: 50%;
          opacity: 0.3;
        }

        .hero-enhanced.sol .mode-indicator {
          color: #92400e;
        }

        .sol-title .wave-emoji {
          font-size: 4rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        .sol-title .wave {
          display: inline-block;
          animation: wave 2s ease-in-out infinite;
          transform-origin: 70% 70%;
        }

        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-10deg); }
        }

        .sol-title h1 {
          text-align: center;
          margin: 0;
        }

        .sol-title .greeting {
          display: block;
          font-size: clamp(1.5rem, 4vw, 2.5rem);
          font-weight: 600;
          color: #92400e;
        }

        .sol-title .tagline {
          display: block;
          font-size: clamp(1rem, 2.5vw, 1.5rem);
          font-weight: 400;
          color: #78350f;
          margin-top: 0.5rem;
          line-height: 1.4;
        }

        .hero-enhanced.sol .hero-desc {
          color: #78350f;
          text-align: center;
          max-width: 450px;
        }

        .hero-enhanced.sol .cta.primary {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border: none;
          color: #78350f;
          font-weight: 600;
          box-shadow: 0 4px 20px rgba(251, 191, 36, 0.3);
        }

        .hero-enhanced.sol .cta.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(251, 191, 36, 0.4);
        }

        .hero-enhanced.sol .cta.secondary {
          border: 2px solid #fbbf24;
          color: #92400e;
        }

        .hero-enhanced.sol .cta .badge {
          background: rgba(120, 53, 15, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        /* ========== SHARED STYLES ========== */
        .hero-bg-layer {
          position: absolute;
          inset: -50px;
          transition: transform 0.1s ease-out;
        }

        .hero-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          transition: left 0.1s, top 0.05s;
        }

        .hero-content-layer {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          text-align: center;
        }

        .mode-indicator {
          margin-bottom: 2rem;
        }

        .mode-tag {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.6;
        }

        .mode-name {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0.25rem 0;
        }

        .mode-hint {
          font-size: 0.7rem;
          opacity: 0.4;
        }

        .hero-title {
          margin-bottom: 2rem;
        }

        .hero-desc {
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .hero-ctas {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .cta {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.5rem;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.3s;
          cursor: pointer;
        }

        .cta.secondary {
          background: transparent;
        }

        .scroll-hint {
          position: absolute;
          bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          opacity: 0.5;
        }

        .scroll-hint .text {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .scroll-hint .arrow {
          font-size: 1.5rem;
        }

        .scroll-hint .arrow.bounce {
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(10px); }
          60% { transform: translateY(5px); }
        }

        /* Entrance animation */
        .hero-enhanced {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s, transform 0.8s;
        }

        .hero-enhanced.visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 640px) {
          .hero-ctas {
            flex-direction: column;
            width: 100%;
            max-width: 300px;
          }

          .cta {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

// Kasra Background Component
function KasraBackground({ mousePos }: { mousePos: MousePosition }) {
  return (
    <div className="kasra-bg-inner">
      <div
        className="glow-orb"
        style={{
          left: `${mousePos.x * 100}%`,
          top: `${mousePos.y * 100}%`,
        }}
      />
      <div className="scan-line" />
      <style>{`
        .kasra-bg-inner {
          position: absolute;
          inset: 0;
        }
        .glow-orb {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          pointer-events: none;
          transition: left 0.1s, top 0.1s;
        }
        .scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
          animation: scan 4s linear infinite;
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}

// River Background Component
function RiverBackground({ mousePos }: { mousePos: MousePosition }) {
  return (
    <div className="river-bg-inner">
      <div
        className="nebula-glow"
        style={{
          left: `${30 + mousePos.x * 20}%`,
          top: `${20 + mousePos.y * 20}%`,
        }}
      />
      <div className="vignette" />
      <style>{`
        .river-bg-inner {
          position: absolute;
          inset: 0;
        }
        .nebula-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(ellipse, rgba(147, 51, 234, 0.2) 0%, transparent 60%);
          transform: translate(-50%, -50%);
          filter: blur(40px);
          transition: left 0.3s, top 0.3s;
        }
        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 30%, rgba(13, 13, 21, 0.8) 100%);
        }
      `}</style>
    </div>
  );
}

// Sol Background Component
function SolBackground({ mousePos }: { mousePos: MousePosition }) {
  return (
    <div className="sol-bg-inner">
      <div
        className="warm-glow"
        style={{
          left: `${40 + mousePos.x * 20}%`,
          top: `${40 + mousePos.y * 20}%`,
        }}
      />
      <style>{`
        .sol-bg-inner {
          position: absolute;
          inset: 0;
        }
        .warm-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 60%);
          transform: translate(-50%, -50%);
          filter: blur(60px);
          transition: left 0.3s, top 0.3s;
        }
      `}</style>
    </div>
  );
}
