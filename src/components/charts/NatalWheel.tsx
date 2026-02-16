'use client';

import { useState, useEffect, useMemo } from 'react';
import { calculateChart, SIGN_SYMBOLS, SIGNS } from '../../lib/ephemeris-fallback';
import type { DateTime, PlanetPosition } from '../../lib/ephemeris-fallback';

interface NatalWheelProps {
  /** Birth data for chart calculation */
  birthData: { year: number; month: number; day: number; hour?: number; minute?: number };
  /** Latitude/longitude for ascendant */
  location?: { latitude: number; longitude: number };
  /** Size in px (default 280) */
  size?: number;
  /** Animate on mount (default true) */
  animate?: boolean;
  /** Show planet labels (default true) */
  showLabels?: boolean;
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
  Sun: '#d4a854',
  Moon: '#e8e0d0',
  Mercury: '#a0a0a0',
  Venus: '#c4956a',
  Mars: '#c45050',
  Jupiter: '#b8924a',
  Saturn: '#8a8a78',
  Uranus: '#6ab0c4',
  Neptune: '#7a8aee',
  Pluto: '#9a7abc',
};

const ANIM_DURATION = 1000;

export function NatalWheel({
  birthData,
  location,
  size = 280,
  animate = true,
  showLabels = true,
}: NatalWheelProps) {
  const [progress, setProgress] = useState(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const chart = useMemo(() => {
    const dt: DateTime = {
      year: birthData.year,
      month: birthData.month,
      day: birthData.day,
      hour: birthData.hour ?? 12,
      minute: birthData.minute ?? 0,
    };
    const geo = location ? { latitude: location.latitude, longitude: location.longitude } : undefined;
    return calculateChart(dt, geo);
  }, [birthData.year, birthData.month, birthData.day, birthData.hour, birthData.minute, location]);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size / 2) - 4;
  const signR = outerR - 20;        // inner edge of sign band
  const planetR = signR - 22;       // planet orbit
  const innerR = signR - 44;        // inner circle

  // Rotation: 0° Aries at the left (9 o'clock), going counter-clockwise
  // If ascendant exists, rotate so it's at 9 o'clock
  const ascOffset = chart.ascendant != null ? -chart.ascendant : 0;

  function degToAngle(longitude: number): number {
    // Convert ecliptic longitude to SVG angle
    // 0° Aries = left (180° SVG), going counter-clockwise
    const adjusted = longitude + ascOffset;
    return (180 - adjusted) * (Math.PI / 180);
  }

  function polarToXY(angle: number, r: number): [number, number] {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function arcPath(startDeg: number, endDeg: number, r: number): string {
    const a1 = degToAngle(startDeg);
    const a2 = degToAngle(endDeg);
    const [x1, y1] = polarToXY(a1, r);
    const [x2, y2] = polarToXY(a2, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }

  // Resolve overlapping planet labels
  function resolveOverlaps(planets: PlanetPosition[]): Array<PlanetPosition & { displayAngle: number }> {
    const sorted = [...planets].sort((a, b) => a.longitude - b.longitude);
    const minSep = 12; // minimum degrees between labels
    const result = sorted.map((p) => ({ ...p, displayAngle: p.longitude }));

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < result.length; i++) {
        const diff = result[i].displayAngle - result[i - 1].displayAngle;
        if (diff < minSep && diff >= 0) {
          const shift = (minSep - diff) / 2;
          result[i - 1].displayAngle -= shift;
          result[i].displayAngle += shift;
        }
      }
    }
    return result;
  }

  const displayPlanets = resolveOverlaps(chart.planets);

  return (
    <div className="natal-wheel-container" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="natal-wheel-svg"
      >
        <defs>
          <radialGradient id="wheel-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212, 168, 84, 0.04)" />
            <stop offset="70%" stopColor="rgba(212, 168, 84, 0.02)" />
            <stop offset="100%" stopColor="rgba(212, 168, 84, 0)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <circle cx={cx} cy={cy} r={outerR} fill="url(#wheel-glow)" />

        {/* Outer ring */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="rgba(212, 168, 84, 0.2)"
          strokeWidth={1}
        />

        {/* Sign band inner ring */}
        <circle
          cx={cx}
          cy={cy}
          r={signR}
          fill="none"
          stroke="rgba(212, 168, 84, 0.1)"
          strokeWidth={0.5}
        />

        {/* Inner circle */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke="rgba(240, 232, 216, 0.06)"
          strokeWidth={0.5}
        />

        {/* Sign divisions and symbols */}
        {Array.from({ length: 12 }).map((_, i) => {
          const startDeg = i * 30;
          const angle = degToAngle(startDeg);
          const midAngle = degToAngle(startDeg + 15);
          const [lx1, ly1] = polarToXY(angle, signR);
          const [lx2, ly2] = polarToXY(angle, outerR);
          const labelR = (signR + outerR) / 2;
          const [sx, sy] = polarToXY(midAngle, labelR);

          // Alternate sign backgrounds for subtle rhythm
          const evenSign = i % 2 === 0;

          return (
            <g key={i} style={{ opacity: progress }}>
              {/* Sign divider line */}
              <line
                x1={lx1}
                y1={ly1}
                x2={lx2}
                y2={ly2}
                stroke="rgba(212, 168, 84, 0.12)"
                strokeWidth={0.5}
              />
              {/* Sign arc background (alternating) */}
              {evenSign && (
                <path
                  d={`
                    M ${polarToXY(degToAngle(startDeg), signR).join(' ')}
                    A ${signR} ${signR} 0 0 1 ${polarToXY(degToAngle(startDeg + 30), signR).join(' ')}
                    L ${polarToXY(degToAngle(startDeg + 30), outerR).join(' ')}
                    A ${outerR} ${outerR} 0 0 0 ${polarToXY(degToAngle(startDeg), outerR).join(' ')}
                    Z
                  `}
                  fill="rgba(212, 168, 84, 0.02)"
                />
              )}
              {/* Sign symbol */}
              <text
                x={sx}
                y={sy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(212, 168, 84, 0.35)"
                fontSize={9}
                className="sign-symbol"
              >
                {SIGN_SYMBOLS[i]}
              </text>
            </g>
          );
        })}

        {/* Planet orbit ring (subtle) */}
        <circle
          cx={cx}
          cy={cy}
          r={planetR}
          fill="none"
          stroke="rgba(240, 232, 216, 0.03)"
          strokeWidth={0.5}
          strokeDasharray="2 4"
        />

        {/* Ascendant marker */}
        {chart.ascendant != null && (
          <g style={{ opacity: progress }}>
            <line
              x1={polarToXY(degToAngle(chart.ascendant), innerR - 4)[0]}
              y1={polarToXY(degToAngle(chart.ascendant), innerR - 4)[1]}
              x2={polarToXY(degToAngle(chart.ascendant), outerR + 2)[0]}
              y2={polarToXY(degToAngle(chart.ascendant), outerR + 2)[1]}
              stroke="rgba(212, 168, 84, 0.4)"
              strokeWidth={1.5}
            />
            <text
              x={polarToXY(degToAngle(chart.ascendant), outerR + 12)[0]}
              y={polarToXY(degToAngle(chart.ascendant), outerR + 12)[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(212, 168, 84, 0.6)"
              fontSize={7}
              className="asc-label"
            >
              ASC
            </text>
          </g>
        )}

        {/* Planets */}
        {displayPlanets.map((planet) => {
          const trueAngle = degToAngle(planet.longitude);
          const dispAngle = degToAngle(planet.displayAngle);
          const [px, py] = polarToXY(trueAngle, planetR);
          const [lx, ly] = polarToXY(dispAngle, planetR);
          const color = PLANET_COLORS[planet.name] || '#d4a854';
          const symbol = PLANET_SYMBOLS[planet.name] || '?';
          const isLuminary = planet.name === 'Sun' || planet.name === 'Moon';
          const dotR = isLuminary ? 3.5 : 2.5;

          // Tick mark from inner circle to planet orbit
          const [tx1, ty1] = polarToXY(trueAngle, innerR);
          const [tx2, ty2] = polarToXY(trueAngle, innerR + 8);

          return (
            <g key={planet.name} style={{ opacity: progress }}>
              {/* Tick mark */}
              <line
                x1={tx1}
                y1={ty1}
                x2={tx2}
                y2={ty2}
                stroke={color}
                strokeWidth={0.5}
                opacity={0.3}
              />
              {/* Planet dot (at true position) */}
              <circle
                cx={px}
                cy={py}
                r={dotR}
                fill={color}
                opacity={0.9}
              />
              {/* Retrograde indicator */}
              {planet.retrograde && (
                <text
                  x={px + 6}
                  y={py - 4}
                  fill={color}
                  fontSize={6}
                  opacity={0.5}
                >
                  R
                </text>
              )}
              {/* Label */}
              {showLabels && (
                <text
                  x={polarToXY(dispAngle, planetR - 14)[0]}
                  y={polarToXY(dispAngle, planetR - 14)[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={color}
                  fontSize={isLuminary ? 11 : 9}
                  className="planet-symbol"
                >
                  {symbol}
                </text>
              )}
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={2} fill="rgba(212, 168, 84, 0.3)" />
      </svg>

      {/* Legend below the wheel */}
      <div className="natal-legend">
        {chart.planets.slice(0, 5).map((p) => (
          <span key={p.name} className="legend-item">
            <span style={{ color: PLANET_COLORS[p.name] }}>{PLANET_SYMBOLS[p.name]}</span>
            {' '}{p.sign} {Math.floor(p.degree)}°
          </span>
        ))}
      </div>

      <style>{`
        .natal-wheel-container {
          margin: 0 auto;
          text-align: center;
        }
        .natal-wheel-svg {
          display: block;
          overflow: visible;
          margin: 0 auto;
        }
        .sign-symbol {
          font-family: inherit;
        }
        .planet-symbol {
          font-family: inherit;
        }
        .asc-label {
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.1em;
          font-weight: 600;
        }
        .natal-legend {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem 1rem;
          margin-top: 0.75rem;
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.4);
          font-family: 'Inter', sans-serif;
        }
        .legend-item {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
