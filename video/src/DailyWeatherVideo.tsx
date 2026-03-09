/**
 * DailyWeather — 1080×1920 YouTube Shorts / Reels / TikTok
 * 30s · 8 scenes · TransitionSeries · spring reveals · planetary audio
 *
 * Layout principle: every scene uses flexbox centering so content
 * fills the full 1920px canvas. No hardcoded top: positions.
 */

import {
  AbsoluteFill, interpolate, spring,
  useCurrentFrame, useVideoConfig, Easing, Audio, staticFile,
  Sequence, Img,
} from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { noise2D } from '@remotion/noise';

// ── Brand ────────────────────────────────────────────────────────
const GOLD       = '#d4a854';
const GOLD_DIM   = 'rgba(212,168,84,0.28)';
const GOLD_FAINT = 'rgba(212,168,84,0.08)';
const BG         = '#080706';
const TEXT       = '#f0e8d8';
const TEXT_MUTED = 'rgba(240,232,216,0.50)';
const TEXT_DIM   = 'rgba(240,232,216,0.28)';
const YIN        = 'rgba(167,139,250,0.90)';
const YIN_DIM    = 'rgba(167,139,250,0.16)';
const SERIF      = "'Georgia', serif";
const SANS       = "'Helvetica Neue', Arial, sans-serif";

// Safe zone padding (top leaves room for brand overlay)
const PAD_TOP    = 190;
const PAD_SIDE   = 48;
const PAD_BOTTOM = 120;

// Scene durations: must sum to 1026 (= 900 + 7×18)
const DUR = {
  hook:      120,
  ctx:       100,
  curiosity:  90,
  arcs:      270,
  freq:      110,
  reading:   190,
  engage:     80,
  cta:        66,
  transition: 18,
};

// ── Types ─────────────────────────────────────────────────────────
export interface DailyWeatherProps {
  date: string;
  narrative: string;
  dominantPlanet: string;
  frequency: number;
  archetypes: {
    yin:  { name: string; symbol: string; quality: string };
    yang: { name: string; symbol: string; quality: string };
  };
  moonPhase: string;
  moonEmoji: string;
  dimension?: string;
  hasAudio?: boolean;
}

export const DEFAULT_WEATHER: DailyWeatherProps = {
  date: 'March 9, 2026',
  narrative: 'Saturn holds the frame. What has been deferred asks to be faced with precision. The field rewards those who show up.',
  dominantPlanet: 'Saturn',
  frequency: 147.85,
  archetypes: {
    yin:  { name: 'The Hermit',    symbol: 'H', quality: 'Withdrawal & Inner Light' },
    yang: { name: 'The Architect', symbol: 'A', quality: 'Structure & Mastery' },
  },
  moonPhase: 'Waxing Gibbous',
  moonEmoji: '🌔',
  dimension: 'Structure',
  hasAudio: false,
};

// ── Asset helpers ─────────────────────────────────────────────────
const PLANET_NAMES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const DIM_NAMES    = ['energy','body','emotion','clarity','ground'];

function planetAsset(name: string): string | null {
  const key = name.toLowerCase();
  return PLANET_NAMES.includes(key) ? staticFile(`assets/planet-${key}.png`) : null;
}

function dimensionAsset(dim?: string): string | null {
  const key = dim?.toLowerCase();
  return key && DIM_NAMES.includes(key) ? staticFile(`assets/dimension-${key}.png`) : null;
}

// ── Animation helpers ─────────────────────────────────────────────

function fi(frame: number, start: number, dur = 18) {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease,
  });
}

function fo(frame: number, start: number, dur = 18) {
  return interpolate(frame, [start, start + dur], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease,
  });
}

/** Spring slide-up: returns translateY pixels */
function su(frame: number, start: number, fps: number, dist = 32) {
  const p = spring({ frame: frame - start, fps, config: { damping: 22, stiffness: 58 } });
  return interpolate(p, [0, 1], [dist, 0]);
}

/** Spring opacity pop */
function sop(frame: number, start: number, fps: number): number {
  return Math.min(1, spring({ frame: frame - start, fps, config: { damping: 28, stiffness: 80 } }));
}

