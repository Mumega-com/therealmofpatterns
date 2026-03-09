import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Sequence,
} from 'remotion';

// ── Brand ────────────────────────────────────────────────────
const GOLD = '#d4a854';
const GOLD_DIM = 'rgba(212,168,84,0.4)';
const GOLD_FAINT = 'rgba(212,168,84,0.12)';
const BG = '#0a0908';
const TEXT = '#f0e8d8';
const TEXT_MUTED = 'rgba(240,232,216,0.6)';

const SERIF = "'Georgia', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

// ── Helpers ──────────────────────────────────────────────────
function fadeIn(frame: number, start: number, duration = 20) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.ease,
  });
}

function fadeOut(frame: number, start: number, duration = 15) {
  return interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.ease,
  });
}

function slideUp(frame: number, start: number, fps: number) {
  const progress = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 60 } });
  return interpolate(progress, [0, 1], [40, 0]);
}

// ── Star field ───────────────────────────────────────────────
function Stars({ opacity }: { opacity: number }) {
  const stars = Array.from({ length: 80 }, (_, i) => ({
    x: ((i * 137.508) % 100),
    y: ((i * 97.3) % 100),
    r: 0.5 + (i % 3) * 0.5,
    delay: (i % 30) * 4,
  }));

  return (
    <AbsoluteFill style={{ opacity }}>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: '50%',
            background: TEXT,
            opacity: 0.4 + (i % 4) * 0.15,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

// ── Sacred geometry (hexagram / soul toroid outline) ─────────
function SacredGeometry({ progress, opacity }: { progress: number; opacity: number }) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const R = 120;

  // Six petals of flower of life
  const petals = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3;
    return { x: cx + R * 0.6 * Math.cos(angle), y: cy + R * 0.6 * Math.sin(angle) };
  });

  // Outer hexagon points
  const hex = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });
  const hexPath = hex.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Star of David lines
  const tri1 = [hex[0], hex[2], hex[4]];
  const tri2 = [hex[1], hex[3], hex[5]];
  const triPath1 = tri1.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
  const triPath2 = tri2.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  const strokeDash = `${R * 8}`;
  const strokeOffset = interpolate(progress, [0, 1], [R * 8, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer glow circle */}
        <circle cx={cx} cy={cy} r={R + 20} fill="none" stroke={GOLD_FAINT} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={R + 40} fill="none" stroke={GOLD_FAINT} strokeWidth={0.5} />

        {/* Petal circles */}
        {petals.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={R * 0.6}
            fill="none"
            stroke={GOLD_DIM}
            strokeWidth={0.8}
            strokeDasharray={strokeDash}
            strokeDashoffset={strokeOffset + i * 40}
          />
        ))}

        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={R * 0.6}
          fill="none"
          stroke={GOLD_DIM}
          strokeWidth={0.8}
          strokeDasharray={strokeDash}
          strokeDashoffset={strokeOffset}
        />

        {/* Hexagon */}
        <path
          d={hexPath}
          fill="none"
          stroke={GOLD}
          strokeWidth={1.2}
          strokeDasharray={strokeDash}
          strokeDashoffset={strokeOffset}
          opacity={0.7}
        />

        {/* Star triangles */}
        <path d={triPath1} fill="none" stroke={GOLD} strokeWidth={0.8} opacity={0.5}
          strokeDasharray={strokeDash} strokeDashoffset={strokeOffset * 0.8} />
        <path d={triPath2} fill="none" stroke={GOLD} strokeWidth={0.8} opacity={0.5}
          strokeDasharray={strokeDash} strokeDashoffset={strokeOffset * 0.8} />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill={GOLD} opacity={progress} />
      </svg>
    </div>
  );
}

// ── Dimension card ───────────────────────────────────────────
const DIMS = [
  { symbol: '⚡', label: 'Energy',   side: 'Yang' },
  { symbol: '◎', label: 'Body',     side: 'Yin'  },
  { symbol: '♡', label: 'Emotion',  side: 'Yin'  },
  { symbol: '◈', label: 'Clarity',  side: 'Yang' },
  { symbol: '⬡', label: 'Ground',   side: 'Yin'  },
];

