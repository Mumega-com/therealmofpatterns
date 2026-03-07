// @ts-nocheck
'use client';

/**
 * SoulToroid — 3D Toroidal Field Visualization
 *
 * Maps the 8D natal vector to living geometry:
 *   idx 0  P  Identity  (Sun)             → axis presence
 *   idx 1  E  Structure (Saturn)           → satComp  — axis compression
 *   idx 2  μ  Mind      (Mercury)          → geminiDrift — orbit speed
 *   idx 3  V  Heart     (Venus)            → libraStab — midplane stabilizer
 *   idx 4  N  Growth    (Jupiter)          → sagAxis + rahuExp
 *   idx 5  Δ  Drive     (Mars)             → scorpioCore — core vortex density
 *   idx 6  R  Connection(Moon)             → piscesField — field thickness
 *   idx 7  Φ  Awareness (Uranus/Neptune)   → piscesField + rahuExp
 *
 * Modes:
 *   'widget'  — compact dashboard tile, no panel
 *   'full'    — full-screen canvas + Soul Anatomy side panel
 *   'compare' — two fields side-by-side with resonance score
 */

import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ToroidParams {
  scorpioCore: number;
  piscesField: number;
  sagAxis: number;
  geminiDrift: number;
  satComp: number;
  libraStab: number;
  rahuExp: number;
}

export interface SoulToroidProps {
  natal: number[];         // 8D vector [0..1]
  transit?: number[];      // today's transit 8D vector (optional)
  compare?: number[];      // second person's 8D vector (compare mode)
  mode?: 'widget' | 'full' | 'compare';
  archetypeName?: string;
  onShare?: () => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// Derive geometry params from 8D vector
// ─────────────────────────────────────────────────────────────

function deriveParams(v: number[]): ToroidParams {
  const s = [...v];
  while (s.length < 8) s.push(0.5);
  return {
    scorpioCore:  s[5],                    // Δ Drive
    piscesField:  (s[6] + s[7]) / 2,      // R Connection + Φ Awareness
    sagAxis:      s[4],                    // N Growth
    geminiDrift:  s[2],                    // μ Mind
    satComp:      s[1],                    // E Structure
    libraStab:    s[3],                    // V Heart
    rahuExp:      (s[4] + s[7]) / 2,      // N Growth + Φ Awareness
  };
}

// ─────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────

function makeHelixPoints(
  radius: number,
  turns: number,
  y0: number,
  height: number,
  phase: number,
  steps = 700,
): Float32Array {
  const arr = new Float32Array((steps + 1) * 3);
  for (let i = 0; i <= steps; i++) {
    const t   = i / steps;
    const ang = t * Math.PI * 2 * turns + phase;
    const y   = y0 + t * height;
    const r   = radius * (1 - 0.35 * Math.sin(t * Math.PI * 2));
    arr[i * 3]     = Math.cos(ang) * r;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = Math.sin(ang) * r;
  }
  return arr;
}

function makeParticles(count: number, R: number, r: number): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    arr[i * 3]     = (R + r * Math.cos(v)) * Math.cos(u);
    arr[i * 3 + 1] = r * Math.sin(v);
    arr[i * 3 + 2] = (R + r * Math.cos(v)) * Math.sin(u);
  }
  return arr;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CHAKRA_COLORS = [
  new THREE.Color(0xff2200), // Root
  new THREE.Color(0xff8800), // Sacral
  new THREE.Color(0xffee00), // Solar
  new THREE.Color(0x33ff55), // Heart
  new THREE.Color(0x22bbff), // Throat
  new THREE.Color(0x5566ff), // Ajna
  new THREE.Color(0xcc33ff), // Crown
];
const CHAKRA_U = [0.05, 0.18, 0.32, 0.48, 0.62, 0.78, 0.92];

