'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { $mode, $forecast } from '../../stores';
import { getRecentCheckins, getKappaTrend, getAverageKappa, type CheckinEntry } from '../../lib/checkin-storage';

// ============================================
// Types
// ============================================

interface GaugeProps {
  value: number;
  max?: number;
  label: string;
  mode: 'kasra' | 'river' | 'sol';
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  trend?: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  mode: 'kasra' | 'river' | 'sol';
}

interface SparklineProps {
  data: number[];
  mode: 'kasra' | 'river' | 'sol';
  height?: number;
  showArea?: boolean;
}

interface DashboardEnhancedProps {
  className?: string;
}

// ============================================
// Main Dashboard Component
// ============================================

export function DashboardEnhanced({ className = '' }: DashboardEnhancedProps) {
  const mode = useStore($mode);
  const forecast = useStore($forecast);
  const failureMode = forecast.failureMode || 'healthy';

  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [trend, setTrend] = useState<number | null>(null);
  const [avgKappa, setAvgKappa] = useState<number | null>(null);

  useEffect(() => {
    const recent = getRecentCheckins(14);
    setCheckins(recent);
    setTrend(getKappaTrend(7));
    setAvgKappa(getAverageKappa(7));
  }, []);

  const kappaHistory = useMemo(() =>
    checkins.map(c => c.kappa).reverse(),
    [checkins]
  );

  return (
    <div className={`dashboard-enhanced dashboard-enhanced--${mode} ${className}`}>
      {/* Primary Metric - Kappa Gauge */}
      <section className="dashboard-section primary-metric">
        <AnimatedGauge
          value={forecast.kappa ?? 0}
          max={1}
          label={mode === 'kasra' ? 'KAPPA_COEFFICIENT' : mode === 'river' ? 'Soul Coherence' : 'Your Score'}
          mode={mode}
          size="lg"
          showTrend
          trend={trend ?? undefined}
        />
      </section>

      {/* Stats Grid */}
      <section className="dashboard-section stats-grid">
        <StatCard
          label={mode === 'kasra' ? 'STREAK' : mode === 'river' ? 'Days Attuned' : 'Streak'}
          value={checkins.length > 0 ? calculateStreak(checkins) : 0}
          icon={mode === 'sol' ? '🔥' : undefined}
          mode={mode}
        />
        <StatCard
          label={mode === 'kasra' ? 'AVG_7D' : mode === 'river' ? 'Weekly Mean' : '7-Day Avg'}
          value={avgKappa ? `${(avgKappa * 100).toFixed(0)}%` : '--'}
          trend={trend && trend > 0 ? 'up' : trend && trend < 0 ? 'down' : 'stable'}
          trendValue={trend ? `${(trend * 100).toFixed(1)}%` : undefined}
          mode={mode}
        />
        <StatCard
          label={mode === 'kasra' ? 'TOTAL_CHECKINS' : mode === 'river' ? 'Attunements' : 'Check-ins'}
          value={checkins.length}
          icon={mode === 'sol' ? '✓' : undefined}
          mode={mode}
        />
        <StatCard
          label={mode === 'kasra' ? 'STATUS' : mode === 'river' ? 'Field State' : 'Status'}
          value={failureMode === 'healthy' ? (mode === 'kasra' ? 'NOMINAL' : mode === 'river' ? 'Harmonious' : 'Great!') : failureMode.toUpperCase()}
          mode={mode}
        />
      </section>

      {/* Trend Sparkline */}
      {kappaHistory.length > 2 && (
        <section className="dashboard-section trend-section">
          <div className="section-header">
            <span className="section-icon">
              {mode === 'kasra' ? '◈' : mode === 'river' ? '☽' : '📈'}
            </span>
            <span className="section-title">
              {mode === 'kasra' ? 'KAPPA_HISTORY' : mode === 'river' ? 'Pattern Flow' : 'Your Progress'}
            </span>
          </div>
          <Sparkline data={kappaHistory} mode={mode} height={80} showArea />
        </section>
      )}

      {/* Dimension Breakdown */}
      {checkins.length > 0 && (
        <section className="dashboard-section dimensions-section">
          <div className="section-header">
            <span className="section-icon">
              {mode === 'kasra' ? '▣' : mode === 'river' ? '⬡' : '🎯'}
            </span>
            <span className="section-title">
              {mode === 'kasra' ? 'DIMENSION_MATRIX' : mode === 'river' ? 'The Four Waters' : 'Balance'}
            </span>
          </div>
          <DimensionBars
            scores={checkins[0]?.scores || {}}
            mode={mode}
          />
        </section>
      )}

      {/* Mode-specific Visualization */}
      {mode === 'kasra' && <KasraDataStream />}
      {mode === 'river' && <RiverMandala kappa={forecast.kappa ?? 0.5} />}
      {mode === 'sol' && <SolProgressRings checkins={checkins} />}

      <style>{getStyles(mode)}</style>
    </div>
  );
}

