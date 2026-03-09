/**
 * DailyWeather — 1080×1920 YouTube Shorts / Reels / TikTok
 * 30s · 8 scenes · TransitionSeries · spring reveals · word-by-word reading
 *
 * Scene layout (900 frames total):
 *   Hook (120f) → slide → Context (100f) → slide → Curiosity (90f)
 *   → slide → Archetypes (270f) → fade → Frequency (110f)
 *   → slide → Reading (190f) → slide → Engage (80f) → fade → CTA (66f)
 *   Each transition = 18f spring. Total: 1026 - 7×18 = 900 ✓
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
const GOLD_DIM   = 'rgba(212,168,84,0.30)';
const GOLD_FAINT = 'rgba(212,168,84,0.08)';
const BG         = '#080706';
const TEXT       = '#f0e8d8';
const TEXT_MUTED = 'rgba(240,232,216,0.50)';
const YIN        = 'rgba(167,139,250,0.90)';
const YIN_DIM    = 'rgba(167,139,250,0.18)';
const SERIF      = "'Georgia', serif";
const SANS       = "'Helvetica Neue', Arial, sans-serif";

// Scene durations — must sum to 1026 (= 900 + 7×18)
const DUR = {
  hook:     120,
  ctx:      100,
  curiosity: 90,
  arcs:     270,
  freq:     110,
  reading:  190,
  engage:    80,
  cta:       66,
  transition: 18,
};

// ── Asset helpers ────────────────────────────────────────────────
const PLANET_NAMES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
const DIM_NAMES    = ['energy','body','emotion','clarity','ground'];

function planetAsset(name: string): string | null {
  const key = name.toLowerCase();
  if (PLANET_NAMES.includes(key)) return staticFile(`assets/planet-${key}.png`);
  return null;
}

function dimensionAsset(dim?: string): string | null {
  const key = dim?.toLowerCase();
  if (key && DIM_NAMES.includes(key)) return staticFile(`assets/dimension-${key}.png`);
  return null;
}

// ── Types ────────────────────────────────────────────────────────
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

// ── Animation helpers ────────────────────────────────────────────

/** Fade in: 0→1 over `dur` frames starting at `start` */
function fi(frame: number, start: number, dur = 18) {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease,
  });
}

/** Spring slide-up: returns translateY pixels */
function su(frame: number, start: number, fps: number, dist = 28) {
  const p = spring({ frame: frame - start, fps, config: { damping: 22, stiffness: 60 } });
  return interpolate(p, [0, 1], [dist, 0]);
}

/** Spring pop opacity: 0→1 with spring physics */
function sop(frame: number, start: number, fps: number): number {
  return Math.min(1, spring({ frame: frame - start, fps, config: { damping: 28, stiffness: 80 } }));
}

/** Spring scale reveal: 0.82→1 with bounce */
function sscale(frame: number, start: number, fps: number, from = 0.82): number {
  const p = spring({ frame: frame - start, fps, config: { damping: 20, stiffness: 55, mass: 0.9 } });
  return interpolate(p, [0, 1], [from, 1]);
}