function transitToColor(v: number[] | null): THREE.Color {
  if (!v) return new THREE.Color(0x2aa7ff);
  const dom  = v.indexOf(Math.max(...v.slice(0, 8)));
  const hues = [0.12, 0.62, 0.33, 0.92, 0.08, 0.0, 0.75, 0.55];
  return new THREE.Color().setHSL(hues[dom] ?? 0.6, 0.8, 0.55);
}

// ─────────────────────────────────────────────────────────────
// Three.js inner scene
// ─────────────────────────────────────────────────────────────

interface SceneProps {
  params: ToroidParams;
  transitColor: THREE.Color;
  compact?: boolean;
  offset?: [number, number, number];
}

function ToroidScene({ params, transitColor, compact = false, offset = [0, 0, 0] }: SceneProps) {
  const worldRef        = useRef<THREE.Group>(null);
  const torusRef        = useRef<THREE.Mesh>(null);
  const innerTorusRef   = useRef<THREE.Mesh>(null);
  const torusMatRef     = useRef<THREE.MeshStandardMaterial>(null);
  const driftRef        = useRef<THREE.Mesh>(null);
  const trailHead       = useRef(0);

  const {
    scorpioCore, piscesField, sagAxis, geminiDrift,
    satComp, libraStab, rahuExp,
  } = params;

  // Derived constants — only recompute when params change
  const geo = useMemo(() => {
    const baseMinor  = 1.35 * (0.75 + 0.55 * piscesField);
    const coreTight  = 0.35 + 0.55 * scorpioCore;
    const axisGlow   = 0.4  + 1.6  * sagAxis;
    const driftRate  = 0.2  + 1.2  * geminiDrift;
    const rahuPrec   = (rahuExp + sagAxis) / 2;

    const AH = 8.0 * (1 - 0.22 * satComp);
    const R  = 4.2 * (1 + 0.18 * rahuExp);
    const r  = baseMinor * (1 + 0.22 * rahuExp);
    const mid = AH * 0.48;

    const precRate = 0.03 + 0.20 * rahuPrec;
    const wobAmp   = 0.03 + 0.14 * rahuPrec;
    const wobFreq  = 0.10 + 0.30 * rahuPrec;

    const coreRadius = R * (0.18 + 0.24 * coreTight);
    const helixTurns = 8 + Math.round(10 * scorpioCore);
    const helixH     = AH * 0.72;
    const helixY0    = AH * 0.12;

    const count = compact ? 700 : 1400;

    // Helix geometries
    const idaPts  = makeHelixPoints(coreRadius, helixTurns, helixY0, helixH, 0);
    const pinPts  = makeHelixPoints(coreRadius, helixTurns, helixY0, helixH, Math.PI);
    const partPts = makeParticles(count, R, r);

    const idaGeo  = new THREE.BufferGeometry();
    idaGeo.setAttribute('position', new THREE.BufferAttribute(idaPts, 3));

    const pinGeo  = new THREE.BufferGeometry();
    pinGeo.setAttribute('position', new THREE.BufferAttribute(pinPts, 3));

    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPts, 3));

    const trailPts = new Float32Array(200 * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPts, 3));

    const idaLine = new THREE.Line(
      idaGeo,
      new THREE.LineBasicMaterial({ color: 0xff44aa, transparent: true, opacity: 0.75 }),
    );
    const pinLine = new THREE.Line(
      pinGeo,
      new THREE.LineBasicMaterial({ color: 0x33aaff, transparent: true, opacity: 0.75 }),
    );

    return {
      AH, R, r, mid, axisGlow, driftRate, precRate, wobAmp, wobFreq,
      rahuExp, satComp, libraStab, geminiDrift,
      idaLine, pinLine, partGeo, trailGeo, trailPts,
    };
  }, [scorpioCore, piscesField, sagAxis, geminiDrift, satComp, libraStab, rahuExp, compact]);

  const libraDamp = useCallback(
    (x: number) => {
      const d    = Math.abs((x - geo.mid) / geo.AH);
      const ease = Math.min(1, d * 2.2);
      return (1 - geo.libraStab) + geo.libraStab * ease;
    },
    [geo.mid, geo.AH, geo.libraStab],
  );

  useFrame(({ clock }) => {
    if (!worldRef.current || !driftRef.current) return;
    const t = clock.getElapsedTime();

    // Global precession / wobble
    worldRef.current.rotation.y = t * geo.precRate;
    worldRef.current.rotation.x = geo.wobAmp * Math.sin(t * geo.wobFreq);
    worldRef.current.rotation.z = geo.wobAmp * 0.6 * Math.sin(t * (geo.wobFreq * 0.73) + 1.2);

    // Breathing
    if (torusRef.current) {
      torusRef.current.scale.setScalar(1 + 0.018 * Math.sin(t * 0.7) * libraDamp(geo.mid));
    }
    if (innerTorusRef.current) {
      innerTorusRef.current.scale.setScalar(1 + 0.026 * Math.sin(t * 0.9 + 1.0) * libraDamp(geo.AH * 0.35));
    }

    // Transit colour shift on outer torus
    if (torusMatRef.current) {
      torusMatRef.current.emissive.lerp(transitColor, 0.008);
    }

    // Drift dot
    const vertRate = 0.18 * (1 - 0.35 * geo.satComp);
    const yBase    = geo.AH * (0.15 + 0.75 * (0.5 + 0.5 * Math.sin(t * vertRate)));
    const yWobble  = (0.18 * (1 - 0.45 * geo.libraStab)) * Math.sin(t * 0.55 + 0.7);
    const dY       = THREE.MathUtils.clamp(
      yBase + yWobble * libraDamp(yBase),
      0.05 * geo.AH,
      0.98 * geo.AH,
    );
    const rBase = geo.R * (0.24 + 0.22 * Math.sin(t * 0.33 + 0.8));
    const rRahu = rBase * (1 + 0.22 * geo.rahuExp);
    const ang   = t * geo.driftRate + 0.8 * Math.sin(t * geo.precRate * 4);
    const dx    = Math.cos(ang) * rRahu;
    const dz    = Math.sin(ang) * rRahu;
    driftRef.current.position.set(dx, dY, dz);

    // Trail ring buffer
    const pos  = geo.trailGeo.attributes.position as THREE.BufferAttribute;
    const head = trailHead.current;
    pos.array[head * 3]     = dx;
    pos.array[head * 3 + 1] = dY;
    pos.array[head * 3 + 2] = dz;
    trailHead.current = (head + 1) % 200;
    pos.needsUpdate = true;
  });

  const { AH, R, r, mid, axisGlow, satComp: sc, libraStab: ls } = geo;
  const csz = compact ? 0.11 : 0.14;
  const rsz = compact ? 0.3  : 0.38;

  return (
    <group position={offset}>
      <group ref={worldRef}>

        {/* Central axis */}
        <mesh position={[0, AH / 2 - AH * 0.05, 0]}>
          <cylinderGeometry args={[0.05, 0.05, AH, 24, 1, true]} />
          <meshStandardMaterial
            color={0xfff3c4}
            emissive={new THREE.Color(0xffcc77)}
            emissiveIntensity={axisGlow * (1 + 0.35 * sc)}
            transparent opacity={0.86}
            metalness={0.2} roughness={0.3}
          />
        </mesh>

        {/* Outer toroid shell */}
        <mesh ref={torusRef} rotation={[Math.PI / 2, 0, 0]} position={[0, mid, 0]}>
          <torusGeometry args={[R, r, 48, compact ? 140 : 220]} />
          <meshStandardMaterial
            ref={torusMatRef}
            color={0x7bd5ff}
            emissive={new THREE.Color(0x2aa7ff)}
            emissiveIntensity={0.80}
            transparent opacity={0.22}
            roughness={0.12}
          />
        </mesh>

        {/* Inner torus (Scorpio core) */}
        <mesh ref={innerTorusRef} rotation={[Math.PI / 2, 0, 0]} position={[0, AH * 0.35, 0]}>
          <torusGeometry args={[R * 0.55, r * 0.18, 28, compact ? 100 : 160]} />
          <meshStandardMaterial
            color={0xff6aa8}
            emissive={new THREE.Color(0xff2d7a)}
            emissiveIntensity={1.05}
            transparent opacity={0.18} roughness={0.25}
          />
        </mesh>

        {/* Libra equatorial ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, mid, 0]}>
          <torusGeometry args={[R * 1.03, 0.025, 10, 90]} />
          <meshStandardMaterial
            color={0xffd700}
            emissive={new THREE.Color(0xffaa00)}
            emissiveIntensity={0.6 * ls}
            transparent opacity={0.1 + 0.45 * ls}
          />
        </mesh>

        {/* Ida helix — feminine (pink) */}
        <primitive object={geo.idaLine} />

        {/* Pingala helix — masculine (blue) */}
        <primitive object={geo.pinLine} />

        {/* Field particles */}
        <points>
          <primitive object={geo.partGeo} attach="geometry" />
          <pointsMaterial
            size={compact ? 0.025 : 0.035}
            color={0x88ccff}
            transparent opacity={0.28}
            sizeAttenuation
          />
        </points>

        {/* Chakra nodes */}
        {CHAKRA_U.map((u, i) => (
          <group key={i} position={[0, u * AH, 0]}>
            <mesh>
              <sphereGeometry args={[csz, 16, 16]} />
              <meshStandardMaterial
                color={0xffffff}
                emissive={CHAKRA_COLORS[i]}
                emissiveIntensity={1.3}
                transparent opacity={0.9}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[rsz, 0.015, 10, compact ? 60 : 90]} />
              <meshStandardMaterial
                color={CHAKRA_COLORS[i]}
                emissive={CHAKRA_COLORS[i]}
                emissiveIntensity={0.7}
                transparent opacity={0.38}
              />
            </mesh>
          </group>
        ))}

        {/* Drift dot */}
        <mesh ref={driftRef}>
          <sphereGeometry args={[compact ? 0.08 : 0.1, 14, 14]} />
          <meshStandardMaterial
            color={0xc7ff6a}
            emissive={new THREE.Color(0x9fff3a)}
            emissiveIntensity={1.25}
          />
        </mesh>

        {/* Drift trail */}
        <points>
          <primitive object={geo.trailGeo} attach="geometry" />
          <pointsMaterial size={0.04} color={0xc7ff6a} transparent opacity={0.22} sizeAttenuation />
        </points>

      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Soul Anatomy side panel (full mode)
