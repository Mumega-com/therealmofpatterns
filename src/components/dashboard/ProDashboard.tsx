'use client';

import { useState, useEffect } from 'react';
import { RadarChart } from '../charts/RadarChart';
import { KappaSparkline } from './KappaSparkline';
import { NarratorCard } from '../shared/NarratorCard';
import { getDashboardData, type DashboardData } from '../../lib/dashboard-utils';
import { JOURNEY_STAGES } from '../../lib/journey-engine';

type ViewState = 'loading' | 'no-birth-data' | 'free' | 'pro';

export function ProDashboard() {
  const [state, setState] = useState<ViewState>('loading');
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    // Small delay to let localStorage hydrate
    const timer = setTimeout(() => {
      const d = getDashboardData();
      setData(d);

      if (!d.hasBirthData) {
        setState('no-birth-data');
      } else {
        // Show full dashboard for all users with birth data
        // Pro users get extra features, free users see an upgrade prompt
        setState(d.isPro ? 'pro' : 'free');
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  if (state === 'loading') return <DashboardSkeleton />;
  if (state === 'no-birth-data') return <NoBirthData />;
  if (!data) return null;

  const isFree = state === 'free';

  return (
    <div className="pro-dashboard">
      <div>
        {/* Section 1: Today's Energy */}
        <section className="dash-section energy-section">
          <h2 className="section-title">Today's Energy</h2>

          <div className="energy-grid">
            {/* Radar chart */}
            <div className="chart-col">
              {data.natalVector && (
                <RadarChart
                  values={data.natalVector}
                  overlay={data.transitVector || undefined}
                  size={260}
                  showLabels={true}
                  dominantIndex={data.archetype?.dominantIndex}
                />
              )}
              <div className="chart-legend">
                <span className="legend-item legend-natal">Your profile</span>
                <span className="legend-item legend-transit">Today's sky</span>
              </div>
            </div>

            {/* Stats col */}
            <div className="stats-col">
              {data.archetype && (
                <div className="archetype-badge">
                  <span className="badge-label">Your archetype</span>
                  <span className="badge-name">{data.archetype.primary.title}</span>
                  <span className="badge-quest">{data.archetype.primary.quest}</span>
                </div>
              )}

              {data.averageKappa !== null && (
                <div className="kappa-display">
                  <span className="kappa-value">{Math.round(data.averageKappa * 100)}%</span>
                  <span className="kappa-label">Alignment (7-day avg)</span>
                </div>
              )}

              <div className="stage-badge">
                <span className="stage-icon">{data.journey.currentStage.icon}</span>
                <div>
                  <span className="stage-name">{data.journey.currentStage.name}</span>
                  <span className="stage-subtitle">{data.journey.currentStage.subtitle}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Pattern Trends */}
        <section className="dash-section trends-section">
          <h2 className="section-title">Pattern Trends</h2>

          <div className="trends-grid">
            <div className="trend-card sparkline-card">
              <span className="card-label">Alignment over time</span>
              <KappaSparkline
                scores={data.recentScores}
                trend={data.trend}
                width={240}
                height={48}
              />
            </div>

            <div className="trend-card streak-card">
              <span className="streak-number">{data.streak}</span>
              <span className="card-label">Day streak</span>
            </div>

            <div className="trend-card checkins-card">
              <span className="streak-number">{data.totalCheckins}</span>
              <span className="card-label">Total check-ins</span>
            </div>
          </div>

          {/* Journey progress bar */}
          <div className="journey-progress">
            <div className="progress-stages">
              {JOURNEY_STAGES.map((stage) => {
                const isActive = stage.number === data.journey.stageNumber;
                const isCompleted = stage.number < data.journey.stageNumber;
                return (
                  <div
                    key={stage.id}
                    className={`progress-stage ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    title={stage.name}
                  >
                    <span className="progress-icon">{stage.icon}</span>
                  </div>
                );
              })}
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${((data.journey.stageNumber - 1) / 7) * 100}%` }}
              />
            </div>
            <p className="next-milestone">{data.journey.nextMilestone}</p>
          </div>
        </section>

        {/* Section 3: Today's Narrative */}
        <section className="dash-section reading-preview">
          <NarratorCard
            archetypeTitle={data.archetype?.primary.title}
            compact={true}
          />
        </section>

        {/* Section 4: Quick Actions */}
        <section className="dash-section actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <a href="/reading" className="action-card">
              <span className="action-icon">☀</span>
              <span className="action-label">Daily Reading</span>
            </a>
            <a href="/sol/checkin" className="action-card">
              <span className="action-icon">◈</span>
              <span className="action-label">Check In</span>
            </a>
            <a href="/profile" className="action-card">
              <span className="action-icon">⊙</span>
              <span className="action-label">Your Profile</span>
            </a>
            <a href="/journey" className="action-card">
              <span className="action-icon">⚜</span>
              <span className="action-label">Journey Map</span>
            </a>
          </div>
        </section>
      </div>

      {isFree && <UpgradeBanner />}

      <style>{`
        .pro-dashboard {
          max-width: 800px;
          margin: 0 auto;
        }

        /* Sections */
        .dash-section {
          margin-bottom: 2.5rem;
        }

        .section-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.4rem;
          font-weight: 400;
          color: #d4a854;
          margin: 0 0 1.25rem;
        }

        /* Energy Section */
        .energy-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 640px) {
          .energy-grid {
            grid-template-columns: 1fr;
            justify-items: center;
          }
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 0.75rem;
          font-size: 0.75rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: rgba(240, 232, 216, 0.5);
        }

        .legend-natal::before {
          content: '';
          display: inline-block;
          width: 12px;
          height: 2px;
          background: #d4a854;
        }

        .legend-transit::before {
          content: '';
          display: inline-block;
          width: 12px;
          height: 2px;
          background: rgba(167, 139, 250, 0.5);
          border-top: 1px dashed rgba(167, 139, 250, 0.8);
        }

        .stats-col {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .archetype-badge {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .badge-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(240, 232, 216, 0.4);
        }

        .badge-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.6rem;
          color: #f0e8d8;
        }

        .badge-quest {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
          font-style: italic;
        }

        .kappa-display {
          display: flex;
          flex-direction: column;
        }

        .kappa-value {
          font-size: 2.5rem;
          font-weight: 300;
          color: #d4a854;
          line-height: 1;
        }

        .kappa-label {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.4);
          margin-top: 0.25rem;
        }

        .stage-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 10px;
        }

        .stage-icon {
          font-size: 1.5rem;
        }

        .stage-name {
          display: block;
          font-size: 0.9rem;
          color: #f0e8d8;
        }

        .stage-subtitle {
          display: block;
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.5);
        }

        /* Trends Section */
        .trends-grid {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 640px) {
          .trends-grid {
            grid-template-columns: 1fr 1fr;
          }
          .sparkline-card {
            grid-column: 1 / -1;
          }
        }

        .trend-card {
          padding: 1rem;
          background: rgba(26, 24, 20, 0.5);
          border: 1px solid rgba(212, 168, 84, 0.08);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .card-label {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .streak-number {
          font-size: 2rem;
          font-weight: 300;
          color: #f0e8d8;
          line-height: 1;
        }

        /* Journey Progress */
        .journey-progress {
          padding: 1rem;
          background: rgba(26, 24, 20, 0.4);
          border: 1px solid rgba(212, 168, 84, 0.08);
          border-radius: 10px;
        }

        .progress-stages {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .progress-stage {
          font-size: 1rem;
          opacity: 0.25;
          transition: opacity 0.3s;
        }

        .progress-stage.completed {
          opacity: 0.6;
        }

        .progress-stage.active {
          opacity: 1;
        }

        .progress-bar-track {
          height: 3px;
          background: rgba(240, 232, 216, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #d4a854, rgba(167, 139, 250, 0.6));
          border-radius: 2px;
          transition: width 0.6s ease;
        }

        .next-milestone {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.5);
          margin: 0;
        }

        /* Reading Preview */
        .reading-excerpt {
          color: rgba(240, 232, 216, 0.7);
          font-size: 0.95rem;
          line-height: 1.7;
          margin: 0 0 0.75rem;
        }

        .read-more-link {
          font-size: 0.85rem;
          color: #d4a854;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .read-more-link:hover {
          opacity: 0.8;
        }

        /* Quick Actions */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.25rem 1rem;
          background: rgba(26, 24, 20, 0.5);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s;
        }

        .action-card:hover {
          border-color: rgba(212, 168, 84, 0.3);
          transform: translateY(-2px);
        }

        .action-icon {
          font-size: 1.5rem;
        }

        .action-label {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.7);
        }

        /* Upgrade Banner */
        .upgrade-banner {
          position: relative;
          z-index: 10;
          margin-bottom: 2rem;
          padding: 2rem;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.15) 0%, rgba(167, 139, 250, 0.1) 100%);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 16px;
          text-align: center;
        }

        .upgrade-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.5rem;
          color: #f0e8d8;
          margin: 0 0 0.5rem;
        }

        .upgrade-desc {
          color: rgba(240, 232, 216, 0.6);
          font-size: 0.9rem;
          margin: 0 0 1.5rem;
        }

        .upgrade-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.75rem;
          background: linear-gradient(135deg, #d4a854 0%, #c49a4a 100%);
          color: #0a0908;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          border-radius: 10px;
          transition: all 0.2s;
        }

        .upgrade-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(212, 168, 84, 0.3);
        }
      `}</style>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="skel-block skel-wide" />
      <div className="skel-row">
        <div className="skel-block skel-chart" />
        <div className="skel-block skel-stats" />
      </div>
      <div className="skel-block skel-wide" />
      <style>{`
        .dashboard-skeleton {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .skel-block {
          background: rgba(240, 232, 216, 0.04);
          border-radius: 12px;
          animation: skeleton-pulse 1.5s infinite;
        }
        .skel-wide { height: 24px; width: 40%; }
        .skel-chart { height: 260px; width: 260px; border-radius: 50%; }
        .skel-stats { height: 260px; flex: 1; }
        .skel-row { display: flex; gap: 2rem; }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

function NoBirthData() {
  return (
    <div className="no-birth-data">
      <div className="nbd-icon">⊙</div>
      <h2 className="nbd-title">Your dashboard is waiting</h2>
      <p className="nbd-desc">
        Enter your birthday to unlock your personalized energy dashboard
        with daily insights, pattern tracking, and your unique archetype.
      </p>
      <a href="/discover" className="nbd-cta">
        Discover your pattern →
      </a>
      <style>{`
        .no-birth-data {
          max-width: 500px;
          margin: 4rem auto;
          text-align: center;
        }
        .nbd-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }
        .nbd-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.8rem;
          font-weight: 400;
          color: #f0e8d8;
          margin: 0 0 1rem;
        }
        .nbd-desc {
          color: rgba(240, 232, 216, 0.6);
          line-height: 1.6;
          margin: 0 0 2rem;
        }
        .nbd-cta {
          display: inline-flex;
          padding: 0.75rem 1.75rem;
          background: linear-gradient(135deg, #d4a854 0%, #c49a4a 100%);
          color: #0a0908;
          font-weight: 600;
          text-decoration: none;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .nbd-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(212, 168, 84, 0.3);
        }
      `}</style>
    </div>
  );
}

function UpgradeBanner() {
  return (
    <div className="upgrade-banner">
      <h2 className="upgrade-title">Unlock your full dashboard</h2>
      <p className="upgrade-desc">
        See your energy trends, pattern insights, and personalized daily guidance.
      </p>
      <a href="/subscribe" className="upgrade-cta">
        Upgrade to Pro →
      </a>
    </div>
  );
}