/** Spring scale reveal */
function sscale(frame: number, start: number, fps: number, from = 0.82): number {
  const p = spring({ frame: frame - start, fps, config: { damping: 20, stiffness: 55, mass: 0.9 } });
  return interpolate(p, [0, 1], [from, 1]);
}

function splitNarrative(text: string): string[] {
  const sents = text.match(/[^.!?]+[.!?]+\s*/g)
    ?.map(s => s.trim()).filter(s => s.length > 4) ?? [];
  if (sents.length >= 3) return sents.slice(0, 3);
  if (sents.length === 2) return sents;
  const words = text.split(' ');
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

// ── Scene layout wrapper ──────────────────────────────────────────
function Scene({ children, opacity = 1, translateY = 0 }: {
  children: React.ReactNode; opacity?: number; translateY?: number;
}) {
  return (
    <AbsoluteFill style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: PAD_TOP,
      paddingBottom: PAD_BOTTOM,
      paddingLeft: PAD_SIDE,
      paddingRight: PAD_SIDE,
      opacity,
      transform: `translateY(${translateY}px)`,
    }}>
      {children}
    </AbsoluteFill>
  );
}

// ── Label chip ────────────────────────────────────────────────────
function Label({ children, color = GOLD }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: SANS, fontSize: 13, letterSpacing: '0.22em',
      textTransform: 'uppercase', color, opacity: 0.6,
      marginBottom: 32,
    }}>
      {children}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────