// ─────────────────────────────────────────────────────────────

const DIM_META = [
  { symbol: 'P', name: 'Identity',   ruler: 'Sun',            color: '#ffdd88' },
  { symbol: 'E', name: 'Structure',  ruler: 'Saturn',         color: '#aabbcc' },
  { symbol: 'μ', name: 'Mind',       ruler: 'Mercury',        color: '#88ff88' },
  { symbol: 'V', name: 'Heart',      ruler: 'Venus',          color: '#ffaabb' },
  { symbol: 'N', name: 'Growth',     ruler: 'Jupiter',        color: '#ff8844' },
  { symbol: 'Δ', name: 'Drive',      ruler: 'Mars',           color: '#ff5555' },
  { symbol: 'R', name: 'Connection', ruler: 'Moon',           color: '#88ddff' },
  { symbol: 'Φ', name: 'Awareness',  ruler: 'Uranus/Neptune', color: '#cc77ff' },
];

const ANATOMY = [
  {
    label: 'Axis of Light',
    element: 'N Growth (Jupiter)',
    color: '#ffcc77',
    desc: 'Your spiritual spine — vertical current connecting root to crown. Brighter and taller with high Growth. Jupiter transits intensify this channel: clarity and expansion flow freely.',
  },
  {
    label: 'Toroidal Shell',
    element: 'R Connection + Φ Awareness',
    color: '#7bd5ff',
    desc: 'The outer field boundary. Thickness reflects emotional sensitivity and spiritual permeability. Neptune transits dissolve the edge; Saturn transits harden it into discipline.',
  },
  {
    label: 'Core Vortex',
    element: 'Δ Drive (Mars)',
    color: '#ff6aa8',
    desc: 'Inner Scorpionic helix — the engine of transformation. Density and radius grow with Drive. Mars transits rev this core: watch for intensity, depth of focus, and regenerative power.',
  },
  {
    label: 'Ida / Pingala',
    element: 'All dimensions (polarity)',
    color: '#dd88ff',
    desc: 'Dual helixes spiraling the axis. Pink (Ida, feminine current) and blue (Pingala, masculine current). Their weave reflects the polarity balance across your 8 dimensions.',
  },
  {
    label: 'Chakra Nodes',
    element: '7 universal centers',
    color: '#ffffff',
    desc: 'Fixed resonance points on the axis from root to crown. They pulse at the brightness of your natal profile. The most luminous node reveals your dominant energetic center.',
  },
  {
    label: 'Libra Ring',
    element: 'V Heart (Venus)',
    color: '#ffd700',
    desc: 'Equatorial stabilizer at the midplane. Strengthens with Heart. Venus transits make it glow and dampen chaotic wobble near center — a natural harmonic equilibrator.',
  },
  {
    label: 'Drift Point',
    element: 'μ Mind (Mercury)',
    color: '#c7ff6a',
    desc: 'The wandering mind — orbits faster with higher Mind scores. Mercury retrograde slows and destabilizes its path. Watch for scattered thought or brilliant lateral leaps.',
  },
  {
    label: 'Field Particles',
    element: 'R Connection (Moon)',
    color: '#88ccff',
    desc: 'Ambient field flowing across the toroidal surface — the relational atmosphere, collective current, emotional background noise that surrounds your personal field.',
  },
];

