'use client';

import { useState, useEffect } from 'react';
import { getJourneyState, JOURNEY_STAGES, type JourneyState, type JourneyStage } from '../../lib/journey-engine';
import { computeFromBirthData } from '../../lib/16d-engine';
import { DIMENSION_METADATA, type BirthData } from '../../types';
import { JourneyMap } from './JourneyMap';
import { UnlockGate } from './UnlockGate';
import { RadarChart } from '../charts/RadarChart';

export function JourneyDashboard() {
  const [state, setState] = useState<JourneyState | null>(null);
  const [selectedStage, setSelectedStage] = useState<JourneyStage | null>(null);

  useEffect(() => {
    setState(getJourneyState());
  }, []);

  if (!state) {
    return (
      <div className="jd-loading">
        <div className="jd-pulse" />
        <p>Reading your journey...</p>
      </div>
    );
  }

  const { archetype, content, stageNumber, checkinCount, streakDays, nextMilestone } = state;

  return (
    <div className="journey-dashboard">
      {/* Header */}
      <header className="jd-header">
        <h1 className="jd-title">
          {archetype ? `${archetype.primary.title}'s Journey` : 'Your Journey'}
        </h1>
        <p className="jd-subtitle">
          {archetype
            ? `Stage ${stageNumber}: ${state.currentStage.name}`
            : 'Enter your birthday to begin'}
        </p>
      </header>

      {/* The Map */}
      <section className="jd-map-section">
        <JourneyMap
          currentStage={stageNumber}
          unlockedStages={state.unlockedStages}
          archetype={archetype}
          onStageClick={(stage) => setSelectedStage(stage)}
        />
      </section>

      {/* Next Milestone */}
      <div className="jd-milestone">
        <span className="jd-milestone-icon">→</span>
        <span className="jd-milestone-text">{nextMilestone}</span>
      </div>

      {/* Stage Detail (when clicked) */}
      {selectedStage && state.unlockedStages.includes(selectedStage.number) && (
        <section className="jd-stage-detail">
          <div className="jd-stage-detail-header">
            <span className="jd-stage-icon">{selectedStage.icon}</span>
            <div>
              <h3 className="jd-stage-name">{selectedStage.name}</h3>
              <p className="jd-stage-sub">{selectedStage.subtitle}</p>
            </div>
            <button className="jd-close" onClick={() => setSelectedStage(null)}>×</button>
          </div>
          <p className="jd-stage-desc">{selectedStage.description}</p>
        </section>
      )}

      {/* Archetype Card (Stage 1+) */}
      {archetype && content && (
        <section className="jd-archetype">
          <div className="jd-archetype-header">
            <div className="jd-archetype-icon">{archetype.primary.title.charAt(4)}</div>
            <div>
              <h2 className="jd-archetype-name">{archetype.primary.title}</h2>
              <p className="jd-archetype-quest">Quest: {archetype.primary.quest}</p>
            </div>
          </div>
          <p className="jd-archetype-intro">{content.intro}</p>
          <blockquote className="jd-archetype-quote">
            "{archetype.primary.quote}"
            <cite>— {archetype.primary.quoteAuthor}</cite>
          </blockquote>
        </section>
      )}

      {/* Stats Row */}
      {state.firstCheckinDone && (
        <div className="jd-stats">
          <div className="jd-stat">
            <span className="jd-stat-value">{checkinCount}</span>
            <span className="jd-stat-label">Check-ins</span>
          </div>
          <div className="jd-stat">
            <span className="jd-stat-value">{streakDays}</span>
            <span className="jd-stat-label">Day streak</span>
          </div>
          <div className="jd-stat">
            <span className="jd-stat-value">{stageNumber}/8</span>
            <span className="jd-stat-label">Stage</span>
          </div>
        </div>
      )}

      {/* Dominant Dimension (Stage 4+) */}
      <UnlockGate requiredStage={4} teaser="Complete your first check-in to see your strengths">
        {archetype && content && (
          <section className="jd-section">
            <h2 className="jd-section-title">Your Strength</h2>
            <div className="jd-strength-card">
              <div className="jd-strength-header">
                <span className="jd-strength-symbol">
                  {DIMENSION_METADATA[archetype.dominantIndex].symbol}
                </span>
                <span className="jd-strength-name">
                  {DIMENSION_METADATA[archetype.dominantIndex].name}
                </span>
                <span className="jd-strength-pct">
                  {Math.round(archetype.dominantValue * 100)}%
                </span>
              </div>
              <p className="jd-strength-text">{content.strength}</p>
            </div>
          </section>
        )}
      </UnlockGate>

      {/* Energy Profile (Stage 4+) */}
      <UnlockGate requiredStage={4} teaser="Your energy profile reveals itself after your first check-in">
        {archetype && (
          <section className="jd-section">
            <h2 className="jd-section-title">Your Energy Profile</h2>
            <div className="jd-radar-wrap">
              <RadarChart
                values={state.archetype ? getArchetypeVector(state) : []}
                dominantIndex={archetype.dominantIndex}
                size={240}
              />
            </div>
          </section>
        )}
      </UnlockGate>

      {/* Shadow Teaser (Stage 5+) */}
      <UnlockGate requiredStage={5} teaser="Keep building your practice to glimpse your shadow">
        {content && (
          <section className="jd-section jd-shadow-section">
            <h2 className="jd-section-title">A Pattern Emerges</h2>
            <p className="jd-shadow-teaser">{content.shadowTeaser}</p>
          </section>
        )}
      </UnlockGate>

      {/* Shadow Reveal (Stage 6+) */}
      <UnlockGate requiredStage={6} teaser="Your shadow awaits deeper in the journey">
        {archetype && content && (
          <section className="jd-section jd-ordeal-section">
            <h2 className="jd-section-title">The Ordeal: Your Shadow</h2>
            <div className="jd-shadow-card">
              <div className="jd-shadow-header">
                <span className="jd-shadow-icon">☽</span>
                <div>
                  <h3 className="jd-shadow-name">{archetype.shadow.shadowName}</h3>
                  <p className="jd-shadow-dim">
                    Shadow dimension: {DIMENSION_METADATA[archetype.weakestIndex].name}
                    {' '}({Math.round(archetype.weakestValue * 100)}%)
                  </p>
                </div>
              </div>
              <p className="jd-shadow-reveal">{content.shadowReveal}</p>
            </div>
          </section>
        )}
      </UnlockGate>

      {/* CTA */}
      {!state.hasBirthData && (
        <section className="jd-cta">
          <h2>Begin Your Journey</h2>
          <p>Enter your birthday to discover your archetype and start your Hero's Journey.</p>
          <a href="/discover" className="jd-cta-button">Discover Your Pattern</a>
          <span className="jd-cta-sub">Free · 30 seconds · No signup required</span>
        </section>
      )}

      {state.hasBirthData && !state.firstCheckinDone && (
        <section className="jd-cta">
          <h2>Cross the Threshold</h2>
          <p>Your first check-in is a commitment. One minute to begin your transformation.</p>
          <a href="/sol/checkin" className="jd-cta-button">Start Check-in</a>
        </section>
      )}

      {state.firstCheckinDone && stageNumber < 6 && (
        <section className="jd-cta jd-cta-subtle">
          <a href="/sol/checkin" className="jd-cta-button-outline">Today's Check-in</a>
        </section>
      )}

      <style>{`
        .journey-dashboard {
          max-width: 640px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Header */
        .jd-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .jd-title {
          font-size: 2rem;
          font-weight: 400;
          color: #d4a854;
          margin: 0 0 0.5rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .jd-subtitle {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.5);
          margin: 0;
        }

        /* Map */
        .jd-map-section {
          margin-bottom: 1rem;
        }

        /* Milestone */
        .jd-milestone {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(212, 168, 84, 0.06);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 8px;
          margin-bottom: 2rem;
        }
        .jd-milestone-icon {
          color: #d4a854;
          font-size: 0.9rem;
        }
        .jd-milestone-text {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
        }

        /* Stage Detail */
        .jd-stage-detail {
          padding: 1.25rem;
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 12px;
          margin-bottom: 2rem;
          animation: jd-slide-in 0.3s ease-out;
        }
        @keyframes jd-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .jd-stage-detail-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .jd-stage-icon { font-size: 1.5rem; }
        .jd-stage-name { font-size: 1rem; color: #f0e8d8; margin: 0; font-weight: 600; }
        .jd-stage-sub { font-size: 0.8rem; color: rgba(240, 232, 216, 0.4); margin: 0; }
        .jd-stage-desc { font-size: 0.85rem; color: rgba(240, 232, 216, 0.6); line-height: 1.6; margin: 0; }
        .jd-close {
          margin-left: auto;
          background: none;
          border: none;
          color: rgba(240, 232, 216, 0.3);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
        }
        .jd-close:hover { color: rgba(240, 232, 216, 0.6); }

        /* Archetype Card */
        .jd-archetype {
          padding: 1.5rem;
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 12px;
          margin-bottom: 2rem;
        }
        .jd-archetype-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .jd-archetype-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(212, 168, 84, 0.1);
          border: 1px solid rgba(212, 168, 84, 0.2);
          border-radius: 50%;
          font-size: 1.2rem;
          color: #d4a854;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .jd-archetype-name {
          font-size: 1.3rem;
          color: #d4a854;
          margin: 0;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .jd-archetype-quest {
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.4);
          margin: 0.25rem 0 0;
          font-style: italic;
        }
        .jd-archetype-intro {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.7);
          line-height: 1.7;
          margin: 0 0 1rem;
        }
        .jd-archetype-quote {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1rem;
          font-style: italic;
          color: rgba(212, 168, 84, 0.6);
          border-left: 2px solid rgba(212, 168, 84, 0.2);
          padding-left: 1rem;
          margin: 0;
          line-height: 1.6;
        }
        .jd-archetype-quote cite {
          display: block;
          font-size: 0.8rem;
          color: rgba(240, 232, 216, 0.3);
          font-style: normal;
          margin-top: 0.5rem;
        }

        /* Stats */
        .jd-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .jd-stat {
          text-align: center;
          padding: 1rem;
          background: rgba(26, 24, 20, 0.4);
          border: 1px solid rgba(212, 168, 84, 0.08);
          border-radius: 8px;
        }
        .jd-stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 600;
          color: #d4a854;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .jd-stat-label {
          font-size: 0.7rem;
          color: rgba(240, 232, 216, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Sections */
        .jd-section {
          margin-bottom: 2rem;
        }
        .jd-section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #f0e8d8;
          margin: 0 0 1rem;
        }

        /* Strength */
        .jd-strength-card {
          padding: 1.25rem;
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(212, 168, 84, 0.1);
          border-radius: 12px;
        }
        .jd-strength-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .jd-strength-symbol {
          font-size: 1.2rem;
          color: #d4a854;
        }
        .jd-strength-name {
          font-size: 0.9rem;
          color: #d4a854;
          font-weight: 600;
        }
        .jd-strength-pct {
          margin-left: auto;
          font-size: 0.85rem;
          color: rgba(212, 168, 84, 0.5);
        }
        .jd-strength-text {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
          line-height: 1.7;
          margin: 0;
        }

        /* Radar */
        .jd-radar-wrap {
          display: flex;
          justify-content: center;
          padding: 1rem;
          background: rgba(26, 24, 20, 0.4);
          border: 1px solid rgba(212, 168, 84, 0.08);
          border-radius: 12px;
        }

        /* Shadow */
        .jd-shadow-section {
          border-left: 2px solid rgba(167, 139, 250, 0.2);
          padding-left: 1rem;
        }
        .jd-shadow-teaser {
          font-size: 0.9rem;
          color: rgba(240, 232, 216, 0.6);
          line-height: 1.7;
          margin: 0;
        }

        /* Ordeal */
        .jd-ordeal-section {
          border-left: 2px solid rgba(167, 139, 250, 0.3);
          padding-left: 1rem;
        }
        .jd-shadow-card {
          padding: 1.25rem;
          background: rgba(26, 24, 20, 0.6);
          border: 1px solid rgba(167, 139, 250, 0.1);
          border-radius: 12px;
        }
        .jd-shadow-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .jd-shadow-icon {
          font-size: 1.5rem;
          color: rgba(167, 139, 250, 0.6);
        }
        .jd-shadow-name {
          font-size: 1rem;
          color: rgba(167, 139, 250, 0.8);
          margin: 0;
          font-weight: 600;
        }
        .jd-shadow-dim {
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.3);
          margin: 0.25rem 0 0;
        }
        .jd-shadow-reveal {
          font-size: 0.85rem;
          color: rgba(240, 232, 216, 0.6);
          line-height: 1.7;
          margin: 0;
        }

        /* CTA */
        .jd-cta {
          text-align: center;
          padding: 2rem 1.5rem;
          background: linear-gradient(135deg, rgba(212, 168, 84, 0.08), rgba(167, 139, 250, 0.05));
          border: 1px solid rgba(212, 168, 84, 0.15);
          border-radius: 16px;
          margin-top: 2rem;
        }
        .jd-cta h2 {
          font-size: 1.3rem;
          color: #f0e8d8;
          margin: 0 0 0.75rem;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .jd-cta p {
          color: rgba(240, 232, 216, 0.5);
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0 0 1.5rem;
        }
        .jd-cta-button {
          display: inline-block;
          padding: 0.8rem 2rem;
          background: linear-gradient(135deg, #d4a854, #c49a4a);
          color: #0a0908;
          font-weight: 700;
          font-size: 0.95rem;
          border-radius: 8px;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .jd-cta-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(212, 168, 84, 0.3);
        }
        .jd-cta-sub {
          display: block;
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: rgba(240, 232, 216, 0.3);
        }
        .jd-cta-subtle {
          background: transparent;
          border: none;
          padding: 1rem;
        }
        .jd-cta-button-outline {
          display: inline-block;
          padding: 0.6rem 1.5rem;
          background: transparent;
          border: 1px solid rgba(212, 168, 84, 0.3);
          color: #d4a854;
          font-weight: 500;
          font-size: 0.85rem;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .jd-cta-button-outline:hover {
          background: rgba(212, 168, 84, 0.08);
          border-color: rgba(212, 168, 84, 0.5);
        }

        /* Loading */
        .jd-loading {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(240, 232, 216, 0.4);
        }
        .jd-pulse {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(212, 168, 84, 0.2);
          margin: 0 auto 1rem;
          animation: jd-pulse-anim 1.5s ease-in-out infinite;
        }
        @keyframes jd-pulse-anim {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        @media (max-width: 480px) {
          .jd-title { font-size: 1.5rem; }
          .jd-stats { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
          .jd-stat { padding: 0.75rem 0.5rem; }
          .jd-stat-value { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
}

// Helper to extract the 8D vector from journey state
function getArchetypeVector(state: JourneyState): number[] {
  if (!state.archetype) return [];
  try {
    const birthDataStr = typeof window !== 'undefined' ? localStorage.getItem('rop_birth_data_full') : null;
    if (birthDataStr) {
      const birthData: BirthData = JSON.parse(birthDataStr);
      const vector = computeFromBirthData(birthData);
      return Array.from(vector).slice(0, 8);
    }
  } catch { /* fallback */ }
  return [];
}