function splitNarrative(text: string): string[] {
  const sents = text.match(/[^.!?]+[.!?]+\s*/g)
    ?.map(s => s.trim()).filter(s => s.length > 4) ?? [];
  if (sents.length >= 3) return sents.slice(0, 3);
  if (sents.length === 2) return sents;
  const comma = text.indexOf(',');
  if (comma > 20 && comma < text.length - 15)
    return [text.slice(0, comma + 1).trim(), text.slice(comma + 1).trim()];
  const words = text.split(' ');
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

// ── Word-by-word reveal ──────────────────────────────────────────
function WordReveal({
  text, frame, fps, startFrame = 0, stagger = 2.5, color = TEXT, fontSize = 54,
}: {
  text: string; frame: number; fps: number; startFrame?: number;
  stagger?: number; color?: string; fontSize?: number;
}) {
  const words = text.split(' ');
  return (
    <span style={{ fontFamily: SERIF, fontSize, color, lineHeight: 1.6 }}>
      {words.map((word, i) => {
        const wf = frame - startFrame - i * stagger;
        const p = spring({ frame: wf, fps, config: { damping: 26, stiffness: 100 } });
        const opacity = interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
        const y = interpolate(p, [0, 1], [16, 0]);
        return (
          <span key={i} style={{
            display: 'inline-block',
            opacity,
            transform: `translateY(${y}px)`,
            marginRight: '0.3em',
          }}>
            {word}
          </span>
        );
      })}
    </span>
  );
}

// ── Shared visual components ─────────────────────────────────────

function ParticleField({ frame, opacity }: { frame: number; opacity: number }) {
  const COUNT = 60;
  const W = 1080, H = 1920;
  const t = frame / 90;

  const particles = Array.from({ length: COUNT }, (_, i) => {
    const seed = i * 137.508;
    const nx = noise2D('px' + i, t * 0.3, seed) * 0.5 + 0.5;
    const ny = noise2D('py' + i, seed, t * 0.2) * 0.5 + 0.5;
    const ns = noise2D('ps' + i, t * 0.5, seed * 2) * 0.5 + 0.5;
    const nb = noise2D('pb' + i, seed * 3, t * 0.4) * 0.5 + 0.5;
    return { x: nx * W, y: ny * H, size: 1 + ns * 2.5, bright: 0.15 + nb * 0.55 };
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <radialGradient id="pg" cx="50%" cy="35%" r="55%">
            <stop offset="0%"   stopColor="rgba(212,168,84,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#pg)" />
        {particles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.size} fill={GOLD} opacity={p.bright * 0.45} />
        ))}
      </svg>
    </AbsoluteFill>
  );
}