function getTransitNote(v: number[]): string {
  const pairs: [number, string][] = v
    .slice(0, 8)
    .map((val, i) => [val, i] as [number, number])
    .sort((a, b) => b[0] - a[0]);
  const top = pairs[0][1];
  const notes = [
    'Sun activates identity field — strong presence and self-clarity today.',
    'Saturn compresses the axis — structure and discipline are rewarded.',
    'Mercury peaks — mind orbits fast, words land precisely.',
    'Venus brightens the Libra ring — harmony, connection, beauty.',
    'Jupiter opens the axis — expansion and meaning flow freely.',
    'Mars revs the core vortex — channel intensity with intention.',
    'Moon heightens the field particles — trust feelings, relational day.',
    'Outer planets active — subtle shifts in awareness and intuition.',
  ];
  return notes[top] ?? 'Balanced sky — your field runs on its own rhythm.';
}

interface SoulPanelProps {
  params: ToroidParams;
  archetypeName?: string;
  natal: number[];
  transit?: number[];
  onShare?: () => void;
}

function SoulPanel({ params, archetypeName, natal, transit, onShare }: SoulPanelProps) {
  const [active, setActive] = useState<number | null>(null);
  const dominant = useMemo(
    () => natal.slice(0, 8).indexOf(Math.max(...natal.slice(0, 8))),
    [natal],
  );

  return (
    <div className="soul-panel">
      <div className="sp-header">
        <span className="sp-eyebrow">Soul Anatomy</span>
        {archetypeName && <span className="sp-archetype">{archetypeName}</span>}
      </div>

      {/* 8D dimension bars */}
      <div className="sp-dims">
        {DIM_META.map((d, i) => (
          <div key={i} className={`sp-dim ${i === dominant ? 'sp-dim-dominant' : ''}`}>
            <span className="sp-sym" style={{ color: i === dominant ? d.color : undefined }}>{d.symbol}</span>
            <div className="sp-track">
              <div className="sp-fill" style={{ width: `${Math.round((natal[i] ?? 0) * 100)}%`, background: d.color }} />
            </div>
            <span className="sp-val">{Math.round((natal[i] ?? 0) * 100)}</span>
          </div>
        ))}
      </div>

      <div className="sp-label">Field Elements</div>

      {ANATOMY.map((item, i) => (
        <div
          key={i}
          className={`sp-item ${active === i ? 'sp-item-open' : ''}`}
          onClick={() => setActive(active === i ? null : i)}
        >
          <span className="sp-dot" style={{ background: item.color }} />
          <div className="sp-item-body">
            <div className="sp-item-row">
              <span className="sp-item-label">{item.label}</span>
              <span className="sp-item-dim">{item.element}</span>
            </div>
            {active === i && <p className="sp-item-desc">{item.desc}</p>}
          </div>
        </div>
      ))}

      {transit && (
        <div className="sp-transit">
          <span className="sp-transit-label">Today's sky</span>
          <p className="sp-transit-text">{getTransitNote(transit)}</p>
        </div>
      )}

      {onShare && (
        <button className="sp-share" onClick={onShare}>
          Share your field ↗
        </button>
      )}

      <style>{`
        .soul-panel {
          width: 296px;
          min-width: 280px;
          height: 100%;
          background: rgba(4,6,18,0.93);
          border-left: 1px solid rgba(100,140,255,0.12);
          overflow-y: auto;
          padding: 20px 16px 48px;
          backdrop-filter: blur(12px);
          scrollbar-width: thin;
          scrollbar-color: rgba(100,140,255,0.2) transparent;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .sp-header {
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(100,140,255,0.1);
        }
        .sp-eyebrow {
          display: block;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(180,200,255,0.45);
          margin-bottom: 4px;
        }
        .sp-archetype {
          font-size: 1rem;
          color: #f0e8d8;
          font-style: italic;
        }
        .sp-dims {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-bottom: 20px;
        }
        .sp-dim {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
        }
        .sp-sym {
          width: 18px;
          text-align: center;
          color: rgba(200,210,255,0.4);
          font-size: 12px;
          transition: color 0.3s;
        }
        .sp-track {
          flex: 1;
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
        }
        .sp-fill {
          height: 100%;
          border-radius: 2px;
          opacity: 0.82;
          transition: width 0.5s ease;
        }
        .sp-val {
          width: 26px;
          text-align: right;
          color: rgba(200,210,255,0.3);
          font-size: 10px;
        }
        .sp-label {
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(180,200,255,0.38);
          margin-bottom: 8px;
        }
        .sp-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
          margin-bottom: 3px;
          transition: all 0.15s;
        }
        .sp-item:hover, .sp-item-open {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
        }
        .sp-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          margin-top: 3px;
          flex-shrink: 0;
        }
        .sp-item-body { flex: 1; }
        .sp-item-row { display: flex; flex-direction: column; gap: 1px; }
        .sp-item-label {
          font-size: 12px;
          color: rgba(220,228,255,0.85);
          font-weight: 500;
        }
        .sp-item-dim {
          font-size: 10px;
          color: rgba(180,200,255,0.38);
        }
        .sp-item-desc {
          font-size: 11px;
          color: rgba(207,211,255,0.65);
          line-height: 1.6;
          margin: 7px 0 0;
        }
        .sp-transit {
          margin-top: 16px;
          padding: 12px;
          background: rgba(100,140,255,0.07);
          border: 1px solid rgba(100,140,255,0.15);
          border-radius: 8px;
        }
        .sp-transit-label {
          display: block;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(180,200,255,0.4);
          margin-bottom: 6px;
        }
        .sp-transit-text {
          font-size: 11px;
          color: rgba(207,211,255,0.72);
          line-height: 1.55;
          margin: 0;
        }
        .sp-share {
          margin-top: 18px;
          width: 100%;
          padding: 10px;
          background: transparent;
          border: 1px solid rgba(100,140,255,0.3);
          border-radius: 8px;
          color: rgba(207,211,255,0.75);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.04em;
        }
        .sp-share:hover {
          border-color: rgba(100,140,255,0.7);
          color: #fff;
          background: rgba(100,140,255,0.08);
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Share token helpers (exported for pages to use)
// ─────────────────────────────────────────────────────────────

export function encodeShareToken(bd: {
  year: number; month: number; day: number; hour?: number; minute?: number;
}): string {
  const payload = { y: bd.year, m: bd.month, d: bd.day, h: bd.hour ?? 12, mn: bd.minute ?? 0 };
  return btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function decodeShareToken(
  token: string,
): { year: number; month: number; day: number; hour: number; minute: number } | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(padded));
    return { year: p.y, month: p.m, day: p.d, hour: p.h ?? 12, minute: p.mn ?? 0 };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Cosine similarity for compare mode
// ─────────────────────────────────────────────────────────────

function cosineSim(a: number[], b: number[]): number {
  const dot  = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

// ─────────────────────────────────────────────────────────────
// Public SoulToroid component
// ─────────────────────────────────────────────────────────────

export function SoulToroid({
  natal,
  transit,
  compare,
  mode = 'widget',
  archetypeName,
  onShare,
  className = '',
}: SoulToroidProps) {
  const params        = useMemo(() => deriveParams(natal), [natal]);
  const compareParams = useMemo(() => (compare ? deriveParams(compare) : null), [compare]);
  const transitColor  = useMemo(() => transitToColor(transit ?? null), [transit]);
  const resonance     = useMemo(() => {
    if (!compare) return null;
    return Math.round(cosineSim(natal.slice(0, 8), compare.slice(0, 8)) * 100);
  }, [natal, compare]);

  // ── Widget mode ──────────────────────────────────────────
  if (mode === 'widget') {
    return (
      <div
        className={`st-widget ${className}`}
        style={{ position: 'relative', width: 260, height: 260, cursor: 'grab' }}
      >
        <Canvas
          camera={{ position: [9, 5, 11], fov: 50 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.25} color={0x8899ff} />
          <directionalLight position={[8, 10, 6]} intensity={1.0} />
          <ToroidScene params={params} transitColor={transitColor} compact />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
        </Canvas>
      </div>
    );
  }

  // ── Compare mode ─────────────────────────────────────────
  if (mode === 'compare' && compareParams) {
    return (
      <div className={`st-compare ${className}`} style={{ position: 'relative', width: '100%', height: 460 }}>
        <Canvas
          camera={{ position: [20, 5, 14], fov: 55 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.25} color={0x8899ff} />
          <directionalLight position={[8, 10, 6]} intensity={1.0} />
          <ToroidScene params={params}        transitColor={transitColor} compact offset={[-6.5, 0, 0]} />
          <ToroidScene params={compareParams} transitColor={transitColor} compact offset={[6.5, 0, 0]} />
          <OrbitControls enableZoom enablePan={false} />
        </Canvas>

        {resonance !== null && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 28px',
            background: 'rgba(4,6,18,0.85)',
            border: '1px solid rgba(100,140,255,0.3)',
            borderRadius: 40, backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#c7ff6a', lineHeight: 1 }}>
              {resonance}%
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(207,211,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Field Resonance
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── Full mode ─────────────────────────────────────────────
  return (
    <div
      className={`st-full ${className}`}
      style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [11, 7, 13], fov: 55 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <fog args={['#05060a', 40, 220]} />
          <ambientLight intensity={0.25} color={0x8899ff} />
          <directionalLight position={[8, 10, 6]} intensity={1.0} />
          <ToroidScene params={params} transitColor={transitColor} />
          <OrbitControls enableZoom enablePan={false} />
        </Canvas>
      </div>

      <SoulPanel
        params={params}
        archetypeName={archetypeName}
        natal={natal}
        transit={transit}
        onShare={onShare}
      />
    </div>
  );
}
