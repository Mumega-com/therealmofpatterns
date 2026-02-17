'use client';

interface SparklineProps {
  scores: { date: string; kappa: number }[];
  trend: 'up' | 'down' | 'stable';
  width?: number;
  height?: number;
}

export function KappaSparkline({ scores, trend, width = 200, height = 48 }: SparklineProps) {
  if (scores.length < 2) {
    return (
      <div className="sparkline-empty" style={{ width, height }}>
        <span>Check in daily to see your trend</span>
        <style>{`
          .sparkline-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(240, 232, 216, 0.4);
            font-size: 0.75rem;
            border: 1px dashed rgba(212, 168, 84, 0.15);
            border-radius: 8px;
          }
        `}</style>
      </div>
    );
  }

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const min = Math.min(...scores.map(s => s.kappa));
  const max = Math.max(...scores.map(s => s.kappa));
  const range = max - min || 0.1;

  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * w;
    const y = pad + h - ((s.kappa - min) / range) * h;
    return { x, y };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  // Gradient fill area
  const areaD = pathD +
    ` L${points[points.length - 1].x.toFixed(1)},${height} L${points[0].x.toFixed(1)},${height} Z`;

  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#d4a854';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className="sparkline-wrapper">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#spark-fill)" />
        <path d={pathD} fill="none" stroke={trendColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* Current value dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={3}
          fill={trendColor}
        />
      </svg>
      <span className="trend-badge" style={{ color: trendColor }}>
        {trendArrow}
      </span>
      <style>{`
        .sparkline-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .trend-badge {
          font-size: 1rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