function FrequencyWave({ freq, frame, opacity }: { freq: number; frame: number; opacity: number }) {
  const pts = 90, W = 980, H = 100;
  const t = frame / 30;
  const path = Array.from({ length: pts }, (_, i) => {
    const x   = (i / (pts - 1)) * W;
    const env = Math.sin((i / pts) * Math.PI);
    const y   = H / 2 + (
      Math.sin((i / pts) * Math.PI * 4 + t * 2)      * 20 +
      Math.sin((i / pts) * Math.PI * 8 + t * 3 + freq * 0.01) * 9 +
      Math.sin((i / pts) * Math.PI * 2 + t * 0.7)    * 13
    ) * env;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <div style={{ opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="wg" x1="0%" x2="100%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="20%"  stopColor={GOLD} stopOpacity={0.55} />
            <stop offset="50%"  stopColor={GOLD} stopOpacity={1} />
            <stop offset="80%"  stopColor={GOLD} stopOpacity={0.55} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#wg)" strokeWidth={2.5} />
      </svg>
      <div style={{ fontFamily: SANS, fontSize: 16, color: GOLD, letterSpacing: '0.14em', opacity: 0.8 }}>
        {freq.toFixed(2)} Hz
      </div>
    </div>
  );
}

function ArchSymbol({ side }: { side: 'yin' | 'yang' }) {
  const color = side === 'yin' ? YIN : GOLD;
  const size  = 64;
  if (side === 'yang') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64">
        <polygon points="32,4 60,32 32,60 4,32" fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
        <polygon points="32,14 50,32 32,50 14,32" fill={color} opacity={0.15} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={24} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
      <circle cx={40} cy={32} r={18} fill={BG} />
      <circle cx={32} cy={32} r={4} fill={color} opacity={0.6} />
    </svg>
  );
}

function ArchCard({
  a, side, frame, fps, delay = 0,
}: {
  a: { name: string; symbol: string; quality: string };
  side: 'yin' | 'yang';
  frame: number; fps: number; delay?: number;
}) {
  const color       = side === 'yin' ? YIN : GOLD;
  const borderColor = side === 'yin' ? YIN_DIM : GOLD_DIM;
  const bgColor     = side === 'yin' ? 'rgba(167,139,250,0.05)' : 'rgba(212,168,84,0.04)';
  const scale       = sscale(frame, delay, fps, 0.82);
  const op          = sop(frame, delay, fps);
  // Use generated archetype image when available
  const archSrc     = staticFile(`assets/archetype-${side}.png`);
  const archImgOp   = fi(frame, delay + 8, 20) * 0.55;

  return (
    <div style={{
      flex: 1, background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 24, padding: '52px 28px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      opacity: op,
      transform: `scale(${scale})`,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Generated archetype symbol behind content */}
      <div style={{
        position: 'absolute', top: 20, left: '50%',
        transform: 'translateX(-50%)',
        width: 180, height: 180,
        opacity: archImgOp,
        filter: `blur(0.5px) drop-shadow(0 0 24px ${color})`,
        pointerEvents: 'none',
      }}>
        <Img src={archSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      <div style={{
        fontSize: 10, fontFamily: SANS, letterSpacing: '0.2em',
        textTransform: 'uppercase', color,
        background: side === 'yin' ? 'rgba(167,139,250,0.1)' : GOLD_FAINT,
        padding: '5px 16px', borderRadius: 20,
        position: 'relative', zIndex: 1,
      }}>
        {side === 'yin' ? 'Yin' : 'Yang'}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ArchSymbol side={side} />
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 30, color: TEXT, fontWeight: 500, textAlign: 'center', lineHeight: 1.25, position: 'relative', zIndex: 1 }}>
        {a.name}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 16, color: TEXT_MUTED, textAlign: 'center', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
        {a.quality}
      </div>
    </div>
  );
}

function OrbitalRing({ frame, opacity }: { frame: number; opacity: number }) {
  const R1 = 110, R2 = 80, R3 = 50;
  const cx = 540, cy = 770;
  const rot = frame * 0.12;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, opacity }}>
      <svg width={1080} height={1080} viewBox="0 0 1080 1080">
        <g transform={`rotate(${rot}, ${cx}, ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={R1} ry={R1 * 0.35}
            fill="none" stroke={GOLD_DIM} strokeWidth={1} />
        </g>
        <g transform={`rotate(${-rot * 0.6}, ${cx}, ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={R2} ry={R2 * 0.28}
            fill="none" stroke={GOLD_DIM} strokeWidth={0.7} strokeDasharray="4 8" />
        </g>
        <circle cx={cx} cy={cy} r={R3} fill="none" stroke={GOLD_DIM} strokeWidth={0.5} />
        <circle cx={cx} cy={cy} r={6} fill={GOLD} opacity={0.6} />
      </svg>
    </div>
  );
}

// ── Persistent overlay (lives outside TransitionSeries) ──────────
function PersistentOverlay({
  globalFrame, fps, date, frequency, hasAudio,
}: {
  globalFrame: number; fps: number; date: string; frequency: number; hasAudio?: boolean;
}) {
  // Brand fades in early, stays throughout
  const brandOp = fi(globalFrame, 16, 22);
  const dateOp  = fi(globalFrame, 16, 22);
  const dateY   = su(globalFrame, 16, fps, 16);

  // Bottom wave: visible all scenes, dims during archetypes (frames ~256–526) and freq (~508–618)
  const bottomWaveBase = fi(globalFrame, 45, 30);
  const arcsDim = interpolate(globalFrame, [250, 268, 520, 538], [1, 0.12, 0.12, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const freqDim = interpolate(globalFrame, [502, 515, 615, 628], [1, 0.08, 0.08, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const bottomWaveOp = bottomWaveBase * arcsDim * freqDim * 0.35;

  return (
    <>
      {hasAudio && <Audio src={staticFile('daily-voiceover.mp3')} />}

      {/* Top gold bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
      }} />

      {/* Brand + date */}
      <div style={{
        position: 'absolute', top: 58, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 11, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: GOLD, opacity: 0.42,
        }}>
          The Realm of Patterns
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 22, color: TEXT, fontWeight: 300,
          opacity: dateOp,
          transform: `translateY(${dateY}px)`,
        }}>
          {date}
        </div>
      </div>

      {/* Persistent bottom wave */}
      <div style={{ position: 'absolute', top: 1620, left: 0, right: 0, opacity: bottomWaveOp }}>
        <FrequencyWave freq={frequency} frame={globalFrame} opacity={0.65} />
      </div>

      {/* Bottom gold bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        opacity: 0.35,
      }} />
    </>
  );
}

// ── Scene components ─────────────────────────────────────────────

/** Scene 1: Hook — planet name as thumbnail, orbital rings, freq hint */
function HookScene({ planet, frequency }: { planet: string; frequency: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nameScale  = sscale(frame, 0, fps, 0.72);
  const nameOp     = sop(frame, 0, fps);
  const subOp      = fi(frame, 18, 22);
  const subY       = su(frame, 18, fps, 20);
  const orbitalOp  = fi(frame, 0, 30);
  const hintOp     = fi(frame, 30, 25) * 0.55;
  // Planet sigil fades in slightly behind the orbital ring — slow reveal
  const sigilOp    = fi(frame, 8, 40) * 0.28;
  const sigilScale = sscale(frame, 8, fps, 0.6);
  const sigilSrc   = planetAsset(planet);

  return (
    <AbsoluteFill>
      {/* Generated planet sigil — glowing behind orbital ring */}
      {sigilSrc && (
        <div style={{
          position: 'absolute',
          top: 490, left: '50%',
          transform: `translateX(-50%) scale(${sigilScale})`,
          width: 560, height: 560,
          opacity: sigilOp,
          filter: `blur(1px) drop-shadow(0 0 60px rgba(212,168,84,0.4))`,
        }}>
          <Img
            src={sigilSrc}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      )}

      <OrbitalRing frame={frame} opacity={orbitalOp * 0.85} />

      {/* Planet name — centered, this IS the thumbnail */}
      <div style={{
        position: 'absolute', top: 620, left: 0, right: 0, textAlign: 'center',
        opacity: nameOp,
        transform: `scale(${nameScale})`,
      }}>
        <div style={{
          fontFamily: SERIF, fontWeight: 700, color: GOLD,
          letterSpacing: '-0.025em', lineHeight: 1,
          fontSize: planet.length > 7 ? 96 : 118,
          textShadow: `0 0 120px rgba(212,168,84,0.35), 0 0 40px rgba(212,168,84,0.15)`,
        }}>
          {planet.toUpperCase()}
        </div>
        <div style={{
          fontFamily: SANS, fontSize: 19, color: TEXT_MUTED,
          letterSpacing: '0.1em', marginTop: 18,
          opacity: subOp,
          transform: `translateY(${subY}px)`,
        }}>
          is shaping today's field
        </div>
      </div>

      {/* Bottom freq hint */}
      <div style={{
        position: 'absolute', top: 1480, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        opacity: hintOp,
      }}>
        <FrequencyWave freq={frequency} frame={frame} opacity={0.8} />
        <div style={{
          fontFamily: SANS, fontSize: 13, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: TEXT_MUTED,
        }}>
          field frequency · {frequency.toFixed(2)} Hz
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 2: Context — moon phase + dimension */
function ContextScene({ moonEmoji, moonPhase, dimension }: {
  moonEmoji: string; moonPhase: string; dimension?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op = sop(frame, 0, fps);
  const y  = su(frame, 0, fps, 28);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', top: 900, left: 60, right: 60,
        opacity: op,
        transform: `translateY(${y}px)`,
      }}>
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)`,
          marginBottom: 48,
        }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '0 32px' }}>
            <div style={{ fontSize: 80, marginBottom: 16, lineHeight: 1 }}>{moonEmoji}</div>
            <div style={{ fontFamily: SANS, fontSize: 20, color: TEXT_MUTED, letterSpacing: '0.04em' }}>
              {moonPhase}
            </div>
          </div>
          <div style={{ width: 1, background: GOLD_DIM, margin: '4px 0' }} />
          <div style={{ flex: 1, textAlign: 'center', padding: '0 32px' }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto 16px',
              border: `1px solid ${GOLD_DIM}`, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width={40} height={40} viewBox="0 0 40 40">
                <polygon points="20,2 38,20 20,38 2,20" fill={GOLD} opacity={0.8} />
              </svg>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 20, color: TEXT_MUTED, letterSpacing: '0.04em' }}>
              {dimension ?? 'Field'} dimension
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 3: Curiosity gap */
function CuriosityScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op     = sop(frame, 0, fps);
  const y      = su(frame, 0, fps, 28);
  const italicOp = fi(frame, 28, 22);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', top: 860, left: 60, right: 60, textAlign: 'center',
        opacity: op,
        transform: `translateY(${y}px)`,
      }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, color: TEXT, lineHeight: 1.55, marginBottom: 40 }}>
          Two archetypes<br />are active today.
        </div>
        <div style={{
          fontFamily: SERIF, fontSize: 38, color: GOLD, fontStyle: 'italic',
          opacity: italicOp,
        }}>
          Which speaks to you?
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 4: Archetype cards — yin/yang side by side with spring pop-in */
function ArchetypesScene({ archetypes, frequency }: {
  archetypes: DailyWeatherProps['archetypes']; frequency: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cards pop in with staggered delay
  const containerOp = sop(frame, 0, fps);
  const containerY  = su(frame, 0, fps, 36);

  // "YIN · VS · YANG" label fades in after cards
  const labelOp = fi(frame, 40, 20);

  // Frequency strip at bottom of archetype scene
  const freqOp = fi(frame, 60, 20) * 0.45;

  return (
    <AbsoluteFill>
      {/* Cards */}
      <div style={{
        position: 'absolute', top: 560, left: 40, right: 40,
        display: 'flex', gap: 16,
        opacity: containerOp,
        transform: `translateY(${containerY}px)`,
      }}>
        <ArchCard a={archetypes.yin}  side="yin"  frame={frame} fps={fps} delay={0} />
        <ArchCard a={archetypes.yang} side="yang" frame={frame} fps={fps} delay={10} />
      </div>

      {/* YIN · VS · YANG */}
      <div style={{
        position: 'absolute', top: 1260, left: 0, right: 0, textAlign: 'center',
        fontFamily: SANS, fontSize: 12, letterSpacing: '0.26em', color: TEXT_MUTED,
        opacity: labelOp,
      }}>
        YIN &nbsp;·&nbsp; VS &nbsp;·&nbsp; YANG
      </div>

      {/* Frequency strip */}
      <div style={{
        position: 'absolute', top: 1390, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        opacity: freqOp,
      }}>
        <div style={{
          height: 1, width: 200,
          background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)`,
          marginBottom: 16,
        }} />
        <FrequencyWave freq={frequency} frame={frame} opacity={0.45} />
      </div>
    </AbsoluteFill>
  );
}

/** Scene 5: Frequency moment — large wave + quote + number */
function FreqScene({ planet, frequency }: { planet: string; frequency: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op         = sop(frame, 0, fps);
  const y          = su(frame, 0, fps, 26);
  const quoteOp    = fi(frame, 22, 22);
  const numOp      = fi(frame, 35, 22) * 0.22;
  const numScale   = sscale(frame, 35, fps, 0.85);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', top: 640, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        opacity: op,
        transform: `translateY(${y}px)`,
      }}>
        <div style={{
          fontFamily: SANS, fontSize: 12, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: TEXT_MUTED,
        }}>
          Field Frequency · {planet}
        </div>
        <FrequencyWave freq={frequency} frame={frame} opacity={1} />
        <div style={{
          fontFamily: SERIF, fontSize: 34, color: TEXT, fontStyle: 'italic',
          textAlign: 'center', maxWidth: 900, lineHeight: 1.65,
          padding: '0 60px',
          opacity: quoteOp,
        }}>
          "This is the frequency<br />you're moving through."
        </div>
        {/* Large freq number */}
        <div style={{
          fontFamily: SERIF, fontSize: 96, color: GOLD, fontWeight: 700,
          letterSpacing: '-0.02em', lineHeight: 1, marginTop: 40,
          opacity: numOp,
          transform: `scale(${numScale})`,
        }}>
          {frequency.toFixed(2)}
        </div>
        <div style={{
          fontFamily: SANS, fontSize: 11, letterSpacing: '0.28em',
          textTransform: 'uppercase', color: GOLD,
          opacity: fi(frame, 35, 22) * 0.4,
          marginTop: -8,
        }}>
          hertz
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 6: Reading cards — word-by-word narrative reveal */
function ReadingScene({ narrative, dimension }: { narrative: string; dimension?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dimSrc  = dimensionAsset(dimension);
  const dimOp   = fi(frame, 0, 40) * 0.12; // very subtle texture underlay

  const cards   = splitNarrative(narrative);
  const cardLen = Math.floor(190 / cards.length);

  return (
    <AbsoluteFill>
      {/* Dimension texture — very subtle atmosphere underlay */}
      {dimSrc && (
        <AbsoluteFill style={{ opacity: dimOp }}>
          <Img src={dimSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )}

      {cards.map((text, i) => {
        const cardStart = i * cardLen;
        const cardEnd   = (i + 1) * cardLen;

        // Card container fades in with spring, fades out with interpolate
        const inOp   = sop(frame, cardStart, fps);
        const outOp  = i < cards.length - 1
          ? interpolate(frame, [cardEnd - 14, cardEnd], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          : 1;
        const cardOp = inOp * outOp;
        const cardY  = su(frame, cardStart, fps, 30);

        // Word reveal starts 14f after card appears
        const wordStartFrame = cardStart + 14;

        return (
          <div key={i} style={{
            position: 'absolute', top: 860, left: 56, right: 56, textAlign: 'center',
            opacity: cardOp,
            transform: `translateY(${cardY}px)`,
          }}>
            {cards.length > 1 && (
              <div style={{
                fontFamily: SANS, fontSize: 10, letterSpacing: '0.2em', color: GOLD,
                opacity: 0.5, marginBottom: 28, textTransform: 'uppercase',
              }}>
                ☉ Sol's reading &nbsp;·&nbsp; {i + 1} / {cards.length}
              </div>
            )}
            <WordReveal
              text={text.trim()}
              frame={frame}
              fps={fps}
              startFrame={wordStartFrame}
              stagger={2.8}
              fontSize={54}
            />
            <div style={{ width: 40, height: 2, background: GOLD, margin: '32px auto 0', opacity: 0.5 }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Scene 7: Engagement — comment below + archetype buttons */
function EngageScene({ archetypes }: { archetypes: DailyWeatherProps['archetypes'] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op        = sop(frame, 0, fps);
  const y         = su(frame, 0, fps, 24);
  const yangScale = sscale(frame, 18, fps, 0.88);
  const yinScale  = sscale(frame, 26, fps, 0.88);
  const yangOp    = sop(frame, 18, fps);
  const yinOp     = sop(frame, 26, fps);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', top: 760, left: 56, right: 56, textAlign: 'center',
        opacity: op,
        transform: `translateY(${y}px)`,
      }}>
        <div style={{ fontFamily: SERIF, fontSize: 44, color: TEXT, lineHeight: 1.55, marginBottom: 48 }}>
          Comment below 👇
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
          <div style={{
            padding: '20px 44px', border: `1px solid ${GOLD_DIM}`,
            borderRadius: 16, fontFamily: SERIF, fontSize: 26, color: GOLD,
            width: '100%', textAlign: 'center',
            opacity: yangOp, transform: `scale(${yangScale})`,
          }}>
            ◈ &nbsp;{archetypes.yang.name}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 13, letterSpacing: '0.14em', color: TEXT_MUTED }}>
            or
          </div>
          <div style={{
            padding: '20px 44px', border: `1px solid ${YIN_DIM}`,
            borderRadius: 16, fontFamily: SERIF, fontSize: 26, color: YIN,
            width: '100%', textAlign: 'center',
            opacity: yinOp, transform: `scale(${yinScale})`,
          }}>
            ◑ &nbsp;{archetypes.yin.name}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Scene 8: CTA — natal pattern + link */
function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const op    = sop(frame, 0, fps);
  const y     = su(frame, 0, fps, 24);
  const btnOp = sop(frame, 18, fps);
  const btnSc = sscale(frame, 18, fps, 0.88);
  const urlOp = fi(frame, 30, 20);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', top: 780, left: 56, right: 56, textAlign: 'center',
        opacity: op,
        transform: `translateY(${y}px)`,
      }}>
        <div style={{
          fontFamily: SERIF, fontSize: 38, color: TEXT, lineHeight: 1.6, marginBottom: 52,
        }}>
          Your natal pattern shapes how you experience this field.
        </div>
        <div style={{
          display: 'inline-block', padding: '24px 60px',
          background: `linear-gradient(135deg, ${GOLD} 0%, #c49a4a 100%)`,
          borderRadius: 16, fontFamily: SANS, fontSize: 24,
          fontWeight: 700, color: BG, letterSpacing: '0.02em',
          marginBottom: 28,
          opacity: btnOp, transform: `scale(${btnSc})`,
        }}>
          Free reading ↓
        </div>
        <div style={{
          fontFamily: SANS, fontSize: 18, color: TEXT_MUTED, letterSpacing: '0.07em',
          opacity: urlOp,
        }}>
          therealmofpatterns.com
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Main composition ──────────────────────────────────────────────
export function DailyWeatherVideo(props: DailyWeatherProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { date, narrative, dominantPlanet, frequency, archetypes, moonPhase, moonEmoji, dimension, hasAudio } = props;

  // Global fade-out at the very end
  const globalOp = frame >= durationInFrames - 38
    ? interpolate(frame, [durationInFrames - 38, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
    : 1;

  const particleOp = fi(frame, 0, 60) * 0.7;

  const T = DUR.transition;

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalOp }}>
      {/* ── Layer 0: Noise particle field (full duration) ────── */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <ParticleField frame={frame} opacity={particleOp} />
      </Sequence>

      {/* ── Layer 1: Scene transitions ────────────────────────── */}
      <TransitionSeries>

        {/* Scene 1: Hook */}
        <TransitionSeries.Sequence durationInFrames={DUR.hook}>
          <HookScene planet={dominantPlanet} frequency={frequency} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 55 } })}
        />

        {/* Scene 2: Context */}
        <TransitionSeries.Sequence durationInFrames={DUR.ctx}>
          <ContextScene moonEmoji={moonEmoji} moonPhase={moonPhase} dimension={dimension} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 55 } })}
        />

        {/* Scene 3: Curiosity */}
        <TransitionSeries.Sequence durationInFrames={DUR.curiosity}>
          <CuriosityScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 24, stiffness: 50 } })}
        />

        {/* Scene 4: Archetypes */}
        <TransitionSeries.Sequence durationInFrames={DUR.arcs}>
          <ArchetypesScene archetypes={archetypes} frequency={frequency} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ durationInFrames: T, config: { damping: 28, stiffness: 60 } })}
        />

        {/* Scene 5: Frequency */}
        <TransitionSeries.Sequence durationInFrames={DUR.freq}>
          <FreqScene planet={dominantPlanet} frequency={frequency} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 55 } })}
        />

        {/* Scene 6: Reading */}
        <TransitionSeries.Sequence durationInFrames={DUR.reading}>
          <ReadingScene narrative={narrative} dimension={dimension} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ durationInFrames: T, config: { damping: 26, stiffness: 55 } })}
        />

        {/* Scene 7: Engagement */}
        <TransitionSeries.Sequence durationInFrames={DUR.engage}>
          <EngageScene archetypes={archetypes} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ durationInFrames: T, config: { damping: 28, stiffness: 60 } })}
        />

        {/* Scene 8: CTA */}
        <TransitionSeries.Sequence durationInFrames={DUR.cta}>
          <CTAScene />
        </TransitionSeries.Sequence>

      </TransitionSeries>

      {/* ── Layer 2: Persistent overlay (always on top) ───────── */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <PersistentOverlay
          globalFrame={frame}
          fps={fps}
          date={date}
          frequency={frequency}
          hasAudio={hasAudio}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