function Divider({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      width: '100%', height: 1,
      background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)`,
      margin: '40px 0',
      ...style,
    }} />
  );
}

// ── Word-by-word reveal ───────────────────────────────────────────
function WordReveal({
  text, frame, fps, startFrame = 0, stagger = 2.5,
  color = TEXT, fontSize = 52, lineHeight = 1.65, textAlign = 'center' as const,
}: {
  text: string; frame: number; fps: number; startFrame?: number;
  stagger?: number; color?: string; fontSize?: number;
  lineHeight?: number; textAlign?: 'center' | 'left';
}) {
  const words = text.split(' ');
  return (
    <div style={{ fontFamily: SERIF, fontSize, color, lineHeight, textAlign, width: '100%' }}>
      {words.map((word, i) => {
        const wf = frame - startFrame - i * stagger;
        const p  = spring({ frame: wf, fps, config: { damping: 26, stiffness: 100 } });
        const op = interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
        const y  = interpolate(p, [0, 1], [20, 0]);
        return (
          <span key={i} style={{
            display: 'inline-block', opacity: op,
            transform: `translateY(${y}px)`, marginRight: '0.28em',
          }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────

function ParticleField({ frame, opacity }: { frame: number; opacity: number }) {
  const COUNT = 55;
  const W = 1080, H = 1920;
  const t = frame / 90;
  const particles = Array.from({ length: COUNT }, (_, i) => {
    const seed  = i * 137.508;
    const nx    = noise2D('px' + i, t * 0.3, seed) * 0.5 + 0.5;
    const ny    = noise2D('py' + i, seed, t * 0.2) * 0.5 + 0.5;
    const ns    = noise2D('ps' + i, t * 0.5, seed * 2) * 0.5 + 0.5;
    const nb    = noise2D('pb' + i, seed * 3, t * 0.4) * 0.5 + 0.5;
    return { x: nx * W, y: ny * H, size: 1 + ns * 2.8, bright: 0.12 + nb * 0.5 };
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <radialGradient id="pg" cx="50%" cy="42%" r="50%">
            <stop offset="0%"   stopColor="rgba(212,168,84,0.07)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#pg)" />
        {particles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.size} fill={GOLD} opacity={p.bright * 0.4} />
        ))}
      </svg>
    </AbsoluteFill>
  );
}

function FrequencyWave({ freq, frame, opacity, width = 940 }: {
  freq: number; frame: number; opacity: number; width?: number;
}) {
  const pts = 100, H = 120;
  const t = frame / 30;
  const path = Array.from({ length: pts }, (_, i) => {
    const x   = (i / (pts - 1)) * width;
    const env = Math.sin((i / pts) * Math.PI);
    const y   = H / 2 + (
      Math.sin((i / pts) * Math.PI * 4 + t * 2)            * 22 +
      Math.sin((i / pts) * Math.PI * 8 + t * 3 + freq * 0.01) * 10 +
      Math.sin((i / pts) * Math.PI * 2 + t * 0.7)          * 14
    ) * env;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <div style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>
        <defs>
          <linearGradient id="wg" x1="0%" x2="100%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="18%"  stopColor={GOLD} stopOpacity={0.5} />
            <stop offset="50%"  stopColor={GOLD} stopOpacity={1} />
            <stop offset="82%"  stopColor={GOLD} stopOpacity={0.5} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#wg)" strokeWidth={3} />
      </svg>
      <div style={{ fontFamily: SANS, fontSize: 18, color: GOLD, letterSpacing: '0.16em', opacity: 0.75 }}>
        {freq.toFixed(2)} Hz
      </div>
    </div>
  );
}

function OrbitalRing({ frame, opacity }: { frame: number; opacity: number }) {
  const cx = 540, cy = 540; // centered in 1080×1080 SVG
  const rot = frame * 0.1;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity }}>
      <svg width={1080} height={1080} viewBox="0 0 1080 1080" style={{ position: 'absolute' }}>
        <g transform={`rotate(${rot}, ${cx}, ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={200} ry={70}
            fill="none" stroke={GOLD_DIM} strokeWidth={1.5} />
        </g>
        <g transform={`rotate(${-rot * 0.65}, ${cx}, ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={148} ry={52}
            fill="none" stroke={GOLD_DIM} strokeWidth={1} strokeDasharray="5 9" />
        </g>
        <circle cx={cx} cy={cy} r={88}  fill="none" stroke={GOLD_DIM} strokeWidth={0.7} />
        <circle cx={cx} cy={cy} r={8} fill={GOLD} opacity={0.65} />
        <circle cx={cx} cy={cy} r={3} fill="#fff" opacity={0.4} />
      </svg>
    </div>
  );
}

function ArchSymbol({ side, size = 80 }: { side: 'yin' | 'yang'; size?: number }) {
  const color = side === 'yin' ? YIN : GOLD;
  if (side === 'yang') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <polygon points="40,5 75,40 40,75 5,40" fill="none" stroke={color} strokeWidth={2.5} opacity={0.9} />
        <polygon points="40,18 62,40 40,62 18,40" fill={color} opacity={0.14} />
        <circle cx={40} cy={40} r={6} fill={color} opacity={0.5} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx={40} cy={40} r={32} fill="none" stroke={color} strokeWidth={2.5} opacity={0.9} />
      <circle cx={52} cy={40} r={24} fill={BG} />
      <circle cx={40} cy={40} r={6} fill={color} opacity={0.6} />
    </svg>
  );
}

// ── Persistent overlay ────────────────────────────────────────────
function PersistentOverlay({ globalFrame, fps, date, frequency, hasAudio }: {
  globalFrame: number; fps: number; date: string; frequency: number; hasAudio?: boolean;
}) {
  const brandOp = fi(globalFrame, 0, 25);
  const dateOp  = fi(globalFrame, 12, 20);
  const dateY   = su(globalFrame, 12, fps, 14);

  return (
    <>
      {hasAudio && <Audio src={staticFile('daily-ambient.wav')} />}

      {/* Top gold bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />

      {/* Brand */}
      <div style={{
        position: 'absolute', top: 52, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 11, letterSpacing: '0.24em',
          textTransform: 'uppercase', color: GOLD, opacity: brandOp * 0.38,
        }}>
          The Realm of Patterns
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 22, color: TEXT, fontWeight: 300,
          opacity: dateOp * 0.8,
          transform: `translateY(${dateY}px)`,
        }}>
          {date}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        opacity: 0.3,
      }} />
    </>
  );
}

// ── SCENES ────────────────────────────────────────────────────────

/** Scene 1: Hook — large planet name fills the screen */
function HookScene({ planet, frequency }: { planet: string; frequency: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame 0 must NOT be black — it's the thumbnail
  const nameOp    = frame === 0 ? 1 : sop(frame, 0, fps);
  const nameScale = frame === 0 ? 1 : sscale(frame, 0, fps, 0.68);
  const ringOp    = fi(frame, 0, 28);
  const subOp     = sop(frame, 14, fps);
  const subY      = su(frame, 14, fps, 24);
  const hintOp    = fi(frame, 22, 25) * 0.6;
  const sigilSrc  = planetAsset(planet);
  const sigilOp   = (frame === 0 ? 0.22 : fi(frame, 4, 35) * 0.22);

  return (
    <AbsoluteFill>
      {/* Planet sigil — large, centered, glowing behind ring */}
      {sigilSrc && (
        <AbsoluteFill style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 60, // nudge below brand
        }}>
          <div style={{
            width: 720, height: 720, opacity: sigilOp,
            filter: `blur(2px) drop-shadow(0 0 80px rgba(212,168,84,0.5))`,
          }}>
            <Img src={sigilSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </AbsoluteFill>
      )}

      {/* Orbital rings — centered in full canvas */}
      <OrbitalRing frame={frame} opacity={ringOp * 0.9} />

      {/* Planet name — large, centered */}
      <Scene opacity={nameOp}>
        <div style={{
          transform: `scale(${nameScale})`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        }}>
          <div style={{
            fontFamily: SERIF, fontWeight: 700, color: GOLD,
            letterSpacing: '-0.02em', lineHeight: 0.92, textAlign: 'center',
            fontSize: planet.length > 7 ? 148 : 192,
            textShadow: `0 0 160px rgba(212,168,84,0.3), 0 0 60px rgba(212,168,84,0.15)`,
          }}>
            {planet.toUpperCase()}
          </div>

          <div style={{
            fontFamily: SANS, fontSize: 22, color: TEXT_MUTED,
            letterSpacing: '0.12em', opacity: subOp,
            transform: `translateY(${subY}px)`,
          }}>
            is shaping today's field
          </div>
        </div>

        {/* Freq hint — pushed to bottom of scene */}
        <div style={{
          position: 'absolute', bottom: 140, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          opacity: hintOp,
        }}>
          <FrequencyWave freq={frequency} frame={frame} opacity={0.7} width={880} />
          <div style={{
            fontFamily: SANS, fontSize: 13, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: TEXT_DIM,
          }}>
            field frequency · {frequency.toFixed(2)} Hz
          </div>
        </div>
      </Scene>
    </AbsoluteFill>
  );
}

/** Scene 2: Context — moon phase + dimension, large and spaced */
function ContextScene({ moonEmoji, moonPhase, dimension }: {
  moonEmoji: string; moonPhase: string; dimension?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sop(frame, 0, fps);
  const y  = su(frame, 0, fps, 32);

  return (
    <Scene opacity={op} translateY={y}>
      <Label>Today's field</Label>

      <div style={{
        width: '100%', display: 'flex',
        flexDirection: 'column', alignItems: 'center', gap: 0,
      }}>
        {/* Moon */}
        <div style={{
          textAlign: 'center', padding: '60px 0',
          width: '100%',
        }}>
          <div style={{ fontSize: 140, lineHeight: 1, marginBottom: 24 }}>{moonEmoji}</div>
          <div style={{ fontFamily: SERIF, fontSize: 36, color: TEXT, letterSpacing: '0.03em' }}>
            {moonPhase}
          </div>
        </div>

        <Divider />

        {/* Dimension */}
        <div style={{
          textAlign: 'center', padding: '60px 0',
          width: '100%',
        }}>
          <div style={{
            width: 100, height: 100, margin: '0 auto 28px',
            border: `1px solid ${GOLD_DIM}`, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={50} height={50} viewBox="0 0 50 50">
              <polygon points="25,3 47,25 25,47 3,25" fill={GOLD} opacity={0.8} />
            </svg>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 36, color: TEXT }}>
            {dimension ?? 'Field'} dimension
          </div>
          <div style={{ fontFamily: SANS, fontSize: 16, color: TEXT_MUTED, marginTop: 12, letterSpacing: '0.06em' }}>
            today's dominant pattern
          </div>
        </div>
      </div>
    </Scene>
  );
}

/** Scene 3: Curiosity gap */
function CuriosityScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op      = sop(frame, 0, fps);
  const y       = su(frame, 0, fps, 32);
  const italicOp = sop(frame, 22, fps);
  const italicY  = su(frame, 22, fps, 24);

  return (
    <Scene opacity={op} translateY={y}>
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{
          fontFamily: SERIF, fontSize: 72, color: TEXT,
          lineHeight: 1.35, marginBottom: 56,
          fontWeight: 400,
        }}>
          Two archetypes<br />are active today.
        </div>
        <div style={{
          height: 1, width: 80, margin: '0 auto 56px',
          background: GOLD_DIM,
        }} />
        <div style={{
          fontFamily: SERIF, fontSize: 52, color: GOLD, fontStyle: 'italic',
          opacity: italicOp, transform: `translateY(${italicY}px)`,
        }}>
          Which speaks to you?
        </div>
      </div>
    </Scene>
  );
}

/** Scene 4: Archetype cards — fills the full safe zone */
function ArchetypesScene({ archetypes, frequency }: {
  archetypes: DailyWeatherProps['archetypes']; frequency: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerOp = sop(frame, 0, fps);
  const labelOp     = fi(frame, 35, 20);
  const freqOp      = fi(frame, 55, 20) * 0.5;

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column',
      paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM,
      paddingLeft: 28, paddingRight: 28,
      gap: 0,
    }}>
      {/* Label */}
      <div style={{
        textAlign: 'center', marginBottom: 24, opacity: labelOp,
        fontFamily: SANS, fontSize: 12, letterSpacing: '0.28em',
        textTransform: 'uppercase', color: TEXT_MUTED,
      }}>
        YIN &nbsp;·&nbsp; vs &nbsp;·&nbsp; YANG
      </div>

      {/* Cards row — fills available height */}
      <div style={{
        flex: 1, display: 'flex', gap: 16,
        opacity: containerOp,
      }}>
        <ArchCard a={archetypes.yin}  side="yin"  frame={frame} fps={fps} delay={0} />
        <ArchCard a={archetypes.yang} side="yang" frame={frame} fps={fps} delay={12} />
      </div>

      {/* Freq strip */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 0, marginTop: 24, opacity: freqOp,
      }}>
        <FrequencyWave freq={frequency} frame={frame} opacity={0.5} width={860} />
      </div>
    </AbsoluteFill>
  );
}

function ArchCard({ a, side, frame, fps, delay = 0 }: {
  a: { name: string; symbol: string; quality: string };
  side: 'yin' | 'yang'; frame: number; fps: number; delay?: number;
}) {
  const color       = side === 'yin' ? YIN : GOLD;
  const borderColor = side === 'yin' ? YIN_DIM : GOLD_DIM;
  const bgColor     = side === 'yin' ? 'rgba(167,139,250,0.05)' : 'rgba(212,168,84,0.04)';
  const scale       = sscale(frame, delay, fps, 0.84);
  const op          = sop(frame, delay, fps);
  const archSrc     = staticFile(`assets/archetype-${side}.png`);
  const archImgOp   = fi(frame, delay + 10, 22) * 0.45;

  return (
    <div style={{
      flex: 1, background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 28,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 20,
      padding: '40px 24px',
      opacity: op, transform: `scale(${scale})`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Generated art behind */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 260, height: 260,
        opacity: archImgOp,
        filter: `blur(1px) drop-shadow(0 0 30px ${color})`,
      }}>
        <Img src={archSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      {/* Polarity badge */}
      <div style={{
        fontSize: 11, fontFamily: SANS, letterSpacing: '0.22em',
        textTransform: 'uppercase', color,
        background: side === 'yin' ? 'rgba(167,139,250,0.1)' : GOLD_FAINT,
        padding: '6px 20px', borderRadius: 20,
        position: 'relative', zIndex: 1,
      }}>
        {side === 'yin' ? 'Yin' : 'Yang'}
      </div>

      {/* Symbol */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ArchSymbol side={side} size={96} />
      </div>

      {/* Name */}
      <div style={{
        fontFamily: SERIF, fontSize: 36, color: TEXT, fontWeight: 500,
        textAlign: 'center', lineHeight: 1.2,
        position: 'relative', zIndex: 1,
      }}>
        {a.name}
      </div>

      {/* Quality */}
      <div style={{
        fontFamily: SANS, fontSize: 17, color: TEXT_MUTED,
        textAlign: 'center', lineHeight: 1.5,
        position: 'relative', zIndex: 1,
        paddingLeft: 8, paddingRight: 8,
      }}>
        {a.quality}
      </div>
    </div>
  );
}

/** Scene 5: Frequency — large wave dominates the screen */
function FreqScene({ planet, frequency }: { planet: string; frequency: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op       = sop(frame, 0, fps);
  const y        = su(frame, 0, fps, 28);
  const quoteOp  = sop(frame, 20, fps);
  const quoteY   = su(frame, 20, fps, 24);
  const numOp    = fi(frame, 32, 22) * 0.18;
  const numScale = sscale(frame, 32, fps, 0.86);

  return (
    <Scene opacity={op} translateY={y}>
      <Label color={TEXT_MUTED}>Field Frequency · {planet}</Label>

      <FrequencyWave freq={frequency} frame={frame} opacity={1} width={960} />

      <div style={{
        fontFamily: SERIF, fontSize: 42, color: TEXT, fontStyle: 'italic',
        textAlign: 'center', lineHeight: 1.6, marginTop: 48,
        opacity: quoteOp, transform: `translateY(${quoteY}px)`,
        maxWidth: 880,
      }}>
        "This is the frequency<br />you're moving through."
      </div>

      {/* Giant frequency number — decorative */}
      <div style={{
        fontFamily: SERIF, fontSize: 130, color: GOLD, fontWeight: 700,
        letterSpacing: '-0.02em', lineHeight: 1, marginTop: 48,
        opacity: numOp, transform: `scale(${numScale})`,
      }}>
        {frequency.toFixed(2)}
      </div>
      <div style={{
        fontFamily: SANS, fontSize: 14, letterSpacing: '0.3em',
        textTransform: 'uppercase', color: GOLD,
        opacity: fi(frame, 32, 22) * 0.38, marginTop: 4,
      }}>
        hertz
      </div>
    </Scene>
  );
}

/** Scene 6: Reading — word-by-word with dimension texture */
function ReadingScene({ narrative, dimension }: { narrative: string; dimension?: string }) {
  const frame  = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards   = splitNarrative(narrative);
  const cardLen = Math.floor(190 / cards.length);
  const dimSrc  = dimensionAsset(dimension);
  const dimOp   = fi(frame, 0, 45) * 0.1;

  return (
    <AbsoluteFill>
      {dimSrc && (
        <AbsoluteFill style={{ opacity: dimOp }}>
          <Img src={dimSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}

      {cards.map((text, i) => {
        const cardStart = i * cardLen;
        const cardEnd   = (i + 1) * cardLen;
        const inOp      = sop(frame, cardStart, fps);
        const outOp     = i < cards.length - 1
          ? fo(frame, cardEnd - 12, 12)
          : 1;
        const cardOp = inOp * outOp;
        const cardY  = su(frame, cardStart, fps, 32);

        return (
          <Scene key={i} opacity={cardOp} translateY={cardY}>
            {cards.length > 1 && (
              <div style={{
                fontFamily: SANS, fontSize: 11, letterSpacing: '0.22em',
                textTransform: 'uppercase', color: GOLD, opacity: 0.45,
                marginBottom: 40,
              }}>
                ☉ Sol's reading &nbsp;·&nbsp; {i + 1} of {cards.length}
              </div>
            )}
            <WordReveal
              text={text.trim()} frame={frame} fps={fps}
              startFrame={cardStart + 12} stagger={2.5}
              fontSize={58} lineHeight={1.65}
            />
            <div style={{
              width: 48, height: 2, background: GOLD,
              margin: '48px auto 0', opacity: 0.45,
            }} />
          </Scene>
        );
      })}
    </AbsoluteFill>
  );
}

/** Scene 7: Engagement */
function EngageScene({ archetypes }: { archetypes: DailyWeatherProps['archetypes'] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op       = sop(frame, 0, fps);
  const y        = su(frame, 0, fps, 28);
  const yangOp   = sop(frame, 16, fps);
  const yangScale = sscale(frame, 16, fps, 0.88);
  const yinOp    = sop(frame, 26, fps);
  const yinScale  = sscale(frame, 26, fps, 0.88);

  return (
    <Scene opacity={op} translateY={y}>
      <div style={{
        fontFamily: SERIF, fontSize: 58, color: TEXT,
        lineHeight: 1.3, textAlign: 'center', marginBottom: 64,
      }}>
        Comment below 👇
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
        <div style={{
          padding: '28px 52px', border: `1px solid ${GOLD_DIM}`,
          borderRadius: 20, fontFamily: SERIF, fontSize: 32, color: GOLD,
          width: '100%', textAlign: 'center',
          opacity: yangOp, transform: `scale(${yangScale})`,
        }}>
          ◈ &nbsp;{archetypes.yang.name}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 15, letterSpacing: '0.12em', color: TEXT_DIM }}>
          or
        </div>
        <div style={{
          padding: '28px 52px', border: `1px solid ${YIN_DIM}`,
          borderRadius: 20, fontFamily: SERIF, fontSize: 32, color: YIN,
          width: '100%', textAlign: 'center',
          opacity: yinOp, transform: `scale(${yinScale})`,
        }}>
          ◑ &nbsp;{archetypes.yin.name}
        </div>
      </div>
    </Scene>
  );
}

/** Scene 8: CTA */
function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op     = sop(frame, 0, fps);
  const y      = su(frame, 0, fps, 28);
  const btnOp  = sop(frame, 16, fps);
  const btnSc  = sscale(frame, 16, fps, 0.88);
  const urlOp  = fi(frame, 28, 20);

  return (
    <Scene opacity={op} translateY={y}>
      <div style={{
        fontFamily: SERIF, fontSize: 46, color: TEXT,
        lineHeight: 1.55, textAlign: 'center', marginBottom: 64,
        maxWidth: 900,
      }}>
        Your natal pattern shapes how you experience this field.
      </div>

      <Divider style={{ marginBottom: 56 }} />

      <div style={{
        padding: '30px 72px',
        background: `linear-gradient(135deg, ${GOLD} 0%, #c49a4a 100%)`,
        borderRadius: 20, fontFamily: SANS, fontSize: 28,
        fontWeight: 700, color: BG, letterSpacing: '0.02em',
        marginBottom: 36,
        opacity: btnOp, transform: `scale(${btnSc})`,
      }}>
        Free reading ↓
      </div>

      <div style={{
        fontFamily: SANS, fontSize: 20, color: TEXT_MUTED,
        letterSpacing: '0.08em', opacity: urlOp,
      }}>
        therealmofpatterns.com
      </div>
    </Scene>
  );
}

