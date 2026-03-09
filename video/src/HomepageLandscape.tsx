import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Audio,
  staticFile,
} from 'remotion';

const GOLD = '#d4a854';
const GOLD_DIM = 'rgba(212,168,84,0.35)';
const GOLD_FAINT = 'rgba(212,168,84,0.1)';
const BG = '#0a0908';
const TEXT = '#f0e8d8';
const TEXT_MUTED = 'rgba(240,232,216,0.55)';
const SERIF = "'Georgia', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

function fadeIn(frame: number, start: number, dur = 20) {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.ease,
  });
}

function slideUp(frame: number, start: number, fps: number, dist = 24) {
  const p = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 55 } });
  return interpolate(p, [0, 1], [dist, 0]);
}

function SacredGeo({ progress, frame }: { progress: number; frame: number }) {
  const size = 480;
  const cx = size / 2;
  const cy = size / 2;
  const R = 170;
  const rotate = frame * 0.015;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  const hexPath = hex.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
  const tri1 = [hex[0], hex[2], hex[4]];
  const tri2 = [hex[1], hex[3], hex[5]];
  const dash = R * 8;
  const offset = interpolate(progress, [0, 1], [dash, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ transform: `rotate(${rotate}deg)` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R + 24} fill="none" stroke={GOLD_FAINT} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={R + 48} fill="none" stroke={GOLD_FAINT} strokeWidth={0.5} />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const px = cx + R * 0.55 * Math.cos(a);
          const py = cy + R * 0.55 * Math.sin(a);
          return <circle key={i} cx={px} cy={py} r={R * 0.55} fill="none"
            stroke={GOLD_DIM} strokeWidth={0.7} strokeDasharray={`${dash} ${dash}`}
            strokeDashoffset={offset + i * 50} />;
        })}
        <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke={GOLD_DIM} strokeWidth={0.7}
          strokeDasharray={`${dash} ${dash}`} strokeDashoffset={offset} />
        <path d={hexPath} fill="none" stroke={GOLD} strokeWidth={1.2} opacity={0.65}
          strokeDasharray={`${dash} ${dash}`} strokeDashoffset={offset} />
        <path d={[tri1[0], tri1[1], tri1[2]].map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'}
          fill="none" stroke={GOLD} strokeWidth={0.8} opacity={0.45}
          strokeDasharray={`${dash} ${dash}`} strokeDashoffset={offset * 0.8} />
        <path d={[tri2[0], tri2[1], tri2[2]].map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'}
          fill="none" stroke={GOLD} strokeWidth={0.8} opacity={0.45}
          strokeDasharray={`${dash} ${dash}`} strokeDashoffset={offset * 0.8} />
        <circle cx={cx} cy={cy} r={4} fill={GOLD} opacity={progress} />
      </svg>
    </div>
  );
}