// ============================================
// Animated Gauge Component
// ============================================

function AnimatedGauge({ value, max = 1, label, mode, size = 'md', showTrend, trend }: GaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Animate value on mount/change
  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setDisplayValue(startValue + (endValue - startValue) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const sizes = { sm: 100, md: 160, lg: 220 };
  const svgSize = sizes[size];
  const strokeWidth = size === 'lg' ? 12 : size === 'md' ? 8 : 6;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = Math.min(displayValue / max, 1);
  const strokeDashoffset = circumference * (1 - normalizedValue * 0.75); // 270 degree arc

  const getColor = () => {
    if (normalizedValue >= 0.7) return mode === 'kasra' ? '#00ff88' : mode === 'river' ? '#a78bfa' : '#22c55e';
    if (normalizedValue >= 0.4) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className={`gauge gauge--${mode} gauge--${size}`}>
      <svg
        ref={svgRef}
        width={svgSize}
        height={svgSize * 0.6}
        viewBox={`0 0 ${svgSize} ${svgSize * 0.6}`}
        className="gauge-svg"
      >
        <defs>
          <linearGradient id={`gauge-gradient-${mode}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getColor()} stopOpacity="0.3" />
            <stop offset="100%" stopColor={getColor()} />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={describeArc(svgSize / 2, svgSize * 0.55, radius, -225, 45)}
          fill="none"
          stroke="var(--gauge-track)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Fill */}
        <path
          d={describeArc(svgSize / 2, svgSize * 0.55, radius, -225, -225 + normalizedValue * 270)}
          fill="none"
          stroke={`url(#gauge-gradient-${mode})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter={mode === 'kasra' ? 'url(#gauge-glow)' : undefined}
          className="gauge-fill"
        />

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
          const angle = -225 + tick * 270;
          const tickStart = polarToCartesian(svgSize / 2, svgSize * 0.55, radius + 8, angle);
          const tickEnd = polarToCartesian(svgSize / 2, svgSize * 0.55, radius + 14, angle);
          return (
            <line
              key={i}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke="var(--gauge-tick)"
              strokeWidth={2}
            />
          );
        })}
      </svg>

      {/* Value Display */}
      <div className="gauge-value">
        <span className="gauge-number">{(displayValue * 100).toFixed(0)}</span>
        <span className="gauge-percent">%</span>
      </div>

      {/* Label */}
      <div className="gauge-label">{label}</div>

      {/* Trend Indicator */}
      {showTrend && trend !== undefined && (
        <div className={`gauge-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
          <span>{Math.abs(trend * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Stat Card Component
// ============================================

function StatCard({ label, value, icon, trend, trendValue, mode }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${mode}`}>
      <div className="stat-header">
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {trend && (
        <div className={`stat-trend stat-trend--${trend}`}>
          <span className="trend-arrow">
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
          {trendValue && <span className="trend-value">{trendValue}</span>}
        </div>
      )}
    </div>
  );
}

// ============================================
// Sparkline Component
// ============================================

function Sparkline({ data, mode, height = 60, showArea = false }: SparklineProps) {
  if (data.length < 2) return null;

  const width = 100; // Percentage
  const padding = 2;
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.1;
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: padding + ((width - padding * 2) / (data.length - 1)) * i,
    y: padding + ((1 - (v - min) / range) * (height - padding * 2)),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className={`sparkline sparkline--${mode}`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="sparkline-svg">
        <defs>
          <linearGradient id={`spark-gradient-${mode}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--spark-color)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--spark-color)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {showArea && (
          <path d={areaPath} fill={`url(#spark-gradient-${mode})`} />
        )}

        <path
          d={linePath}
          fill="none"
          stroke="var(--spark-color)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Last point highlight */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill="var(--spark-color)"
          className="spark-dot"
        />
      </svg>

      {/* Data labels */}
      <div className="sparkline-labels">
        <span>{(data[0] * 100).toFixed(0)}%</span>
        <span>{(data[data.length - 1] * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ============================================
// Dimension Bars Component
// ============================================

function DimensionBars({ scores, mode }: { scores: Record<string, number>; mode: string }) {
  const dimensions = ['coherence', 'energy', 'focus', 'embodiment'];
  const icons: Record<string, Record<string, string>> = {
    kasra: { coherence: '◈', energy: '⚡', focus: '◉', embodiment: '▣' },
    river: { coherence: '☽', energy: '☀', focus: '★', embodiment: '⬡' },
    sol: { coherence: '💭', energy: '⚡', focus: '🎯', embodiment: '🧘' },
  };

  return (
    <div className="dimension-bars">
      {dimensions.map(dim => {
        const value = scores[dim] || 3;
        const percent = (value / 5) * 100;

        return (
          <div key={dim} className="dimension-row">
            <span className="dim-icon">{icons[mode]?.[dim] || '○'}</span>
            <span className="dim-name">{dim}</span>
            <div className="dim-track">
              <div
                className="dim-fill"
                style={{ width: `${percent}%` }}
              />
              {mode === 'kasra' && (
                <div className="dim-scanline" />
              )}
            </div>
            <span className="dim-value">{value.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Kasra Data Stream
// ============================================

function KasraDataStream() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const messages = [
      'SYNC: Field calibration complete',
      'DATA: κ coefficient within parameters',
      'STAT: Pattern recognition active',
      'INFO: Dimensional matrix stable',
      'PROC: Coherence field monitored',
      'SCAN: No anomalies detected',
    ];

    const addLine = () => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLines(prev => [...prev.slice(-5), `[${timestamp}] ${msg}`]);
    };

    addLine();
    const interval = setInterval(addLine, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="dashboard-section data-stream">
      <div className="section-header">
        <span className="section-icon">▶</span>
        <span className="section-title">LIVE_DATA_STREAM</span>
        <span className="stream-status">● ACTIVE</span>
      </div>
      <div className="stream-content">
        {lines.map((line, i) => (
          <div key={i} className="stream-line" style={{ opacity: 0.5 + (i / lines.length) * 0.5 }}>
            {line}
          </div>
        ))}
        <span className="stream-cursor">_</span>
      </div>
    </section>
  );
}

// ============================================
// River Mandala
// ============================================

function RiverMandala({ kappa }: { kappa: number }) {
  const layers = 4;
  const petalsPerLayer = [6, 8, 12, 16];

  return (
    <section className="dashboard-section mandala-section">
      <div className="section-header">
        <span className="section-icon">◈</span>
        <span className="section-title">Soul Mandala</span>
      </div>
      <div className="mandala-container">
        <svg viewBox="0 0 200 200" className="mandala-svg">
          <defs>
            <radialGradient id="mandala-gradient">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
            </radialGradient>
          </defs>

          {/* Layers */}
          {Array.from({ length: layers }).map((_, layerIndex) => {
            const radius = 25 + layerIndex * 20;
            const petals = petalsPerLayer[layerIndex];
            const scale = 0.5 + kappa * 0.5;

            return (
              <g
                key={layerIndex}
                className="mandala-layer"
                style={{
                  transformOrigin: '100px 100px',
                  animation: `mandala-rotate ${20 + layerIndex * 5}s linear infinite ${layerIndex % 2 === 0 ? '' : 'reverse'}`,
                }}
              >
                {Array.from({ length: petals }).map((_, petalIndex) => {
                  const angle = (360 / petals) * petalIndex;
                  return (
                    <ellipse
                      key={petalIndex}
                      cx="100"
                      cy={100 - radius}
                      rx={8 * scale}
                      ry={15 * scale}
                      fill="url(#mandala-gradient)"
                      transform={`rotate(${angle} 100 100)`}
                      opacity={0.3 + kappa * 0.5}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Center */}
          <circle cx="100" cy="100" r={10 + kappa * 10} fill="#a78bfa" opacity="0.8">
            <animate attributeName="r" values={`${10 + kappa * 10};${15 + kappa * 10};${10 + kappa * 10}`} dur="4s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    </section>
  );
}

// ============================================
// Sol Progress Rings
// ============================================

function SolProgressRings({ checkins }: { checkins: CheckinEntry[] }) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();

  // Map checkins to weekdays
  const weekData = weekdays.map((day, i) => {
    const dayCheckins = checkins.filter(c => new Date(c.timestamp).getDay() === i);
    return {
      day,
      count: dayCheckins.length,
      avgKappa: dayCheckins.length > 0
        ? dayCheckins.reduce((sum, c) => sum + c.kappa, 0) / dayCheckins.length
        : 0,
      isToday: i === today,
    };
  });

  return (
    <section className="dashboard-section progress-rings-section">
      <div className="section-header">
        <span className="section-icon">📅</span>
        <span className="section-title">Weekly Activity</span>
      </div>
      <div className="progress-rings">
        {weekData.map((d, i) => (
          <div key={i} className={`ring-day ${d.isToday ? 'today' : ''}`}>
            <svg viewBox="0 0 40 40" className="ring-svg">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="var(--ring-track)"
                strokeWidth="4"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={d.count > 0 ? 'var(--ring-fill)' : 'transparent'}
                strokeWidth="4"
                strokeDasharray={`${d.avgKappa * 100} 100`}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
              />
            </svg>
            <span className="ring-label">{d.day[0]}</span>
            {d.count > 0 && <span className="ring-check">✓</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// Utility Functions
// ============================================

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function calculateStreak(checkins: CheckinEntry[]): number {
  if (checkins.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < checkins.length - 1; i++) {
    const current = new Date(checkins[i].timestamp);
    const next = new Date(checkins[i + 1].timestamp);
    current.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);

    const diff = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ============================================
// Styles
// ============================================

function getStyles(mode: string): string {
  const vars: Record<string, string> = {
    kasra: `
      --dash-bg: #0a0a0a;
      --dash-card-bg: rgba(0,255,136,0.03);
      --dash-accent: #00ff88;
      --dash-accent-dim: rgba(0,255,136,0.3);
      --dash-text: #ffffff;
      --dash-muted: rgba(255,255,255,0.5);
      --dash-border: rgba(0,255,136,0.2);
      --gauge-track: rgba(0,255,136,0.15);
      --gauge-tick: rgba(0,255,136,0.3);
      --spark-color: #00ff88;
      --ring-track: rgba(0,255,136,0.15);
      --ring-fill: #00ff88;
      --dash-font: 'Geist Mono', monospace;
    `,
    river: `
      --dash-bg: #0f0c1a;
      --dash-card-bg: rgba(167,139,250,0.03);
      --dash-accent: #a78bfa;
      --dash-accent-dim: rgba(167,139,250,0.3);
      --dash-text: #f0e8d8;
      --dash-muted: rgba(240,232,216,0.5);
      --dash-border: rgba(167,139,250,0.2);
      --gauge-track: rgba(167,139,250,0.15);
      --gauge-tick: rgba(167,139,250,0.3);
      --spark-color: #a78bfa;
      --ring-track: rgba(167,139,250,0.15);
      --ring-fill: #a78bfa;
      --dash-font: 'Cormorant Garamond', serif;
    `,
    sol: `
      --dash-bg: #fffbf5;
      --dash-card-bg: rgba(245,158,11,0.03);
      --dash-accent: #f59e0b;
      --dash-accent-dim: rgba(245,158,11,0.3);
      --dash-text: #1a1a1a;
      --dash-muted: rgba(26,26,26,0.5);
      --dash-border: rgba(245,158,11,0.2);
      --gauge-track: rgba(245,158,11,0.15);
      --gauge-tick: rgba(245,158,11,0.3);
      --spark-color: #f59e0b;
      --ring-track: rgba(245,158,11,0.15);
      --ring-fill: #f59e0b;
      --dash-font: 'Inter', system-ui, sans-serif;
    `,
  };

  return `
    .dashboard-enhanced {
      ${vars[mode] || vars.sol}
      font-family: var(--dash-font);
      color: var(--dash-text);
    }

    /* Sections */
    .dashboard-section {
      background: var(--dash-card-bg);
      border: 1px solid var(--dash-border);
      border-radius: ${mode === 'kasra' ? '0' : '12px'};
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--dash-border);
    }

    .section-icon {
      font-size: 1.1rem;
      color: var(--dash-accent);
    }

    .section-title {
      font-size: 0.8rem;
      color: var(--dash-muted);
      text-transform: ${mode === 'kasra' ? 'uppercase' : 'none'};
      letter-spacing: ${mode === 'kasra' ? '0.1em' : 'normal'};
      flex: 1;
    }

    /* Gauge */
    .gauge {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .gauge-svg {
      display: block;
    }

    .gauge-fill {
      transition: stroke-dasharray 1.5s ease-out;
    }

    .gauge-value {
      position: absolute;
      top: 50%;
      transform: translateY(-30%);
      display: flex;
      align-items: baseline;
      gap: 2px;
    }

    .gauge-number {
      font-size: ${mode === 'kasra' ? '3rem' : '2.5rem'};
      font-weight: 700;
      color: var(--dash-accent);
      font-family: 'Geist Mono', monospace;
      ${mode === 'kasra' ? 'text-shadow: 0 0 20px var(--dash-accent);' : ''}
    }

    .gauge-percent {
      font-size: 1.25rem;
      color: var(--dash-muted);
    }

    .gauge-label {
      font-size: 0.75rem;
      color: var(--dash-muted);
      text-transform: ${mode === 'kasra' ? 'uppercase' : 'none'};
      letter-spacing: ${mode === 'kasra' ? '0.1em' : 'normal'};
      margin-top: 0.5rem;
    }

    .gauge-trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }

    .gauge-trend.up { color: #22c55e; background: rgba(34,197,94,0.1); }
    .gauge-trend.down { color: #ef4444; background: rgba(239,68,68,0.1); }
    .gauge-trend.stable { color: var(--dash-muted); background: var(--dash-card-bg); }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      padding: 0;
      background: transparent;
      border: none;
    }

    @media (min-width: 640px) {
      .stats-grid { grid-template-columns: repeat(4, 1fr); }
    }

    .stat-card {
      background: var(--dash-card-bg);
      border: 1px solid var(--dash-border);
      border-radius: ${mode === 'kasra' ? '0' : '8px'};
      padding: 1rem;
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      border-color: var(--dash-accent);
      ${mode === 'kasra' ? 'box-shadow: 0 0 10px var(--dash-accent-dim);' : ''}
    }

    .stat-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .stat-icon { font-size: 1rem; }

    .stat-label {
      font-size: 0.7rem;
      color: var(--dash-muted);
      text-transform: ${mode === 'kasra' ? 'uppercase' : 'none'};
      letter-spacing: ${mode === 'kasra' ? '0.05em' : 'normal'};
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--dash-text);
    }

    .stat-trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.7rem;
      margin-top: 0.25rem;
    }

    .stat-trend--up { color: #22c55e; }
    .stat-trend--down { color: #ef4444; }
    .stat-trend--stable { color: var(--dash-muted); }

    /* Sparkline */
    .sparkline { position: relative; }

    .sparkline-svg {
      width: 100%;
      height: 80px;
      display: block;
    }

    .spark-dot {
      animation: spark-pulse 2s ease-in-out infinite;
    }

    @keyframes spark-pulse {
      0%, 100% { r: 3; }
      50% { r: 5; }
    }

    .sparkline-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--dash-muted);
      margin-top: 0.5rem;
    }

    /* Dimension Bars */
    .dimension-bars { display: flex; flex-direction: column; gap: 0.75rem; }

    .dimension-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .dim-icon {
      width: 1.5rem;
      text-align: center;
      color: var(--dash-accent);
    }

    .dim-name {
      width: 6rem;
      font-size: 0.8rem;
      color: var(--dash-muted);
      text-transform: capitalize;
    }

    .dim-track {
      flex: 1;
      height: 8px;
      background: var(--dash-border);
      border-radius: ${mode === 'kasra' ? '0' : '4px'};
      overflow: hidden;
      position: relative;
    }

    .dim-fill {
      height: 100%;
      background: var(--dash-accent);
      transition: width 1s ease-out;
      ${mode === 'kasra' ? 'box-shadow: 0 0 8px var(--dash-accent);' : ''}
    }

    .dim-scanline {
      position: absolute;
      top: 0;
      left: 0;
      width: 20%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: scanline-move 2s linear infinite;
    }

    @keyframes scanline-move {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(500%); }
    }

    .dim-value {
      width: 2.5rem;
      text-align: right;
      font-size: 0.85rem;
      font-family: 'Geist Mono', monospace;
      color: var(--dash-text);
    }

    /* Data Stream (Kasra) */
    .data-stream .stream-status {
      font-size: 0.7rem;
      color: #00ff88;
      animation: blink-status 1s step-end infinite;
    }

    @keyframes blink-status {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .stream-content {
      font-family: 'Geist Mono', monospace;
      font-size: 0.75rem;
      color: rgba(0,255,136,0.7);
      background: #000;
      padding: 1rem;
      border: 1px solid rgba(0,255,136,0.2);
      max-height: 150px;
      overflow-y: auto;
    }

    .stream-line {
      margin-bottom: 0.25rem;
      animation: line-appear 0.3s ease-out;
    }

    @keyframes line-appear {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .stream-cursor {
      animation: cursor-blink 1s step-end infinite;
    }

    @keyframes cursor-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    /* Mandala (River) */
    .mandala-container {
      display: flex;
      justify-content: center;
      padding: 1rem;
    }

    .mandala-svg {
      width: 200px;
      height: 200px;
    }

    @keyframes mandala-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Progress Rings (Sol) */
    .progress-rings {
      display: flex;
      justify-content: space-around;
      gap: 0.5rem;
    }

    .ring-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .ring-day.today .ring-svg {
      filter: drop-shadow(0 0 4px var(--ring-fill));
    }

    .ring-svg {
      width: 40px;
      height: 40px;
    }

    .ring-label {
      font-size: 0.7rem;
      color: var(--dash-muted);
      margin-top: 0.25rem;
    }

    .ring-check {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -70%);
      font-size: 0.8rem;
      color: var(--ring-fill);
    }

    .ring-day.today .ring-label {
      color: var(--dash-accent);
      font-weight: 600;
    }
  `;
}

export default DashboardEnhanced;