// ── Main composition ──────────────────────────────────────────────
export function DailyWeatherVideo(props: DailyWeatherProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { date, narrative, dominantPlanet, frequency, archetypes,
          moonPhase, moonEmoji, dimension, hasAudio } = props;

  const globalOp = frame >= durationInFrames - 38
    ? interpolate(frame, [durationInFrames - 38, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;
  const particleOp = fi(frame, 0, 55) * 0.65;

  const T = DUR.transition;

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalOp }}>
      {/* Particles — full duration, behind everything */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <ParticleField frame={frame} opacity={particleOp} />
      </Sequence>

      {/* Scene transitions */}
      <TransitionSeries>

        <TransitionSeries.Sequence durationInFrames={DUR.hook}>
          <HookScene planet={dominantPlanet} frequency={frequency} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 52 } })}
        />

        <TransitionSeries.Sequence durationInFrames={DUR.ctx}>
          <ContextScene moonEmoji={moonEmoji} moonPhase={moonPhase} dimension={dimension} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 52 } })}
        />

        <TransitionSeries.Sequence durationInFrames={DUR.curiosity}>
          <CuriosityScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 24, stiffness: 48 } })}
        />

        <TransitionSeries.Sequence durationInFrames={DUR.arcs}>
          <ArchetypesScene archetypes={archetypes} frequency={frequency} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ durationInFrames: T, config: { damping: 28, stiffness: 60 } })}
        />

        <TransitionSeries.Sequence durationInFrames={DUR.freq}>
          <FreqScene planet={dominantPlanet} frequency={frequency} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 52 } })}
        />

        <TransitionSeries.Sequence durationInFrames={DUR.reading}>
          <ReadingScene narrative={narrative} dimension={dimension} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 52 } })}
        />

        <TransitionSeries.Sequence durationInFrames={DUR.engage}>
          <EngageScene archetypes={archetypes} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ durationInFrames: T, config: { damping: 28, stiffness: 60 } })}
        />

        <TransitionSeries.Sequence durationInFrames={DUR.cta}>
          <CTAScene />
        </TransitionSeries.Sequence>

      </TransitionSeries>

      {/* Persistent brand overlay — always on top */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <PersistentOverlay
          globalFrame={frame} fps={fps}
          date={date} frequency={frequency} hasAudio={hasAudio}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