function DimensionCard({ symbol, label, side, opacity, y }: {
  symbol: string; label: string; side: string; opacity: number; y: number;
}) {
  return (
    <div style={{
      opacity,
      transform: `translateY(${y}px)`,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: '18px 28px',
      background: 'rgba(26,24,20,0.7)',
      border: `1px solid rgba(212,168,84,${opacity * 0.25})`,
      borderRadius: 16,
      backdropFilter: 'blur(8px)',
    }}>
      <span style={{ fontSize: 28, color: GOLD, width: 36, textAlign: 'center' }}>{symbol}</span>
      <span style={{ fontFamily: SERIF, fontSize: 22, color: TEXT, flex: 1 }}>{label}</span>
      <span style={{
        fontFamily: SANS,
        fontSize: 11,
        color: side === 'Yang' ? GOLD : 'rgba(167,139,250,0.8)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        background: side === 'Yang' ? GOLD_FAINT : 'rgba(167,139,250,0.08)',
        padding: '4px 10px',
        borderRadius: 6,
      }}>{side}</span>
    </div>
  );
}

// ── Narrative reveal ─────────────────────────────────────────
const NARRATIVE = "Something in you is orienting. Not toward a destination — toward a way of moving. The field is not asking you to resolve anything today. It is asking you to stay present with what is unfolding.";

function NarrativeReveal({ progress, opacity }: { progress: number; opacity: number }) {
  const chars = Math.floor(progress * NARRATIVE.length);
  const visible = NARRATIVE.slice(0, chars);
  const invisible = NARRATIVE.slice(chars);

  return (
    <div style={{
      opacity,
      fontFamily: SERIF,
      fontSize: 26,
      lineHeight: 1.8,
      color: TEXT,
      textAlign: 'center',
      padding: '0 40px',
    }}>
      <span>{visible}</span>
      <span style={{ color: 'transparent' }}>{invisible}</span>
    </div>
  );
}