export function HomepageLandscape() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const S = {
    geoIn: 15, title1: 50, title2: 75, sub: 105,
    feat1: 160, feat2: 185, feat3: 210,
    narIn: 330, narEnd: 510,
    tagIn: 540, ctaIn: 600, fadeOut: 780,
  };

  const globalOpacity = frame < S.fadeOut
    ? 1
    : interpolate(frame, [S.fadeOut, S.fadeOut + 60], [1, 0], { extrapolateRight: 'clamp' });

  const geoProgress = interpolate(frame, [S.geoIn, S.geoIn + 100], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease),
  });

  const NARRATIVE = "Something in you is orienting. Not toward a destination — toward a way of moving. The field rewards those who show up.";
  const narChars = Math.floor(interpolate(frame, [S.narIn, S.narEnd], [0, NARRATIVE.length], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));

  const features = [
    { icon: '☉', text: "Sol's daily reading — depth psychology, not horoscopes" },
    { icon: '◎', text: 'Your natal field — rendered as living 3D geometry' },
    { icon: '◑', text: 'Weekly synthesis — the arc of seven days as one pattern' },
  ];

  return (
    <AbsoluteFill style={{ background: BG, opacity: globalOpacity, display: 'flex', flexDirection: 'row' }}>

      {/* Audio */}
      <Audio src={staticFile('voiceover.mp3')} startFrom={0} />

      {/* Left — geometry */}
      <div style={{
        width: '44%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(212,168,84,0.06) 0%, transparent 70%)',
        }} />
        <div style={{ opacity: fadeIn(frame, S.geoIn, 30) }}>
          <SacredGeo progress={geoProgress} frame={frame} />
        </div>
      </div>

      {/* Vertical divider */}
      <div style={{
        width: 1,
        background: `linear-gradient(180deg, transparent, ${GOLD_DIM}, transparent)`,
        opacity: fadeIn(frame, S.geoIn, 40),
        alignSelf: 'stretch',
        margin: '60px 0',
      }} />

      {/* Right — text */}
      <div style={{
        flex: 1, padding: '80px 80px 80px 70px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0,
      }}>

        {/* Badge */}
        <div style={{
          opacity: fadeIn(frame, S.title1 - 10, 20),
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 28,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
          <span style={{
            fontFamily: SANS, fontSize: 13, color: GOLD,
            letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            Free · No signup required
          </span>
        </div>

        {/* Title */}
        <div style={{
          opacity: fadeIn(frame, S.title1, 22),
          transform: `translateY(${slideUp(frame, S.title1, fps)}px)`,
          fontFamily: SERIF, fontSize: 60, fontWeight: 300, color: TEXT,
          lineHeight: 1.15, marginBottom: 6,
        }}>
          A daily practice
        </div>
        <div style={{
          opacity: fadeIn(frame, S.title2, 22),
          transform: `translateY(${slideUp(frame, S.title2, fps)}px)`,
          fontFamily: SERIF, fontSize: 60, fontWeight: 600, color: GOLD,
          lineHeight: 1.15, marginBottom: 24,
        }}>
          with your narrator.
        </div>

        <div style={{
          opacity: fadeIn(frame, S.sub, 25),
          transform: `translateY(${slideUp(frame, S.sub, fps)}px)`,
          fontFamily: SANS, fontSize: 19, color: TEXT_MUTED,
          lineHeight: 1.65, marginBottom: 40, maxWidth: 480,
        }}>
          Sol reads your natal pattern and offers a reflection rooted in depth psychology. Not predictions. Real presence.
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 44 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              opacity: fadeIn(frame, S.feat1 + i * 25, 20),
              transform: `translateY(${slideUp(frame, S.feat1 + i * 25, fps, 16)}px)`,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: '50%',
                background: GOLD_FAINT, border: `1px solid ${GOLD_DIM}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: GOLD, flexShrink: 0,
              }}>{f.icon}</span>
              <span style={{ fontFamily: SANS, fontSize: 17, color: TEXT_MUTED }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Narrative */}
        <div style={{
          opacity: fadeIn(frame, S.narIn, 20),
          background: 'rgba(26,24,20,0.6)',
          border: `1px solid ${GOLD_FAINT}`,
          borderRadius: 16, padding: '24px 28px',
          marginBottom: 36,
          display: frame < S.narIn ? 'none' : 'block',
        }}>
          <div style={{ fontFamily: SANS, fontSize: 12, color: GOLD, letterSpacing: '0.12em', marginBottom: 12, opacity: 0.75 }}>
            ☉ SOL'S READING · TODAY
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 22, color: TEXT, lineHeight: 1.8 }}>
            <span>{NARRATIVE.slice(0, narChars)}</span>
            <span style={{ color: 'transparent' }}>{NARRATIVE.slice(narChars)}</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          opacity: fadeIn(frame, S.ctaIn, 25),
          transform: `translateY(${slideUp(frame, S.ctaIn, fps)}px)`,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            padding: '18px 44px',
            background: `linear-gradient(135deg, ${GOLD} 0%, #c49a4a 100%)`,
            borderRadius: 12, fontFamily: SANS, fontSize: 20,
            fontWeight: 700, color: BG, letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            Begin the practice
            <span>→</span>
          </div>
          <span style={{ fontFamily: SANS, fontSize: 15, color: TEXT_MUTED }}>
            therealmofpatterns.com
          </span>
        </div>
      </div>

      {/* Top line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        opacity: fadeIn(frame, 0, 30),
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        opacity: fadeIn(frame, 0, 30) * 0.4,
      }} />
    </AbsoluteFill>
  );
}
