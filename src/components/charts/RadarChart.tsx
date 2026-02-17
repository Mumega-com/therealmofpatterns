'use client';

import { useState, useEffect } from 'react';
import { DIMENSION_METADATA } from '../../types';

interface RadarChartProps {
  /** 8D vector, values 0-1 */
  values: number[];
  /** Optional second vector for overlay (e.g., today's transit) */
  overlay?: number[];
  /** Size in px (default 280) */
  size?: number;
  /** Show dimension labels (default true) */
  showLabels?: boolean;
  /** Animate on mount (default true) */
  animate?: boolean;
  /** Dominant dimension index to highlight */
  dominantIndex?: number;
}

const ANIM_DURATION = 800;

export function RadarChart({
  values,
  overlay,
  size = 280,
  showLabels = true,
  animate = true,
  dominantIndex,
}: RadarChartProps) {
  const [progress, setProgress] = useState(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      // ease-out cubic
      setProgress(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const cx = size / 2;
  const cy = size / 2;
  const labelPad = showLabels ? 38 : 8;
  const maxR = cx - labelPad;
  const dims = DIMENSION_METADATA.slice(0, 8);
  const angleStep = (2 * Math.PI) / 8;
  // Start from top (-90°)
  const startAngle = -Math.PI / 2;

  function polarToXY(angle: number, r: number): [number, number] {
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Build polygon points for a vector
  function vectorToPath(vec: number[], scale: number): string {
    return vec
      .slice(0, 8)
      .map((v, i) => {
        const angle = startAngle + i * angleStep;
        const r = v * maxR * scale;
        const [x, y] = polarToXY(angle, r);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ') + ' Z';
  }

  // Dot positions for a vector
  function vectorDots(vec: number[], scale: number): Array<{ x: number; y: number; val: number; i: number }> {
    return vec.slice(0, 8).map((v, i) => {
      const angle = startAngle + i * angleStep;
      const r = v * maxR * scale;
      const [x, y] = polarToXY(angle, r);
      return { x, y, val: v, i };
    });
  }

  const mainPath = vectorToPath(values, progress);
  const mainDots = vectorDots(values, progress);
  const overlayPath = overlay ? vectorToPath(overlay, progress) : null;

  return (
    <div className="radar-chart-container" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="radar-chart-svg"
      >
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212, 168, 84, 0.06)" />
            <stop offset="100%" stopColor="rgba(212, 168, 84, 0)" />
          </radialGradient>
          <linearGradient id="radar-fill-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(212, 168, 84, 0.25)" />
            <stop offset="100%" stopColor="rgba(212, 168, 84, 0.08)" />
          </linearGradient>
          <linearGradient id="overlay-fill-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(167, 139, 250, 0.2)" />
            <stop offset="100%" stopColor="rgba(167, 139, 250, 0.05)" />
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle cx={cx} cy={cy} r={maxR} fill="url(#radar-glow)" />

        {/* Grid rings */}
        {rings.map((ring) => (
          <circle
            key={ring}
            cx={cx}
            cy={cy}
            r={maxR * ring}
            fill="none"
            stroke="rgba(240, 232, 216, 0.06)"
            strokeWidth={ring === 1 ? 1 : 0.5}
          />
        ))}

        {/* Axis lines */}
        {dims.map((_, i) => {
          const angle = startAngle + i * angleStep;
          const [x, y] = polarToXY(angle, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(240, 232, 216, 0.06)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Overlay polygon (transit) */}
        {overlayPath && (
          <path
            d={overlayPath}
            fill="url(#overlay-fill-grad)"
            stroke="rgba(167, 139, 250, 0.4)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Main polygon (natal) */}
        <path
          d={mainPath}
          fill="url(#radar-fill-grad)"
          stroke="rgba(212, 168, 84, 0.7)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Dots on vertices */}
        {mainDots.map((dot) => {
          const isDominant = dot.i === dominantIndex;
          return (
            <g key={dot.i}>
              {isDominant && (
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={8}
                  fill="none"
                  stroke="rgba(212, 168, 84, 0.3)"
                  strokeWidth={1}
                  className="radar-pulse"
                />
              )}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={isDominant ? 4 : 2.5}
                fill={isDominant ? '#d4a854' : 'rgba(212, 168, 84, 0.8)'}
              />
            </g>
          );
        })}

        {/* Labels */}
        {showLabels &&
          dims.map((dim, i) => {
            const angle = startAngle + i * angleStep;
            const labelR = maxR + 18;
            const [x, y] = polarToXY(angle, labelR);
            const isDominant = i === dominantIndex;
            return (
              <g key={`label-${i}`}>
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="radar-label-name"
                  fill={isDominant ? '#d4a854' : 'rgba(240, 232, 216, 0.45)'}
                  fontSize={9}
                  fontWeight={isDominant ? 600 : 400}
                >
                  {dim.name}
                </text>
              </g>
            );
          })}
      </svg>

      <style>{`
        .radar-chart-container {
          margin: 0 auto;
        }
        .radar-chart-svg {
          display: block;
          overflow: visible;
        }
        .radar-label-symbol {
          font-family: inherit;
        }
        .radar-label-name {
          font-family: 'Inter', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .radar-pulse {
          animation: radar-pulse-ring 2s ease-out infinite;
        }
        @keyframes radar-pulse-ring {
          0% { r: 4; opacity: 1; }
          100% { r: 14; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