// ── Main composition ─────────────────────────────────────────
export function HomepageVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene timing (at 30fps, total = 900 frames = 30s)
  const S = {
    starsIn:      0,    // 0s  — stars appear
    geoStart:     30,   // 1s  — geometry draws
    title1In:     80,   // 2.7s — "A daily practice"
    title2In:     105,  // 3.5s — "with your own narrator."
    subtitleIn:   140,  // 4.7s — subtitle
    dimsStart:    200,  // 6.7s — dimensions cascade in
    narStart:     380,  // 12.7s — narrative types out
    narEnd:       560,  // 18.7s — narrative done
    taglineIn:    590,  // 19.7s — "The field remembers you."
    ctaIn:        650,  // 21.7s — CTA
    fadeOutStart: 820,  // 27.3s — fade to black
  };

  // Global fade out
  const globalOpacity = frame < S.fadeOutStart
    ? 1
    : fadeOut(frame, S.fadeOutStart, 80);

  // Geometry progress
  const geoProgress = interpolate(frame, [S.geoStart, S.geoStart + 90], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease),
  });

  // Geometry rotation
  const geoRotate = interpolate(frame, [0, 900], [0, 15]);

  // Narrative typewriter
  const narProgress = interpolate(frame, [S.narStart, S.narEnd], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear,
  });

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalOpacity, fontFamily: SERIF }}>

      {/* Stars */}
      <Stars opacity={fadeIn(frame, S.starsIn, 60)} />

      {/* Top gold line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        opacity: fadeIn(frame, S.geoStart, 30),
      }} />

      {/* Geometry — top area */}
      <div style={{
        position: 'absolute', top: 80, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        transform: `rotate(${geoRotate}deg)`,
      }}>
        <SacredGeometry progress={geoProgress} opacity={fadeIn(frame, S.geoStart, 30)} />
      </div>

      {/* Title block */}
      <div style={{
        position: 'absolute', top: 460, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '0 60px',
      }}>
        <div style={{
          opacity: fadeIn(frame, S.title1In, 25),
          transform: `translateY(${slideUp(frame, S.title1In, fps)}px)`,
          fontFamily: SERIF, fontSize: 52, fontWeight: 300, color: TEXT,
          letterSpacing: '-0.01em', textAlign: 'center',
        }}>
          A daily practice
        </div>
        <div style={{
          opacity: fadeIn(frame, S.title2In, 25),
          transform: `translateY(${slideUp(frame, S.title2In, fps)}px)`,
          fontFamily: SERIF, fontSize: 52, fontWeight: 600, color: GOLD,
          letterSpacing: '-0.01em', textAlign: 'center',
        }}>
          with your own narrator.
        </div>
        <div style={{
          opacity: fadeIn(frame, S.subtitleIn, 30),
          transform: `translateY(${slideUp(frame, S.subtitleIn, fps)}px)`,
          fontFamily: SANS, fontSize: 20, color: TEXT_MUTED,
          textAlign: 'center', lineHeight: 1.6, marginTop: 16,
        }}>
          Sol reads your natal pattern and offers a{'\n'}
          reflection rooted in depth psychology.
        </div>
      </div>

      {/* Dimensions cascade */}
      <div style={{
        position: 'absolute', top: 700, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: '0 80px',
        opacity: frame > S.narStart ? fadeOut(frame, S.narStart - 20, 20) : 1,
      }}>
        {DIMS.map((d, i) => {
          const start = S.dimsStart + i * 28;
          return (
            <DimensionCard
              key={d.label}
              {...d}
              opacity={fadeIn(frame, start, 20)}
              y={slideUp(frame, start, fps)}
            />
          );
        })}
      </div>

      {/* Narrative — replaces dimensions */}
      <div style={{
        position: 'absolute', top: 680, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 60px',
      }}>
        {/* Sol label */}
        <div style={{
          opacity: fadeIn(frame, S.narStart, 20),
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28,
        }}>
          <span style={{ fontSize: 24, color: GOLD }}>☉</span>
          <span style={{ fontFamily: SANS, fontSize: 14, color: GOLD, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Sol's reading
          </span>
        </div>
        <NarrativeReveal
          progress={narProgress}
          opacity={fadeIn(frame, S.narStart, 20)}
        />
      </div>

      {/* Tagline */}
      <div style={{
        position: 'absolute', bottom: 300, left: 0, right: 0,
        textAlign: 'center', padding: '0 60px',
        opacity: fadeIn(frame, S.taglineIn, 30),
        transform: `translateY(${slideUp(frame, S.taglineIn, fps)}px)`,
      }}>
        <div style={{ fontFamily: SERIF, fontSize: 36, color: TEXT, marginBottom: 8 }}>
          The field remembers you.
        </div>
        <div style={{
          width: 48, height: 1, background: GOLD, margin: '16px auto', opacity: 0.5,
        }} />
      </div>

      {/* CTA */}
      <div style={{
        position: 'absolute', bottom: 160, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: fadeIn(frame, S.ctaIn, 30),
        transform: `translateY(${slideUp(frame, S.ctaIn, fps)}px)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '20px 48px',
          background: `linear-gradient(135deg, ${GOLD} 0%, #c49a4a 100%)`,
          borderRadius: 14,
          fontFamily: SANS, fontSize: 22, fontWeight: 700,
          color: BG, letterSpacing: '0.02em',
        }}>
          Begin the practice
          <span style={{ fontSize: 18 }}>→</span>
          <span style={{
            fontSize: 13, background: 'rgba(0,0,0,0.15)',
            padding: '3px 10px', borderRadius: 8,
          }}>free</span>
        </div>
      </div>

      {/* URL watermark */}
      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: SANS, fontSize: 18, color: 'rgba(240,232,216,0.3)',
        letterSpacing: '0.06em',
        opacity: fadeIn(frame, S.ctaIn + 20, 30),
      }}>
        therealmofpatterns.com
      </div>

      {/* Bottom gold line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        opacity: fadeIn(frame, S.geoStart, 30) * 0.5,
      }} />
    </AbsoluteFill>
  );
}
