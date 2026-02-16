'use client';

import { useState, useEffect } from 'react';
import { JOURNEY_STAGES, type JourneyStage } from '../../lib/journey-engine';
import type { ArchetypeResult } from '../../lib/archetype-engine';

interface JourneyMapProps {
  currentStage: number;        // 1-8
  unlockedStages: number[];
  archetype?: ArchetypeResult | null;
  size?: number;
  onStageClick?: (stage: JourneyStage) => void;
}

export function JourneyMap({
  currentStage,
  unlockedStages,
  archetype,
  size = 340,
  onStageClick,
}: JourneyMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const pathRadius = size * 0.36;

  // Generate a winding path (ascending spiral)
  // 8 stages placed along a sinuous path from bottom to top
  const stagePositions = JOURNEY_STAGES.map((stage, i) => {
    // S-curve path: stages wind left and right as they ascend
    const t = i / 7; // 0 to 1
    const y = cy + pathRadius * (1 - t * 2); // bottom to top
    const xOffset = Math.sin(t * Math.PI * 2) * (size * 0.22);
    const x = cx + xOffset;
    return { x, y, stage, index: i };
  });

  // Build the path string connecting all stages
  const pathPoints = stagePositions.map(p => `${p.x},${p.y}`);
  let pathD = `M ${pathPoints[0]}`;
  for (let i = 1; i < pathPoints.length; i++) {
    const prev = stagePositions[i - 1];
    const curr = stagePositions[i];
    // Smooth curve between points
    const cpx1 = prev.x;
    const cpy1 = prev.y - (curr.y - prev.y) * 0.3;
    const cpx2 = curr.x;
    const cpy2 = curr.y + (curr.y - prev.y) * 0.3;
    pathD += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${curr.x},${curr.y}`;
  }

  return (
    <div className="journey-map-container">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="journey-map-svg"
      >
        <defs>
          {/* Gold gradient for active path */}
          <linearGradient id="jm-path-active" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(212, 168, 84, 0.1)" />
            <stop offset="100%" stopColor="rgba(212, 168, 84, 0.6)" />
          </linearGradient>

          {/* Glow for current stage */}
          <filter id="jm-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow territory gradient */}
          <radialGradient id="jm-shadow-zone" cx="0.5" cy="0.3" r="0.4">
            <stop offset="0%" stopColor="rgba(100, 60, 120, 0.15)" />
            <stop offset="100%" stopColor="rgba(100, 60, 120, 0)" />
          </radialGradient>
        </defs>

        {/* Shadow territory (visible from stage 5+) */}
        {currentStage >= 5 && (
          <ellipse
            cx={stagePositions[5]?.x || cx}
            cy={stagePositions[5]?.y || cy}
            rx={size * 0.18}
            ry={size * 0.12}
            fill="url(#jm-shadow-zone)"
            className={mounted ? 'jm-fade-in' : ''}
            style={{ opacity: mounted ? 1 : 0 }}
          />
        )}

        {/* Background path (full journey, dim) */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(240, 232, 216, 0.06)"
          strokeWidth="2"
          strokeDasharray="4 8"
        />

        {/* Active path (up to current stage) */}
        {currentStage > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="url(#jm-path-active)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={mounted ? 'jm-path-draw' : ''}
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: mounted ? 1000 - (1000 * (currentStage / 8)) : 1000,
            }}
          />
        )}

        {/* Stage nodes */}
        {stagePositions.map(({ x, y, stage, index }) => {
          const stageNum = index + 1;
          const isUnlocked = unlockedStages.includes(stageNum);
          const isCurrent = stageNum === currentStage;
          const isPast = stageNum < currentStage;
          const isFuture = stageNum > currentStage;

          return (
            <g
              key={stage.id}
              className={`jm-stage ${isCurrent ? 'jm-current' : ''} ${isUnlocked ? 'jm-unlocked' : 'jm-locked'}`}
              onClick={() => isUnlocked && onStageClick?.(stage)}
              style={{ cursor: isUnlocked && onStageClick ? 'pointer' : 'default' }}
            >
              {/* Current stage glow */}
              {isCurrent && mounted && (
                <circle
                  cx={x}
                  cy={y}
                  r={16}
                  fill="none"
                  stroke="rgba(212, 168, 84, 0.3)"
                  strokeWidth="1"
                  className="jm-pulse"
                />
              )}

              {/* Node circle */}
              <circle
                cx={x}
                cy={y}
                r={isCurrent ? 14 : 10}
                fill={
                  isCurrent
                    ? 'rgba(212, 168, 84, 0.2)'
                    : isPast
                    ? 'rgba(212, 168, 84, 0.1)'
                    : 'rgba(240, 232, 216, 0.03)'
                }
                stroke={
                  isCurrent
                    ? '#d4a854'
                    : isPast
                    ? 'rgba(212, 168, 84, 0.4)'
                    : 'rgba(240, 232, 216, 0.1)'
                }
                strokeWidth={isCurrent ? 2 : 1}
                filter={isCurrent ? 'url(#jm-glow)' : undefined}
                className={mounted ? 'jm-node-appear' : ''}
                style={{
                  animationDelay: `${index * 100}ms`,
                  opacity: mounted ? 1 : 0,
                }}
              />

              {/* Stage icon */}
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isCurrent ? 12 : 9}
                fill={
                  isCurrent
                    ? '#d4a854'
                    : isPast
                    ? 'rgba(212, 168, 84, 0.6)'
                    : 'rgba(240, 232, 216, 0.15)'
                }
                style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s' }}
              >
                {stage.icon}
              </text>

              {/* Stage label (only for unlocked stages) */}
              {isUnlocked && (
                <text
                  x={index % 2 === 0 ? x + 20 : x - 20}
                  y={y}
                  textAnchor={index % 2 === 0 ? 'start' : 'end'}
                  dominantBaseline="central"
                  fontSize={isCurrent ? 10 : 8.5}
                  fill={isCurrent ? '#d4a854' : 'rgba(240, 232, 216, 0.4)'}
                  fontWeight={isCurrent ? 600 : 400}
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.5s ${index * 100}ms` }}
                >
                  {stage.name}
                </text>
              )}

              {/* Lock icon for future stages */}
              {isFuture && !isUnlocked && (
                <text
                  x={x}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={7}
                  fill="rgba(240, 232, 216, 0.1)"
                >
                  ·
                </text>
              )}
            </g>
          );
        })}

        {/* Archetype label at current position */}
        {archetype && currentStage >= 1 && mounted && (
          <text
            x={cx}
            y={size - 16}
            textAnchor="middle"
            fontSize={11}
            fill="rgba(212, 168, 84, 0.5)"
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontStyle="italic"
          >
            {archetype.primary.title}
          </text>
        )}
      </svg>

      <style>{`
        .journey-map-container {
          display: flex;
          justify-content: center;
        }

        .journey-map-svg {
          max-width: 100%;
          height: auto;
        }

        .jm-pulse {
          animation: jm-pulse-anim 2s ease-in-out infinite;
        }

        @keyframes jm-pulse-anim {
          0%, 100% { r: 16; opacity: 0.3; }
          50% { r: 22; opacity: 0; }
        }

        .jm-node-appear {
          animation: jm-appear 0.5s ease-out forwards;
        }

        @keyframes jm-appear {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }

        .jm-path-draw {
          transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .jm-fade-in {
          transition: opacity 1s ease-out 0.5s;
        }

        .jm-stage.jm-unlocked:hover circle {
          stroke: rgba(212, 168, 84, 0.6);
        }

        .jm-stage.jm-unlocked:hover text {
          fill: #d4a854;
        }
      `}</style>
    </div>
  );
}
